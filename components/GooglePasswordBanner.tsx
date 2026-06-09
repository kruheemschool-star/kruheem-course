"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserAuth } from "@/context/AuthContext";
import { KeyRound, X, ArrowRight } from "lucide-react";

/**
 * Floating banner shown ONLY to users who signed up with Google and don't yet
 * have a password set. It nudges them to set a password (→ /set-password) so they
 * can log in with email + password going forward. Renders nothing for everyone else.
 * Dismissible for the session; reappears next session until they set a password.
 */
export default function GooglePasswordBanner() {
  const { user, isAdmin } = useUserAuth();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState<boolean>(
    () => typeof window !== "undefined" && sessionStorage.getItem("gpw_banner_dismissed") === "1"
  );

  if (!user) return null;
  // Admins log in with Google on purpose — never nag them to set a password.
  if (isAdmin) return null;
  // Don't show on the set-password page itself or the auth pages.
  if (pathname === "/set-password" || pathname === "/login" || pathname === "/register") return null;

  const providers = (user.providerData || []).map((p) => p.providerId);
  const isGoogleOnly = providers.includes("google.com") && !providers.includes("password");
  if (!isGoogleOnly || dismissed) return null;

  const dismiss = () => {
    if (typeof window !== "undefined") sessionStorage.setItem("gpw_banner_dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-md">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-indigo-100 dark:border-indigo-900/50 p-4 pr-9 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button onClick={dismiss} aria-label="ปิด" className="absolute top-2.5 right-2.5 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition">
          <X size={16} />
        </button>
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
          <KeyRound size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">ตั้งรหัสผ่านเพื่อล็อกอินง่ายขึ้น 🔐</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">บัญชีคุณเข้าระบบด้วย Google — ตั้งรหัสผ่านไว้ ครั้งหน้าใช้อีเมล+รหัสล็อกอินได้เลย</p>
        </div>
        <Link href="/set-password" className="flex-shrink-0 inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition">
          ตั้งเลย <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
