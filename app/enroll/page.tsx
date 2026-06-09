"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { collection, getDocs, query, orderBy, addDoc, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useUserAuth } from "@/context/AuthContext";
import BrowserWarning from "@/components/BrowserWarning";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

/*
  PUBLIC enrollment + payment form (login-free, ONE simple pattern).
  ── NOT wired into any CTA — reachable only by visiting /enroll directly. ──
  Parent fills: account (email + their own password) + info + course(s) + slip(s) →
  creates their account (email/password only, no Google), uploads the slip(s), and
  files a PENDING enrollment for the admin to verify + approve later.
*/

const UPLOAD_TIMEOUT = 120_000;
const COMPRESSION_TIMEOUT = 10_000;
const COMPRESSION_THRESHOLD = 2 * 1024 * 1024;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_SLIPS = 5;

async function compressWithTimeout(file: File, options: Record<string, unknown>, timeoutMs: number): Promise<File | Blob> {
  const p = import("browser-image-compression").then((m) => m.default(file, options as never));
  const t = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("COMPRESSION_TIMEOUT")), timeoutMs));
  return Promise.race([p, t]);
}

function uploadWithProgress(storageRef: ReturnType<typeof ref>, file: File, onProgress: (pct: number) => void, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    const timer = setTimeout(() => { task.cancel(); reject(new Error("UPLOAD_TIMEOUT")); }, timeoutMs);
    task.on("state_changed",
      (s) => onProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      (e) => { clearTimeout(timer); reject(e); },
      async () => { clearTimeout(timer); try { resolve(await getDownloadURL(task.snapshot.ref)); } catch (e) { reject(e); } }
    );
  });
}

type CourseDoc = { id: string; title: string; price?: number; fullPrice?: number; allowedExamLevel?: string | null; category?: string };

