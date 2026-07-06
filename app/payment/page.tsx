"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc, where, doc, limit, runTransaction } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useUserAuth } from "@/context/AuthContext";
import ConfettiBurst from "@/components/gamification/ConfettiBurst";
import { PAYMENT_INFO } from "@/lib/constants";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (before compression)
const UPLOAD_TIMEOUT = 120_000; // 120 seconds
const COMPRESSION_TIMEOUT = 10_000; // 10 seconds max for compression
const COMPRESSION_THRESHOLD = 2 * 1024 * 1024; // Only compress files > 2MB
const MAX_SLIPS = 5; // attach up to 5 transfer slips

const PHONE_RE = /^[0-9]{9,10}$/; // step-2 gate: 9–10 digit phone
const STEP_LABELS = ["เลือกคอร์ส", "ข้อมูลผู้เรียน", "ชำระเงิน", "แนบสลิป"];

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
  const [slipFiles, setSlipFiles] = useState<File[]>([]);
  const [slipPreviews, setSlipPreviews] = useState<string[]>([]);
  // Confirmation screen — set after a successful submit (snapshot of what was sent).
  const [done, setDone] = useState<null | { courses: { title: string; price: number }[]; total: number; slipCount: number; couponCode: string | null }>(null);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [lineId, setLineId] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitStatus, setSubmitStatus] = useState<string>('');
  const [slipError, setSlipError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // --- Wizard UI state (presentation only) ---
  const [step, setStep] = useState(1);                 // active step 1..4
  const [maxStepReached, setMaxStepReached] = useState(1); // highest unlocked step
  const [copied, setCopied] = useState<string | null>(null); // copy-to-clipboard feedback

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
      // Use Math.round so the customer never silently loses up to ฿1
      // from a percent discount being floored.
      let discountAmount = 0;
      if (couponData.discountPercent) {
        discountAmount = Math.round((totalPrice * couponData.discountPercent) / 100);
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


  // Not signed in → send to /login and remember this exact page (incl. ?course=…)
  // so they land right back here after logging in / signing up. replace() keeps
  // /payment out of history, so Back from /login won't bounce into this redirect.
  useEffect(() => {
    if (!authLoading && !user) {
      const back = window.location.pathname + window.location.search;
      router.replace(`/login?returnUrl=${encodeURIComponent(back)}`);
    }
  }, [user, authLoading, router]);

  const [coursesLoadError, setCoursesLoadError] = useState<string | null>(null);
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Cap the read so this never becomes an unbounded full-collection scan as
        // the catalog grows. 500 is far above any realistic course count, so it
        // never hides a purchasable course — raise it if the catalog ever nears it.
        const q = query(collection(db, "courses"), orderBy("createdAt", "desc"), limit(500));
        const snapshot = await getDocs(q);
        const courseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCourses(courseData);

        const allCategories = Array.from(new Set(courseData.map((c: any) => c.category || "อื่นๆ")));
        // "คลังข้อสอบ" is always pinned to the front (leftmost) so it never hides
        // off-screen at the end of the horizontally-scrolling tab row on mobile.
        const rank = (c: string) => (c.includes("คลังข้อสอบ") ? 0 : (categoryOrder[c] || 99));
        const sortedCategories = allCategories.sort((a, b) => rank(a) - rank(b));

        setCategories(sortedCategories);
        if (sortedCategories.length > 0) setSelectedCategory(sortedCategories[0]);
        setCoursesLoadError(null);
      } catch (err) {
        console.error("Failed to load courses:", err);
        setCoursesLoadError("โหลดรายชื่อคอร์สไม่สำเร็จ กรุณารีเฟรชหน้าใหม่ หรือเช็คอินเทอร์เน็ต");
      }
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



  /** Compress one image (web-worker, then no-worker fallback); returns the file, or null if rejected. */
  const prepareImage = useCallback(async (file: File): Promise<File | null> => {
    if (!file.type.startsWith('image/')) { setSlipError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG)'); return null; }
    if (file.size > MAX_FILE_SIZE) { setSlipError(`มีไฟล์ใหญ่เกิน 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`); return null; }
    if (file.size <= COMPRESSION_THRESHOLD) return file;
    const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: 0.85 };
    try {
      return await compressWithTimeout(file, options, COMPRESSION_TIMEOUT) as File;
    } catch {
      // Retry without the web worker (some in-app browsers); fall back to the original if that fails too.
      try { return await compressWithTimeout(file, { ...options, useWebWorker: false }, COMPRESSION_TIMEOUT) as File; }
      catch { return file; }
    }
  }, []);

  /** Add one or more images: validate + compress each, then append (up to MAX_SLIPS). */
  const addFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setSlipError('');
    const room = MAX_SLIPS - slipFiles.length;
    if (room <= 0) { setSlipError(`แนบสลิปได้สูงสุด ${MAX_SLIPS} รูป`); return; }
    const chosen = Array.from(files).slice(0, room);
    setIsCompressing(true);
    try {
      const prepared: File[] = [];
      for (const f of chosen) { const out = await prepareImage(f); if (out) prepared.push(out); }
      if (prepared.length) {
        setSlipFiles(prev => [...prev, ...prepared]);
        setSlipPreviews(prev => [...prev, ...prepared.map(f => URL.createObjectURL(f))]);
      }
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [slipFiles.length, prepareImage]);

  /** Remove one attached slip by index (revokes its preview URL). */
  const removeSlip = useCallback((idx: number) => {
    setSlipPreviews(prev => { const u = prev[idx]; if (u) URL.revokeObjectURL(u); return prev.filter((_, i) => i !== idx); });
    setSlipFiles(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
  };

  /** Handle paste (Ctrl+V) for slip images */
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imgs: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) { const f = items[i].getAsFile(); if (f) imgs.push(f); }
      }
      if (imgs.length) { e.preventDefault(); addFiles(imgs); }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addFiles]);

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
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (selectedCourses.length === 0) return alert("⚠️ กรุณาเลือกคอร์สเรียนอย่างน้อย 1 คอร์ส");
    if (!fullName.trim()) return alert("⚠️ กรุณากรอกชื่อ-นามสกุล");
    if (!phoneNumber.trim()) return alert("⚠️ กรุณากรอกเบอร์โทรศัพท์");
    if (slipFiles.length === 0) return alert("⚠️ กรุณาแนบสลิปโอนเงินอย่างน้อย 1 รูป");

    setIsSubmitting(true);
    setUploadProgress(0);
    setSubmitStatus('กำลังเตรียมข้อมูล...');

    try {
      // 1. Upload every attached slip (each was already compressed when attached)
      const slipUrls: string[] = [];
      for (let i = 0; i < slipFiles.length; i++) {
        setSubmitStatus(`กำลังอัปโหลดสลิป ${i + 1}/${slipFiles.length}...`);
        setUploadProgress(0);
        const storageRef = ref(storage, `slips/${user.uid}_${Date.now()}_${i}`);
        const url = await uploadWithProgress(storageRef, slipFiles[i], (pct) => setUploadProgress(pct), UPLOAD_TIMEOUT);
        slipUrls.push(url);
      }

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
          slipUrl: slipUrls[0],   // first slip — keeps the existing admin display working
          slipUrls,               // all attached slips
          status: "pending",
          createdAt: new Date()
        });
      });

      await Promise.all(promises);

      // 4. Mark the coupon used ATOMICALLY (transaction re-checks isUsed under
      // lock, so two simultaneous submissions can't both redeem it). Kept in
      // its own try/catch: the enrollment is already created above, so a lost
      // race must not surface as a scary "payment failed" — the slip carries
      // the coupon code and the admin review remains the source of truth.
      if (discount) {
        try {
          const qCoupon = query(collection(db, "coupons"), where("code", "==", discount.code));
          const couponSnap = await getDocs(qCoupon);
          if (!couponSnap.empty) {
            const couponRef = doc(db, "coupons", couponSnap.docs[0].id);
            await runTransaction(db, async (tx) => {
              const fresh = await tx.get(couponRef);
              if (!fresh.exists() || fresh.data().isUsed === true) return; // already redeemed — nothing to do
              tx.update(couponRef, {
                isUsed: true,
                usedAt: new Date(),
                usedForCourseId: selectedCourses[0] || null,
              });
            });
          }
        } catch (couponError) {
          console.error("Coupon redeem failed (enrollment already submitted):", couponError);
        }
      }

      // Snapshot what was sent, then show the confirmation screen.
      const orderedCourses = courses
        .filter(c => selectedCourses.includes(c.id))
        .map(c => ({ title: c.title || "คอร์ส", price: Number(c.price || 0) }));
      slipPreviews.forEach(u => { if (u) URL.revokeObjectURL(u); });
      setDone({ courses: orderedCourses, total: finalPrice, slipCount: slipFiles.length, couponCode: discount?.code || null });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });

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
    .filter(c => !c.salesPage?.previewOnly) // "ปิดการขายชั่วคราว" — not yet released, can't be bought
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

  // --- Wizard navigation (presentation only) ---
  const phoneError = phoneNumber.trim().length > 0 && !PHONE_RE.test(phoneNumber.trim());
  const canProceed: Record<number, boolean> = {
    1: selectedCourses.length > 0,
    2: fullName.trim().length > 0 && PHONE_RE.test(phoneNumber.trim()),
    3: true,
    4: slipFiles.length > 0,
  };
  const scrollTop = () => { if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goNext = () => {
    if (!canProceed[step]) return;
    if (step < 4) { const n = step + 1; setStep(n); setMaxStepReached(m => Math.max(m, n)); scrollTop(); }
  };
  const goBack = () => { if (step > 1) { setStep(step - 1); scrollTop(); } };
  const goToStep = (s: number) => { if (s <= maxStepReached) { setStep(s); scrollTop(); } };
  const submitOrder = () => handleSubmit({ preventDefault() { } } as unknown as React.FormEvent);
  const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => { setCopied(text); setTimeout(() => setCopied(null), 1400); })
        .catch(() => { });
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-slate-500 dark:text-slate-400 dark:bg-slate-950">กำลังตรวจสอบสิทธิ์...</div>;

  // ✅ Confirmation — graph-styled summary of what was just submitted.
  if (done) {
    return (
      <div className="graph-theme min-h-screen flex flex-col">
        <ConfettiBurst />
        <Navbar />
        <main className="gp-bg flex-grow flex items-center justify-center px-[clamp(18px,4vw,40px)] pt-24 pb-24">
          <div className="gp-card w-full max-w-lg p-8 sm:p-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-[var(--accent)] text-[color:var(--accent)] text-4xl mb-5">✓</div>
            <h1 className="text-2xl sm:text-3xl font-medium text-[color:var(--ink)] mb-2">แจ้งโอนเรียบร้อยแล้ว!</h1>
            <p className="text-[color:var(--ink-2)] mb-6 leading-relaxed">ครูได้รับข้อมูลแล้ว กำลังตรวจสอบสลิปและจะเปิดสิทธิ์เข้าเรียนให้โดยเร็ว 🙏</p>

            <div className="rounded-[12px] border border-[var(--line)] bg-[var(--card-2)] p-5 text-left mb-5 space-y-4">
              <div>
                <div className="gp-eyebrow mb-2">คอร์สที่แจ้งโอน ({done.courses.length})</div>
                <div className="space-y-2">
                  {done.courses.map((c, i) => (
                    <div key={i} className="flex justify-between items-center gap-3 text-sm">
                      <span className="text-[color:var(--ink)]">{c.title}</span>
                      <span className="gp-num text-[color:var(--ink-2)] flex-shrink-0">฿{c.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-dashed border-[var(--line-2)] pt-3 space-y-2">
                {done.couponCode && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--ink-2)]">โค้ดส่วนลด</span>
                    <span className="font-semibold text-[color:var(--accent-deep)]">🎟️ {done.couponCode}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-[color:var(--ink)]">ยอดที่แจ้งโอน</span>
                  <span className="gp-num text-2xl font-semibold text-[color:var(--accent-deep)]">฿{done.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[color:var(--ink-2)]">สลิปที่แนบ</span>
                  <span className="font-semibold text-[color:var(--ink)]">🧾 {done.slipCount} รูป</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-[10px] border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-3 mb-6 text-left">
              <span className="leading-none mt-0.5">⏳</span>
              <p className="text-xs text-[color:var(--accent-deep)] leading-relaxed">
                คอร์สจะขึ้นสถานะ <strong>&ldquo;รออนุมัติ&rdquo;</strong> ในหน้าคอร์สของฉัน จนกว่าครูจะตรวจสลิปเสร็จ
              </p>
            </div>

            <Link href="/my-courses" className="gp-btn-primary block text-center text-lg">เข้าสู่คอร์สเรียนของฉัน →</Link>
            <Link href="/" className="inline-block mt-4 text-sm font-semibold text-[color:var(--ink-2)] hover:text-[color:var(--accent)] transition-colors">กลับหน้าหลัก</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="graph-theme min-h-screen flex flex-col">
      <Navbar />
      <main className="gp-bg flex-grow pt-24 pb-28">
        <div className="mx-auto w-full max-w-[1080px] px-[clamp(18px,4vw,40px)]">

          {/* Hero */}
          <div className="mb-1">
            <div className="gp-eyebrow">ลงทะเบียนเรียน</div>
            <h1 className="text-[clamp(28px,4.6vw,44px)] font-medium leading-tight text-[color:var(--ink)] mt-1">สมัครเรียน &amp; แจ้งชำระเงิน</h1>
            <p className="text-[color:var(--ink-2)] mt-2">เลือกคอร์ส กรอกข้อมูล แล้วแนบสลิป — ใช้เวลาไม่กี่นาที</p>
          </div>

          {/* Stepper */}
          <nav className="flex items-center mt-8 mb-2" aria-label="ขั้นตอนการสมัคร">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const isActive = step === n;
              const reached = n <= maxStepReached;
              const isDone = reached && !isActive;
              return (
                <div key={n} className={`flex items-center ${n < 4 ? "flex-1" : ""} min-w-0`}>
                  <button
                    type="button"
                    onClick={() => goToStep(n)}
                    disabled={!reached}
                    aria-current={isActive ? "step" : undefined}
                    className={`flex items-center gap-2.5 ${reached ? "cursor-pointer" : "cursor-default opacity-60"}`}
                  >
                    <span className={`gp-step-node ${isActive ? "gp-step-node--active" : isDone ? "gp-step-node--done" : ""}`}>{isDone ? "✓" : n}</span>
                    <span className={`text-sm font-semibold whitespace-nowrap ${isActive ? "text-[color:var(--ink)]" : "text-[color:var(--ink-2)] hidden sm:inline"}`}>{label}</span>
                  </button>
                  {n < 4 && <span className={`flex-1 h-[2px] mx-2 sm:mx-3 rounded ${n < step ? "bg-[var(--accent)]" : "bg-[var(--line-2)]"}`} />}
                </div>
              );
            })}
          </nav>

          {/* 2-column: form + sticky summary */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[30px] mt-6 items-start">

            {/* ── Form panel ── */}
            <section className="gp-card p-6 sm:p-8">
              <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">

                {/* STEP 1 — Courses */}
                {step === 1 && (
                  <div>
                    <div className="gp-eyebrow mb-1">ขั้นที่ 1</div>
                    <h2 className="text-2xl font-medium text-[color:var(--ink)] mb-1">เลือกคอร์สเรียน</h2>
                    <p className="text-sm text-[color:var(--ink-2)] mb-5">เลือกได้หลายคอร์ส</p>

                    {coursesLoadError && (
                      <div className="mb-4 rounded-[10px] border border-[var(--bad)] bg-[var(--bad)]/5 px-4 py-3 text-sm text-[color:var(--bad)] flex items-start gap-2">
                        <span>⚠️</span><span>{coursesLoadError}</span>
                      </div>
                    )}

                    {/* Category tabs */}
                    <div className="flex gap-4 border-b border-[var(--line)] mb-4 overflow-x-auto custom-scrollbar">
                      {categories.map(cat => (
                        <button key={cat} type="button" onClick={() => setSelectedCategory(cat)} className={`gp-tab ${selectedCategory === cat ? "gp-tab--active" : ""}`}>{cat}</button>
                      ))}
                    </div>

                    {/* Course rows */}
                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredCourses.length > 0 ? filteredCourses.map(course => {
                        const sel = selectedCourses.includes(course.id);
                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => toggleCourse(course.id)}
                            className={`w-full text-left flex items-center gap-3 p-4 rounded-[12px] border transition-all duration-200 ${sel ? "border-[var(--accent)] bg-gradient-to-r from-[var(--accent-soft)] to-transparent" : "border-[var(--line)] bg-[var(--card)] hover:border-[var(--line-2)] hover:translate-x-[3px]"}`}
                          >
                            <span className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold ${sel ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "border-[var(--line-2)] text-transparent"}`}>{sel ? "✓" : ""}</span>
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-[15px] text-[color:var(--ink)]">{course.title}</span>
                                {course.tag && <span className="gp-pill">{course.tag}</span>}
                              </span>
                              {course.meta && <span className="block text-xs text-[color:var(--ink-2)] mt-0.5">{course.meta}</span>}
                            </span>
                            <span className="text-right flex-shrink-0">
                              {course.fullPrice > 0 && <span className="block text-xs text-[color:var(--ink-2)] line-through">฿{Number(course.fullPrice).toLocaleString()}</span>}
                              <span className="gp-num font-semibold text-[color:var(--accent-deep)]">฿{Number(course.price || 0).toLocaleString()}</span>
                            </span>
                          </button>
                        );
                      }) : (
                        <div className="text-center text-[color:var(--ink-2)] py-8 rounded-[12px] border border-dashed border-[var(--line-2)]">ไม่มีคอร์สในหมวดนี้</div>
                      )}
                    </div>

                    {/* mini-summary */}
                    {selectedCourses.length > 0 && (
                      <div className="mt-4 flex items-center justify-between rounded-[10px] bg-[var(--card-2)] border border-[var(--line)] px-4 py-3">
                        <span className="text-sm text-[color:var(--ink-2)]">เลือกแล้ว <strong className="text-[color:var(--ink)]">{selectedCourses.length}</strong> คอร์ส</span>
                        <span className="gp-num font-semibold text-[color:var(--accent-deep)]">฿{totalPrice.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2 — Info */}
                {step === 2 && (
                  <div>
                    <div className="gp-eyebrow mb-1">ขั้นที่ 2</div>
                    <h2 className="text-2xl font-medium text-[color:var(--ink)] mb-1">ข้อมูลผู้เรียน</h2>
                    <p className="text-sm text-[color:var(--ink-2)] mb-5">กรอกข้อมูลสำหรับติดต่อกลับ</p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[13px] font-semibold mb-1.5 text-[color:var(--ink)]">ชื่อ–นามสกุล <span className="text-[color:var(--bad)]">*</span></label>
                        <input type="text" className="gp-input" placeholder="เช่น เด็กชายสมชาย ใจดี" value={fullName} onChange={e => setFullName(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[13px] font-semibold mb-1.5 text-[color:var(--ink)]">เบอร์โทรศัพท์ <span className="text-[color:var(--bad)]">*</span></label>
                          <input type="tel" inputMode="numeric" className={`gp-input ${phoneError ? "gp-input--error" : ""}`} placeholder="0812345678" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                          {phoneError && <p className="text-xs text-[color:var(--bad)] mt-1">กรอกเบอร์ 9–10 หลัก</p>}
                        </div>
                        <div>
                          <label className="block text-[13px] font-semibold mb-1.5 text-[color:var(--ink)]">LINE ID <span className="font-normal text-[color:var(--ink-2)]">(ถ้ามี)</span></label>
                          <input type="text" className="gp-input" placeholder="@yourline" value={lineId} onChange={e => setLineId(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 — Payment */}
                {step === 3 && (
                  <div>
                    <div className="gp-eyebrow mb-1">ขั้นที่ 3</div>
                    <h2 className="text-2xl font-medium text-[color:var(--ink)] mb-1">ชำระเงิน</h2>
                    <p className="text-sm text-[color:var(--ink-2)] mb-5">สแกน QR หรือโอนเข้าบัญชี แล้วไปขั้นถัดไปเพื่อแนบสลิป</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* QR card */}
                      <div className="rounded-[12px] border border-[var(--line)] bg-[var(--card-2)] p-5 flex flex-col items-center">
                        <div className="w-[188px] h-[188px] bg-white rounded-[10px] border border-[var(--line)] p-2 shadow-[var(--gp-shadow-sm)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/qrcode.png" alt="QR พร้อมเพย์" className="w-full h-full object-contain rounded-md" />
                        </div>
                        <div className="gp-eyebrow mt-3">พร้อมเพย์ · PromptPay</div>
                        <div className="text-sm font-semibold text-[color:var(--ink)] mt-1">นายสุเทพ โชติมานิต</div>
                      </div>

                      {/* Account numbers */}
                      <div className="space-y-3">
                        {PAYMENT_INFO.accounts.map(acc => (
                          <div key={acc.value} className="rounded-[12px] border border-[var(--line)] bg-[var(--card)] p-4">
                            <div className="text-xs text-[color:var(--ink-2)] font-semibold mb-1">{acc.label}</div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="gp-num text-lg font-semibold text-[color:var(--accent-deep)] tracking-wide">{acc.value}</span>
                              <button type="button" onClick={() => copyToClipboard(acc.value)} className="gp-chip cursor-pointer hover:brightness-95 transition">
                                {copied === acc.value ? "✓ คัดลอกแล้ว" : "คัดลอก"}
                              </button>
                            </div>
                            {acc.note && <div className="text-xs text-[color:var(--ink-2)] mt-1">{acc.note}</div>}
                          </div>
                        ))}
                        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--card)] p-4">
                          <div className="text-xs text-[color:var(--ink-2)] font-semibold mb-1">ชื่อบัญชี</div>
                          <div className="text-base font-semibold text-[color:var(--ink)]">นายสุเทพ โชติมานิต</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4 — Slip */}
                {step === 4 && (
                  <div>
                    <div className="gp-eyebrow mb-1">ขั้นที่ 4</div>
                    <h2 className="text-2xl font-medium text-[color:var(--ink)] mb-1">แนบหลักฐานการโอน</h2>
                    <p className="text-sm text-[color:var(--ink-2)] mb-5">แนบสลิปได้หลายรูป • สูงสุด {MAX_SLIPS}</p>

                    {slipError && (
                      <div className="mb-4 rounded-[10px] border border-[var(--bad)] bg-[var(--bad)]/5 px-4 py-3 text-sm font-semibold text-[color:var(--bad)] flex items-center gap-2"><span>⚠️</span> {slipError}</div>
                    )}

                    <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" id="slip-upload" />

                    {slipPreviews.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                        {slipPreviews.map((src, i) => (
                          <div key={i} className="relative aspect-square rounded-[10px] overflow-hidden border-2 border-[var(--accent)]/40 bg-[var(--card-2)]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={`สลิป ${i + 1}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeSlip(i)} title="ลบสลิปนี้" className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-[var(--bad)] text-white text-sm flex items-center justify-center shadow hover:brightness-110 transition">✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {slipFiles.length > 0 && (
                      <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--good)] mb-3"><span>✓</span> แนบสลิปแล้ว {slipFiles.length} รูป</div>
                    )}

                    {slipFiles.length < MAX_SLIPS && (
                      <div ref={dropZoneRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                        <label htmlFor="slip-upload" className={`gp-dropzone ${isDragging ? "gp-dropzone--drag" : ""} flex flex-col items-center justify-center gap-2 cursor-pointer ${slipPreviews.length > 0 ? "h-28" : "h-48"}`}>
                          {isCompressing ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-9 h-9 border-[3px] border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-sm font-semibold text-[color:var(--accent-deep)]">กำลังบีบอัดรูป...</span>
                            </div>
                          ) : (
                            <>
                              <div className="w-11 h-11 rounded-full bg-[var(--accent-soft)] text-[color:var(--accent)] flex items-center justify-center text-xl font-bold">↑</div>
                              <span className="font-semibold text-[color:var(--ink)]">{slipPreviews.length > 0 ? "+ เพิ่มสลิปอีก" : "คลิกเพื่ออัปโหลดสลิป"}</span>
                              <span className="text-xs text-[color:var(--ink-2)]">ถ่ายรูป / ลากวาง / Ctrl+V</span>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Nav buttons */}
              <div className="flex items-center gap-3 mt-7 pt-6 border-t border-[var(--line)]">
                {step > 1 && (
                  <button type="button" onClick={goBack} className="gp-btn-ghost">← ย้อนกลับ</button>
                )}
                {step < 4 ? (
                  <button type="button" onClick={goNext} disabled={!canProceed[step]} className="gp-btn-primary ml-auto">ถัดไป →</button>
                ) : (
                  <button type="button" onClick={submitOrder} disabled={isSubmitting || isCompressing || !canProceed[4]} className="gp-btn-primary ml-auto relative overflow-hidden">
                    {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                      <span className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${uploadProgress}%` }} />
                    )}
                    <span className="relative">{isSubmitting ? `${submitStatus}${uploadProgress > 0 && uploadProgress < 100 ? ` (${uploadProgress}%)` : ''}` : "ยืนยันการแจ้งโอน →"}</span>
                  </button>
                )}
              </div>
            </section>

            {/* ── Sticky order summary ── */}
            <aside className="lg:sticky lg:top-6">
              {/* Pastel-mint order summary (light-only graph theme → scoped var overrides;
                  --card is left white so the coupon input still stands out on the mint card) */}
              <div
                className="gp-card p-5"
                style={{
                  background: "#DEF5EC",
                  ["--line" as string]: "#BFE8D6",
                  ["--line-2" as string]: "#ADE0CA",
                  ["--accent" as string]: "#0D9488",
                  ["--accent-deep" as string]: "#0F766E",
                  ["--accent-soft" as string]: "#CDEFE2",
                }}
              >
                <h3 className="font-medium text-lg text-[color:var(--ink)] mb-3">สรุปคำสั่งซื้อ</h3>

                {selectedCourses.length === 0 ? (
                  <p className="text-sm text-[color:var(--ink-2)] py-4 text-center">ยังไม่ได้เลือกคอร์ส</p>
                ) : (
                  <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {courses.filter(c => selectedCourses.includes(c.id)).map(c => (
                      <div key={c.id} className="flex justify-between items-start gap-2 text-sm">
                        <span className="text-[color:var(--ink)] flex-1 min-w-0">{c.title}</span>
                        <span className="gp-num text-[color:var(--ink-2)] flex-shrink-0">฿{Number(c.price || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Coupon + totals */}
                <div className="border-t border-[var(--line)] pt-4">
                  {discount ? (
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="gp-chip">🎟️ {discount.code} · ลด ฿{discount.amount.toLocaleString()}</span>
                      <button type="button" onClick={() => { setDiscount(null); setCouponCode(""); }} className="text-xs font-semibold text-[color:var(--bad)] hover:underline">ลบ</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mb-3">
                      <input type="text" className="gp-input flex-1 !py-2.5 text-sm" placeholder="กรอกโค้ดส่วนลด (ถ้ามี)" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} />
                      <button type="button" onClick={handleApplyCoupon} disabled={!couponCode.trim()} className="gp-btn-primary !px-4 !py-2.5 text-sm">ใช้</button>
                    </div>
                  )}

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-[color:var(--ink-2)]">ราคารวม</span><span className="gp-num text-[color:var(--ink)]">฿{totalPrice.toLocaleString()}</span></div>
                    {discount && <div className="flex justify-between"><span className="text-[color:var(--ink-2)]">ส่วนลด</span><span className="gp-num text-[color:var(--good)]">−฿{discount.amount.toLocaleString()}</span></div>}
                    <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-dashed border-[var(--line-2)]">
                      <span className="font-semibold text-[color:var(--ink)]">ยอดสุทธิ</span>
                      <span className="gp-num text-2xl font-semibold text-[color:var(--accent-deep)]">฿{finalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="text-center mt-8">
            <Link href="/" className="text-sm font-semibold text-[color:var(--ink-2)] hover:text-[color:var(--accent)] transition-colors">ยกเลิกและกลับหน้าหลัก</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
