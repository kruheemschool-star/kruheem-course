"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { PAYMENT_INFO } from "@/lib/constants";

// The "where to transfer" block — QR + account numbers + copy buttons — shown
// on both the main checkout and the PDF-exam checkout so the payment step looks
// and works the same everywhere. Account data comes from PAYMENT_INFO.
export default function PaymentTransferInfo({ compact = false }: { compact?: boolean }) {
    const [copied, setCopied] = useState<string | null>(null);

    const copy = (v: string) => {
        navigator.clipboard?.writeText(v).then(() => {
            setCopied(v);
            setTimeout(() => setCopied((c) => (c === v ? null : c)), 1500);
        });
    };

    return (
        <div className={`grid ${compact ? "grid-cols-1" : "sm:grid-cols-2"} gap-3`}>
            {/* QR */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex flex-col items-center">
                <div className="w-[150px] h-[150px] bg-white rounded-lg border border-slate-200 p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={PAYMENT_INFO.qrImage} alt="QR พร้อมเพย์" className="w-full h-full object-contain rounded" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mt-2">พร้อมเพย์ · PromptPay</div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{PAYMENT_INFO.accountName}</div>
            </div>

            {/* accounts */}
            <div className="space-y-2.5">
                {PAYMENT_INFO.accounts.map((acc) => (
                    <div key={acc.value} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">{acc.label}</div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-lg font-bold text-teal-700 dark:text-teal-300 tracking-wide tabular-nums">{acc.value}</span>
                            <button type="button" onClick={() => copy(acc.value)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition">
                                {copied === acc.value ? <><Check size={13} className="text-teal-600" /> คัดลอกแล้ว</> : <><Copy size={13} /> คัดลอก</>}
                            </button>
                        </div>
                        {acc.note && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{acc.note}</div>}
                    </div>
                ))}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">ชื่อบัญชี</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{PAYMENT_INFO.accountName}</div>
                </div>
            </div>
        </div>
    );
}
