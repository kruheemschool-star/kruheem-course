"use client";
// สถิติคลังข้อสอบ (/admin/exam-stats) — ตอบคำถามเดียว: "คนที่เข้ามาดูชุดข้อสอบ
// หายไปตรงไหน" ผ่านบันได ดู → เริ่มทำ → ส่ง รายชุด พร้อมป้ายสัญญาณอัตโนมัติ
// ดีไซน์อยู่บน .kh-admin (kh-card / kh-table / kh-pill) ให้กลืนกับหลังบ้านเดิม
import { useMemo, useState } from "react";
import { RefreshCw, Search, ChevronDown, ChevronUp, Info } from "lucide-react";
import {
    useExamStats,
    EXAM_STATS_EPOCH,
    type ExamStatsPeriod,
    type ExamStatsFixture,
    type ExamDayDoc,
} from "@/hooks/useExamStats";
import { bangkokDateKey } from "@/lib/examStats";

type Counters = Record<string, number>;

const START_KEYS = ["s_member", "s_trial", "s_guest"] as const;
const SUBMIT_KEYS = ["c_member", "c_trial", "c_guest"] as const;
const BUY_KEYS = ["buy_banner", "buy_paywall", "buy_diag"] as const;

const USER_TYPE_LABEL: Record<string, string> = {
    member: "สมาชิก",
    trial: "ทดลองทำ",
    guest: "ยังไม่ล็อกอิน",
};

const BUY_LABEL: Record<string, string> = {
    buy_banner: "ป้ายชวนหลังทำเสร็จ",
    buy_paywall: "การ์ดล็อกข้อ 6",
    buy_diag: "หน้าผลสแกนจุดอ่อน",
};

const SRC_LABEL: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    twitter: "X (Twitter)",
    tiktok: "TikTok",
    youtube: "YouTube",
    line: "LINE",
    google: "Google",
    bing: "Bing",
    yahoo: "Yahoo",
    direct: "เข้าตรง/บุ๊กมาร์ก",
    internal: "กดต่อจากหน้าอื่นในเว็บ",
    other: "อื่นๆ",
};

type Signal = "star" | "looker" | "dropper" | "quiet" | null;

const SIGNAL_META: Record<Exclude<Signal, null>, { label: string; pill: string; hint: string }> = {
    star: { label: "ดาวรุ่ง", pill: "kh-pill kh-pill-good", hint: "คนดูเยอะ เริ่มทำและทำจบสูงกว่าค่ากลางของคลัง" },
    looker: { label: "ดูเยอะ เริ่มน้อย", pill: "kh-pill kh-pill-warn", hint: "คนเปิดดูมากแต่สัดส่วนกดเริ่มต่ำกว่าค่ากลางชัดเจน — เช็คหน้าปก/คำโปรย/ราคา" },
    dropper: { label: "เริ่มแล้วทิ้งกลางทาง", pill: "kh-pill kh-pill-danger", hint: "กดเริ่มแล้วส่งน้อยผิดปกติ — ชุดอาจยาว/ยากเกินช่วงต้น" },
    quiet: { label: "เงียบ", pill: "kh-pill kh-pill-ink", hint: "แทบไม่มีคนเปิดดูในช่วงนี้ — ยังไม่ถูกโปรโมตหรือหาไม่เจอ" },
};

const fmt = (n: number) => n.toLocaleString("en-US");
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function sumKeys(c: Counters, keys: readonly string[]): number {
    return keys.reduce((acc, k) => acc + (c[k] || 0), 0);
}

function addCounters(target: Counters, src: Counters) {
    for (const [k, v] of Object.entries(src)) target[k] = (target[k] || 0) + v;
}

/** รวมตัวนับทุกวันในช่วง → ต่อชุด + ก้อนรวม */
function aggregate(days: ExamDayDoc[]): { perSet: Record<string, Counters>; total: Counters } {
    const perSet: Record<string, Counters> = {};
    const total: Counters = {};
    for (const day of days) {
        for (const [examId, counters] of Object.entries(day.sets)) {
            if (!perSet[examId]) perSet[examId] = {};
            addCounters(perSet[examId], counters);
            addCounters(total, counters);
        }
    }
    return { perSet, total };
}

