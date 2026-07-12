"use client";

/**
 * นับถอยหลังวันสอบ — การ์ดบนหน้า /exam (ใต้ hero เหนือกล่องสถิติ)
 * สไตล์: โทน amber/orange ตามแบรนด์ (Exam Countdown Redesign - Design Spec.md)
 *
 * 3 สถานะหลัก:
 *   A ยังไม่เลือกสนาม  → กล่องคำถาม + ชิปให้กด
 *   B เลือกแล้ว+มีชุด   → นาฬิกาเต็ม + แผงเวลาฝึก + ปุ่ม "เริ่มตะลุยโจทย์"
 *   C เลือกแล้ว+ไม่มีชุด → นาฬิกา + ฟอร์มรับแจ้งเตือน
 * สถานะกันเหนียว: pending (ยังไม่ประกาศวัน/ไม่มี sourceUrl — ห้ามโชว์นาฬิกา),
 *   expired (สอบไปแล้ว → กลับ A), school-exam (ไม่มีวันสอบกลาง)
 *
 * กับดักที่จัดการแล้ว:
 *   1 Timezone — คำนวณจาก epoch millis ล้วน (ISO จาก REST เป็น UTC เสมอ)
 *   2 Hydration — SSR เรนเดอร์สถานะ A เสมอ แล้วค่อยอ่าน localStorage หลัง mount
 *   3 Re-render — setInterval อยู่ใน <ClockAndModel/> ตัวเดียว + หยุดตอน tab ซ่อน
 *   4 สอบผ่านแล้ว — diff clamp ≥ 0 + เด้งกลับสถานะ A พร้อมข้อความ
 *   5 ปี พ.ศ. — Intl th-TH-u-ca-buddhist + timeZone Asia/Bangkok
 *   6 sourceUrl ว่าง — ไม่เรนเดอร์นาฬิกาของ track นั้น (การ์ด pending แทน)
 */

import { useState, useEffect, useCallback, useSyncExternalStore, memo, type ComponentType } from 'react';
import Link from 'next/link';
import { AlarmClock, Hourglass, Clock } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface CalendarTrack {
    trackId: string;
    label: string;
    examAtIso: string | null;   // ISO string (UTC) จาก Firestore REST — null = ยังไม่กรอก
    sourceUrl: string;          // ลิงก์ประกาศจริง — ว่าง = ห้ามโชว์นาฬิกา
    isEstimate: boolean;
    chaptersToMaster: number;
    hoursPerWeek: number;
    hasContent: boolean;
    order: number;
}

const LS_KEY = 'kh_track';
const SCHOOL_TRACK = 'school-exam';
const TRACK_EVENT = 'kh_track_change';
// จำนวนวันเตรียมตัวโดยรวม — ใช้คำนวณแถบ "เตรียมตัวมาแล้ว X%" บนแผงนาฬิกา
const PREP_TOTAL_DAYS = 180;

// ── localStorage เป็น external store (hydration-safe ผ่าน useSyncExternalStore) ──
// SSR ได้ null เสมอ (สถานะ A) แล้ว React sync ค่าจริงหลัง hydration เอง — กับดัก 2 จบในตัว
const subscribeTrack = (cb: () => void) => {
    window.addEventListener(TRACK_EVENT, cb);
    window.addEventListener('storage', cb);   // sync ข้ามแท็บฟรี
    return () => {
        window.removeEventListener(TRACK_EVENT, cb);
        window.removeEventListener('storage', cb);
    };
};
const getTrackSnapshot = (): string | null => {
    try { return localStorage.getItem(LS_KEY); } catch { return null; }
};
const writeTrack = (id: string | null) => {
    try {
        if (id) localStorage.setItem(LS_KEY, id);
        else localStorage.removeItem(LS_KEY);
    } catch { }
    window.dispatchEvent(new Event(TRACK_EVENT));
};

