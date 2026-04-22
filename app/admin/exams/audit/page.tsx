"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useUserAuth } from "@/context/AuthContext";
import { deriveExamLevel, type ExamLevel } from "@/lib/exam-level";
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
                };
            });

            // Sort: problems first, then by title
            all.sort((a, b) => {
                const aProb = a.mismatch ? 2 : a.unresolved ? 1 : 0;
                const bProb = b.mismatch ? 2 : b.unresolved ? 1 : 0;
                if (aProb !== bProb) return bProb - aProb;
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
                    <button
                        onClick={load}
                        disabled={loading}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        {loading ? "กำลังโหลด" : "Refresh"}
                    </button>
                </div>
                <p className="text-slate-500 mb-6">
                    สแกนข้อสอบทุกชุดเพื่อหาอันที่ <b>ชื่อ</b> กับ <b>หมวดหมู่/ระดับ</b> ไม่สอดคล้อง
                    — ปัญหาเดียวกับ "สอบเข้า ม.1 ชุดที่ 7" ที่ถูกล็อกให้คนซื้อคลังข้อสอบประถมอยู่ก่อนหน้านี้
                </p>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
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
                                        className={`border-t border-slate-100 ${r.mismatch
                                            ? "bg-amber-50/50"
                                            : r.unresolved
                                                ? "bg-slate-50/50"
                                                : ""
                                            }`}
                                    >
                                        <td className="p-3">
                                            {r.mismatch ? (
                                                <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-xs bg-amber-100 px-2 py-1 rounded">
                                                    <AlertTriangle size={12} />
                                                    ไม่ตรง
                                                </span>
                                            ) : r.unresolved ? (
                                                <span className="inline-flex items-center gap-1 text-slate-500 font-bold text-xs bg-slate-100 px-2 py-1 rounded">
                                                    ไม่ระบุ
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-100 px-2 py-1 rounded">
                                                    <CheckCircle2 size={12} />
                                                    OK
                                                </span>
                                            )}
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