export default function EnrollPage() {
  const { user, logOut } = useUserAuth();

  const [courses, setCourses] = useState<CourseDoc[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");

  // Multiple slips
  const [slipFiles, setSlipFiles] = useState<File[]>([]);
  const [slipPreviews, setSlipPreviews] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [slipError, setSlipError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | { email: string; password: string }>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "courses"), orderBy("createdAt", "desc")));
        setCourses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CourseDoc, "id">) })));
      } catch (e) { console.warn("load courses failed", e); }
    })();
  }, []);

  const totalPrice = courses.filter((c) => selectedCourses.includes(c.id)).reduce((s, c) => s + Number(c.price || 0), 0);
  const toggleCourse = (id: string) => setSelectedCourses((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Compress one image; returns the (possibly compressed) file or null on reject.
  const prepareImage = async (file: File): Promise<File | null> => {
    if (!file.type.startsWith("image/")) { setSlipError("กรุณาเลือกไฟล์รูปภาพ (JPG, PNG)"); return null; }
    if (file.size > MAX_FILE_SIZE) { setSlipError(`มีไฟล์ใหญ่เกิน 10MB (${(file.size / 1048576).toFixed(1)}MB)`); return null; }
    if (file.size <= COMPRESSION_THRESHOLD) return file;
    const opts = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: 0.85 };
    try { return await compressWithTimeout(file, opts, COMPRESSION_TIMEOUT) as File; }
    catch { try { return await compressWithTimeout(file, { ...opts, useWebWorker: false }, COMPRESSION_TIMEOUT) as File; } catch { return file; } }
  };

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSlipError("");
    const room = MAX_SLIPS - slipFiles.length;
    if (room <= 0) { setSlipError(`แนบสลิปได้สูงสุด ${MAX_SLIPS} รูป`); return; }
    const chosen = Array.from(files).slice(0, room);
    setIsCompressing(true);
    try {
      const prepared: File[] = [];
      for (const f of chosen) { const out = await prepareImage(f); if (out) prepared.push(out); }
      if (prepared.length) {
        setSlipFiles((p) => [...p, ...prepared]);
        setSlipPreviews((p) => [...p, ...prepared.map((f) => URL.createObjectURL(f))]);
      }
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [slipFiles.length]);

  const removeSlip = (idx: number) => {
    setSlipPreviews((p) => { const u = p[idx]; if (u) URL.revokeObjectURL(u); return p.filter((_, i) => i !== idx); });
    setSlipFiles((p) => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError("กรุณากรอกอีเมลให้ถูกต้อง");
    if (password.length < 6) return setError("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
    if (!fullName.trim()) return setError("กรุณากรอกชื่อ-นามสกุล");
    if (!phone.trim()) return setError("กรุณากรอกเบอร์โทรศัพท์");
    if (selectedCourses.length === 0) return setError("กรุณาเลือกคอร์สอย่างน้อย 1 คอร์ส");
    if (slipFiles.length === 0) return setError("กรุณาแนบสลิปการโอนเงินอย่างน้อย 1 รูป");

    setIsSubmitting(true);
    try {
      // 1) Create the account (email/password only — no Google). They become logged in.
      setSubmitStatus("กำลังสร้างบัญชี...");
      let uid: string;
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        uid = cred.user.uid;
        await cred.user.getIdToken(); // ensure the auth token is attached before the Firestore writes below
        try { await updateProfile(cred.user, { displayName: fullName.trim() }); } catch { /* ignore */ }
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === "auth/email-already-in-use") { setError("อีเมลนี้มีบัญชีอยู่แล้ว — ถ้าเป็นคุณ กรุณาเข้าสู่ระบบก่อน หรือใช้อีเมลอื่น"); return; }
        if (code === "auth/weak-password") { setError("รหัสผ่านอ่อนเกินไป (อย่างน้อย 6 ตัวอักษร)"); return; }
        setError("สร้างบัญชีไม่สำเร็จ ลองใหม่อีกครั้ง"); return;
      }

      // 2) Save the student's profile (name).
      try { await setDoc(doc(db, "users", uid), { displayName: fullName.trim(), email: cleanEmail, authProvider: "email" }, { merge: true }); } catch (e) { console.warn(e); }

      // 3) Upload all slips.
      const slipUrls: string[] = [];
      for (let i = 0; i < slipFiles.length; i++) {
        setSubmitStatus(`กำลังอัปโหลดสลิป ${i + 1}/${slipFiles.length}...`);
        setUploadProgress(0);
        const storageRef = ref(storage, `slips/${uid}_${Date.now()}_${i}`);
        slipUrls.push(await uploadWithProgress(storageRef, slipFiles[i], setUploadProgress, UPLOAD_TIMEOUT));
      }

      // 4) File PENDING enrollments — admin verifies the slip(s) + approves later.
      setSubmitStatus("กำลังบันทึก...");
      for (const courseId of selectedCourses) {
        const c = courses.find((x) => x.id === courseId);
        const price = Number(c?.price) || 0;
        await addDoc(collection(db, "enrollments"), {
          userId: uid,
          userName: fullName.trim(),
          userTel: phone.trim(),
          lineId: lineId.trim(),
          userEmail: cleanEmail,
          courseId,
          courseTitle: c?.title || "Unknown Course",
          allowedExamLevel: c?.allowedExamLevel ?? null,
          price,
          couponCode: null,
          discountAmount: 0,
          finalPrice: price,
          slipUrl: slipUrls[0],   // first slip — keeps existing admin display working
          slipUrls,               // all slips
          status: "pending",
          createdAt: new Date(),
        });
      }

      slipPreviews.forEach((u) => { if (u) URL.revokeObjectURL(u); });
      setDone({ email: cleanEmail, password });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const code = (err as { code?: string; message?: string });
      setError(code?.message === "UPLOAD_TIMEOUT" ? "อัปโหลดสลิปนานเกินไป ลองเชื่อม WiFi แล้วลองใหม่" : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false); setSubmitStatus(""); setUploadProgress(0);
    }
  };

  const inputCls = "w-full p-3.5 bg-white/70 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-400/50 transition font-medium text-slate-700 dark:text-slate-100 placeholder:text-slate-400";

  const orbWrap = (children: React.ReactNode) => (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans flex flex-col">
      <Navbar />
      <div className="relative flex-grow flex justify-center items-center p-4 overflow-hidden pt-24 pb-24">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-200 dark:bg-teal-900 rounded-full filter blur-[100px] opacity-50 dark:opacity-20" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-lime-100 dark:bg-lime-900 rounded-full filter blur-[100px] opacity-60 dark:opacity-20" />
        {children}
      </div>
      <Footer />
    </div>
  );

  // ✅ Success — show login + go to my courses (course will show "รออนุมัติ" until admin approves)
  if (done) {
    return orbWrap(
      <div className="relative z-10 bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/60 dark:border-slate-700/50 shadow-2xl rounded-[2.5rem] p-8 sm:p-10 w-full max-w-lg text-center text-slate-700 dark:text-slate-200">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-5xl mb-5">🎉</div>
        <h1 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-3">ส่งข้อมูลเรียบร้อยแล้ว!</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">ครูกำลังตรวจสอบสลิปและจะเปิดสิทธิ์เข้าเรียนให้โดยเร็ว 🙏<br />เก็บข้อมูลล็อกอินด้านล่างไว้นะคะ</p>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 text-left space-y-2 mb-6">
          <div className="flex items-center gap-2"><Mail size={16} className="text-teal-500" /> <span className="font-bold">อีเมล:</span> {done.email}</div>
          <div className="flex items-center gap-2"><Lock size={16} className="text-teal-500" /> <span className="font-bold">รหัสผ่าน:</span> {done.password}</div>
        </div>
        <Link href="/my-courses" className="block w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-teal-500/30 transition">เข้าสู่คอร์สเรียนของฉัน</Link>
        <p className="text-xs text-slate-400 mt-3">คอร์สจะขึ้น “รออนุมัติ” จนกว่าครูจะตรวจสลิปเสร็จ</p>
      </div>
    );
  }

  // This form is for NEW sign-ups. A logged-in user must log out first — creating a
  // new account would otherwise silently switch them out of their current session
  // (e.g. an admin testing this would get logged out of the admin area).
  if (user) {
    return orbWrap(
      <div className="relative z-10 bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/60 dark:border-slate-700/50 shadow-2xl rounded-[2.5rem] p-8 sm:p-10 w-full max-w-lg text-center text-slate-700 dark:text-slate-200">
        <div className="text-5xl mb-4">👋</div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">คุณล็อกอินอยู่แล้ว</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-7">ฟอร์มนี้สำหรับ “สมัครบัญชีใหม่” เท่านั้น<br />ถ้าจะสมัครบัญชีใหม่ กรุณาออกจากระบบก่อน (กันไม่ให้สลับออกจากบัญชีปัจจุบัน)</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => logOut()} className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition">ออกจากระบบ แล้วสมัครใหม่</button>
          <Link href="/payment" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-teal-600 transition">เพิ่มคอร์สให้บัญชีนี้ → หน้าจ่ายเงิน</Link>
        </div>
      </div>
    );
  }

  return orbWrap(
    <div className="relative z-10 bg-white/60 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/60 dark:border-slate-700/50 shadow-2xl rounded-[2.5rem] p-6 sm:p-9 w-full max-w-2xl text-slate-700 dark:text-slate-200">
      <BrowserWarning />
      <div className="text-center mb-7">
        <div className="inline-block p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 shadow-sm mb-3 text-3xl">📝</div>
        <h1 className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-600 mb-1">ลงทะเบียน & แจ้งโอน</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">กรอกฟอร์มเดียวจบ — สมัคร + เลือกคอร์ส + แนบสลิป</p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-medium flex items-start gap-2">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">
        {/* 1. บัญชี */}
        <div className="space-y-3">
          <label className="text-sm font-black text-slate-700 dark:text-slate-200">1. สร้างบัญชีของคุณ</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input type="email" autoCapitalize="none" className={inputCls + " pl-12"} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="อีเมล (ใช้ล็อกอินเข้าเรียน)" />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input type={showPassword ? "text" : "password"} className={inputCls + " pl-12 pr-12"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="ตั้งรหัสผ่าน (อย่างน้อย 6 ตัว)" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-1">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </div>

        {/* 2. ข้อมูลผู้เรียน */}
        <div className="space-y-3">
          <label className="text-sm font-black text-slate-700 dark:text-slate-200">2. ข้อมูลผู้เรียน</label>
          <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ชื่อ-นามสกุล" />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทรศัพท์" />
            <input className={inputCls} value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="LINE ID (ถ้ามี)" />
          </div>
        </div>

        {/* 3. เลือกคอร์ส (เลือกได้หลายคอร์ส) */}
        <div className="space-y-3">
          <label className="text-sm font-black text-slate-700 dark:text-slate-200">3. เลือกคอร์ส <span className="font-normal text-slate-400">(เลือกได้หลายคอร์ส • เลือกแล้ว {selectedCourses.length})</span></label>
          <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-2xl p-2 space-y-1">
            {courses.length === 0 ? <div className="text-center text-slate-400 py-6 text-sm">กำลังโหลดคอร์ส...</div> : courses.map((c) => (
              <button key={c.id} type="button" onClick={() => toggleCourse(c.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${selectedCourses.includes(c.id) ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700" : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"}`}>
                <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-xs ${selectedCourses.includes(c.id) ? "bg-emerald-500 text-white" : "border-2 border-slate-300 dark:border-slate-600"}`}>{selectedCourses.includes(c.id) && "✓"}</span>
                <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{c.title}</span>
                <span className="text-xs text-slate-400 flex-shrink-0">{Number(c.price || 0).toLocaleString()}฿</span>
              </button>
            ))}
          </div>
          {selectedCourses.length > 0 && (
            <div className="flex justify-between items-center px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
              <span className="font-bold text-slate-500 dark:text-slate-400">ยอดรวม {selectedCourses.length} คอร์ส</span>
              <span className="text-2xl font-black text-emerald-600">{totalPrice.toLocaleString()}.-</span>
            </div>
          )}
        </div>

        {/* 4. ชำระเงิน + สลิป (หลายรูปได้) */}
        <div className="space-y-3">
          <label className="text-sm font-black text-slate-700 dark:text-slate-200">4. โอนเงิน & แนบสลิป</label>
          <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-slate-800/90 dark:to-slate-800/70 rounded-3xl p-6 border border-white dark:border-slate-700 shadow-lg">
            <div className="flex flex-col items-center mb-5">
              <div className="w-52 h-52 bg-white p-3 rounded-2xl shadow-inner border border-slate-100 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/qrcode.png" alt="QR พร้อมเพย์" className="w-full h-full object-contain rounded-xl" />
              </div>
              <span className="text-teal-600 dark:text-teal-400 font-bold text-sm">📱 สแกน QR เพื่อชำระ</span>
            </div>
            <div className="bg-emerald-50/60 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-800 text-sm space-y-2">
              <div><span className="text-slate-500 dark:text-slate-400">ชื่อบัญชี:</span> <span className="font-bold">นายสุเทพ โชติมานิต</span></div>
              <div><span className="text-slate-500 dark:text-slate-400">พร้อมเพย์:</span> <span className="font-black text-teal-600 dark:text-teal-400">082-705-7440</span></div>
              <div><span className="text-slate-500 dark:text-slate-400">กสิกรไทย:</span> <span className="font-black text-emerald-600 dark:text-emerald-400">391-2-78364-1</span></div>
            </div>
          </div>

          {slipError && <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-2xl text-rose-600 text-sm font-medium">⚠️ {slipError}</div>}

          <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={(e) => addFiles(e.target.files)} className="hidden" id="slip" />

          {/* Thumbnails of attached slips */}
          {slipPreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slipPreviews.map((src, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-emerald-200 dark:border-emerald-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`สลิป ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeSlip(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center shadow hover:bg-rose-600">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Upload / add-more button */}
          {slipFiles.length < MAX_SLIPS && (
            <label htmlFor="slip" className={`w-full ${slipPreviews.length > 0 ? "h-20" : "h-40"} border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer transition ${isCompressing ? "border-amber-300 bg-amber-50/30" : "border-teal-200/60 dark:border-slate-600 bg-white/40 dark:bg-slate-800/40 hover:border-teal-400 text-slate-400 hover:text-teal-500"}`}>
              {isCompressing ? <><div className="w-7 h-7 border-[3px] border-amber-400 border-t-transparent rounded-full animate-spin" /><span className="font-bold text-amber-600 text-sm">กำลังบีบอัดรูป...</span></> : <><span className="text-2xl">🧾</span><span className="font-bold text-sm">{slipPreviews.length > 0 ? "+ เพิ่มสลิปอีก" : "คลิกเพื่อแนบสลิป"}</span><span className="text-xs text-slate-300 dark:text-slate-500">ถ่ายรูป/เลือกได้หลายรูป (สูงสุด {MAX_SLIPS})</span></>}
            </label>
          )}
        </div>

        <button type="submit" disabled={isSubmitting || isCompressing} className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-teal-500/30 transition disabled:opacity-60 relative overflow-hidden">
          {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && <div className="absolute inset-y-0 left-0 bg-white/20" style={{ width: `${uploadProgress}%` }} />}
          <span className="relative">{isSubmitting ? `⏳ ${submitStatus}${uploadProgress > 0 && uploadProgress < 100 ? ` (${uploadProgress}%)` : ""}` : "✨ สมัคร + แจ้งโอน"}</span>
        </button>
      </form>
    </div>
  );
}
