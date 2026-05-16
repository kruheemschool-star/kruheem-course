"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useUserAuth } from "@/context/AuthContext";
import { deriveExamLevel, type ExamLevel } from "@/lib/exam-level";
import { isValidExamQuestion } from "@/lib/exam-utils";
import toast, { Toaster } from "react-hot-toast";
import {
    ArrowLeft,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Wrench,
    RefreshCw,
} from "lucide-react";

interface ExamRow {
    id: string;
    title: string;
    category: string;
    level: string;
    isFree: boolean;
    isHidden?: boolean;
    catDerived: ExamLevel | undefined;   // from category+level only
    titleDerived: ExamLevel | undefined; // from title only
    mismatch: boolean;
    unresolved: boolean;
    // Question-corruption audit
    totalQ: number;          // raw questions in storage
    validQ: number;          // questions passing isValidExamQuestion
    blankCount: number;      // totalQ - validQ
    storedCount: number | null; // denormalized questionCount field
    countMismatch: boolean;  // storedCount !== validQ
    wasString: boolean;      // questions stored as JSON string
    hasQuestionsUrl: boolean; // external questions file — not fixable here
    hasCorruption: boolean;  // blankCount > 0 || countMismatch
}

const LABEL: Record<string, string> = {
    primary: "ประถม / สอบเข้า ม.1",
    lower: "ม.ต้น",
    upper: "ม.ปลาย",
};

const DEFAULTS: Record<ExamLevel, { category: string; level: string }> = {
    primary: { category: "ประถม", level: "ป.6" },
    lower: { category: "ม.ต้น", level: "ม.3" },
    upper: { category: "ม.ปลาย", level: "ม.6" },
};

