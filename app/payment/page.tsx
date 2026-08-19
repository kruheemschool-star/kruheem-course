"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc, where, doc, limit, runTransaction, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrowserWarning from "@/components/BrowserWarning";
import { useUserAuth } from "@/context/AuthContext";
import ConfettiBurst from "@/components/gamification/ConfettiBurst";
import { PAYMENT_INFO } from "@/lib/constants";
import { prepareSlipImage, slipPrepErrorText, slipContentType } from "@/lib/slipFile";
import { Library, Backpack, Compass, FunctionSquare, GraduationCap, ChevronRight, Check, User, QrCode, ImageUp, type LucideIcon } from "lucide-react";
import { withTimeout, isNetTimeout, NET_TIMEOUT_MESSAGE } from "@/lib/netGuard";

const UPLOAD_TIMEOUT = 120_000; // 120 seconds
const MAX_SLIPS = 5; // attach up to 5 transfer slips

const PHONE_RE = /^[0-9]{9,10}$/; // step-2 gate: 9–10 digit phone
const STEP_LABELS = ["เลือกคอร์ส", "ข้อมูลผู้เรียน", "ชำระเงิน", "แนบสลิป"];

/** สีเขียว "ยืนยัน" ชุดเดียวกับปุ่มคอร์สของฉัน (design-spec §8) */
const GREEN = { deep: "#1F7A55", soft: "#E7F4EC", line: "#C9E4D4", panel: "#EAF5EF" };

/** ป้ายประจำระดับชั้นสำหรับการ์ดเลือกหมวด (design-spec §2)
 *  หมวดมาจาก Firestore จึงจับคู่ด้วยคำสำคัญ ไม่ใช่ชื่อเป๊ะ — หมวดใหม่ที่ยังไม่รู้จัก
 *  ตกมาที่ชุดสีน้ำเงินกลางเสมอ การ์ดจึงไม่มีวันหน้าตาพัง */
type LevelStyle = { icon: LucideIcon; bg: string; line: string; ink: string; main: string };
const LEVEL_FALLBACK: LevelStyle = { icon: GraduationCap, bg: "#E3EEF8", line: "#C2D7EF", ink: "#1F4E88", main: "#2F6DB5" };
const levelStyle = (cat: string): LevelStyle => {
  const c = cat || "";
  if (c.includes("คลังข้อสอบ")) return { icon: Library, bg: "#DCF1EE", line: "#0D9488", ink: "#0B5F58", main: "#0D9488" };
  if (c.includes("ประถม") || c.includes("ป.4") || c.includes("ป.6")) return { icon: Backpack, bg: "#FBEBD8", line: "#F0DCB4", ink: "#8F5716", main: "#C9762A" };
  if (c.includes("ม.ต้น") || c.includes("ม.1-3")) return { icon: Compass, bg: "#DCE9F8", line: "#C2D7EF", ink: "#1F4E88", main: "#2F6DB5" };
  if (c.includes("ม.ปลาย") || c.includes("ม.4-6") || c.includes("เพิ่มเติม")) return { icon: FunctionSquare, bg: "#E6E1F7", line: "#D3CBEF", ink: "#4B3A8C", main: "#6B54B8" };
  return LEVEL_FALLBACK;
};

/** ขั้นตอนที่เหลือหลังเลือกคอร์ส — การ์ด "หลังจากนี้" (design-spec §6) */
const NEXT_STEPS: { icon: LucideIcon; text: string }[] = [
  { icon: User, text: "กรอกชื่อและเบอร์ติดต่อ" },
  { icon: QrCode, text: "โอนผ่าน QR พร้อมเพย์" },
  { icon: ImageUp, text: "แนบสลิป แล้วรอครูอนุมัติ" },
];

/** Upload with progress tracking and timeout. contentType is passed explicitly
 * because storage.rules requires image/* — files picked in some Android/in-app
 * browsers have an empty type and would otherwise upload as octet-stream. */
