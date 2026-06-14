"use client";
import { useState } from "react";
import { useUserAuth } from "@/context/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, KeyRound } from "lucide-react";
import BrowserWarning from "@/components/BrowserWarning";

type Phase = "email" | "newPassword" | "existingPassword" | "googleFallback" | "password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Step 1 of the public enrollment flow — the "email-first" auth gate.
 *
 * Collects email → asks /api/auth/check-email whether an account already exists →
 * routes to "set a password" (new) / "enter your password" (returning) /
 * "continue with Google" (Google account). On a successful sign-up/sign-in the
 * AuthContext's onAuthStateChanged populates `user`, and the parent /payment page
 * swaps this gate out for the enrollment form. No redirect, same URL.
 *
 * If the check-email lookup fails, it degrades gracefully to an attempt-based flow
 * (try sign-up; on "email-already-in-use" switch to sign-in), so the gate never
 * hard-blocks a parent.
 */
export default function EnrollmentAuthGate() {
  const { emailSignUp, emailSignIn, resetPassword, googleSignIn } = useUserAuth();

  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const resetMessages = () => { setError(""); setInfo(""); };

  // Map Firebase auth error codes → friendly Thai messages.
  const friendly = (code?: string) => {
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "รหัสผ่านไม่ถูกต้อง ลองใหม่ หรือกด \"ลืมรหัสผ่าน\"";
      case "auth/weak-password":
        return "รหัสผ่านสั้นเกินไป (อย่างน้อย 6 ตัวอักษร)";
      case "auth/too-many-requests":
        return "ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
      case "auth/invalid-email":
        return "รูปแบบอีเมลไม่ถูกต้อง";
      default:
        return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
    }
  };

  // ── Phase: email — check whether this email already has an account ──────────
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) { setError("กรุณากรอกอีเมลให้ถูกต้อง"); return; }
    setEmail(value);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) throw new Error("check failed");
      const data = await res.json();
      if (!data.exists) setPhase("newPassword");
      else if (data.provider === "google") setPhase("googleFallback");
      else setPhase("existingPassword");
    } catch {
      // Degrade gracefully when the lookup is unavailable (e.g. admin SDK not
      // configured): show a unified password step that works for BOTH new and
      // returning users, instead of wrongly claiming "new account".
      setPhase("password");
    } finally {
      setLoading(false);
    }
  };

  // ── Phase: password — unified fallback (new OR returning, unknown) ─────────
  // Used only when check-email is unavailable. Try sign-in first (returning user
  // with the right password); if that's not a valid login, create the account.
  const handleUnifiedPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (password.length < 6) { setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"); return; }
    setLoading(true);
    try {
      await emailSignIn(email, password); // returning user, correct password
    } catch (signInErr) {
      const code = (signInErr as { code?: string })?.code;
      if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
        try {
          await emailSignUp(email, password); // brand-new account
        } catch (signUpErr) {
          const upCode = (signUpErr as { code?: string })?.code;
          if (upCode === "auth/email-already-in-use") {
            // Account exists but our password didn't work — either a password
            // account with the wrong password, OR a Google account (no password,
            // → use the Google button which is always shown below).
            setError("อีเมลนี้มีบัญชีอยู่แล้ว — ถ้ารหัสไม่ถูก ลองใหม่ หรือกด \"ลืมรหัสผ่าน\" • ถ้าเคยสมัครด้วย Google กดปุ่ม Google ด้านล่าง");
          } else {
            setError(friendly(upCode));
          }
          setLoading(false);
        }
      } else {
        setError(friendly(code));
        setLoading(false);
      }
    }
  };

  // ── Phase: newPassword — create the account ────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (password.length < 6) { setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"); return; }
    if (password !== confirmPassword) { setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); return; }
    setLoading(true);
    try {
      await emailSignUp(email, password);
      // success → onAuthStateChanged populates user → parent swaps to the form
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        // They're actually a returning user — switch to sign-in, keep the password.
        setPhase("existingPassword");
        setInfo("อีเมลนี้เคยสมัครไว้แล้ว ลองใส่รหัสผ่านเดิมของคุณเพื่อเข้าสู่ระบบ");
      } else {
        setError(friendly(code));
      }
      setLoading(false);
    }
  };

  // ── Phase: existingPassword — sign in ──────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!password) { setError("กรุณากรอกรหัสผ่าน"); return; }
    setLoading(true);
    try {
      await emailSignIn(email, password);
      // success → parent swaps to the form
    } catch (err) {
      setError(friendly((err as { code?: string })?.code));
      setLoading(false);
    }
  };

  // Inline forgot-password — keep them on this page (don't lose enrollment intent)
  const handleForgot = async () => {
    resetMessages();
    if (!EMAIL_RE.test(email)) { setError("กรุณากรอกอีเมลให้ถูกต้องก่อน"); return; }
    try {
      await resetPassword(email);
      setInfo("ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว ✉️ เช็คกล่องจดหมาย ตั้งรหัสใหม่ แล้วกลับมากรอกที่นี่ได้เลย");
    } catch (err) {
      setError(friendly((err as { code?: string })?.code));
    }
  };

  // Google fallback for accounts that registered via Google
  const handleGoogle = async () => {
    resetMessages();
    setLoading(true);
    try {
      await googleSignIn();
      // success → parent swaps to the form
    } catch {
      setError("เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่");
      setLoading(false);
    }
  };

  const backToEmail = () => {
    resetMessages();
    setPassword("");
    setConfirmPassword("");
    setPhase("email");
  };

  const inputBase =
    "w-full pl-12 pr-12 py-3.5 bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-400/50 focus:bg-white/90 dark:focus:bg-slate-800 transition font-medium text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm";

  const primaryBtn =
    "w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-teal-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";

  const Spinner = () => <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />;

  const EmailChip = () => (
    <div className="flex items-center justify-between bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700 rounded-2xl px-4 py-3 mb-4">
      <div className="flex items-center gap-2 min-w-0">
        <Mail className="w-4 h-4 text-teal-500 flex-shrink-0" />
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{email}</span>
      </div>
      <button type="button" onClick={backToEmail} className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex-shrink-0 ml-2">เปลี่ยน</button>
    </div>
  );

  return (
    <div className="relative z-10 bg-white/60 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/60 dark:border-slate-700/50 shadow-2xl rounded-[3rem] p-6 sm:p-10 w-full max-w-md text-slate-700 dark:text-slate-200">

      <div className="text-center mb-6">
        <div className="inline-block p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 shadow-sm mb-4 text-3xl">💳</div>
        <h1 className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-600 mb-2">
          ลงทะเบียน & แจ้งโอน
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
          เริ่มจากกรอกอีเมล ระบบจะพาไปต่อให้เอง — ไม่ต้องสมัครก่อน
        </p>
      </div>

      <BrowserWarning />

      {error && (
        <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-medium flex items-start gap-2">
          <span className="leading-none mt-0.5">⚠️</span><span>{error}</span>
        </div>
      )}
      {info && (
        <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-start gap-2">
          <span className="leading-none mt-0.5">✅</span><span>{info}</span>
        </div>
      )}

      {/* ── Phase: email ─────────────────────────────────────────────── */}
      {phase === "email" && (
        <form onSubmit={handleCheckEmail} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="email"
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="อีเมลของคุณ (เช่น example@gmail.com)"
              className={inputBase.replace("pr-12", "pr-4")}
            />
          </div>
          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? <Spinner /> : <>ถัดไป <ArrowRight className="w-5 h-5" /></>}
          </button>
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            ใช้อีเมลนี้สำหรับเข้าเรียนในภายหลัง
          </p>
        </form>
      )}

      {/* ── Phase: newPassword (สมัครใหม่) ───────────────────────────── */}
      {phase === "newPassword" && (
        <form onSubmit={handleSignUp} className="space-y-4">
          <EmailChip />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <span className="text-lg">🎉</span> ยินดีต้อนรับ! ตั้งรหัสผ่านสำหรับบัญชีใหม่
          </p>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ตั้งรหัสผ่าน (อย่างน้อย 6 ตัว)"
              className={inputBase}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="ยืนยันรหัสผ่านอีกครั้ง"
              className={inputBase}
            />
          </div>
          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? <Spinner /> : <>สมัครและไปต่อ <ArrowRight className="w-5 h-5" /></>}
          </button>
          <button type="button" onClick={backToEmail} className="w-full text-center text-xs text-slate-400 dark:text-slate-500 font-bold hover:text-teal-500 transition flex items-center justify-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> ใช้อีเมลอื่น
          </button>
        </form>
      )}

      {/* ── Phase: existingPassword (คนเก่า) ─────────────────────────── */}
      {phase === "existingPassword" && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <EmailChip />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <span className="text-lg">👋</span> ยินดีต้อนรับกลับมา! ใส่รหัสผ่านของคุณ
          </p>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่านเดิมของคุณ"
              className={inputBase}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleForgot} className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" /> ลืมรหัสผ่าน?
            </button>
          </div>
          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? <Spinner /> : <>เข้าสู่ระบบและไปต่อ <ArrowRight className="w-5 h-5" /></>}
          </button>
          <button type="button" onClick={backToEmail} className="w-full text-center text-xs text-slate-400 dark:text-slate-500 font-bold hover:text-teal-500 transition flex items-center justify-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> ใช้อีเมลอื่น
          </button>
        </form>
      )}

      {/* ── Phase: password (กลางๆ — fallback คนเก่า/ใหม่) ─────────────── */}
      {phase === "password" && (
        <form onSubmit={handleUnifiedPassword} className="space-y-4">
          <EmailChip />
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span className="text-lg">🔑</span> ใส่รหัสผ่านของคุณ
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">เคยมีบัญชีแล้ว → ใส่รหัสเดิม • ยังไม่มี → พิมพ์รหัสที่อยากใช้ (อย่างน้อย 6 ตัว)</p>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              className={inputBase}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleForgot} className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" /> ลืมรหัสผ่าน?
            </button>
          </div>
          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? <Spinner /> : <>ไปต่อ <ArrowRight className="w-5 h-5" /></>}
          </button>
          {/* Always-available Google option — covers returning users who signed up
              with Google (they have no password) without needing them to fail first. */}
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 pt-1">หรือ ถ้าเคยสมัครด้วย Google</p>
          <button type="button" onClick={handleGoogle} disabled={loading} className="w-full py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-600 text-slate-700 dark:text-slate-200 rounded-2xl font-bold transition-all flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md disabled:opacity-60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            เข้าสู่ระบบด้วย Google
          </button>
          <button type="button" onClick={backToEmail} className="w-full text-center text-xs text-slate-400 dark:text-slate-500 font-bold hover:text-teal-500 transition flex items-center justify-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> ใช้อีเมลอื่น
          </button>
        </form>
      )}

      {/* ── Phase: googleFallback (บัญชี Google เดิม) ─────────────────── */}
      {phase === "googleFallback" && (
        <div className="space-y-4">
          <EmailChip />
          <div className="text-center py-2">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">บัญชีนี้เคยเข้าระบบด้วย Google</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">กดปุ่มด้านล่างเพื่อดำเนินการต่อ</p>
          </div>
          <button type="button" onClick={handleGoogle} disabled={loading} className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-600 text-slate-700 dark:text-slate-200 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md disabled:opacity-60">
            {loading ? <Spinner /> : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
                ดำเนินการต่อด้วย Google
              </>
            )}
          </button>
          <button type="button" onClick={backToEmail} className="w-full text-center text-xs text-slate-400 dark:text-slate-500 font-bold hover:text-teal-500 transition flex items-center justify-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> ใช้อีเมลอื่น
          </button>
        </div>
      )}
    </div>
  );
}
