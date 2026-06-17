"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/context/AuthContext";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useAdminLearningStats } from "@/hooks/useAdminLearningStats";
import {
    Copy,
    Download,
    FileText,
    Loader2,
    Check,
    RefreshCw,
    CalendarRange,
    Sparkles,
    ShieldCheck,
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
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin" size={28} style={{ color: "var(--ink-3)" }} />
            </div>
        );
    }

    if (!user || user.email !== "kruheemschool@gmail.com") {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="kh-eyebrow">
                    <FileText size={15} strokeWidth={1.9} /> ส่งออกรายงานสถิติ
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Range tabs */}
                    <div className="flex flex-wrap items-center gap-1">
                        {RANGE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setRange(opt.value)}
                                className="kh-tab"
                                data-active={range === opt.value}
                                title={opt.hint}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Month picker — only when range === "month" */}
                    {range === "month" && (
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(Number(e.target.value))}
                            className="kh-select w-auto"
                            aria-label="เลือกเดือน"
                        >
                            {[
                                "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
                                "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
                            ].map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                    )}

                    {/* Year picker — show for month + year ranges */}
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="kh-select w-auto"
                        aria-label="เลือกปี"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>
                                พ.ศ. {year + 543}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={handleRefresh}
                        disabled={statsLoading || learningLoading}
                        className="kh-btn-ghost"
                    >
                        <RefreshCw size={14} strokeWidth={1.9} className={statsLoading || learningLoading ? "animate-spin" : ""} />
                        รีเฟรชข้อมูล
                    </button>
                </div>
            </div>

            {/* Intro card */}
            <div className="kh-card p-5 flex items-start gap-4">
                <div
                    className="flex items-center justify-center rounded-xl shrink-0"
                    style={{ width: 44, height: 44, background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                >
                    <Sparkles size={20} strokeWidth={1.8} />
                </div>
                <div className="space-y-2">
                    <p className="text-sm leading-relaxed kh-ink2">
                        ส่งออกข้อมูลสถิติเว็บไซต์เป็นไฟล์ <strong className="kh-ink">Markdown</strong> เพื่อนำไปให้ AI ภายนอก (เช่น ChatGPT, Claude, Gemini) ช่วยวิเคราะห์
                        — ครอบคลุม Traffic, Revenue, Learning Health และงานค้าง
                    </p>
                    <p className="kh-eyebrow no-dot" style={{ textTransform: "none" }}>
                        <ShieldCheck size={14} strokeWidth={1.9} style={{ color: "var(--good)" }} />
                        ข้อมูลที่ส่งออกเป็น aggregated stats เท่านั้น ไม่มี PII ของนักเรียน
                    </p>
                </div>
            </div>

            {/* Report cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Markdown export */}
                <div className="kh-card kh-card-h p-5 flex flex-col gap-3">
                    <div
                        className="flex items-center justify-center rounded-xl"
                        style={{ width: 40, height: 40, background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                    >
                        <FileText size={19} strokeWidth={1.8} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold kh-ink">คัดลอก Markdown</div>
                        <p className="text-xs kh-ink3 mt-1 leading-relaxed">
                            คัดลอกรายงานทั้งหมดไปวางในแชต AI ได้ทันที
                        </p>
                    </div>
                    <button
                        onClick={handleCopy}
                        disabled={!isReady}
                        className="kh-btn mt-auto"
                    >
                        {copied ? (
                            <>
                                <Check size={15} strokeWidth={2} />
                                คัดลอกแล้ว
                            </>
                        ) : (
                            <>
                                <Copy size={15} strokeWidth={1.9} />
                                คัดลอก Markdown
                            </>
                        )}
                    </button>
                </div>

                {/* Download .md */}
                <div className="kh-card kh-card-h p-5 flex flex-col gap-3">
                    <div
                        className="flex items-center justify-center rounded-xl"
                        style={{ width: 40, height: 40, background: "var(--good-soft)", color: "var(--good)" }}
                    >
                        <Download size={19} strokeWidth={1.8} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold kh-ink">ดาวน์โหลด .md</div>
                        <p className="text-xs kh-ink3 mt-1 leading-relaxed">
                            บันทึกรายงานเป็นไฟล์ Markdown เก็บไว้
                        </p>
                    </div>
                    <button
                        onClick={handleDownload}
                        disabled={!isReady}
                        className="kh-btn-ghost mt-auto"
                    >
                        <Download size={15} strokeWidth={1.9} />
                        ดาวน์โหลด .md
                    </button>
                </div>

                {/* Range summary */}
                <div className="kh-card p-5 flex flex-col gap-3">
                    <div
                        className="flex items-center justify-center rounded-xl"
                        style={{ width: 40, height: 40, background: "var(--warn-soft)", color: "var(--warn)" }}
                    >
                        <CalendarRange size={19} strokeWidth={1.8} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold kh-ink">ช่วงเวลาที่เลือก</div>
                        <p className="text-xs kh-ink3 mt-1 leading-relaxed">
                            {RANGE_OPTIONS.find(o => o.value === range)?.label} ·{" "}
                            {RANGE_OPTIONS.find(o => o.value === range)?.hint}
                        </p>
                    </div>
                    {isReady && (
                        <div className="mt-auto flex flex-wrap gap-2">
                            <span className="kh-pill kh-pill-ink no-dot kh-num">
                                {lineCount.toLocaleString()} บรรทัด
                            </span>
                            <span className="kh-pill kh-pill-ink no-dot kh-num">
                                {charCount.toLocaleString()} ตัวอักษร
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Status banner */}
            {(statsLoading || (!learningFetched && learningLoading)) && (
                <div
                    className="kh-card p-4 flex items-center gap-3"
                    style={{ background: "var(--warn-soft)", borderColor: "transparent" }}
                >
                    <Loader2 className="animate-spin" size={18} style={{ color: "var(--warn)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--warn)" }}>
                        กำลังโหลดข้อมูล… (สถิติเว็บ + การเรียน)
                    </p>
                </div>
            )}

            {!learningFetched && !learningLoading && !statsLoading && (
                <div
                    className="kh-card p-4 flex items-center justify-between gap-3 flex-wrap"
                    style={{ background: "var(--warn-soft)", borderColor: "transparent" }}
                >
                    <p className="text-sm font-medium" style={{ color: "var(--warn)" }}>
                        ส่วน &quot;สถิติการเรียน&quot; ยังไม่ได้โหลด — กดปุ่มเพื่อดึงข้อมูลก่อน export
                    </p>
                    <button onClick={fetchLearningStats} className="kh-btn">
                        โหลดข้อมูลการเรียน
                    </button>
                </div>
            )}

            {/* Preview */}
            <div className="kh-card overflow-hidden">
                <div
                    className="flex items-center justify-between px-5 py-3"
                    style={{ borderBottom: "1px solid var(--line)", background: "var(--card-2)" }}
                >
                    <div className="kh-eyebrow">
                        <FileText size={14} strokeWidth={1.9} /> Preview (Markdown)
                    </div>
                </div>
                <textarea
                    readOnly
                    value={markdown}
                    placeholder={statsLoading ? "กำลังสร้างรายงาน..." : "ไม่มีข้อมูล"}
                    spellCheck={false}
                    className="w-full h-[600px] p-5 font-mono text-xs leading-relaxed outline-none resize-none kh-ink2"
                    style={{ background: "var(--card-2)", border: "none" }}
                />
            </div>
        </div>
    );
}