function median(values: number[]): number | null {
    if (values.length === 0) return null;
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** ป้ายสัญญาณอัตโนมัติ เทียบกับ "ค่ากลางของคลังในช่วงเดียวกัน" */
function computeSignals(rows: { id: string; v: number; s: number; c: number }[]): Record<string, Signal> {
    const startRates = rows.filter((r) => r.v >= 30 && r.s > 0).map((r) => r.s / r.v);
    const completeRates = rows.filter((r) => r.s >= 5 && r.c > 0).map((r) => r.c / r.s);
    const medStart = median(startRates);
    const medComplete = median(completeRates);

    const out: Record<string, Signal> = {};
    for (const r of rows) {
        let sig: Signal = null;
        const startRate = r.v > 0 ? r.s / r.v : 0;
        const completeRate = r.s > 0 ? r.c / r.s : 0;
        if (
            medStart !== null && medComplete !== null &&
            r.v >= 50 && r.c >= 5 && startRate >= medStart && completeRate >= medComplete
        ) {
            sig = "star";
        } else if (medComplete !== null && r.s >= 10 && completeRate < medComplete * 0.5) {
            sig = "dropper";
        } else if (medStart !== null && r.v >= 50 && startRate < medStart * 0.5) {
            sig = "looker";
        } else if (r.v < 10 && r.s === 0) {
            sig = "quiet";
        }
        out[r.id] = sig;
    }
    return out;
}

/** แกนวันที่เต็มช่วง (เติมวันที่ไม่มีเอกสารเป็นศูนย์ ให้กราฟไม่โหว่) */
function buildDateAxis(period: ExamStatsPeriod): string[] {
    const today = bangkokDateKey();
    const from = period === "all" ? EXAM_STATS_EPOCH : bangkokDateKey(new Date(Date.now() - (period - 1) * 86400000));
    const dates: string[] = [];
    // เดินทีละวันจาก from → today (สตริง YYYY-MM-DD เทียบได้ตรงตัว)
    let cursor = new Date(`${from}T00:00:00+07:00`).getTime();
    const end = new Date(`${today}T00:00:00+07:00`).getTime();
    while (cursor <= end && dates.length < 400) {
        dates.push(bangkokDateKey(new Date(cursor)));
        cursor += 86400000;
    }
    return dates;
}

const thDate = (iso: string) =>
    new Date(`${iso}T00:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });

// ─── กราฟเส้นรายวัน (SVG ล้วน สไตล์เดียวกับ TrafficChart) ───────────────────
interface TrendSeries {
    label: string;
    color: string;
    values: number[];
}

function TrendChart({ dates, series, height = 170 }: { dates: string[]; series: TrendSeries[]; height?: number }) {
    const W = 600;
    const H = height;
    const padX = 10;
    const baseY = H - 30;
    const topY = 14;
    const max = Math.max(1, ...series.flatMap((s) => s.values));
    const x = (i: number) => (dates.length <= 1 ? W / 2 : padX + (i * (W - padX * 2)) / (dates.length - 1));
    const y = (v: number) => baseY - (v / max) * (baseY - topY);

    return (
        <div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="กราฟแนวโน้มรายวัน">
                <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke="var(--line)" strokeWidth="1" />
                {series.map((s) => (
                    <g key={s.label}>
                        <polyline
                            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
                            fill="none"
                            stroke={s.color}
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                        {s.values.map((v, i) => (
                            <circle key={i} cx={x(i)} cy={y(v)} r="6" fill="transparent" stroke="none">
                                <title>{`${thDate(dates[i])} — ${s.label}: ${fmt(v)} ครั้ง`}</title>
                            </circle>
                        ))}
                    </g>
                ))}
                {dates.length > 0 && (
                    <>
                        <text x={padX} y={H - 10} fontSize="11" fill="var(--ink-3)">{thDate(dates[0])}</text>
                        {dates.length > 2 && (
                            <text x={W / 2} y={H - 10} fontSize="11" fill="var(--ink-3)" textAnchor="middle">
                                {thDate(dates[Math.floor(dates.length / 2)])}
                            </text>
                        )}
                        {dates.length > 1 && (
                            <text x={W - padX} y={H - 10} fontSize="11" fill="var(--ink-3)" textAnchor="end">
                                {thDate(dates[dates.length - 1])}
                            </text>
                        )}
                    </>
                )}
            </svg>
            <div className="flex flex-wrap gap-4 mt-1">
                {series.map((s) => (
                    <span key={s.label} className="inline-flex items-center gap-1.5 text-xs kh-ink2">
                        <span className="inline-block w-3.5 h-[3px] rounded-full" style={{ background: s.color }} />
                        {s.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ─── การ์ดสรุปตัวเลขใหญ่ ────────────────────────────────────────────────────
function Kpi({ label, value, suffix, compare, subtitle }: {
    label: string;
    value: string;
    suffix?: string;
    compare?: number | null; // % เทียบช่วงก่อน (null = ไม่มีฐานเทียบ)
    subtitle?: string;
}) {
    return (
        <div className="kh-card p-4">
            <p className="text-[13px] kh-ink2 mb-1">{label}</p>
            <p className="text-2xl font-bold kh-ink leading-none">
                {value}
                {suffix && <span className="text-xs font-normal kh-ink3 ml-1">{suffix}</span>}
            </p>
            {typeof compare === "number" ? (
                <p className={`text-xs mt-1.5 ${compare >= 0 ? "text-[var(--good)]" : "text-[var(--danger)]"}`}>
                    {compare >= 0 ? "▲" : "▼"} {Math.abs(compare)}% จากช่วงก่อนหน้า
                </p>
            ) : subtitle ? (
                <p className="text-xs kh-ink3 mt-1.5">{subtitle}</p>
            ) : null}
        </div>
    );
}

// ─── บอร์ดหลัก ──────────────────────────────────────────────────────────────
export default function ExamStatsBoard({ fixture }: { fixture?: ExamStatsFixture }) {
    const [period, setPeriod] = useState<ExamStatsPeriod>(7);
    const { loading, error, days, prevDays, toc, averages, refresh } = useExamStats(period, fixture);

    const [search, setSearch] = useState("");
    const [levelFilter, setLevelFilter] = useState("ทั้งหมด");
    const [sortKey, setSortKey] = useState<"v" | "s" | "c" | "rate" | "buy">("v");
    const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const { perSet, total } = useMemo(() => aggregate(days), [days]);
    const { total: prevTotal } = useMemo(() => aggregate(prevDays), [prevDays]);

    const totalViews = total.v || 0;
    const totalStarts = sumKeys(total, START_KEYS);
    const totalSubmits = sumKeys(total, SUBMIT_KEYS);
    const completeRate = pct(totalSubmits, totalStarts);

    const compare = (cur: number, prev: number): number | null =>
        period !== "all" && prevDays.length > 0 && prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

    // แถวตาราง: ชุดในสารบัญทั้งหมด + ชุดนอกสารบัญที่มีตัวเลข (ถูกซ่อน/ถูกลบ)
    const rows = useMemo(() => {
        const tocIds = new Set(toc.map((t) => t.id));
        const base = toc.map((t) => {
            const c = perSet[t.id] || {};
            return {
                id: t.id,
                title: t.title,
                level: t.level,
                isFree: t.isFree,
                inToc: true,
                v: c.v || 0,
                s: sumKeys(c, START_KEYS),
                cFull: sumKeys(c, SUBMIT_KEYS),
                buy: sumKeys(c, BUY_KEYS),
                counters: c,
            };
        });
        const extra = Object.entries(perSet)
            .filter(([id]) => !tocIds.has(id))
            .map(([id, c]) => ({
                id,
                title: `(ชุดนอกสารบัญ) ${id}`,
                level: "",
                isFree: false,
                inToc: false,
                v: c.v || 0,
                s: sumKeys(c, START_KEYS),
                cFull: sumKeys(c, SUBMIT_KEYS),
                buy: sumKeys(c, BUY_KEYS),
                counters: c,
            }));
        return [...base, ...extra];
    }, [toc, perSet]);

    const signals = useMemo(
        () => computeSignals(rows.map((r) => ({ id: r.id, v: r.v, s: r.s, c: r.cFull }))),
        [rows]
    );

    const levels = useMemo(() => {
        const ls = Array.from(new Set(toc.map((t) => t.level).filter(Boolean)));
        return ["ทั้งหมด", ...ls];
    }, [toc]);

    const visibleRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = rows.filter((r) => {
            if (levelFilter !== "ทั้งหมด" && r.level !== levelFilter) return false;
            if (q && !r.title.toLowerCase().includes(q)) return false;
            return true;
        });
        const val = (r: (typeof rows)[number]) =>
            sortKey === "v" ? r.v : sortKey === "s" ? r.s : sortKey === "c" ? r.cFull : sortKey === "buy" ? r.buy : pct(r.cFull, r.s);
        filtered.sort((a, b) => (sortDir === "desc" ? val(b) - val(a) : val(a) - val(b)));
        return filtered;
    }, [rows, search, levelFilter, sortKey, sortDir]);

    // ชุดข้อมูลกราฟรวมรายวัน
    const dateAxis = useMemo(() => buildDateAxis(period), [period]);
    const dayByDate = useMemo(() => {
        const m = new Map<string, Counters>();
        for (const d of days) {
            const t: Counters = {};
            for (const counters of Object.values(d.sets)) addCounters(t, counters);
            m.set(d.date, t);
        }
        return m;
    }, [days]);
    const overviewSeries: TrendSeries[] = useMemo(
        () => [
            { label: "เปิดดู", color: "var(--accent)", values: dateAxis.map((d) => dayByDate.get(d)?.v || 0) },
            { label: "เริ่มทำ", color: "var(--accent-2)", values: dateAxis.map((d) => sumKeys(dayByDate.get(d) || {}, START_KEYS)) },
            { label: "ส่งข้อสอบ", color: "#F59E0B", values: dateAxis.map((d) => sumKeys(dayByDate.get(d) || {}, SUBMIT_KEYS)) },
        ],
        [dateAxis, dayByDate]
    );

    const hasAnyData = days.some((d) => Object.keys(d.sets).length > 0);

    const toggleSort = (key: typeof sortKey) => {
        if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const sortArrow = (key: typeof sortKey) => (sortKey === key ? (sortDir === "desc" ? " ↓" : " ↑") : "");

    return (
        <div className="space-y-5">
            {/* แถบเลือกช่วงเวลา */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {([7, 30, "all"] as ExamStatsPeriod[]).map((p) => (
                        <button
                            key={String(p)}
                            className="kh-tab"
                            data-active={period === p ? "true" : undefined}
                            onClick={() => setPeriod(p)}
                        >
                            {p === "all" ? "ทั้งหมด" : `${p} วัน`}
                        </button>
                    ))}
                </div>
                <button className="kh-btn-ghost inline-flex items-center gap-2 text-sm" onClick={refresh} disabled={loading}>
                    <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> รีเฟรช
                </button>
            </div>

            {error && (
                <div className="kh-card p-5 border-[var(--danger)]/40">
                    <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
            )}

            {!loading && !hasAnyData && !error && (
                <div className="kh-card p-5 flex items-start gap-3">
                    <Info size={18} className="kh-ink3 shrink-0 mt-0.5" />
                    <div className="text-sm kh-ink2 leading-relaxed">
                        <p className="font-bold kh-ink mb-1">ยังไม่มีตัวเลขในช่วงนี้</p>
                        <p>
                            ตัวนับเริ่มเก็บตั้งแต่ {thDate(EXAM_STATS_EPOCH)} เป็นต้นไป และจะเดินเมื่อกติกา Firestore
                            เวอร์ชันใหม่ถูกดีพลอยแล้ว (คำสั่ง <code className="font-mono text-xs">firebase deploy --only firestore:rules</code>)
                            — หลังจากนั้นทุกการเปิดดู เริ่มทำ และส่งข้อสอบจะไหลเข้าหน้านี้อัตโนมัติ
                        </p>
                    </div>
                </div>
            )}

            {/* การ์ดสรุป 4 ใบ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi
                    label="คนเปิดดูหน้าชุด"
                    value={fmt(totalViews)}
                    suffix="ครั้ง"
                    compare={compare(totalViews, prevTotal.v || 0)}
                />
                <Kpi
                    label="กดเริ่มทำ"
                    value={fmt(totalStarts)}
                    suffix="ครั้ง"
                    compare={compare(totalStarts, sumKeys(prevTotal, START_KEYS))}
                />
                <Kpi
                    label="ส่งข้อสอบ (รอบเต็ม)"
                    value={fmt(totalSubmits)}
                    suffix="ครั้ง"
                    compare={compare(totalSubmits, sumKeys(prevTotal, SUBMIT_KEYS))}
                />
                <Kpi label="อัตราทำจนจบ" value={`${completeRate}%`} subtitle="ของคนที่กดเริ่มทำ" />
            </div>

            {/* บันไดการแปลง */}
            <div className="kh-card p-5">
                <p className="kh-eyebrow mb-2">บันไดการแปลง</p>
                <p className="text-sm kh-ink2 mb-3">
                    ทุก 100 ครั้งที่เปิดดู → กดเริ่มทำ {pct(totalStarts, totalViews)} ครั้ง → ส่งข้อสอบ {pct(totalSubmits, totalViews)} ครั้ง
                </p>
                <div className="space-y-2">
                    {[
                        { label: "เปิดดู", value: totalViews, color: "var(--accent-soft)", text: "var(--accent)" },
                        { label: "เริ่มทำ", value: totalStarts, color: "var(--accent-2)", text: "#fff" },
                        { label: "ส่ง", value: totalSubmits, color: "var(--accent)", text: "#fff" },
                    ].map((step) => (
                        <div key={step.label} className="flex items-center gap-3">
                            <span className="text-xs kh-ink2 w-14 shrink-0">{step.label}</span>
                            <div className="flex-1 h-7 rounded-lg bg-[var(--paper)] overflow-hidden">
                                <div
                                    className="h-full rounded-lg flex items-center px-2.5 transition-all"
                                    style={{
                                        width: `${totalViews > 0 ? Math.max(6, (step.value / Math.max(1, totalViews)) * 100) : 6}%`,
                                        background: step.color,
                                        minWidth: "3.5rem",
                                    }}
                                >
                                    <span className="text-xs font-bold whitespace-nowrap" style={{ color: step.text }}>
                                        {fmt(step.value)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {(totalStarts > 0 || totalSubmits > 0) && (
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs kh-ink2">
                        <span className="kh-ink3">สัดส่วนคนเริ่มทำ:</span>
                        {START_KEYS.map((k) => {
                            const type = k.replace("s_", "");
                            return (
                                <span key={k}>
                                    {USER_TYPE_LABEL[type]} {pct(total[k] || 0, totalStarts)}%
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* กราฟแนวโน้มรายวัน */}
            <div className="kh-card p-5">
                <p className="kh-eyebrow mb-3">แนวโน้มรายวัน</p>
                <TrendChart dates={dateAxis} series={overviewSeries} />
            </div>

            {/* ตารางรายชุด */}
            <div className="kh-card !p-0 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 p-4 pb-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 kh-ink3" />
                        <input
                            className="kh-input w-full !pl-9"
                            placeholder="ค้นหาชื่อชุดข้อสอบ…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select className="kh-select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                        {levels.map((l) => (
                            <option key={l} value={l}>
                                {l === "ทั้งหมด" ? "ทุกระดับชั้น" : l}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="kh-table w-full text-sm">
                        <thead>
                            <tr>
                                <th className="text-left">ชุดข้อสอบ</th>
                                <th className="text-right cursor-pointer select-none" onClick={() => toggleSort("v")}>ดู{sortArrow("v")}</th>
                                <th className="text-right cursor-pointer select-none" onClick={() => toggleSort("s")}>เริ่ม{sortArrow("s")}</th>
                                <th className="text-right cursor-pointer select-none" onClick={() => toggleSort("c")}>ส่ง{sortArrow("c")}</th>
                                <th className="text-right cursor-pointer select-none" onClick={() => toggleSort("rate")}>%จบ{sortArrow("rate")}</th>
                                <th className="text-right cursor-pointer select-none" onClick={() => toggleSort("buy")}>คลิกซื้อ{sortArrow("buy")}</th>
                                <th className="text-left">สัญญาณ</th>
                                <th className="w-8" />
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 kh-ink3">กำลังโหลดข้อมูล…</td>
                                </tr>
                            )}
                            {!loading && visibleRows.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 kh-ink3">ไม่พบชุดข้อสอบตามเงื่อนไขที่เลือก</td>
                                </tr>
                            )}
                            {!loading &&
                                visibleRows.map((r) => {
                                    const sig = signals[r.id];
                                    const expanded = expandedId === r.id;
                                    const avg = averages[r.id];
                                    return (
                                        <ExamRow
                                            key={r.id}
                                            row={r}
                                            signal={sig}
                                            expanded={expanded}
                                            onToggle={() => setExpandedId(expanded ? null : r.id)}
                                            days={days}
                                            dateAxis={dateAxis}
                                            memberStats={avg}
                                        />
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
                <p className="px-4 py-3 text-xs kh-ink3 leading-relaxed border-t border-[var(--line)]">
                    ป้ายสัญญาณเทียบกับค่ากลางของทั้งคลังในช่วงเวลาเดียวกัน:
                    {" "}
                    {(Object.keys(SIGNAL_META) as Exclude<Signal, null>[]).map((k, i) => (
                        <span key={k}>
                            {i > 0 && " · "}
                            <b>{SIGNAL_META[k].label}</b> = {SIGNAL_META[k].hint}
                        </span>
                    ))}
                </p>
            </div>
        </div>
    );
}

// ─── แถวตาราง + แผงเจาะลึกรายชุด ───────────────────────────────────────────
interface RowData {
    id: string;
    title: string;
    level: string;
    isFree: boolean;
    inToc: boolean;
    v: number;
    s: number;
    cFull: number;
    buy: number;
    counters: Counters;
}

function ExamRow({ row, signal, expanded, onToggle, days, dateAxis, memberStats }: {
    row: RowData;
    signal: Signal;
    expanded: boolean;
    onToggle: () => void;
    days: ExamDayDoc[];
    dateAxis: string[];
    memberStats?: { count: number; avgPercent: number; attempts: number };
}) {
    const rate = pct(row.cFull, row.s);
    return (
        <>
            <tr onClick={onToggle} className="cursor-pointer">
                <td className="max-w-[320px]">
                    <span className="font-medium kh-ink line-clamp-1">{row.title}</span>
                    <span className="flex items-center gap-1.5 mt-0.5">
                        {row.level && <span className="text-[11px] kh-ink3">{row.level}</span>}
                        {row.isFree && <span className="kh-pill kh-pill-accent !text-[10px] !py-0">ฟรี</span>}
                    </span>
                </td>
                <td className="text-right tabular-nums">{fmt(row.v)}</td>
                <td className="text-right tabular-nums">{fmt(row.s)}</td>
                <td className="text-right tabular-nums">{fmt(row.cFull)}</td>
                <td className="text-right tabular-nums">{row.s > 0 ? `${rate}%` : "–"}</td>
                <td className="text-right tabular-nums">{row.buy > 0 ? fmt(row.buy) : "–"}</td>
                <td>{signal ? <span className={`${SIGNAL_META[signal].pill} !text-[11px]`}>{SIGNAL_META[signal].label}</span> : null}</td>
                <td className="text-center kh-ink3">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={8} className="!bg-[var(--paper)]">
                        <ExamDetail row={row} days={days} dateAxis={dateAxis} memberStats={memberStats} />
                    </td>
                </tr>
            )}
        </>
    );
}

function ExamDetail({ row, days, dateAxis, memberStats }: {
    row: RowData;
    days: ExamDayDoc[];
    dateAxis: string[];
    memberStats?: { count: number; avgPercent: number; attempts: number };
}) {
    const byDate = new Map(days.map((d) => [d.date, d.sets[row.id] || {}]));
    const series: TrendSeries[] = [
        { label: "เปิดดู", color: "var(--accent)", values: dateAxis.map((d) => byDate.get(d)?.v || 0) },
        { label: "เริ่มทำ", color: "var(--accent-2)", values: dateAxis.map((d) => sumKeys(byDate.get(d) || {}, START_KEYS)) },
        { label: "ส่ง", color: "#F59E0B", values: dateAxis.map((d) => sumKeys(byDate.get(d) || {}, SUBMIT_KEYS)) },
    ];
    const c = row.counters;
    const srcEntries = Object.entries(c)
        .filter(([k, v]) => k.startsWith("src_") && v > 0)
        .map(([k, v]) => ({ key: k.replace("src_", ""), n: v }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 6);
    const srcMax = Math.max(1, ...srcEntries.map((s) => s.n));

    const infoItems: { label: string; value: string }[] = [
        { label: "สมาชิกที่มีผลบันทึก", value: memberStats ? `${fmt(memberStats.count)} คน` : "–" },
        { label: "คะแนนเฉลี่ยสมาชิก", value: memberStats && memberStats.count > 0 ? `${memberStats.avgPercent}%` : "–" },
        { label: "ครั้งส่งสะสมสมาชิก (ตลอดกาล)", value: memberStats ? fmt(memberStats.attempts) : "–" },
        { label: "เปิดหน้าพิมพ์เอกสาร", value: fmt(c.vp || 0) },
        { label: "ส่งรอบย่อย (ควิซย่อย/ข้อผิด)", value: fmt(c.c_subset || 0) },
    ];

    return (
        <div className="grid md:grid-cols-2 gap-5 p-4">
            <div>
                <p className="kh-eyebrow mb-2">แนวโน้มของชุดนี้</p>
                <TrendChart dates={dateAxis} series={series} height={140} />
            </div>
            <div className="space-y-4">
                <div>
                    <p className="kh-eyebrow mb-2">ตัวเลขสำคัญ</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                        {infoItems.map((it) => (
                            <div key={it.label} className="flex items-baseline justify-between gap-2 min-w-0">
                                <span className="text-xs kh-ink3 truncate">{it.label}</span>
                                <span className="font-bold kh-ink tabular-nums shrink-0">{it.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {row.buy > 0 && (
                    <div>
                        <p className="kh-eyebrow mb-2">คลิกปุ่มสมัคร {fmt(row.buy)} ครั้ง</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs kh-ink2">
                            {BUY_KEYS.filter((k) => (c[k] || 0) > 0).map((k) => (
                                <span key={k}>
                                    {BUY_LABEL[k]}: <b>{fmt(c[k] || 0)}</b>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                <div>
                    <p className="kh-eyebrow mb-2">แหล่งที่มาของคนดู</p>
                    {srcEntries.length === 0 ? (
                        <p className="text-xs kh-ink3">ยังไม่มีข้อมูลในช่วงนี้</p>
                    ) : (
                        <div className="space-y-1.5">
                            {srcEntries.map((s) => (
                                <div key={s.key} className="flex items-center gap-2">
                                    <span className="text-xs kh-ink2 w-40 shrink-0 truncate">{SRC_LABEL[s.key] || s.key}</span>
                                    <div className="flex-1 h-2.5 rounded-full bg-[var(--card)] overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{ width: `${(s.n / srcMax) * 100}%`, background: "var(--accent-2)" }}
                                        />
                                    </div>
                                    <span className="text-xs kh-ink tabular-nums w-12 text-right">{fmt(s.n)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
