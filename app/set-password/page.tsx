"use client";
import { useState } from "react";
import Link from "next/link";
import { useUserAuth } from "@/context/AuthContext";
import {
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { Lock, Eye, EyeOff, KeyRound, CheckCircle2, Mail } from "lucide-react";

/**
 * Lets a logged-in Google user ADD a password to their existing account
 * (linkWithCredential). Keeps the same account/uid/courses — just adds
 * email+password login. After this the Google banner disappears for them.
 */
export default function SetPasswordPage() {
  const { user, loading } = useUserAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const providers = (user?.providerData || []).map((p) => p.providerId);
  const alreadyHasPassword = providers.includes("password");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user || !user.email) return setError("ไม่พบบัญชี กรุณาเข้าสู่ระบบใหม่");
    if (password.length < 6) return setError("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
    if (password !== confirm) return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");

    setBusy(true);
    const credential = EmailAuthProvider.credential(user.email, password);
    try {
      await linkWithCredential(user, credential);
      await user.reload();
      setDone(true);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/requires-recent-login") {
        // Session too old — re-verify via Google, then retry the link.
        try {
          await reauthenticateWithPopup(user, new GoogleAuthProvider());
          await linkWithCredential(user, credential);
          await user.reload();
          setDone(true);
        } catch {
          setError("ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        }
      } else if (code === "auth/provider-already-linked" || code === "auth/email-already-in-use" || code === "auth/credential-already-in-use") {
        setError("บัญชีนี้มีรหัสผ่านอยู่แล้ว — ใช้รหัสผ่านล็อกอินได้เลย");
      } else if (code === "auth/weak-password") {
        setError("รหัสผ่านอ่อนเกินไป (อย่างน้อย 6 ตัวอักษร)");
      } else {
        setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setBusy(false);
    }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-slate-950 p-4 font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 w-full max-w-md bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/60 dark:border-slate-700 p-8 sm:p-10">
        {children}
      </div>
    </div>
  );

  if (loading) return <Shell><p className="text-center text-slate-400">กำลังโหลด...</p></Shell>;

  if (!user) {
    return (
      <Shell>
        <div className="text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-xl font-black text-slate-800 dark:text-white mb-2">กรุณาเข้าสู่ระบบก่อน</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">เข้าสู่ระบบด้วย Google แล้วกลับมาตั้งรหัสผ่านได้เลย</p>
          <Link href="/login" className="inline-block px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition">เข้าสู่ระบบ</Link>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-2">ตั้งรหัสผ่านเรียบร้อย!</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-1">ครั้งหน้าล็อกอินด้วย <span className="font-bold">อีเมล + รหัสผ่าน</span> นี้ได้เลย</p>
          <p className="text-sm text-slate-400 mb-7">(บัญชี คอร์ส และข้อมูลทุกอย่างอยู่ครบเหมือนเดิม)</p>
          <Link href="/my-courses" className="inline-block w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition">ไปหน้าคอร์สของฉัน</Link>
        </div>
      </Shell>
    );
  }

  if (alreadyHasPassword) {
    return (
      <Shell>
        <div className="text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-black text-slate-800 dark:text-white mb-2">บัญชีคุณมีรหัสผ่านอยู่แล้ว ✅</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">ล็อกอินด้วยอีเมล + รหัสผ่านได้เลย ถ้าลืมรหัส กด “ลืมรหัสผ่าน” ที่หน้าเข้าสู่ระบบ</p>
          <Link href="/my-courses" className="inline-block px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition">ไปหน้าคอร์สของฉัน</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-7">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 mx-auto mb-4">
          <KeyRound className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-1">ตั้งรหัสผ่าน</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">ตั้งรหัสผ่านไว้ จะล็อกอินด้วยอีเมล+รหัสได้ (ยังใช้ Google ได้เหมือนเดิม)</p>
      </div>

      <div className="flex items-center gap-2 mb-5 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700">
        <Mail size={16} className="text-indigo-500 flex-shrink-0" />
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{user.email}</span>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-medium flex items-start gap-2">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ตั้งรหัสผ่าน (อย่างน้อย 6 ตัว)"
            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
            {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="ยืนยันรหัสผ่านอีกครั้ง"
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
        <button type="submit" disabled={busy} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 transition disabled:opacity-60 flex items-center justify-center gap-2">
          {busy ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "บันทึกรหัสผ่าน"}
        </button>
      </form>

      <Link href="/" className="block text-center text-slate-400 dark:text-slate-500 font-bold hover:text-indigo-500 transition text-sm mt-6">ไว้ทีหลัง / กลับหน้าหลัก</Link>
    </Shell>
  );
}
