"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/context/AuthContext";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useAdminLearningStats } from "@/hooks/useAdminLearningStats";
import {
    ArrowLeft,
    Copy,
    Download,
    FileText,
    Loader2,
    Check,
    RefreshCw,
} from "lucide-react";
import {
    buildReportMarkdown,
    getReportFilename,
    type ReportRange,
    type ReportInput,
} from "@/lib/reportFormatter";

const RANGE_OPTIONS: { value: ReportRange; label: string; hint: string }[] = [
    { value: "day", label: "รายวัน", hint: "วันนี้" },
    { value: "week", label: "รายสัปดาห์", hint: "7 วันล่าสุด" },
    { value: "month", label: "รายเดือน", hint: "เลือกเดือนได้" },
    { value: "year", label: "รายปี", hint: "ทั้งปี" },
];

export default function AdminReportsPage() {
    const router = useRouter();
    const { user, loading: authLoading, pendingCount: authPendingCount } = useUserAuth();

    const [range, setRange] = useState<ReportRange>("week");
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [copied, setCopied] = useState(false);
    const [generatedAt, setGeneratedAt] = useState<Date>(() => new Date());

    // Admin guard
    useEffect(() => {
        if (authLoading) return;
        if (!user || user.email !== "kruheemschool@gmail.com") {
            router.replace("/");
        }
    }, [authLoading, user, router]);

    const {
        loading: statsLoading,
        pendingCount,
        ticketsCount,
        dailyVisits,
        totalVisits,
        deviceStats,
        sourceStats,
        pageViewStats,
        stats,
        fetchData: refreshStats,
    } = useAdminStats(selectedYear, authPendingCount);

    const {
        loading: learningLoading,
        hasFetched: learningFetched,
        fetchStats: fetchLearningStats,
        overallCompletionRate,
        courseCompletionRates,
        averageActiveDays,
        activeStudentsTrend,
        mostEngagingLessons,
        dropOffPoints,
        topActiveStudents,
    } = useAdminLearningStats();

    // Auto-fetch learning stats once on mount (since report includes them)
    useEffect(() => {
        if (!authLoading && user?.email === "kruheemschool@gmail.com" && !learningFetched && !learningLoading) {
            fetchLearningStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, user, learningFetched]);

    // Build markdown — recompute when inputs change
    const markdown = useMemo(() => {
        if (statsLoading || !user) return "";
        const input: ReportInput = {
            range,
            selectedYear,
            selectedMonth,
            adminEmail: user.email || "unknown",
            generatedAt,
            dailyVisits,
            totalVisits,
            deviceStats,
            sourceStats,
            pageViewStats,
            revenue: {
                totalRevenue: stats.totalRevenue,
                totalStudents: stats.totalStudents,
                revenueGrowth: stats.revenueGrowth,
                aov: stats.aov,
                ltv: stats.ltv,
                retentionRate: stats.retentionRate,
                monthlyData: stats.monthlyData,
                courseData: stats.courseData,
                dailyData: stats.dailyData,
            },
            pendingCount,
            ticketsCount,
            learning: learningFetched
                ? {
                      overallCompletionRate,
                      averageActiveDays,
                      activeStudentsTrend,
                      courseCompletionRates,
                      mostEngagingLessons,
                      dropOffPoints,
                      topActiveStudents,
                  }
                : undefined,
        };
        return buildReportMarkdown(input);
    }, [
        range,
        selectedYear,
        selectedMonth,
        generatedAt,
        statsLoading,
        user,
        dailyVisits,
        totalVisits,
        deviceStats,
        sourceStats,
        pageViewStats,
        stats,
        pendingCount,
        ticketsCount,
        learningFetched,
        overallCompletionRate,
        averageActiveDays,
        activeStudentsTrend,
        courseCompletionRates,
        mostEngagingLessons,
        dropOffPoints,
        topActiveStudents,
    ]);

    const isReady = !statsLoading && markdown.length > 0;
    const charCount = markdown.length;
    const lineCount = markdown ? markdown.split("\n").length : 0;

    const handleCopy = async () => {
        if (!markdown) return;
        try {
            await navigator.clipboard.writeText(markdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed", err);
            alert("คัดลอกไม่สำเร็จ — กรุณาเลือกข้อความใน preview แล้วกด Cmd/Ctrl+C");
        }
    };

    const handleDownload = () => {
        if (!markdown) return;
        const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = getReportFilename(range, generatedAt);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRefresh = async () => {
        setGeneratedAt(new Date());
        await Promise.all([refreshStats(), fetchLearningStats()]);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-slate-400" size={28} />
            </div>
        );
    }

    if (!user || user.email !== "kruheemschool@gmail.com") {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-700">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            prefetch={false}
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <ArrowLeft size={16} />
                            <span>กลับ Admin</span>
                        </Link>
                        <span className="text-slate-300">/</span>
                        <div className="flex items-center gap-2">
                            <FileText size={18} className="text-indigo-500" />
                            <h1 className="text-lg font-semibold text-slate-800">ส่งออกรายงานสถิติ</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
                {/* Intro card */}
                <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 rounded-xl p-5">
                    <p className="text-sm text-slate-700 leading-relaxed">
                        📋 ส่งออกข้อมูลสถิติเว็บไซต์เป็นไฟล์ <strong>Markdown</strong> เพื่อนำไปให้ AI ภายนอก (เช่น ChatGPT, Claude, Gemini) ช่วยวิเคราะห์
                        — ครอบคลุม Traffic, Revenue, Learning Health และงานค้าง
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                        ⚠️ ข้อมูลที่ส่งออกเป็น <strong>aggregated stats</strong> เท่านั้น ไม่มี PII ของนักเรียน
                    </p>
                </div>

                {/* Controls */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    {/* Range picker */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            ช่วงเวลา
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {RANGE_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setRange(opt.value)}
                                    className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                                        range === opt.value
                                            ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <div className="font-semibold">{opt.label}</div>
                                    <div className={`text-[11px] mt-0.5 ${range === opt.value ? "text-slate-300" : "text-slate-400"}`}>
                                        {opt.hint}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Year + Month pickers */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Month picker — only when range === "month" */}
                            {range === "month" && (
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        เลือกเดือน:
                                    </label>
                                    <select
                                        value={selectedMonth}
                                        onChange={e => setSelectedMonth(Number(e.target.value))}
                                        className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium outline-none cursor-pointer hover:border-slate-300"
                                    >
                                        {[
                                            "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
                                            "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
                                        ].map((m, i) => (
                                            <option key={i} value={i}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Year picker — show for month + year ranges */}
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    {range === "month" ? "ปี:" : range === "year" ? "เลือกปี:" : "ปี (สำหรับสรุปรายปี):"}
                                </label>
                                <select
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(Number(e.target.value))}
                                    className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium outline-none cursor-pointer hover:border-slate-300"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                        <option key={year} value={year}>
                                            พ.ศ. {year + 543}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={statsLoading || learningLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={12} className={statsLoading || learningLoading ? "animate-spin" : ""} />
                            รีเฟรชข้อมูล
                        </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                        <button
                            onClick={handleCopy}
                            disabled={!isReady}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {copied ? (
                                <>
                                    <Check size={16} />
                                    คัดลอกแล้ว
                                </>
                            ) : (
                                <>
                                    <Copy size={16} />
                                    คัดลอก Markdown
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={!isReady}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={16} />
                            ดาวน์โหลด .md
                        </button>
                        {isReady && (
                            <span className="text-xs text-slate-400 ml-auto">
                                {lineCount.toLocaleString()} บรรทัด · {charCount.toLocaleString()} ตัวอักษร
                            </span>
                        )}
                    </div>
                </div>

                {/* Status banner */}
                {(statsLoading || (!learningFetched && learningLoading)) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                        <Loader2 className="animate-spin text-amber-600" size={18} />
                        <p className="text-sm text-amber-800">
                            กำลังโหลดข้อมูล… (สถิติเว็บ + การเรียน)
                        </p>
                    </div>
                )}

                {!learningFetched && !learningLoading && !statsLoading && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-sm text-amber-800">
                            ⚠️ ส่วน "สถิติการเรียน" ยังไม่ได้โหลด — กดปุ่มเพื่อดึงข้อมูลก่อน export
                        </p>
                        <button
                            onClick={fetchLearningStats}
                            className="px-4 py-2 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors"
                        >
                            โหลดข้อมูลการเรียน
                        </button>
                    </div>
                )}

                {/* Preview */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-slate-400" />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                Preview (Markdown)
                            </span>
                        </div>
                    </div>
                    <textarea
                        readOnly
                        value={markdown}
                        placeholder={statsLoading ? "กำลังสร้างรายงาน..." : "ไม่มีข้อมูล"}
                        spellCheck={false}
                        className="w-full h-[600px] p-5 font-mono text-xs leading-relaxed text-slate-700 bg-white outline-none resize-none"
                    />
                </div>
            </main>
        </div>
    );
}
