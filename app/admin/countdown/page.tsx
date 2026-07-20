"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Check, AlertCircle, Clock, Save, ExternalLink } from "lucide-react";
import { DEFAULT_COUNTDOWN, DEFAULT_QUOTES } from "@/components/home/ExamCountdownHero";

// แก้รายละเอียดนาฬิกานับถอยหลังหน้าแรก → เขียนลง settings/homeCountdown
// (คอมโพเนนต์ ExamCountdownHero อ่าน doc นี้ตอนโหลดหน้าแรก)
export default function AdminCountdownPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [examName, setExamName] = useState(DEFAULT_COUNTDOWN.examName);
    const [targetDate, setTargetDate] = useState(DEFAULT_COUNTDOWN.targetDate.slice(0, 16));
    const [startDate, setStartDate] = useState("");
    const [showProgress, setShowProgress] = useState(true);
    const [showQuote, setShowQuote] = useState(true);
    const [quotesText, setQuotesText] = useState(DEFAULT_QUOTES.join("\n"));

    useEffect(() => {
        (async () => {
            try {
                const snap = await getDoc(doc(db, "settings", "homeCountdown"));
                if (snap.exists()) {
                    const d = snap.data() as any;
                    if (typeof d.examName === "string") setExamName(d.examName);
                    if (typeof d.targetDate === "string" && d.targetDate) setTargetDate(d.targetDate.slice(0, 16));
                    if (typeof d.startDate === "string") setStartDate(d.startDate.slice(0, 16));
                    if (typeof d.showProgress === "boolean") setShowProgress(d.showProgress);
                    if (typeof d.showQuote === "boolean") setShowQuote(d.showQuote);
                    if (Array.isArray(d.quotes) && d.quotes.length) setQuotesText(d.quotes.join("\n"));
                }
            } catch {
                setMessage({ type: "error", text: "โหลดข้อมูลไม่สำเร็จ ใช้ค่าเริ่มต้นก่อน" });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const showMessage = (type: "success" | "error", text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3500);
    };

    const handleSave = async () => {
        if (!targetDate) { showMessage("error", "กรุณากรอกวัน-เวลาสอบ"); return; }
        setSaving(true);
        try {
            const quotes = quotesText.split("\n").map((q) => q.trim()).filter(Boolean);
            await setDoc(doc(db, "settings", "homeCountdown"), {
                examName: examName.trim() || DEFAULT_COUNTDOWN.examName,
                targetDate,
                startDate: startDate || "",
                showProgress,
                showQuote,
                quotes: quotes.length ? quotes : DEFAULT_QUOTES,
                updatedAt: serverTimestamp(),
            });
            showMessage("success", "บันทึกแล้ว — รีเฟรชหน้าแรกเพื่อดูผล");
        } catch (e) {
            console.error("[admin/countdown] save failed:", e);
            showMessage("error", "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin kh-ink3" size={32} />
            </div>
        );
    }

    const inputCls = "w-full rounded-xl px-4 py-2.5 text-[14px] outline-none";
    const inputStyle = { background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink)" } as React.CSSProperties;

    return (
        <div className="space-y-6 max-w-2xl">
            {message && (
                <div
                    className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl animate-in slide-in-from-right kh-pill no-dot"
                    style={{
                        fontSize: "13.5px", boxShadow: "var(--shadow)",
                        background: message.type === "success" ? "var(--good-soft)" : "var(--danger-soft)",
                        color: message.type === "success" ? "var(--good)" : "var(--danger)",
                        border: `1px solid ${message.type === "success" ? "var(--good)" : "var(--danger)"}`,
                    }}
                >
                    {message.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            {/* Header */}
            <div className="kh-card flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                    <div className="kh-eyebrow mb-1"><Clock size={14} strokeWidth={2} /> นับถอยหลังหน้าแรก</div>
                    <p className="kh-ink2 text-[13px]">ตั้งชื่อสอบ วันสอบ และข้อความให้กำลังใจ ที่แสดงบนการ์ดนับถอยหลังหน้าแรก</p>
                </div>
                <Link href="/" target="_blank" className="kh-pill no-dot inline-flex items-center gap-1.5" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                    ดูหน้าแรก <ExternalLink size={13} />
                </Link>
            </div>

            {/* Form */}
            <div className="kh-card p-5 space-y-5">
                <div>
                    <label className="block text-[13px] font-semibold kh-ink mb-1.5">ชื่อสอบ (หัวข้อใหญ่)</label>
                    <input className={inputCls} style={inputStyle} value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="เช่น สอบเข้า ม.1" />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[13px] font-semibold kh-ink mb-1.5">วัน-เวลาสอบ *</label>
                        <input type="datetime-local" className={inputCls} style={inputStyle} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                        <p className="kh-ink3 text-[11.5px] mt-1">นาฬิกาจะนับถอยหลังไปถึงเวลานี้</p>
                    </div>
                    <div>
                        <label className="block text-[13px] font-semibold kh-ink mb-1.5">วันเริ่มนับ (แถบความคืบหน้า)</label>
                        <input type="datetime-local" className={inputCls} style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        <p className="kh-ink3 text-[11.5px] mt-1">เว้นว่าง = ใช้ 120 วันก่อนวันสอบ</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-5">
                    <label className="inline-flex items-center gap-2 text-[13.5px] kh-ink cursor-pointer">
                        <input type="checkbox" checked={showProgress} onChange={(e) => setShowProgress(e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
                        แสดงแถบความคืบหน้า
                    </label>
                    <label className="inline-flex items-center gap-2 text-[13.5px] kh-ink cursor-pointer">
                        <input type="checkbox" checked={showQuote} onChange={(e) => setShowQuote(e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
                        แสดงคำคมให้กำลังใจ
                    </label>
                </div>

                <div>
                    <label className="block text-[13px] font-semibold kh-ink mb-1.5">คำคมให้กำลังใจ (บรรทัดละ 1 ข้อความ · หมุนสลับทุก 6 วิ)</label>
                    <textarea className={`${inputCls} font-mono`} style={{ ...inputStyle, minHeight: 150, lineHeight: 1.7 }} value={quotesText} onChange={(e) => setQuotesText(e.target.value)} />
                </div>

                <div className="flex justify-end pt-1">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-bold text-white disabled:opacity-60 transition"
                        style={{ background: "var(--accent)" }}
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
}
