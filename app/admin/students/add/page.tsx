"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where, limit, addDoc, doc, setDoc, getFirestore } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { useUserAuth } from "@/context/AuthContext";
import { ArrowLeft, UserPlus, Eye, EyeOff, Loader2, CheckCircle2, Mail, KeyRound } from "lucide-react";

type CourseLite = { id: string; title: string; price?: number; allowedExamLevel?: string | null; category?: string };

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

type Result = { ok: true; name: string; email: string; password: string; created: string[]; skipped: string[]; accountCreated: boolean } | { ok: false; message: string };

export default function AdminAddStudentPage() {
  const { isAdmin, loading: authLoading } = useUserAuth();

  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [duration, setDuration] = useState<"5_years" | "lifetime">("5_years");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "courses"), orderBy("createdAt", "desc")));
        setCourses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CourseLite, "id">) })));
      } catch (e) {
        console.warn("load courses failed", e);
      }
    })();
  }, []);

  const toggleCourse = (id: string) =>
    setSelectedCourses((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const resetForm = () => {
    setFullName(""); setEmail(""); setPassword(""); setPhone(""); setLineId("");
    setSelectedCourses([]); setDuration("5_years"); setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!fullName.trim()) return setResult({ ok: false, message: "กรุณากรอกชื่อ-นามสกุล" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setResult({ ok: false, message: "อีเมลไม่ถูกต้อง" });
    if (password.length < 6) return setResult({ ok: false, message: "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร" });
    if (selectedCourses.length === 0) return setResult({ ok: false, message: "กรุณาเลือกคอร์สอย่างน้อย 1 คอร์ส" });

    setIsSubmitting(true);

    // A throwaway secondary Firebase app so creating the student's account does NOT
    // log the admin out of their own (primary-app) session.
    const secondaryApp = initializeApp(firebaseConfig, `admin-create-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    const secondaryDb = getFirestore(secondaryApp);

    try {
      // 1) Create the account, or sign in to an existing one (parent gave their password).
      let uid: string;
      let accountCreated = false;
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, password);
        uid = cred.user.uid;
        accountCreated = true;
      } catch (err) {
        if ((err as { code?: string })?.code === "auth/email-already-in-use") {
          try {
            const cred = await signInWithEmailAndPassword(secondaryAuth, cleanEmail, password);
            uid = cred.user.uid; // existing account, password matched
          } catch {
            setResult({ ok: false, message: "อีเมลนี้มีบัญชีอยู่แล้ว แต่รหัสผ่านไม่ตรง — ขอรหัสเดิมจากผู้ปกครอง หรือให้เขากด \"ลืมรหัสผ่าน\"" });
            return;
          }
        } else if ((err as { code?: string })?.code === "auth/weak-password") {
          setResult({ ok: false, message: "รหัสผ่านอ่อนเกินไป (อย่างน้อย 6 ตัวอักษร)" });
          return;
        } else {
          setResult({ ok: false, message: "สร้างบัญชีไม่สำเร็จ: " + ((err as { message?: string })?.message || "unknown") });
          return;
        }
      }

      // 2) Write the student's profile. The new/just-signed-in user is authenticated on
      //    the SECONDARY app, so they own (and may write) their own users/{uid} doc.
      try {
        if (secondaryAuth.currentUser) await updateProfile(secondaryAuth.currentUser, { displayName: fullName.trim() });
        await setDoc(doc(secondaryDb, "users", uid), { displayName: fullName.trim(), email: cleanEmail, authProvider: "email" }, { merge: true });
      } catch (e) {
        console.warn("profile write failed (non-blocking):", e);
      }

      // 3) Create the enrollment(s) — via the PRIMARY app (admin), so status can be "approved".
      const now = new Date();
      const expiryDate = new Date(now);
      const accessType = duration === "lifetime" ? "lifetime" : "limited";
      expiryDate.setFullYear(now.getFullYear() + (duration === "lifetime" ? 100 : 5));

      const created: string[] = [];
      const skipped: string[] = [];
      for (const courseId of selectedCourses) {
        const c = courses.find((x) => x.id === courseId);
        const title = c?.title || "ไม่ระบุชื่อคอร์ส";
        // Skip if an approved enrollment for this course already exists for this user.
        try {
          const dup = await getDocs(query(collection(db, "enrollments"),
            where("userId", "==", uid), where("courseId", "==", courseId), where("status", "==", "approved"), limit(1)));
          if (!dup.empty) { skipped.push(title); continue; }
        } catch { /* if the dup check fails, fall through and create anyway */ }

        await addDoc(collection(db, "enrollments"), {
          userId: uid,
          userName: fullName.trim(),
          userTel: phone.trim(),
          lineId: lineId.trim(),
          userEmail: cleanEmail,
          courseId,
          courseTitle: title,
          allowedExamLevel: c?.allowedExamLevel ?? null,
          price: Number(c?.price) || 0,
          couponCode: null,
          discountAmount: 0,
          finalPrice: Number(c?.price) || 0,
          slipUrl: null,
          status: "approved",
          createdAt: now,
          approvedAt: now,
          expiryDate,
          accessType,
          createdByAdmin: true,
        });
        created.push(title);
      }

      // 4) Keep the public "students enrolled" stat in sync (best-effort).
      try {
        const snap = await getDocs(query(collection(db, "enrollments"), where("status", "==", "approved")));
        const emails = new Set<string>();
        snap.docs.forEach((d) => { const em = d.data().userEmail; if (em) emails.add(em); });
        await setDoc(doc(db, "public_stats", "enrollments"), { count: emails.size || snap.size }, { merge: true });
      } catch (e) {
        console.warn("public_stats update failed (non-blocking):", e);
      }

      setResult({ ok: true, name: fullName.trim(), email: cleanEmail, password, created, skipped, accountCreated });
    } catch (err) {
      setResult({ ok: false, message: "เกิดข้อผิดพลาด: " + ((err as { message?: string })?.message || "unknown") });
    } finally {
      try { await signOut(secondaryAuth); } catch { /* ignore */ }
      try { await deleteApp(secondaryApp); } catch { /* ignore */ }
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center text-slate-400">กำลังโหลด...</div>;
  }
  if (!isAdmin) {
    return <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center text-slate-500 font-bold">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  const inputCls = "w-full p-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition font-medium text-slate-800 placeholder:text-slate-400";

  return (
    <div className="min-h-screen bg-[#F8F9FD] font-sans text-slate-800 p-6 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/enrollments" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-bold transition">
          <ArrowLeft size={18} /> กลับหน้าตรวจสอบการชำระเงิน
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><UserPlus size={22} /></span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800">เพิ่มนักเรียน (ลงทะเบียนแทน)</h1>
        </div>
        <p className="text-slate-500 mb-8 text-sm">สำหรับผู้ปกครองที่ลงทะเบียนเองไม่สะดวก — กรอกข้อมูลที่เขาส่งมา ระบบจะสร้างบัญชี + ลงทะเบียนให้ในคลิกเดียว</p>

        {/* ✅ Success */}
        {result?.ok ? (
          <div className="bg-white rounded-[2rem] shadow-lg border border-emerald-100 p-7">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="text-emerald-500" size={30} />
              <h2 className="text-xl font-black text-slate-800">เรียบร้อย! สร้างให้ {result.name} แล้ว</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">{result.accountCreated ? "สร้างบัญชีใหม่ + ลงทะเบียนให้แล้ว" : "อีเมลนี้มีบัญชีอยู่แล้ว — เพิ่มคอร์สให้บัญชีเดิม"}</p>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3 mb-5">
              <p className="text-xs font-bold text-slate-400 uppercase">ส่งข้อมูลนี้ให้ผู้ปกครองทาง LINE</p>
              <div className="flex items-center gap-2 text-slate-700"><Mail size={16} className="text-indigo-500" /> <span className="font-bold">อีเมล:</span> {result.email}</div>
              <div className="flex items-center gap-2 text-slate-700"><KeyRound size={16} className="text-indigo-500" /> <span className="font-bold">รหัสผ่าน:</span> {result.password}</div>
              <p className="text-xs text-slate-400 pt-1">แจ้งผู้ปกครอง: เข้าเว็บ → เข้าสู่ระบบด้วยอีเมล → ใส่อีเมล+รหัสนี้ แล้วเข้าเรียนได้เลย</p>
            </div>

            {result.created.length > 0 && (
              <div className="mb-2 text-sm"><span className="font-bold text-emerald-700">✅ ลงทะเบียนแล้ว:</span> {result.created.join(", ")}</div>
            )}
            {result.skipped.length > 0 && (
              <div className="mb-2 text-sm text-amber-600"><span className="font-bold">⏭️ ข้าม (มีอยู่แล้ว):</span> {result.skipped.join(", ")}</div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={resetForm} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition">+ เพิ่มอีกคน</button>
              <Link href="/admin/students" className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-center transition">ดูรายชื่อนักเรียน</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] shadow-lg border border-slate-100 p-7 space-y-5">
            {result && !result.ok && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-medium flex items-start gap-2">
                <span>⚠️</span><span>{result.message}</span>
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">ชื่อ-นามสกุล *</label>
              <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="เช่น ด.ช. ภูริช ใจดี" />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">อีเมล * <span className="font-normal text-slate-400">(ใช้ล็อกอิน)</span></label>
              <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" autoCapitalize="none" />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">รหัสผ่าน * <span className="font-normal text-slate-400">(รหัสที่ผู้ปกครองตั้งมา)</span></label>
              <div className="relative">
                <input className={inputCls + " pr-12"} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1.5">เบอร์โทร</label>
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1.5">LINE ID</label>
                <input className={inputCls} value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="(ถ้ามี)" />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">เลือกคอร์ส * <span className="font-normal text-slate-400">({selectedCourses.length} คอร์ส)</span></label>
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-2xl p-2 space-y-1">
                {courses.length === 0 ? (
                  <div className="text-center text-slate-400 py-6 text-sm">กำลังโหลดคอร์ส...</div>
                ) : courses.map((c) => (
                  <button key={c.id} type="button" onClick={() => toggleCourse(c.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${selectedCourses.includes(c.id) ? "bg-emerald-50 border border-emerald-200" : "hover:bg-slate-50 border border-transparent"}`}>
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${selectedCourses.includes(c.id) ? "bg-emerald-500 text-white" : "border-2 border-slate-300"}`}>
                      {selectedCourses.includes(c.id) && "✓"}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{c.title}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{Number(c.price || 0).toLocaleString()}฿</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">ระยะเวลาเรียน</label>
              <select className={inputCls} value={duration} onChange={(e) => setDuration(e.target.value as "5_years" | "lifetime")}>
                <option value="5_years">5 ปี (ค่าเริ่มต้น)</option>
                <option value="lifetime">ตลอดชีพ</option>
              </select>
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-black text-lg shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 disabled:opacity-60">
              {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> กำลังสร้าง...</> : <><UserPlus size={20} /> สร้างบัญชี + ลงทะเบียน</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