// Fallback เมื่อ examCalendar ยังอ่านไม่ได้ (เช่น rules ยังไม่ deploy) — สถานะ A ยังทำงาน
const FALLBACK_TRACKS: CalendarTrack[] = [
    { trackId: 'entrance-m1', label: 'สอบเข้า ม.1', examAtIso: null, sourceUrl: '', isEstimate: true, chaptersToMaster: 9, hoursPerWeek: 3, hasContent: true, order: 1 },
    { trackId: 'entrance-m4', label: 'สอบเข้า ม.4', examAtIso: null, sourceUrl: '', isEstimate: true, chaptersToMaster: 10, hoursPerWeek: 3, hasContent: true, order: 2 },
    { trackId: 'onet-m3', label: 'O-NET ม.3', examAtIso: null, sourceUrl: '', isEstimate: true, chaptersToMaster: 8, hoursPerWeek: 3, hasContent: true, order: 3 },
    { trackId: 'onet-m6', label: 'O-NET ม.6', examAtIso: null, sourceUrl: '', isEstimate: true, chaptersToMaster: 10, hoursPerWeek: 3, hasContent: true, order: 4 },
    { trackId: 'alevel-math1', label: 'A-Level', examAtIso: null, sourceUrl: '', isEstimate: true, chaptersToMaster: 12, hoursPerWeek: 3, hasContent: false, order: 5 },
    { trackId: 'tgat', label: 'TGAT', examAtIso: null, sourceUrl: '', isEstimate: true, chaptersToMaster: 6, hoursPerWeek: 3, hasContent: false, order: 6 },
    { trackId: SCHOOL_TRACK, label: 'ยังไม่มีสนาม — เน้นสอบในโรงเรียน', examAtIso: null, sourceUrl: '', isEstimate: true, chaptersToMaster: 8, hoursPerWeek: 3, hasContent: true, order: 7 },
];

// ── helpers (pure, epoch-based) ─────────────────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, '0');

/** "15 มี.ค. 2570" — พ.ศ. เสมอ, ยึดเวลาไทยเสมอไม่ว่าเครื่องอยู่ TZ ไหน */
const thaiDateLabel = (iso: string): string => {
    try {
        return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
            timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric',
        }).format(new Date(iso));
    } catch { return ''; }
};

/** ชั่วโมงฝึกต่อบท ณ ตอนนี้ (days = ceil ตามสเปก) */
const hoursPerChapter = (days: number, hoursPerWeek: number, chapters: number): number =>
    chapters > 0 ? ((days / 7) * hoursPerWeek) / chapters : 0;

const fmtHours = (h: number): string => (h >= 10 ? String(Math.floor(h)) : h.toFixed(1));

// ── ไอคอนวงกลม gradient ส้ม/อำพัน (ใช้ในหัวการ์ด + แผงเวลาฝึก) ──────────────
function IconChip({ icon: Icon, size }: { icon: ComponentType<{ size?: number }>; size: number }) {
    return (
        <div
            className="flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#EA580C] text-white shadow-sm dark:from-[#D97706] dark:to-[#B45309]"
            style={{ width: size, height: size }}
        >
            <Icon size={Math.round(size * 0.48)} />
        </div>
    );
}

