"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc, where, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useUserAuth } from "@/context/AuthContext";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (before compression)
const UPLOAD_TIMEOUT = 120_000; // 120 seconds
const COMPRESSION_TIMEOUT = 10_000; // 10 seconds max for compression
const COMPRESSION_THRESHOLD = 2 * 1024 * 1024; // Only compress files > 2MB

/** Wrap imageCompression with a hard timeout to prevent hanging on mobile */
async function compressWithTimeout(file: File, options: any, timeoutMs: number): Promise<File | Blob> {
  const compressionPromise = import('browser-image-compression').then(mod => mod.default(file, options));
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('COMPRESSION_TIMEOUT')), timeoutMs)
  );
  return Promise.race([compressionPromise, timeoutPromise]);
}

/** Upload with progress tracking and timeout */
function uploadWithProgress(
  storageRef: ReturnType<typeof ref>,
  file: File,
  onProgress: (pct: number) => void,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    const timer = setTimeout(() => { task.cancel(); reject(new Error('UPLOAD_TIMEOUT')); }, timeoutMs);
    task.on(
      'state_changed',
      (snap) => { onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)); },
      (err) => { clearTimeout(timer); reject(err); },
      async () => {
        clearTimeout(timer);
        try { const url = await getDownloadURL(task.snapshot.ref); resolve(url); }
        catch (e) { reject(e); }
      }
    );
  });
}

