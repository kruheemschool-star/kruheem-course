"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where, limit, addDoc, doc, setDoc, getFirestore } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { useUserAuth } from "@/context/AuthContext";
import { UserPlus, Eye, EyeOff, Loader2, CheckCircle2, Mail, KeyRound, AlertTriangle, Users, Wallet } from "lucide-react";

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
    return (
      <div className="flex items-center justify-center py-24 kh-ink3">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="kh-card p-8 text-center kh-ink2 font-bold">⛔ ไม่มีสิทธิ์เข้าถึงหน้านี้</div>
    );
  }

  const inputCls = "kh-input";

  return (
    <div className="space-y-6">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="kh-eyebrow"><UserPlus size={14} /> ลงทะเบียนแทนผู้ปกครอง</span>
        <div className="flex-1" />
        <Link href="/admin/enrollments" className="kh-btn-ghost">
          <Wallet size={16} /> ตรวจสอบการชำระเงิน
        </Link>
        <Link href="/admin/students" className="kh-btn-ghost">
          <Users size={16} /> ทะเบียนนักเรียน
        </Link>
      </div>

      <p className="kh-ink3 text-sm max-w-2xl -mt-1">สำหรับผู้ปกครองที่ลงทะเบียนเองไม่สะดวก — กรอกข้อมูลที่เขาส่งมา ระบบจะสร้างบัญชี + ลงทะเบียนให้ในคลิกเดียว</p>

      <div className="max-w-2xl">
        {/* ✅ Success */}
        {result?.ok ? (
          <div className="kh-card p-7">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 size={30} style={{ color: "var(--good)" }} />
              <h2 className="text-xl font-bold kh-ink">เรียบร้อย! สร้างให้ {result.name} แล้ว</h2>
            </div>
            <p className="text-sm kh-ink3 mb-4">{result.accountCreated ? "สร้างบัญชีใหม่ + ลงทะเบียนให้แล้ว" : "อีเมลนี้มีบัญชีอยู่แล้ว — เพิ่มคอร์สให้บัญชีเดิม"}</p>

            <div className="rounded-xl p-5 space-y-3 mb-5" style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>
              <p className="kh-eyebrow">ส่งข้อมูลนี้ให้ผู้ปกครองทาง LINE</p>
              <div className="flex items-center gap-2 kh-ink2"><Mail size={16} style={{ color: "var(--accent)" }} /> <span className="font-bold kh-ink">อีเมล:</span> {result.email}</div>
              <div className="flex items-center gap-2 kh-ink2"><KeyRound size={16} style={{ color: "var(--accent)" }} /> <span className="font-bold kh-ink">รหัสผ่าน:</span> {result.password}</div>
              <p className="text-xs kh-ink3 pt-1">แจ้งผู้ปกครอง: เข้าเว็บ → เข้าสู่ระบบด้วยอีเมล → ใส่อีเมล+รหัสนี้ แล้วเข้าเรียนได้เลย</p>
            </div>

            {result.created.length > 0 && (
              <div className="mb-2 text-sm"><span className="kh-pill kh-pill-good">ลงทะเบียนแล้ว</span> <span className="kh-ink2">{result.created.join(", ")}</span></div>
            )}
            {result.skipped.length > 0 && (
              <div className="mb-2 text-sm"><span className="kh-pill kh-pill-warn">ข้าม (มีอยู่แล้ว)</span> <span className="kh-ink2">{result.skipped.join(", ")}</span></div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={resetForm} className="kh-btn flex-1"><UserPlus size={16} /> เพิ่มอีกคน</button>
              <Link href="/admin/students" className="kh-btn-ghost flex-1">ดูรายชื่อนักเรียน</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="kh-card p-7 space-y-5">
            {result && !result.ok && (
              <div className="rounded-xl p-3.5 text-sm font-medium flex items-start gap-2"
                style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)" }}>
                <AlertTriangle size={16} className="shrink-0 mt-0.5" /><span>{result.message}</span>
              </div>
            )}

            <div>
              <label className="text-sm font-bold kh-ink2 block mb-1.5">ชื่อ-นามสกุล *</label>
              <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="เช่น ด.ช. ภูริช ใจดี" />
            </div>

            <div>
              <label className="text-sm font-bold kh-ink2 block mb-1.5">อีเมล * <span className="font-normal kh-ink3">(ใช้ล็อกอิน)</span></label>
              <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" autoCapitalize="none" />
            </div>

            <div>
              <label className="text-sm font-bold kh-ink2 block mb-1.5">รหัสผ่าน * <span className="font-normal kh-ink3">(รหัสที่ผู้ปกครองตั้งมา)</span></label>
              <div className="relative">
                <input className={inputCls + " pr-12"} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 kh-ink3 hover:kh-ink2 p-1">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold kh-ink2 block mb-1.5">เบอร์โทร</label>
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
              </div>
              <div>
                <label className="text-sm font-bold kh-ink2 block mb-1.5">LINE ID</label>
                <input className={inputCls} value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="(ถ้ามี)" />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold kh-ink2 block mb-1.5">เลือกคอร์ส * <span className="font-normal kh-ink3">({selectedCourses.length} คอร์ส)</span></label>
              <div className="max-h-56 overflow-y-auto rounded-xl p-2 space-y-1" style={{ border: "1px solid var(--line)", background: "var(--card-2)" }}>
                {courses.length === 0 ? (
                  <div className="text-center kh-ink3 py-6 text-sm">กำลังโหลดคอร์ส...</div>
                ) : courses.map((c) => {
                  const on = selectedCourses.includes(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => toggleCourse(c.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition"
                      style={{
                        background: on ? "var(--good-soft)" : "transparent",
                        border: `1px solid ${on ? "color-mix(in srgb, var(--good) 35%, transparent)" : "transparent"}`,
                      }}>
                      <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-white text-xs"
                        style={on
                          ? { background: "var(--good)" }
                          : { border: "2px solid var(--line-2)", background: "transparent" }}>
                        {on && "✓"}
                      </span>
                      <span className="flex-1 text-sm font-semibold kh-ink2 truncate">{c.title}</span>
                      <span className="text-xs kh-ink3 flex-shrink-0 kh-num">{Number(c.price || 0).toLocaleString()}฿</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold kh-ink2 block mb-1.5">ระยะเวลาเรียน</label>
              <select className="kh-select" value={duration} onChange={(e) => setDuration(e.target.value as "5_years" | "lifetime")}>
                <option value="5_years">5 ปี (ค่าเริ่มต้น)</option>
                <option value="lifetime">ตลอดชีพ</option>
              </select>
            </div>

            <button type="submit" disabled={isSubmitting} className="kh-btn w-full" style={{ padding: "13px 16px", fontSize: "15px" }}>
              {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> กำลังสร้าง...</> : <><UserPlus size={20} /> สร้างบัญชี + ลงทะเบียน</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