// ── นาฬิกา + โมเดลชั่วโมง (คอมโพเนนต์เดียวที่ re-render ทุกวินาที) ──────────
const ClockAndModel = memo(function ClockAndModel({ targetMs, hoursPerWeek, chapters, showComparison }: {
    targetMs: number; hoursPerWeek: number; chapters: number; showComparison: boolean;
}) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        let id: ReturnType<typeof setInterval> | null = null;
        const start = () => { if (!id) { setNow(Date.now()); id = setInterval(() => setNow(Date.now()), 1000); } };
        const stop = () => { if (id) { clearInterval(id); id = null; } };
        const onVis = () => (document.visibilityState === 'visible' ? start() : stop());
        start();
        document.addEventListener('visibilitychange', onVis);
        return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
    }, []);

    const diff = Math.max(0, targetMs - now);           // กับดัก 4: ไม่มีเลขติดลบ
    const dDays = Math.floor(diff / 86400000);
    const dHours = Math.floor(diff / 3600000) % 24;
    const dMins = Math.floor(diff / 60000) % 60;
    const dSecs = Math.floor(diff / 1000) % 60;

    const daysCeil = Math.ceil(diff / 86400000);        // โมเดลชั่วโมงใช้ ceil ตามสเปก
    const perNow = hoursPerChapter(daysCeil, hoursPerWeek, chapters);
    const perMonth = hoursPerChapter(Math.max(0, daysCeil - 30), hoursPerWeek, chapters);
    const preparedPct = Math.max(0, Math.min(100, Math.round(((PREP_TOTAL_DAYS - daysCeil) / PREP_TOTAL_DAYS) * 100)));

    const tiles: { val: string; unit: string; emphasize?: boolean }[] = [
        { val: String(dDays), unit: 'วัน' },
        { val: pad2(dHours), unit: 'ชม.' },
        { val: pad2(dMins), unit: 'นาที' },
        { val: pad2(dSecs), unit: 'วิ', emphasize: true },
    ];

    return (
        <>
            <p className="sr-only" aria-live="polite">เหลืออีก {daysCeil} วันก่อนวันสอบ</p>

            {/* Clock board — gradient ส้ม + ลาย graph-paper + วงแสงเรือง */}
            <div
                aria-hidden="true"
                className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#F59E0B] via-[#EA580C] to-[#9A3412] px-[clamp(12px,3cqw,18px)] pb-[clamp(16px,4cqw,22px)] pt-[clamp(18px,4.4cqw,24px)] dark:from-[#B45309] dark:via-[#9A3412] dark:to-[#431407]"
            >
                <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.07)_0px,rgba(255,255,255,0.07)_1px,transparent_1px,transparent_24px)]" />
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />

                <div className="relative">
                    <p className="text-center text-[11px] font-extrabold tracking-[0.14em] text-[#FFF7ED]/90">เหลือเวลาอีก</p>

                    <div className="mt-3 flex justify-center gap-[10px]">
                        {tiles.map(t => (
                            <div
                                key={t.unit}
                                className={`flex min-w-[3.4rem] flex-col items-center rounded-[14px] border py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ${t.emphasize
                                    ? 'border-[rgba(255,247,237,0.35)] bg-white/20'
                                    : 'border-[rgba(255,247,237,0.22)] bg-white/10'
                                    }`}
                            >
                                <span className={`font-mero text-[clamp(1.7rem,9cqw,2.875rem)] font-semibold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums] ${t.emphasize ? 'text-white' : 'text-[#FFF7ED]'}`}>
                                    {t.val}
                                </span>
                                <span className="mt-1.5 text-[11px] font-semibold text-[#FDE68A]">{t.unit}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                        <span className="shrink-0 text-[11px] font-semibold text-[#FFF7ED]/80">เตรียมตัวมาแล้ว</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#FDE68A] to-white dark:from-[#FBBF24] dark:to-[#FDE68A]"
                                style={{ width: `${preparedPct}%` }}
                            />
                        </div>
                        <span className="shrink-0 text-[11px] font-bold text-white [font-variant-numeric:tabular-nums]">{preparedPct}%</span>
                    </div>
                </div>
            </div>

            {/* Practice-time panel — รวมสต็อกหลักกับส่วนเปรียบเทียบเป็นแผงเดียว */}
            <div className="mt-[clamp(14px,3.4cqw,18px)] rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] p-[clamp(16px,4cqw,20px)] dark:border-[rgba(251,191,36,0.24)] dark:bg-[rgba(180,83,9,0.20)]">
                <div className="flex items-center gap-3">
                    <IconChip icon={Hourglass} size={50} />
                    <div className="min-w-0">
                        <p className="text-[11px] font-extrabold tracking-[0.08em] text-[#C2410C]/80 dark:text-[#FBBF24]/80">เวลาฝึกจริงที่เหลือ</p>
                        <p className="font-mero text-[clamp(1.5rem,7cqw,2rem)] font-semibold leading-tight text-slate-900 dark:text-slate-50 [font-variant-numeric:tabular-nums]">
                            {fmtHours(perNow)}{' '}
                            <span className="text-[clamp(13px,3.6cqw,15px)] font-bold text-slate-500 dark:text-slate-400">ชม. ต่อ 1 บท</span>
                        </p>
                    </div>
                </div>
                <p className="mt-1.5 text-[clamp(12px,3.4cqw,13px)] font-medium text-slate-500 dark:text-slate-400">
                    สัปดาห์ละ {hoursPerWeek} ชม. × {chapters} บทที่ต้องแม่น
                </p>

                {showComparison && daysCeil > 30 && (
                    <>
                        <div className="my-[clamp(12px,3cqw,16px)] border-t border-dashed border-[#F7D69B] dark:border-[rgba(251,191,36,0.3)]" />
                        <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-[clamp(12px,3.4cqw,14px)] font-semibold text-slate-600 dark:text-slate-300">
                                <Clock size={16} className="text-[#EA580C] dark:text-[#FBBF24]" />
                                ถ้ารออีก 1 เดือน
                            </span>
                            <span className="rounded-full bg-[#FBE0C4] px-3 py-1 text-[clamp(12px,3.4cqw,14px)] font-bold text-[#B4530A] [font-variant-numeric:tabular-nums] dark:bg-[rgba(251,191,36,0.2)] dark:text-[#FCD34D]">
                                เหลือแค่ {fmtHours(perMonth)} ชม./บท
                            </span>
                        </div>
                    </>
                )}
            </div>
        </>
    );
});