export default function ExamAuditPage() {
    const { isAdmin, loading: authLoading } = useUserAuth();
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<ExamRow[]>([]);
    const [fixing, setFixing] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "exams"));
            const all: ExamRow[] = snap.docs.map((d) => {
                const data = d.data() as any;
                const category = data.category || "";
                const level = data.level || "";
                const title = data.title || "";
                const catDerived = deriveExamLevel(category, level, null);
                const titleDerived = deriveExamLevel(null, null, title);
                const mismatch = Boolean(
                    titleDerived && catDerived && titleDerived !== catDerived
                );
                const unresolved = !catDerived; // category couldn't be classified

                // --- Question-corruption detection ---
                // Mirror the questions-shape logic in app/exam/[id]/page.tsx
                const rawQ = data.questions;
                const wasString = typeof rawQ === "string";
                let qArr: any[] = [];
                if (wasString) {
                    try { qArr = JSON.parse(rawQ); } catch { qArr = []; }
                } else if (Array.isArray(rawQ)) {
                    qArr = rawQ;
                }
                if (!Array.isArray(qArr)) qArr = [];
                const hasQuestionsUrl = !!data.questionsUrl && !data.questions;
                const totalQ = qArr.length;
                const validQ = qArr.filter(isValidExamQuestion).length;
                const blankCount = totalQ - validQ;
                const storedCount = typeof data.questionCount === "number" ? data.questionCount : null;
                const countMismatch = !hasQuestionsUrl && storedCount !== null && storedCount !== validQ;
                const hasCorruption = !hasQuestionsUrl && (blankCount > 0 || countMismatch);

                return {
                    id: d.id,
                    title,
                    category,
                    level,
                    isFree: !!data.isFree,
                    isHidden: !!data.isHidden,
                    catDerived,
                    titleDerived,
                    mismatch,
                    unresolved,
                    totalQ,
                    validQ,
                    blankCount,
                    storedCount,
                    countMismatch,
                    wasString,
                    hasQuestionsUrl,
                    hasCorruption,
                };
            });

            // Sort: problems first (corruption ranks highest), then by title
            const score = (r: ExamRow) =>
                (r.hasCorruption ? 4 : 0) + (r.mismatch ? 2 : 0) + (r.unresolved ? 1 : 0);
            all.sort((a, b) => {
                const d = score(b) - score(a);
                if (d !== 0) return d;
                return a.title.localeCompare(b.title, "th");
            });
            setRows(all);
        } catch (e: any) {
            console.error(e);
            toast.error("โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && isAdmin) load();
    }, [authLoading, isAdmin]);

    const fixRow = async (row: ExamRow, target: ExamLevel) => {
        setFixing(row.id);
        try {
            const { category, level } = DEFAULTS[target];
            await updateDoc(doc(db, "exams", row.id), { category, level });
            toast.success(`แก้ไข "${row.title}" → ${LABEL[target]}`);
            // Update locally
            setRows((prev) =>
                prev.map((r) =>
                    r.id === row.id
                        ? {
                            ...r,
                            category,
                            level,
                            catDerived: target,
                            mismatch: false,
                            unresolved: false,
                        }
                        : r
                )
            );
        } catch (e: any) {
            console.error(e);
            toast.error("บันทึกไม่สำเร็จ");
        } finally {
            setFixing(null);
        }
    };

    // Remove blank/corrupt questions from one exam, preserving storage shape
    // (array vs JSON-string) and recomputing the denormalized questionCount.
    const fixCorruptQuestions = async (row: ExamRow) => {
        if (row.hasQuestionsUrl) {
            toast("ข้อสอบนี้ใช้ไฟล์ภายนอก (questionsUrl) — ต้องแก้ที่ไฟล์ต้นทาง");
            return;
        }
        setFixing(row.id);
        try {
            // Re-read fresh to avoid acting on a stale list snapshot
            const dref = doc(db, "exams", row.id);
            const fresh = await getDoc(dref);
            if (!fresh.exists()) {
                toast.error("ไม่พบเอกสารข้อสอบ");
                return;
            }
            const data = fresh.data() as any;
            const rawQ = data.questions;
            const wasString = typeof rawQ === "string";
            let qArr: any[] = [];
            if (wasString) {
                try { qArr = JSON.parse(rawQ); } catch { qArr = []; }
            } else if (Array.isArray(rawQ)) {
                qArr = rawQ;
            }
            if (!Array.isArray(qArr)) qArr = [];

            const cleaned = qArr.filter(isValidExamQuestion);
            const removed = qArr.length - cleaned.length;
            if (removed === 0 && data.questionCount === cleaned.length) {
                toast("ไม่พบข้อมูลที่ต้องแก้");
                return;
            }

            await updateDoc(dref, {
                questions: wasString ? JSON.stringify(cleaned) : cleaned,
                questionCount: cleaned.length,
                updatedAt: serverTimestamp(),
            });
            toast.success(`ลบข้อว่าง ${removed} ข้อจาก "${row.title}" — เหลือ ${cleaned.length} ข้อ`);
            setRows((prev) =>
                prev.map((r) =>
                    r.id === row.id
                        ? {
                            ...r,
                            totalQ: cleaned.length,
                            validQ: cleaned.length,
                            blankCount: 0,
                            storedCount: cleaned.length,
                            countMismatch: false,
                            hasCorruption: false,
                        }
                        : r
                )
            );
        } catch (e: any) {
            console.error(e);
            toast.error("ลบข้อสอบว่างไม่สำเร็จ");
        } finally {
            setFixing(null);
        }
    };

    const fixAllCorrupt = async () => {
        const targets = rows.filter((r) => r.hasCorruption && !r.hasQuestionsUrl);
        if (targets.length === 0) {
            toast("ไม่มีข้อสอบที่ต้องซ่อม");
            return;
        }
        if (!confirm(`พบ ${targets.length} ชุดที่มีข้อว่าง/จำนวนข้อไม่ตรง\nระบบจะลบข้อว่างออกและแก้จำนวนข้อให้ถูกต้อง ดำเนินการต่อ?`)) return;
        // Sequential — avoids write bursts and keeps toasts readable
        for (const r of targets) {
            await fixCorruptQuestions(r);
        }
        toast.success("ซ่อมข้อสอบที่มีปัญหาเสร็จแล้ว");
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }
    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-700">จำเป็นต้องเป็นแอดมิน</h1>
                    <Link href="/" className="inline-block mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg">
                        กลับหน้าหลัก
                    </Link>
                </div>
            </div>
        );
    }

    const mismatchCount = rows.filter((r) => r.mismatch).length;
    const unresolvedCount = rows.filter((r) => r.unresolved).length;
    const corruptionCount = rows.filter((r) => r.hasCorruption).length;
    const okCount = rows.length - mismatchCount - unresolvedCount;

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto">
                <Link
                    href="/admin/exams"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4 text-sm"
                >
                    <ArrowLeft size={16} />
                    กลับไปคลังข้อสอบ
                </Link>

                <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800">
                        🔍 ตรวจสอบการตั้งค่าข้อสอบ
                    </h1>
                    <div className="flex items-center gap-2 flex-wrap">
                        {corruptionCount > 0 && (
                            <button
                                onClick={fixAllCorrupt}
                                disabled={loading || fixing !== null}
                                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-bold flex items-center gap-2 text-sm disabled:opacity-50"
                            >
                                <Wrench size={14} />
                                ซ่อมข้อสอบว่างทั้งหมด ({corruptionCount})
                            </button>
                        )}
                        <button
                            onClick={load}
                            disabled={loading}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                            {loading ? "กำลังโหลด" : "Refresh"}
                        </button>
                    </div>
                </div>
                <p className="text-slate-500 mb-6">
                    สแกนข้อสอบทุกชุดเพื่อหาอันที่ <b>ชื่อ</b> กับ <b>หมวดหมู่/ระดับ</b> ไม่สอดคล้อง
                    — ปัญหาเดียวกับ "สอบเข้า ม.1 ชุดที่ 7" ที่ถูกล็อกให้คนซื้อคลังข้อสอบประถมอยู่ก่อนหน้านี้
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <Stat icon={<AlertTriangle size={18} />} label="ข้อว่าง / นับไม่ตรง" value={corruptionCount} tone="warn" />
                    <Stat icon={<AlertTriangle size={18} />} label="หมวดไม่ตรงกับชื่อ" value={mismatchCount} tone="warn" />
                    <Stat icon={<AlertTriangle size={18} />} label="ยังไม่ระบุ category" value={unresolvedCount} tone="warn" />
                    <Stat icon={<CheckCircle2 size={18} />} label="ปกติ" value={okCount} tone="ok" />
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-400">
                        <Loader2 className="animate-spin mx-auto mb-2" size={28} />
                        กำลังสแกน…
                    </div>
                ) : rows.length === 0 ? (
                    <p className="text-slate-400 text-center py-12">ไม่มีข้อสอบ</p>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
                                <tr>
                                    <th className="p-3 text-left">สถานะ</th>
                                    <th className="p-3 text-left">ชื่อข้อสอบ</th>
                                    <th className="p-3 text-left">Category/Level</th>
                                    <th className="p-3 text-left">จาก Title</th>
                                    <th className="p-3 text-right">แก้ไขให้เป็น…</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr
                                        key={r.id}
                                        className={`border-t border-slate-100 ${r.hasCorruption
                                            ? "bg-rose-50/60"
                                            : r.mismatch
                                                ? "bg-amber-50/50"
                                                : r.unresolved
                                                    ? "bg-slate-50/50"
                                                    : ""
                                            }`}
                                    >
                                        <td className="p-3">
                                            <div className="flex flex-col gap-1 items-start">
                                                {r.hasCorruption && (
                                                    <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-xs bg-rose-100 px-2 py-1 rounded">
                                                        <AlertTriangle size={12} />
                                                        {r.blankCount > 0 ? `ข้อว่าง ${r.blankCount}` : "นับไม่ตรง"}
                                                        {r.countMismatch && (
                                                            <span className="font-mono opacity-80">
                                                                (เก็บ {r.storedCount ?? "—"}/จริง {r.validQ})
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                                {r.hasQuestionsUrl && (
                                                    <span className="inline-flex items-center gap-1 text-slate-500 font-bold text-xs bg-slate-100 px-2 py-1 rounded">
                                                        ไฟล์ภายนอก
                                                    </span>
                                                )}
                                                {r.mismatch ? (
                                                    <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-xs bg-amber-100 px-2 py-1 rounded">
                                                        <AlertTriangle size={12} />
                                                        ไม่ตรง
                                                    </span>
                                                ) : r.unresolved ? (
                                                    <span className="inline-flex items-center gap-1 text-slate-500 font-bold text-xs bg-slate-100 px-2 py-1 rounded">
                                                        ไม่ระบุ
                                                    </span>
                                                ) : !r.hasCorruption ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-100 px-2 py-1 rounded">
                                                        <CheckCircle2 size={12} />
                                                        OK
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="p-3 font-medium text-slate-700 max-w-xs truncate" title={r.title}>
                                            {r.title}
                                            {r.isFree && (
                                                <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">FREE</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-slate-500 text-xs font-mono">
                                            {r.category || <em className="text-rose-500">empty</em>} / {r.level || <em className="text-rose-500">empty</em>}
                                            <br />
                                            <span className="text-slate-400">
                                                → {r.catDerived ? LABEL[r.catDerived] : "—"}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-500 text-xs">
                                            {r.titleDerived ? (
                                                <span className="font-bold text-indigo-600">{LABEL[r.titleDerived]}</span>
                                            ) : (
                                                <span className="text-slate-400">ไม่ชัดเจน</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex flex-col gap-1 items-end">
                                                {r.titleDerived && (r.mismatch || r.unresolved) && (
                                                    <button
                                                        onClick={() => fixRow(r, r.titleDerived!)}
                                                        disabled={fixing === r.id}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-bold disabled:opacity-50"
                                                    >
                                                        {fixing === r.id ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            <Wrench size={12} />
                                                        )}
                                                        {LABEL[r.titleDerived]}
                                                    </button>
                                                )}
                                                {r.hasCorruption && !r.hasQuestionsUrl && (
                                                    <button
                                                        onClick={() => fixCorruptQuestions(r)}
                                                        disabled={fixing === r.id}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-xs font-bold disabled:opacity-50"
                                                    >
                                                        {fixing === r.id ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            <Wrench size={12} />
                                                        )}
                                                        ลบข้อว่าง{r.blankCount > 0 ? ` (${r.blankCount})` : ""}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                    <p className="font-bold mb-1">📝 คำอธิบาย</p>
                    <ul className="list-disc pl-5 space-y-0.5 text-blue-700">
                        <li><b>ข้อว่าง / นับไม่ตรง</b> — ชุดมีข้อที่ไม่มีโจทย์/ตัวเลือก/รูป (ทำให้หน้าทำข้อสอบค้างขึ้น "เกิดข้อผิดพลาด") หรือ questionCount ไม่ตรงกับจำนวนข้อจริง → กดปุ่ม <b>สีแดง "ลบข้อว่าง"</b> เพื่อล้างและแก้จำนวนข้อให้ถูกต้อง</li>
                        <li><b>ไม่ตรง</b> — ชื่อชุดข้อสอบบอกระดับหนึ่ง แต่ category/level ถูกตั้งเป็นอีกระดับ → คนซื้อผิด level จะเข้าไม่ได้</li>
                        <li><b>ไม่ระบุ</b> — category/level ว่างหรือ regex จับไม่ได้ → แต่ถ้า title ชัดเจน ระบบ guard ยังใช้ title ช่วย match ให้</li>
                        <li>กดปุ่ม <b>สีม่วง</b> เพื่อแก้หมวดให้ตรงกับ title อัตโนมัติ</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "ok" | "warn" }) {
    const cls =
        tone === "ok"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-amber-50 border-amber-200 text-amber-700";
    return (
        <div className={`border rounded-xl p-4 ${cls}`}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-70">
                {icon}
                <span>{label}</span>
            </div>
            <p className="text-2xl font-black mt-1">{value}</p>
        </div>
    );
}