export default function PaymentPage() {
  const { user, loading: authLoading } = useUserAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState("");

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [lineId, setLineId] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitStatus, setSubmitStatus] = useState<string>('');
  const [compressionInfo, setCompressionInfo] = useState<{ original: number; compressed: number } | null>(null);
  const [slipError, setSlipError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const categoryOrder: Record<string, number> = {
    "คอร์สสอบเข้า": 1,
    "สอบเข้า ม.1": 1,
    "ป.6 สอบเข้า ม.1": 1,
    "ประถม (ป.4-6)": 2,
    "ม.ต้น (ม.1-3)": 3,
    "ม.ปลาย (ม.4-6)": 4,
    "ม.ปลาย (คณิตเพิ่มเติม)": 4
  };

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState<{ code: string, amount: number, type: string } | null>(null);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      // 1. Query by Code first
      const q = query(collection(db, "coupons"), where("code", "==", couponCode.toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        alert("❌ ไม่พบโค้ดส่วนลดนี้");
        setCouponCode("");
        return;
      }

      const couponData = snapshot.docs[0].data();

      // 2. Check if already used
      if (couponData.isUsed) {
        alert("❌ โค้ดนี้ถูกใช้งานไปแล้ว");
        setCouponCode("");
        return;
      }

      // 3. Check userId ownership (review reward coupons are bound to userId)
      if (couponData.userId && user && couponData.userId !== user.uid) {
        alert("❌ โค้ดนี้สำหรับผู้ใช้คนอื่น ไม่สามารถใช้ได้");
        setCouponCode("");
        return;
      }

      // Calculate Discount
      let discountAmount = 0;
      if (couponData.discountPercent) {
        discountAmount = Math.floor((totalPrice * couponData.discountPercent) / 100);
      } else if (couponData.discountAmount) {
        discountAmount = couponData.discountAmount;
      }

      // Cap discount to not exceed total price
      if (discountAmount > totalPrice) discountAmount = totalPrice;

      setDiscount({
        code: couponCode.toUpperCase(),
        amount: discountAmount,
        type: couponData.source || 'promo' // 'review_reward' or 'promo'
      });

    } catch (error) {
      console.error("Error applying coupon:", error);
      alert("เกิดข้อผิดพลาดในการตรวจสอบคูปอง");
    }
  };

  const totalPrice = courses
    .filter(course => selectedCourses.includes(course.id))
    .reduce((sum, course) => sum + Number(course.price || 0), 0);

  const finalPrice = discount ? Math.max(0, totalPrice - discount.amount) : totalPrice;

  // Reset coupon if total price changes (e.g. course selection changes)
  useEffect(() => {
    if (discount) {
      // Re-validate discount amount if it was percentage based, strictly speaking we should probably re-calc
      // For simplicity, let's just reset to avoid edge cases where price drops below discount fixed amount or similar quirks
      setDiscount(null);
      setCouponCode("");
    }
  }, [selectedCourses]);


  useEffect(() => {
    if (!authLoading && !user) {
      alert("กรุณาเข้าสู่ระบบก่อนแจ้งโอนเงิน");
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchCourses = async () => {
      const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const courseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(courseData);

      const allCategories = Array.from(new Set(courseData.map((c: any) => c.category || "อื่นๆ")));
      const sortedCategories = allCategories.sort((a, b) => {
        const orderA = categoryOrder[a] || 99;
        const orderB = categoryOrder[b] || 99;
        return orderA - orderB;
      });

      setCategories(sortedCategories);
      if (sortedCategories.length > 0) setSelectedCategory(sortedCategories[0]);
    };
    fetchCourses();
  }, []);

  const toggleCourse = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter(id => id !== courseId));
    } else {
      setSelectedCourses([...selectedCourses, courseId]);
    }
  };



  /** Core file processing: validate → compress (with timeout) → set state */
  const processFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSlipError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file size before compression
    if (file.size > MAX_FILE_SIZE) {
      setSlipError(`ไฟล์ใหญ่เกินไป (${(file.size / 1024 / 1024).toFixed(1)}MB) กรุณาเลือกรูปไม่เกิน 10MB`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const originalSize = file.size;
    setSlipError('');
    setCompressionInfo(null);
    setIsCompressing(true);

    // Revoke old preview URL to prevent memory leak
    if (slipPreview) URL.revokeObjectURL(slipPreview);

    try {
      let compressedFile: File | Blob = file;

      // Only compress if file is larger than threshold (2MB)
      if (originalSize > COMPRESSION_THRESHOLD) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.85
        };

        try {
          // Attempt 1: With Web Worker + timeout
          compressedFile = await compressWithTimeout(file, options, COMPRESSION_TIMEOUT);
        } catch (workerErr: any) {
          console.warn('Compression attempt 1 failed:', workerErr?.message);
          try {
            // Attempt 2: Without Web Worker + timeout (for in-app browsers)
            compressedFile = await compressWithTimeout(
              file,
              { ...options, useWebWorker: false },
              COMPRESSION_TIMEOUT
            );
          } catch (fallbackErr: any) {
            // All compression failed or timed out — use original file (perfectly fine)
            compressedFile = file;
          }
        }
      }

      setSlipFile(compressedFile as File);
      setSlipPreview(URL.createObjectURL(compressedFile));
      setCompressionInfo({ original: originalSize, compressed: compressedFile.size });
    } catch (err) {
      // Ultimate fallback: just use the original file as-is
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
      setCompressionInfo({ original: originalSize, compressed: originalSize });
    } finally {
      setIsCompressing(false);
      // Always reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [slipPreview]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  /** Handle paste (Ctrl+V) for slip images */
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) processFile(file);
          return;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFile]);

  /** Handle drag-and-drop for slip images */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  /** Clear slip and allow re-upload */
  const clearSlip = useCallback(() => {
    if (slipPreview) URL.revokeObjectURL(slipPreview);
    setSlipFile(null);
    setSlipPreview('');
    setCompressionInfo(null);
    setSlipError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [slipPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (selectedCourses.length === 0) return alert("⚠️ กรุณาเลือกคอร์สเรียนอย่างน้อย 1 คอร์ส");
    if (!fullName.trim()) return alert("⚠️ กรุณากรอกชื่อ-นามสกุล");
    if (!phoneNumber.trim()) return alert("⚠️ กรุณากรอกเบอร์โทรศัพท์");
    if (!slipFile) return alert("⚠️ กรุณาแนบสลิปโอนเงิน");

    // Validate file size (after compression)
    if (slipFile.size > 5 * 1024 * 1024) {
      return alert(`⚠️ ไฟล์สลิปยังใหญ่เกินไปหลังบีบอัด (${(slipFile.size / 1024 / 1024).toFixed(1)}MB)\nกรุณาเลือกรูปที่มีขนาดเล็กลง`);
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    setSubmitStatus('กำลังเตรียมข้อมูล...');

    try {
      // 1. Upload with progress tracking & timeout (file already compressed in handleFileChange)
      setSubmitStatus('กำลังอัปโหลดสลิป...');
      const storageRef = ref(storage, `slips/${user.uid}_${Date.now()}`);
      const downloadURL = await uploadWithProgress(
        storageRef,
        slipFile,
        (pct) => setUploadProgress(pct),
        UPLOAD_TIMEOUT
      );

      // 3. Create enrollment docs
      setSubmitStatus('กำลังบันทึกข้อมูล...');
      setUploadProgress(100);

      const promises = selectedCourses.map(async (courseId) => {
        const courseInfo = courses.find(c => c.id === courseId);
        const price = Number(courseInfo?.price || 0);

        // Calculate per-item discount (Weighted distribution)
        let itemDiscount = 0;
        if (discount && totalPrice > 0) {
          const ratio = price / totalPrice;
          itemDiscount = Math.floor(discount.amount * ratio);
        }
        const itemFinalPrice = Math.max(0, price - itemDiscount);

        return addDoc(collection(db, "enrollments"), {
          userId: user.uid,
          userName: fullName,
          userTel: phoneNumber,
          lineId: lineId,
          userEmail: user.email,
          courseId: courseId,
          courseTitle: courseInfo?.title || "Unknown Course",
          // Copy exam-level scope from course so ExamAccessGuard can match it
          // (null for non exam-bank courses). Fixes exam-bank gating bug.
          allowedExamLevel: courseInfo?.allowedExamLevel ?? null,
          price: price,
          couponCode: discount?.code || null,
          discountAmount: itemDiscount,
          finalPrice: itemFinalPrice,
          slipUrl: downloadURL,
          status: "pending",
          createdAt: new Date()
        });
      });

      await Promise.all(promises);

      // 4. Update Coupon Status to 'Used' immediately to prevent reuse
      if (discount) {
        const qCoupon = query(collection(db, "coupons"), where("code", "==", discount.code));
        const couponSnap = await getDocs(qCoupon);
        if (!couponSnap.empty) {
          const couponDoc = couponSnap.docs[0];
          await updateDoc(doc(db, "coupons", couponDoc.id), {
            isUsed: true,
            usedAt: new Date(),
            usedForCourseId: selectedCourses[0] || null,
          });
        }
      }

      alert("✅ แจ้งโอนเงินเรียบร้อย! ข้อมูลถูกส่งไปยัง Admin แล้วครับ");
      router.push("/my-courses");

    } catch (error: any) {
      console.error("Payment Error:", error);
      if (error?.message === 'UPLOAD_TIMEOUT') {
        alert("⏳ การอัปโหลดสลิปใช้เวลานานเกินไป\n\nวิธีแก้ไข:\n• ลองเชื่อมต่อ WiFi แล้วลองใหม่\n• ลองถ่ายรูปสลิปด้วยกล้องแทนการ Screenshot");
      } else if (error?.code === 'storage/canceled') {
        alert("❌ การอัปโหลดถูกยกเลิก\nกรุณาลองใหม่อีกครั้ง");
      } else if (error?.code === 'storage/unauthorized') {
        alert("❌ ไม่มีสิทธิ์อัปโหลดไฟล์\nกรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่");
      } else if (error?.code === 'storage/retry-limit-exceeded' || error?.code === 'storage/server-file-wrong-size') {
        alert("❌ เกิดข้อผิดพลาดในการอัปโหลด\n\nวิธีแก้ไข:\n• ปิดแอปแล้วเปิดใหม่\n• ลองใช้ browser อื่น (Chrome/Safari)");
      } else {
        alert(`เกิดข้อผิดพลาด กรุณาลองใหม่\n\n(${error?.code || error?.message || 'unknown error'})`);
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setSubmitStatus('');
    }
  };

  // Custom course ordering for ประถม category
  const courseOrder: Record<string, number> = {
    "คอร์ส ป.6 สอบเข้าชั้น ม.1": 1,
    "ติวเข้มสอบเข้า Gifted ม.1": 2,
    "คอร์สการเทียบบัญญัติไตรยางค์": 3,
    "คอร์สเก่งสมการ": 4,
  };

  const getCourseOrder = (title: string): number => {
    // Check for partial match
    for (const [key, order] of Object.entries(courseOrder)) {
      if (title.includes(key) || key.includes(title)) {
        return order;
      }
    }
    // Check for specific keywords
    if (title.includes("ป.6") && title.includes("สอบเข้า")) return 1;
    if (title.includes("Gifted") || title.includes("กิฟ")) return 2;
    if (title.includes("บัญญัติไตรยางค์")) return 3;
    if (title.includes("สมการ")) return 4;
    return 99; // Default order for other courses
  };

  const filteredCourses = courses
    .filter(c => (c.category || "อื่นๆ") === selectedCategory)
    .sort((a, b) => {
      // Use custom order for ประถม category
      if (selectedCategory.includes("ประถม")) {
        const orderA = getCourseOrder(a.title);
        const orderB = getCourseOrder(b.title);
        return orderA - orderB;
      }
      // Default alphabetical sort for other categories
      return a.title.localeCompare(b.title, 'th');
    });

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-slate-500 dark:text-slate-400 dark:bg-slate-950">กำลังตรวจสอบสิทธิ์...</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans flex flex-col transition-colors">
      <Navbar />

      {/* 🌿 Background Wrapper */}
      <div className="relative flex-grow flex justify-center items-center p-4 overflow-hidden pt-24 pb-24">

        {/* 🍃 Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-200 dark:bg-teal-900 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[100px] opacity-60 dark:opacity-20 animate-pulse"></div>
        <div className="absolute top-[30%] right-[-10%] w-[400px] h-[400px] bg-emerald-200 dark:bg-emerald-900 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[100px] opacity-60 dark:opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-lime-100 dark:bg-lime-900 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[100px] opacity-70 dark:opacity-20 animate-pulse delay-2000"></div>

        {/* 💎 Glass Card */}
        <div className="relative z-10 bg-white/60 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/60 dark:border-slate-700/50 shadow-2xl rounded-[3rem] p-6 sm:p-10 w-full max-w-2xl text-slate-700 dark:text-slate-200">

          <div className="text-center mb-8">
            <div className="inline-block p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 shadow-sm mb-4 text-3xl">💳</div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-600 mb-2">
              ลงทะเบียน & แจ้งโอน
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">กรอกข้อมูลและแนบสลิปเพื่อเริ่มเรียนทันที</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* 1. เลือกคอร์ส */}
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">1. เลือกคอร์สเรียน</label>
                <span className="text-xs font-medium text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-lg border border-orange-100 dark:border-orange-800">* อย่างน้อย 1 คอร์ส</span>
              </div>

              {/* Segmented Control Buttons */}
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-3 rounded-xl font-bold transition-all duration-200 ${selectedCategory === cat
                        ? 'bg-teal-600 text-white shadow-lg shadow-teal-200'
                        : 'bg-white/50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-white/80 dark:hover:bg-slate-700/60 hover:border-teal-300 dark:hover:border-teal-500'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Course List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <div
                      key={course.id}
                      onClick={() => toggleCourse(course.id)}
                      className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3 cursor-pointer group relative overflow-hidden
                                            ${selectedCourses.includes(course.id)
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                          : 'bg-white/40 dark:bg-slate-800/50 border-white/50 dark:border-slate-700 hover:bg-white/80 dark:hover:bg-slate-700/60 hover:scale-[1.02] hover:shadow-lg'}
                                        `}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                                            ${selectedCourses.includes(course.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-emerald-300'}`}>
                        {selectedCourses.includes(course.id) && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`font-bold text-sm block truncate ${selectedCourses.includes(course.id) ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-200'}`}>{course.title}</span>
                        <div className="flex items-center gap-2">
                          {course.fullPrice > 0 && (
                            <span className="text-xs text-slate-300 dark:text-slate-500 line-through">฿{Number(course.fullPrice).toLocaleString()}</span>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-400">{course.price?.toLocaleString()} บาท</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center text-slate-400 dark:text-slate-500 py-6 bg-white/30 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600">ไม่มีคอร์สในหมวดหมู่นี้</div>
                )}
              </div>

              {/* ✅ ส่วนสรุปยอด + รายการที่เลือก (Bill Summary) */}
              {selectedCourses.length > 0 && (
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/50 rounded-3xl p-5 shadow-lg shadow-emerald-100/50 dark:shadow-none animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="text-emerald-800 dark:text-emerald-400 font-bold mb-3 flex items-center gap-2 text-sm">
                    🛒 รายการที่เลือก ({selectedCourses.length})
                  </h3>

                  {/* Loop รายการสินค้า */}
                  <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {courses.filter(c => selectedCourses.includes(c.id)).map(course => (
                      <div key={course.id} className="flex justify-between items-center bg-white/70 dark:bg-slate-800/70 p-3 rounded-2xl border border-white/50 dark:border-slate-700 shadow-sm">
                        <div className="min-w-0 flex-1 mr-2">
                          <div className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{course.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{Number(course.price).toLocaleString()} บาท</div>
                        </div>
                        {/* ปุ่มกากบาท (X) เพื่อลบ */}
                        <button
                          type="button"
                          onClick={() => toggleCourse(course.id)}
                          className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-500 rounded-full transition-colors flex-shrink-0"
                          title="เอาคอร์สนี้ออก"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* สรุปราคารวม */}
                  <div className="pt-3 border-t-2 border-dashed border-emerald-100 dark:border-emerald-900/50 flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400 font-bold">ยอดสุทธิ</span>
                    <span className="text-2xl font-black text-emerald-600 tracking-tight">{totalPrice.toLocaleString()}.-</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. ข้อมูลผู้เรียน */}
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">2. ข้อมูลผู้เรียน</label>
                <span className="text-xs font-medium text-orange-500">* จำเป็น</span>
              </div>

              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                required
                className="w-full p-4 bg-white/50 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-400/50 focus:bg-white/80 dark:focus:bg-slate-800 transition font-medium text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="tel"
                  placeholder="เบอร์โทรศัพท์"
                  required
                  className="w-full p-4 bg-white/50 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-400/50 focus:bg-white/80 dark:focus:bg-slate-800 transition font-medium text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="LINE ID (ถ้ามี)"
                  className="w-full p-4 bg-white/50 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-400/50 focus:bg-white/80 dark:focus:bg-slate-800 transition font-medium text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm"
                  value={lineId}
                  onChange={e => setLineId(e.target.value)}
                />
              </div>
            </div>

            {/* 3. QR Code & Slip */}
            <div className="space-y-4">

              <div className="relative overflow-hidden bg-gradient-to-br from-white/90 to-white/70 dark:from-slate-800/90 dark:to-slate-800/70 rounded-3xl p-8 border border-white dark:border-slate-700 shadow-lg backdrop-blur-sm">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 via-emerald-400 to-lime-400"></div>

                <h3 className="text-teal-900 dark:text-teal-300 font-black mb-6 flex items-center justify-center gap-2 text-lg">
                  <span className="text-2xl">💳</span> ช่องทางการชำระเงิน
                </h3>

                {/* QR Code Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700 mb-6">
                  <div className="flex flex-col items-center">
                    <div className="w-80 h-80 bg-white dark:bg-white p-3 rounded-2xl shadow-inner border-2 border-slate-100 dark:border-slate-300 mb-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/qrcode.png"
                        alt="QR Code พร้อมเพย์"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/30 rounded-xl border border-teal-100 dark:border-teal-800">
                      <span className="text-teal-600 dark:text-teal-400 font-bold text-sm">📱 สแกน QR Code เพื่อชำระ</span>
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/50">
                  <h4 className="text-emerald-800 dark:text-emerald-400 font-bold mb-4 text-center flex items-center justify-center gap-2">
                    <span>🏦</span> รายละเอียดบัญชี
                  </h4>

                  <div className="space-y-3">
                    {/* Account Holder */}
                    <div className="bg-white/80 dark:bg-slate-800/60 rounded-xl p-4 border border-white dark:border-slate-700 shadow-sm">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">ชื่อบัญชี</div>
                      <div className="text-slate-800 dark:text-slate-100 font-bold text-lg">นายสุเทพ โชติมานิต</div>
                    </div>

                    {/* PromptPay */}
                    <div className="bg-white/80 dark:bg-slate-800/60 rounded-xl p-4 border border-white dark:border-slate-700 shadow-sm">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">พร้อมเพย์</div>
                      <div className="text-teal-600 dark:text-teal-400 font-black text-xl tracking-wide">082-705-7440</div>
                    </div>

                    {/* Bank Account */}
                    <div className="bg-white/80 dark:bg-slate-800/60 rounded-xl p-4 border border-white dark:border-slate-700 shadow-sm">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">ธนาคารกสิกรไทย (ออมทรัพย์)</div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-black text-xl tracking-wider">391-2-78364-1</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">สาขา: เซ็นทรัลรัตนาธิเบศร์</div>
                    </div>
                  </div>
                </div>

                {/* Amount to Pay */}
                <div className="mt-6 text-center">
                  <div className="flex flex-col gap-4 mb-4">
                    {/* Coupon Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="กรอกโค้ดส่วนลด (ถ้ามี)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="flex-1 px-4 py-2 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:font-normal dark:placeholder:text-slate-500"
                        disabled={!!discount}
                      />
                      {discount ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDiscount(null);
                            setCouponCode("");
                          }}
                          className="px-4 py-2 bg-red-100 text-red-500 font-bold rounded-xl hover:bg-red-200 transition"
                        >
                          ยกเลิก
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition"
                          disabled={!couponCode.trim()}
                        >
                          ใช้โค้ด
                        </button>
                      )}
                    </div>

                    {discount && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 p-3 rounded-xl flex justify-between items-center text-emerald-700 dark:text-emerald-400 animate-in fade-in slide-in-from-top-2">
                        <span className="text-sm font-bold flex items-center gap-2">
                          🏷️ ใช้โค้ดส่วนลด {discount.code}
                        </span>
                        <span className="font-black">- ฿{discount.amount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="inline-flex flex-col items-center gap-1 px-8 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2rem] shadow-xl shadow-emerald-200 w-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                    {discount && (
                      <span className="text-emerald-100 text-sm font-bold line-through decoration-emerald-200/60 decoration-2">฿{totalPrice.toLocaleString()}</span>
                    )}

                    <span className="text-white/90 text-xs font-bold uppercase tracking-wider mb-1">ยอดที่ต้องชำระสุทธิ</span>
                    <span className="text-white font-black text-4xl tracking-tight leading-none">
                      {finalPrice.toLocaleString()} <span className="text-lg font-bold opacity-80">บาท</span>
                    </span>
                  </div>
                </div>
              </div>

              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">3. แนบหลักฐานการโอน (สลิป)</label>

              {/* Error message */}
              {slipError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-bold px-4 py-3 rounded-2xl flex items-center gap-2">
                  <span>⚠️</span> {slipError}
                </div>
              )}

              <div
                ref={dropZoneRef}
                className="relative group"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  id="slip-upload"
                />

                {/* Preview mode — show image with change/remove options */}
                {slipPreview && !isCompressing ? (
                  <div className="relative bg-white/40 dark:bg-slate-800/40 border-2 border-emerald-200 dark:border-emerald-800 rounded-3xl p-3 backdrop-blur-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slipPreview} alt="Preview" className="w-full max-h-64 object-contain rounded-2xl" />
                    <div className="flex gap-2 mt-3">
                      <label
                        htmlFor="slip-upload"
                        className="flex-1 py-2.5 bg-white/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer transition"
                      >
                        🔄 เปลี่ยนรูป
                      </label>
                      <button
                        type="button"
                        onClick={clearSlip}
                        className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-500 hover:bg-red-100 transition"
                      >
                        ✕ ลบ
                      </button>
                    </div>
                    {compressionInfo && compressionInfo.original !== compressionInfo.compressed && (
                      <p className="text-[11px] text-emerald-600 font-bold text-center mt-2">
                        ✅ บีบอัดแล้ว: {(compressionInfo.original / 1024).toFixed(0)}KB → {(compressionInfo.compressed / 1024).toFixed(0)}KB
                      </p>
                    )}
                  </div>
                ) : (
                  <label
                    htmlFor="slip-upload"
                    className={`w-full h-48 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 shadow-sm backdrop-blur-sm
                      ${isCompressing
                        ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-900/10'
                        : isDragging
                          ? 'border-teal-400 bg-teal-50/30 dark:bg-teal-900/20 scale-[1.02]'
                          : 'bg-white/40 dark:bg-slate-800/40 border-teal-200/50 dark:border-slate-600 hover:bg-white/60 dark:hover:bg-slate-700/40 hover:border-teal-400 text-slate-400 dark:text-slate-400 hover:text-teal-500 hover:scale-[1.01]'
                      }`}
                  >
                    {isCompressing ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-[3px] border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-bold text-amber-600 text-sm">กำลังบีบอัดรูปภาพ...</span>
                        <button
                          type="button"
                          onClick={() => { setIsCompressing(false); clearSlip(); }}
                          className="text-xs text-red-500 font-bold hover:underline"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">🧾</div>
                        <span className="font-bold">คลิกเพื่ออัปโหลดสลิป</span>
                        <span className="text-xs text-slate-300 dark:text-slate-500 font-medium">หรือลากวาง / Ctrl+V วางรูปได้เลย</span>
                      </>
                    )}
                  </label>
                )}
              </div>

            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="w-full py-5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-xl rounded-[1.5rem] shadow-lg shadow-teal-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none relative overflow-hidden group"
            >
              {/* Progress bar background */}
              {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                <div
                  className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              )}
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative">
                {isSubmitting
                  ? `⏳ ${submitStatus}${uploadProgress > 0 && uploadProgress < 100 ? ` (${uploadProgress}%)` : ''}`
                  : '✨ ยืนยันการแจ้งโอน'}
              </span>
            </button>

            <Link href="/" className="block text-center text-slate-400 dark:text-slate-500 font-bold hover:text-teal-500 dark:hover:text-teal-400 transition text-sm">ยกเลิก / กลับหน้าหลัก</Link>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}