// ── ชิ้นส่วนเล็ก ────────────────────────────────────────────────────────────
function TrackHeader({ label, dateLabel, isEstimate, onChange }: {
    label: string; dateLabel?: string | null; isEstimate?: boolean; onChange: () => void;
}) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <IconChip icon={AlarmClock} size={40} />
                <div className="min-w-0">
                    <p className="text-[11px] font-extrabold tracking-[0.1em] text-[#EA580C] dark:text-[#FBBF24]">นับถอยหลังวันสอบ</p>
                    <p className="mt-0.5 truncate text-[clamp(13px,3.6cqw,15px)] font-bold text-slate-800 dark:text-slate-100">
                        {label}
                        {dateLabel && <> · {dateLabel}{isEstimate && <span className="font-medium text-slate-400 dark:text-slate-500"> (โดยประมาณ)</span>}</>}
                    </p>
                </div>
            </div>
            <button
                onClick={onChange}
                aria-label="เปลี่ยนสนามสอบ"
                className="shrink-0 rounded-full bg-slate-100 dark:bg-[#334155] px-3.5 py-1.5 text-[clamp(11px,3cqw,13px)] font-bold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors min-h-[36px]"
            >
                เปลี่ยน
            </button>
        </div>
    );
}

function StartButton({ onStart }: { onStart: () => void }) {
    return (
        <button
            onClick={onStart}
            className="font-mero mt-[clamp(14px,3.4cqw,18px)] min-h-[44px] w-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EA580C] py-3.5 text-[clamp(14px,4cqw,16px)] font-semibold text-white shadow-md shadow-orange-500/25 transition-all hover:brightness-105 active:brightness-95 dark:from-[#D97706] dark:to-[#B45309] dark:shadow-none"
        >
            เริ่มตะลุยโจทย์ →
        </button>
    );
}