function uploadWithProgress(
  storageRef: ReturnType<typeof ref>,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType });
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
  const { user, userProfile, loading: authLoading } = useUserAuth();
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
  // Submit-failure message shown INLINE (never alert(): FB/LINE in-app
  // browsers silently drop alert, so a failed submit looked like nothing).
  const [submitError, setSubmitError] = useState<string>('');
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


  // Prefill learner name/phone from the signup profile (they typed it at
  // /register) so a stalled payment doesn't start from blank fields again.
  // Only fills fields the user hasn't typed into.
  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.displayName) setFullName(prev => prev || userProfile.displayName || "");
    if (userProfile.phoneNumber) setPhoneNumber(prev => prev || userProfile.phoneNumber || "");
  }, [userProfile]);

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



  /** Validate + compress one image via the shared slip helper (tolerates
   * empty file.type from Android/in-app pickers, converts HEIC, enforces the
   * storage.rules 5MB cap). Returns the file, or null if rejected. */
  const prepareImage = useCallback(async (file: File): Promise<File | null> => {
    const prep = await prepareSlipImage(file);
    if (!prep.ok) { setSlipError(slipPrepErrorText(prep.reason)); return null; }
    return prep.file;
  }, []);

  /** Add one or more images: validate + compress each, then append (up to MAX_SLIPS). */
  const addFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setSlipError('');
    setSubmitError('');
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

    // Inline errors, not alert(): FB/LINE in-app browsers drop alert silently.
    if (selectedCourses.length === 0) return setSubmitError("กรุณาเลือกคอร์สเรียนอย่างน้อย 1 คอร์ส");
    if (!fullName.trim()) return setSubmitError("กรุณากรอกชื่อ-นามสกุล");
    if (!phoneNumber.trim()) return setSubmitError("กรุณากรอกเบอร์โทรศัพท์");
    if (slipFiles.length === 0) return setSubmitError("กรุณาแนบสลิปโอนเงินอย่างน้อย 1 รูป");

    setIsSubmitting(true);
    setSubmitError('');
    setUploadProgress(0);
    setSubmitStatus('กำลังเตรียมข้อมูล...');

    try {
      // 1. Upload every attached slip (each was already compressed when attached)
      const slipUrls: string[] = [];
      for (let i = 0; i < slipFiles.length; i++) {
        setSubmitStatus(`กำลังอัปโหลดสลิป ${i + 1}/${slipFiles.length}...`);
        setUploadProgress(0);
        const storageRef = ref(storage, `slips/${user.uid}_${Date.now()}_${i}`);
        const url = await uploadWithProgress(storageRef, slipFiles[i], slipContentType(slipFiles[i]), (pct) => setUploadProgress(pct), UPLOAD_TIMEOUT);
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

      // เพดานเวลา 45 วิ: ถ้าช่องสัญญาณ Firestore ตายเงียบ (แท็บถูกพักไว้นาน)
      // addDoc จะไม่ resolve และไม่ reject — ปุ่ม "ยืนยัน" จะค้างหมุนตลอดกาล
      await withTimeout(Promise.all(promises), 45000, "บันทึกใบแจ้งโอน");

      // เก็บชื่อ/เบอร์จากใบแจ้งโอนเข้าโปรไฟล์ (เฉพาะช่องที่ยังว่าง ไม่ทับของเดิม)
      // — หน้าสมัครสมาชิกไม่ถามชื่อ/เบอร์แล้ว จุดนี้คือที่แรกที่หลังบ้าน
      // (/admin/registrations) จะได้ข้อมูลติดต่อของสมาชิกใหม่
      try {
        const profilePatch: Record<string, string> = {};
        if (!userProfile?.displayName && fullName.trim()) profilePatch.displayName = fullName.trim();
        if (!userProfile?.phoneNumber && phoneNumber.trim()) profilePatch.phoneNumber = phoneNumber.trim();
        if (Object.keys(profilePatch).length > 0) {
          await setDoc(doc(db, "users", user.uid), profilePatch, { merge: true });
        }
      } catch (profileError) {
        console.error("Profile writeback failed (enrollment already submitted):", profileError);
      }

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
        setSubmitError("การอัปโหลดสลิปใช้เวลานานเกินไป — ลองเชื่อมต่อ WiFi แล้วกดยืนยันอีกครั้ง หรือถ่ายรูปสลิปด้วยกล้องแทนการแคปหน้าจอ");
      } else if (error?.code === 'storage/canceled') {
        setSubmitError("การอัปโหลดถูกยกเลิก กรุณากดยืนยันอีกครั้ง");
      } else if (error?.code === 'storage/unauthorized') {
        setSubmitError("ไม่มีสิทธิ์อัปโหลดไฟล์ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ แล้วลองอีกครั้ง");
      } else if (error?.code === 'storage/retry-limit-exceeded' || error?.code === 'storage/server-file-wrong-size') {
        setSubmitError("อัปโหลดไม่สำเร็จ — ลองปิดแอปแล้วเปิดใหม่ หรือเปิดหน้านี้ใน Chrome/Safari แล้วลองอีกครั้ง");
      } else if (isNetTimeout(error)) {
        setSubmitError(NET_TIMEOUT_MESSAGE);
      } else {
        setSubmitError(`เกิดข้อผิดพลาด กรุณาลองใหม่ (${error?.code || error?.message || 'unknown error'})`);
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

          {/* In-app browser (LINE/Messenger/FB/IG) escape hatch — the file
              picker + uploads are unreliable inside those webviews, which is
              the top reason "แนบสลิปไม่ได้". Renders nothing in a normal browser. */}
          <BrowserWarning />

          {/* Hero */}
          <div className="mb-1 flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="gp-eyebrow">ลงทะเบียนเรียน</div>
              <h1 className="text-[clamp(28px,4.6vw,44px)] font-medium leading-tight text-[color:var(--ink)] mt-1">สมัครเรียน &amp; แจ้งชำระเงิน</h1>
              <p className="text-[color:var(--ink-2)] mt-2">เลือกคอร์ส กรอกข้อมูล แล้วแนบสลิป — ใช้เวลาไม่กี่นาที</p>
            </div>
            <span
              className="flex-shrink-0 text-[12.5px] font-semibold px-3.5 py-2 rounded-full mt-1"
              style={{ background: "#FFF6E5", border: "1px solid #F0DCB4", color: "#94661C" }}
            >
              แนบสลิปแล้วรอครูตรวจสอบ
            </span>
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
                    className={`flex items-center gap-2.5 min-w-0 ${reached ? "cursor-pointer" : "cursor-default opacity-60"}`}
                  >
                    <span className={`gp-step-node ${isActive ? "gp-step-node--active" : isDone ? "gp-step-node--done" : ""}`}>
                      {isDone ? <Check size={17} strokeWidth={3} /> : n}
                    </span>
                    {/* จอแคบซ่อนป้ายทุกขั้น — ที่ว่างไม่พอ ป้ายจะไปทับวงกลมขั้นถัดไป
                        (หัวข้อใต้ตัวนับบอกอยู่แล้วว่ากำลังทำขั้นอะไร) */}
                    <span className={`text-sm font-semibold truncate min-w-0 hidden sm:inline ${isActive ? "text-[color:var(--ink)]" : "text-[color:var(--ink-2)]"}`}>{label}</span>
                  </button>
                  {n < 4 && <span className={`flex-1 h-[3px] mx-2 sm:mx-3 rounded ${n < step ? "bg-[var(--accent)]" : "bg-[var(--line-2)]"}`} />}
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
                    {coursesLoadError && (
                      <div className="mb-4 rounded-[10px] border border-[var(--bad)] bg-[var(--bad)]/5 px-4 py-3 text-sm text-[color:var(--bad)] flex items-start gap-2">
                        <span>⚠️</span><span>{coursesLoadError}</span>
                      </div>
                    )}

                    {/* ① เลือกระดับชั้น — การ์ดแทนแท็บ: เห็นครบทุกระดับพร้อมกัน ไม่ต้องเลื่อนแนวนอน */}
                    <div className="flex items-start gap-3 mb-4">
                      <span className="gp-num w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] text-white flex-shrink-0 mt-0.5" style={{ background: "var(--accent)" }}>1</span>
                      <div className="min-w-0">
                        <h2 className="text-[19px] font-medium text-[color:var(--ink)] leading-snug">เลือกระดับชั้นก่อน</h2>
                        <p className="text-[13px] text-[color:var(--ink-2)] mt-0.5">กดการ์ดด้านล่างเพื่อดูคอร์สในระดับนั้น</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
                      {categories.map(cat => {
                        const st = levelStyle(cat);
                        const Icon = st.icon;
                        const active = selectedCategory === cat;
                        const count = courses.filter(c => !c.salesPage?.previewOnly && (c.category || "อื่นๆ") === cat).length;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            aria-pressed={active}
                            className="text-left flex items-center gap-3 rounded-[16px] transition-shadow"
                            style={{
                              minHeight: "74px",
                              padding: "14px 16px",
                              background: st.bg,
                              border: `2px solid ${active ? st.main : st.line}`,
                              boxShadow: active ? `0 10px 22px -16px ${st.main}` : "none",
                            }}
                            onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = st.main; }}
                            onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = st.line; }}
                          >
                            <span
                              className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
                              style={{
                                background: active ? st.main : "#FFFFFF",
                                color: active ? "#FFFFFF" : st.main,
                                border: active ? "none" : `1px solid ${st.line}`,
                              }}
                            >
                              <Icon size={22} strokeWidth={1.9} />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="gp-kanit block text-[16px] font-semibold leading-snug break-words" style={{ color: st.ink }}>{cat}</span>
                              <span className="block text-[12.5px] mt-0.5" style={{ color: st.ink, opacity: 0.72 }}>
                                {active ? "กำลังดูหมวดนี้อยู่" : `${count} คอร์ส`}
                              </span>
                            </span>
                            {active ? (
                              <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: st.main, color: "#FFFFFF" }}>
                                <Check size={14} strokeWidth={3} />
                              </span>
                            ) : (
                              <ChevronRight size={20} className="flex-shrink-0" style={{ color: st.main }} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* ② เลือกคอร์สในระดับที่กดไว้ */}
                    <div className="flex items-start gap-3 mb-4">
                      <span className="gp-num w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] text-white flex-shrink-0 mt-0.5" style={{ background: "var(--accent)" }}>2</span>
                      <div className="min-w-0">
                        <h2 className="text-[19px] font-medium text-[color:var(--ink)] leading-snug break-words">
                          เลือกคอร์สในระดับ “{selectedCategory || "—"}”
                        </h2>
                        <p className="text-[13px] text-[color:var(--ink-2)] mt-0.5">เลือกได้หลายคอร์ส</p>
                      </div>
                    </div>

                    {/* Course rows */}
                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredCourses.length > 0 ? filteredCourses.map(course => {
                        const sel = selectedCourses.includes(course.id);
                        const st = levelStyle(selectedCategory);
                        const price = Number(course.price) || 0;
                        const full = Number(course.fullPrice) || 0;
                        const off = full > price && price > 0 ? Math.round((1 - price / full) * 100) : 0;
                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => toggleCourse(course.id)}
                            aria-pressed={sel}
                            className="w-full text-left flex items-center gap-3 rounded-[14px] transition-colors"
                            style={{
                              minHeight: "74px",
                              padding: "14px 16px",
                              background: sel ? "#F2FAF8" : "var(--card)",
                              border: `2px solid ${sel ? "#0D9488" : "var(--line)"}`,
                              boxShadow: sel ? "inset 4px 0 0 #0D9488" : "none",
                            }}
                            onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = st.main; }}
                            onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = "var(--line)"; }}
                          >
                            <span
                              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                              style={{
                                background: sel ? "#0D9488" : "transparent",
                                border: sel ? "2px solid #0D9488" : "2px solid var(--line-2)",
                                color: "#FFFFFF",
                              }}
                            >
                              {sel && <Check size={14} strokeWidth={3} />}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-[15px] text-[color:var(--ink)]">{course.title}</span>
                                {course.tag && <span className="gp-pill">{course.tag}</span>}
                              </span>
                              {course.meta && <span className="block text-xs text-[color:var(--ink-2)] mt-0.5">{course.meta}</span>}
                            </span>
                            <span className="text-right flex-shrink-0">
                              {full > 0 && <span className="block text-xs text-[color:var(--ink-2)] line-through">฿{full.toLocaleString()}</span>}
                              <span className="gp-num block text-[20px] font-semibold leading-tight text-[color:var(--accent-deep)]">฿{price.toLocaleString()}</span>
                              {off > 0 && (
                                <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FFE9E4", color: "#B4533F" }}>
                                  ลด {off}%
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      }) : (
                        <div className="text-center text-[color:var(--ink-2)] py-8 rounded-[14px] border border-dashed border-[var(--line-2)]">ไม่มีคอร์สในหมวดนี้</div>
                      )}
                    </div>

                    {/* แถบสรุป + ปุ่มถัดไป (ปุ่มเดียวของขั้นนี้ — แถบปุ่มร่วมด้านล่างซ่อนในขั้นที่ 1) */}
                    <div
                      className="mt-5 flex items-center justify-between gap-3 flex-wrap rounded-[14px] px-4 py-3.5"
                      style={{ background: GREEN.soft, border: `1px solid ${GREEN.line}` }}
                    >
                      <span className="text-sm text-[color:var(--ink-2)] whitespace-nowrap">
                        เลือกแล้ว <strong className="gp-num text-[color:var(--ink)]">{selectedCourses.length}</strong> คอร์ส · รวม{" "}
                        <strong className="gp-num text-[15px]" style={{ color: GREEN.deep }}>฿{totalPrice.toLocaleString()}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={goNext}
                        disabled={!canProceed[1]}
                        className="gp-btn-primary w-full sm:w-auto"
                        style={{ background: GREEN.deep }}
                      >
                        ถัดไป →
                      </button>
                    </div>
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

              {/* Submit failure — inline so it survives in-app browsers that block alert() */}
              {submitError && (
                <div className="mt-6 rounded-[10px] border border-[var(--bad)] bg-[var(--bad)]/5 px-4 py-3 text-sm font-semibold text-[color:var(--bad)] flex items-start gap-2">
                  <span>⚠️</span><span>{submitError}</span>
                </div>
              )}

              {/* Nav buttons — ขั้นที่ 1 มีปุ่มถัดไปอยู่ในแถบสรุปแล้ว และยังไม่มีที่ให้ย้อนกลับ */}
              {step > 1 && (
              <div className="flex items-center gap-3 mt-7 pt-6 border-t border-[var(--line)]">
                <button type="button" onClick={goBack} className="gp-btn-ghost">← ย้อนกลับ</button>
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
              )}
            </section>

            {/* ── Sticky order summary ── */}
            <aside className="lg:sticky lg:top-6 space-y-4">
              {/* Pastel-mint order summary (light-only graph theme → scoped var overrides;
                  --card is left white so the coupon input still stands out on the mint card) */}
              <div
                className="gp-card p-5"
                style={{
                  background: GREEN.panel,
                  ["--line" as string]: GREEN.line,
                  ["--line-2" as string]: "#ADE0CA",
                  ["--accent" as string]: GREEN.deep,
                  ["--accent-deep" as string]: GREEN.deep,
                  ["--accent-soft" as string]: GREEN.soft,
                }}
              >
                <h3 className="font-medium text-lg text-[color:var(--ink)] mb-3">สรุปคำสั่งซื้อ</h3>

                {selectedCourses.length === 0 ? (
                  <p className="text-sm text-[color:var(--ink-2)] py-4 text-center">ยังไม่ได้เลือกคอร์ส</p>
                ) : (
                  <div className="space-y-2 mb-4 max-h-[230px] overflow-y-auto pr-1 custom-scrollbar">
                    {courses.filter(c => selectedCourses.includes(c.id)).map(c => {
                      const st = levelStyle(c.category || "");
                      const Icon = st.icon;
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5"
                          style={{ background: "#FFFFFF", border: `1px solid ${GREEN.line}` }}
                        >
                          <span
                            className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
                            style={{ background: st.bg, color: st.main }}
                          >
                            <Icon size={16} strokeWidth={2} />
                          </span>
                          <span className="flex-1 min-w-0 text-[13px] leading-snug text-[color:var(--ink)]">{c.title}</span>
                          <span className="gp-num text-[13px] flex-shrink-0 text-[color:var(--ink-2)]">฿{Number(c.price || 0).toLocaleString()}</span>
                        </div>
                      );
                    })}
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
                    {discount && <div className="flex justify-between"><span className="text-[color:var(--ink-2)]">ส่วนลด</span><span className="gp-num" style={{ color: "#B4533F" }}>−฿{discount.amount.toLocaleString()}</span></div>}
                    <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-dashed border-[var(--line-2)]">
                      <span className="font-semibold text-[color:var(--ink)]">ยอดสุทธิ</span>
                      <span className="gp-num text-[30px] font-semibold leading-none" style={{ color: GREEN.deep }}>฿{finalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* หลังจากนี้ — บอกล่วงหน้าว่าเหลืออีก 3 ขั้น จะได้ไม่กังวลว่าต้องทำอะไรต่อ */}
              <div className="gp-card p-5">
                <div className="gp-eyebrow mb-3">หลังจากนี้</div>
                <div className="space-y-3">
                  {NEXT_STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const stepNo = i + 2;
                    const passed = step > stepNo;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span
                          className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
                          style={{
                            background: passed ? GREEN.soft : "var(--accent-soft)",
                            color: passed ? GREEN.deep : "var(--accent)",
                          }}
                        >
                          {passed ? <Check size={17} strokeWidth={3} /> : <Icon size={17} strokeWidth={2} />}
                        </span>
                        <span className="flex-1 min-w-0 text-[13.5px] text-[color:var(--ink-2)] leading-snug">{s.text}</span>
                        <span className="gp-num text-[12px] flex-shrink-0 text-[color:var(--ink-2)] opacity-70">ขั้น {stepNo}</span>
                      </div>
                    );
                  })}
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