function SourceLink({ url }: { url: string }) {
    return (
        <div className="mt-3 text-right">
            <a href={url} target="_blank" rel="noopener noreferrer"
                className="text-[clamp(12px,3.4cqw,13px)] font-semibold text-slate-500 dark:text-slate-400 hover:text-[#EA580C] dark:hover:text-[#FBBF24] underline-offset-2 hover:underline transition-colors">
                ดูประกาศวันสอบจริง ↗
            </a>
        </div>
    );
}

// ── การ์ดหลัก ───────────────────────────────────────────────────────────────
export default function ExamCountdown({ tracks }: { tracks: CalendarTrack[] }) {
    const list = (tracks && tracks.length > 0 ? tracks : FALLBACK_TRACKS)
        .slice().sort((a, b) => a.order - b.order);

    // trackId มาจาก localStorage โดยตรง (external store) — SSR = null = สถานะ A เสมอ
    const trackId = useSyncExternalStore(subscribeTrack, getTrackSnapshot, () => null);
    // จับเวลาครั้งเดียว (lazy init) ไว้เช็ค "สอบผ่านไปแล้ว" — ความละเอียดระดับวัน พอเพียง
    const [mountNow] = useState(() => Date.now());
    const [contact, setContact] = useState('');
    const [notifyState, setNotifyState] = useState<'idle' | 'sent'>('idle');

    const selectTrack = useCallback((t: CalendarTrack) => {
        writeTrack(t.trackId);
        setNotifyState('idle');
        // เก็บสถิติการกดชิป (fire-and-forget — ห้ามพังหน้าเมื่อเขียนไม่ได้)
        addDoc(collection(db, 'trackClicks'), {
            trackId: t.trackId, hasContent: t.hasContent, clickedAt: serverTimestamp(),
        }).catch(() => { });
    }, []);

    const clearTrack = useCallback(() => writeTrack(null), []);

    const startPractice = useCallback(() => {
        // Next.js เก็บ DOM ของหน้าเก่าซ่อนไว้ (id ซ้ำได้) — ต้องเลือกตัวที่มองเห็นจริง
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('#exam-sections'));
        const target = candidates.find(el => el.offsetParent) ?? candidates[0];
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const submitNotify = useCallback((t: CalendarTrack) => {
        const c = contact.trim();
        if (c.length < 3) return;
        addDoc(collection(db, 'trackNotifyRequests'), {
            trackId: t.trackId, contact: c.slice(0, 100), createdAt: serverTimestamp(),
        }).catch(() => { });
        setNotifyState('sent');    // ตอบรับทันที (optimistic) — คำขอถูกส่งแบบ fire-and-forget
    }, [contact]);

    // ── resolve สถานะ (derived ล้วน ไม่มี effect) ──
    const selected = trackId ? list.find(t => t.trackId === trackId) : undefined;
    // กับดัก 1+4: เทียบ epoch ล้วน — สอบผ่านแล้ว → กลับสถานะ A พร้อมข้อความ (ห้ามเลขติดลบ)
    const expired = !!(selected && selected.examAtIso && selected.sourceUrl
        && Date.parse(selected.examAtIso) <= mountNow);

    const cardBase = 'khc-rise rounded-[28px] border border-[#EEF1F5] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] text-left [container-type:inline-size]';

    // ═══ สถานะ A — ยังไม่เลือกสนาม (รวมเคสสนามที่สอบผ่านไปแล้ว) ═══
    if (!selected || expired) {
        return (
            <div className={`${cardBase} p-[clamp(20px,5.5cqw,32px)] mb-8`}>
                {expired && (
                    <div className="mb-4 rounded-[12px] border border-[#FDE68A] bg-[#FFFBEB] dark:border-[rgba(180,83,9,0.45)] dark:bg-[rgba(120,53,15,0.24)] px-4 py-2.5 text-[clamp(12px,3.4cqw,14px)] font-semibold text-[#B45309] dark:text-[#FCD34D]">
                        สนามนี้สอบไปแล้ว — เลือกสนามถัดไปได้เลย
                    </div>
                )}
                <h2 className="text-[clamp(18px,5.2cqw,22px)] font-extrabold text-slate-900 dark:text-slate-50">
                    🎯 ลูกกำลังเตรียมสอบอะไรอยู่ครับ?
                </h2>
                <p className="mt-1.5 text-[clamp(13px,3.6cqw,15px)] font-medium text-slate-500 dark:text-slate-400">
                    ครูฮีมจะได้บอกว่าเหลือเวลาฝึกจริงกี่ชั่วโมงต่อบท
                </p>
                <div className="mt-4 flex flex-wrap gap-[9px]">
                    {list.map(t => (
                        <button
                            key={t.trackId}
                            onClick={() => selectTrack(t)}
                            className={`rounded-full bg-white dark:bg-[#0F172A] px-4 py-2.5 min-h-[44px] text-[clamp(13px,3.6cqw,14px)] font-semibold text-slate-600 dark:text-[#CBD5E1] border transition-colors hover:border-[#EA580C] hover:text-[#C2410C] hover:bg-[#FFFBEB] dark:hover:border-[#FBBF24] dark:hover:text-[#FBBF24] dark:hover:bg-[#1E293B] ${t.trackId === SCHOOL_TRACK ? 'border-dashed border-slate-300 dark:border-slate-600' : 'border-[#E2E8F0] dark:border-[#334155]'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // ═══ สนามโรงเรียน — ไม่มีวันสอบกลาง ไม่มีนาฬิกา ═══
    if (selected.trackId === SCHOOL_TRACK) {
        return (
            <div className={`${cardBase} p-[clamp(18px,5cqw,30px)] mb-8`}>
                <TrackHeader label="เน้นสอบในโรงเรียน" onChange={clearTrack} />
                <p className="mt-[clamp(16px,4cqw,24px)] text-center text-[clamp(15px,4.6cqw,20px)] font-bold text-slate-900 dark:text-slate-50">
                    โฟกัสสอบในโรงเรียนไปก่อน — ดีมากครับ
                </p>
                <p className="mt-1.5 text-center text-[clamp(12px,3.4cqw,14px)] font-medium text-slate-400 dark:text-slate-500">
                    ฝึกจากคลังข้อสอบให้แม่นทีละบท พื้นฐานแน่นแล้วสนามไหนก็ไม่กลัว
                </p>
                <StartButton onStart={startPractice} />
            </div>
        );
    }

    // ═══ กับดัก 6 — ยังไม่ประกาศวัน / ไม่มีลิงก์ประกาศ → ห้ามโชว์นาฬิกา ═══
    if (!selected.examAtIso || !selected.sourceUrl) {
        return (
            <div className={`${cardBase} p-[clamp(18px,5cqw,30px)] mb-8`}>
                <TrackHeader label={selected.label} onChange={clearTrack} />
                <p className="mt-[clamp(16px,4cqw,24px)] text-center text-[clamp(15px,4.6cqw,20px)] font-bold text-slate-900 dark:text-slate-50">
                    สนามนี้ยังไม่ประกาศวันสอบอย่างเป็นทางการ
                </p>
                <p className="mt-1.5 text-center text-[clamp(12px,3.4cqw,14px)] font-medium text-slate-400 dark:text-slate-500">
                    ครูฮีมจะเปิดนาฬิกานับถอยหลังให้ทันทีที่มีประกาศ — ระหว่างนี้ฝึกเก็บทีละบทไปก่อนได้เลย
                </p>
                {selected.hasContent && <StartButton onStart={startPractice} />}
            </div>
        );
    }

    const targetMs = Date.parse(selected.examAtIso);
    const dateLabel = thaiDateLabel(selected.examAtIso);

    // ═══ สถานะ B — นาฬิกาเต็ม + ปุ่มตะลุยโจทย์ ═══
    if (selected.hasContent) {
        return (
            <div className={`${cardBase} p-[clamp(18px,5cqw,30px)] mb-8`}>
                <TrackHeader label={selected.label} dateLabel={dateLabel} isEstimate={selected.isEstimate} onChange={clearTrack} />
                <div className="mt-[clamp(16px,4cqw,24px)]">
                    <ClockAndModel targetMs={targetMs} hoursPerWeek={selected.hoursPerWeek} chapters={selected.chaptersToMaster} showComparison={true} />
                </div>
                <StartButton onStart={startPractice} />
                <SourceLink url={selected.sourceUrl} />
            </div>
        );
    }

    // ═══ สถานะ C — มีนาฬิกา แต่ยังไม่มีชุดข้อสอบ → ฟอร์มรับแจ้งเตือน ═══
    return (
        <div className={`${cardBase} p-[clamp(18px,5cqw,30px)] mb-8`}>
            <TrackHeader label={selected.label} dateLabel={dateLabel} isEstimate={selected.isEstimate} onChange={clearTrack} />
            <div className="mt-[clamp(16px,4cqw,24px)]">
                <ClockAndModel targetMs={targetMs} hoursPerWeek={selected.hoursPerWeek} chapters={selected.chaptersToMaster} showComparison={false} />
            </div>
            <div className="mt-[clamp(14px,3.4cqw,18px)] border-t border-dashed border-slate-200 dark:border-slate-600 pt-[clamp(14px,3.4cqw,18px)]">
                <p className="text-[clamp(14px,3.8cqw,16px)] font-bold text-slate-900 dark:text-slate-50">
                    ครูฮีมกำลังทำชุด <span className="text-[#EA580C] dark:text-[#FBBF24]">{selected.label}</span> อยู่ครับ
                </p>
                {notifyState === 'sent' ? (
                    <p className="mt-3 text-[clamp(13px,3.6cqw,14px)] font-semibold text-[#1F8A5B]">
                        ✓ รับเรื่องแล้วครับ — ชุดมาเมื่อไหร่ ครูฮีมแจ้งทันที
                    </p>
                ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                        <input
                            type="text"
                            value={contact}
                            onChange={e => setContact(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitNotify(selected); }}
                            placeholder="LINE ID หรือเบอร์โทร"
                            aria-label="LINE ID หรือเบอร์โทร สำหรับรับแจ้งเตือน"
                            className="flex-1 min-w-[180px] rounded-full border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-4 py-2.5 min-h-[44px] text-[clamp(13px,3.6cqw,14px)] font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#EA580C] dark:focus:border-[#FBBF24] transition-colors"
                        />
                        <button
                            onClick={() => submitNotify(selected)}
                            disabled={contact.trim().length < 3}
                            className="rounded-full bg-[#EA580C] hover:bg-[#C2410C] dark:bg-[#D97706] dark:hover:bg-[#B45309] disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 min-h-[44px] text-[clamp(13px,3.6cqw,14px)] font-bold text-white transition-colors"
                        >
                            รับแจ้งเตือน
                        </button>
                    </div>
                )}
                <p className="mt-3 text-[clamp(12px,3.4cqw,13px)] font-medium text-slate-400 dark:text-slate-500">
                    ระหว่างนี้ทบทวนบทที่ออกบ่อยสุดก่อนได้:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {['เซต', 'ฟังก์ชัน', 'ตรีโกณมิติ'].map(tag => (
                        <Link
                            key={tag}
                            href={`/exam/practice?q=${encodeURIComponent(tag)}`}
                            className="rounded-full bg-[#FFFBEB] dark:bg-[#0F172A] border border-[#FDE68A] dark:border-[#334155] px-3.5 py-2 text-[clamp(12px,3.4cqw,13px)] font-semibold text-[#C2410C] dark:text-[#FBBF24] hover:border-[#EA580C] dark:hover:border-[#FBBF24] transition-colors"
                        >
                            {tag}
                        </Link>
                    ))}
                </div>
            </div>
            <SourceLink url={selected.sourceUrl} />
        </div>
    );
}
