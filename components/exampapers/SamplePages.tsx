"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import type { ExamPaperSample } from "@/types";

/**
 * "เปิดดูข้างในเล่ม" — ภาพหน้ากระดาษจริงจากไฟล์ที่ขาย
 *
 * จุดขายหลักของทุกชุดคือ "เฉลยละเอียด" แต่เดิมมันมองไม่เห็นเลยจนกว่าจะกดปุ่ม
 * ดูตัวอย่าง (ซึ่งเปิด PDF อีกแท็บ และเงียบไปเลยใน webview ของ FB/LINE)
 * ตรงนี้เลยเอาหน้าจริงมาแปะให้เห็นคาหน้าขาย กดขยายอ่านได้โดยไม่ต้องออกจากหน้า
 *
 * การขยายใช้เทคนิค FLIP: ภาพใหญ่เป็น position:fixed แล้วสั่ง left/top/width/height
 * เอง เริ่มจากกรอบของรูปย่อที่กด แล้วค่อยๆ คลี่ไปเต็มจอ ปิดก็หดกลับที่เดิม
 * — ใช้ object-cover เหมือนรูปย่อตลอดทาง เพราะกรอบปลายทางคำนวณให้ตรงสัดส่วน
 * จริงของภาพอยู่แล้ว ปลายทาง cover จึงเท่ากับ contain พอดี ภาพไม่กระตุกตอนจบ
 */

const EASE_OPEN = "cubic-bezier(0.22, 1, 0.36, 1)"; // คลี่ออกแล้วผ่อนลงช้าๆ
const EASE_CLOSE = "cubic-bezier(0.4, 0, 0.2, 1)";
const OPEN_MS = 420;
const CLOSE_MS = 320;

type Rect = { left: number; top: number; width: number; height: number };

export default function SamplePages({ samples }: { samples?: ExamPaperSample[] }) {
    const items = (samples || []).filter((s) => s?.url);
    const [open, setOpen] = useState<number | null>(null);
    const [closing, setClosing] = useState(false);
    const [shown, setShown] = useState(false); // คุมความจางของฉากหลัง/ปุ่ม
    const shownRef = useRef(false);

    const thumbRefs = useRef<(HTMLImageElement | null)[]>([]);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const flownRef = useRef(false); // คลี่ไปแล้วหรือยัง (กันไม่ให้เล่นซ้ำตอนกดลูกศรเปลี่ยนหน้า)
    const timerRef = useRef<number | null>(null);

    const reduceMotion = () =>
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** กรอบของรูปย่อใบที่ i บนหน้าจอ — ใช้เป็นทั้งจุดเริ่มตอนเปิดและจุดจบตอนปิด */
    const thumbRect = useCallback((i: number): Rect | null => {
        const el = thumbRefs.current[i];
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return null;
        return { left: r.left, top: r.top, width: r.width, height: r.height };
    }, []);

    /** กรอบปลายทาง: ใหญ่ที่สุดเท่าที่จอรับได้ โดยคงสัดส่วนจริงของภาพ */
    const fullRect = useCallback((i: number, nat?: { w: number; h: number }): Rect => {
        const el = thumbRefs.current[i];
        let nw = nat?.w || el?.naturalWidth || 0;
        let nh = nat?.h || el?.naturalHeight || 0;
        if (!nw || !nh) {
            // รูปย่อเป็น loading="lazy" — ถ้ากดก่อนที่มันจะโหลดเสร็จจะยังไม่รู้สัดส่วนจริง
            // ใช้สัดส่วนของกรอบการ์ดไปพลางก่อน แล้ว onLoad ของภาพใหญ่จะแก้ให้ตรงเอง
            const r = el?.getBoundingClientRect();
            nw = r?.width || 3;
            nh = r?.height || 4;
        }
        // จอกว้างเว้นที่ให้ปุ่มลูกศรอยู่ข้างภาพ · จอมือถือให้ปุ่มลอยทับขอบภาพไปเลย
        // (แบบแอปรูปภาพ) ไม่งั้นเหลือที่อ่านแค่ 255 จาก 375 จุด ตัวหนังสือเล็กจนอ่านไม่ออก
        const narrow = window.innerWidth < 640;
        const side = items.length > 1 && !narrow ? 60 : 16;
        const top = 58; // เว้นที่ให้แถบหัวเรื่อง
        const bottom = 16;
        const maxW = Math.max(80, window.innerWidth - side * 2);
        const maxH = Math.max(80, window.innerHeight - top - bottom);
        const k = Math.min(maxW / nw, maxH / nh);
        const w = nw * k;
        const h = nh * k;
        return { left: (window.innerWidth - w) / 2, top: top + (maxH - h) / 2, width: w, height: h };
    }, [items.length]);

    const applyRect = (el: HTMLElement, r: Rect) => {
        el.style.left = `${r.left}px`;
        el.style.top = `${r.top}px`;
        el.style.width = `${r.width}px`;
        el.style.height = `${r.height}px`;
    };

    // อ่านค่าปัจจุบันผ่าน ref ไม่ใช่ทำงานข้างเคียงใน state updater — React โหมด dev
    // เรียก updater ซ้ำสองรอบ ถ้าสั่งแอนิเมชันในนั้นจะยิงซ้ำและตั้งเวลาปิดซ้อนกัน
    const openRef = useRef<number | null>(null);
    const closingRef = useRef(false);
    useEffect(() => { openRef.current = open; }, [open]);

    const close = useCallback(() => {
        const i = openRef.current;
        if (i === null || closingRef.current) return;
        closingRef.current = true;
        setClosing(true);
        shownRef.current = false; setShown(false);

        const el = imgRef.current;
        const back = thumbRect(i);
        const instant = reduceMotion() || !el || !back;

        if (!instant && el && back) {
            el.style.transition =
                `left ${CLOSE_MS}ms ${EASE_CLOSE}, top ${CLOSE_MS}ms ${EASE_CLOSE}, ` +
                `width ${CLOSE_MS}ms ${EASE_CLOSE}, height ${CLOSE_MS}ms ${EASE_CLOSE}, ` +
                `border-radius ${CLOSE_MS}ms ${EASE_CLOSE}, opacity ${CLOSE_MS}ms ease`;
            el.style.borderRadius = "12px";
            applyRect(el, back);
        }

        // ยังไม่ถอดภาพออกจากจอทันที รอให้หดกลับเข้าการ์ดจบก่อน
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
            flownRef.current = false;
            closingRef.current = false;
            setClosing(false);
            setOpen(null);
        }, instant ? 0 : CLOSE_MS);
    }, [thumbRect]);

    /**
     * กดรูปย่อเพื่อเปิด — ถ้าภาพเก่ายังหดปิดไม่เสร็จ ต้องยกเลิกคิวปิดที่ค้างอยู่ก่อน
     * ไม่งั้นตัวคลี่จะถูกข้าม (เพราะยังนับว่า "กำลังปิด") แล้วคิวเก่าจะมาปิดซ้ำทีหลัง
     */
    const openAt = useCallback((i: number) => {
        if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
        closingRef.current = false;
        flownRef.current = false;
        shownRef.current = false;
        setClosing(false);
        setShown(false);
        setOpen(i);
    }, []);

    const step = useCallback((dir: number) => {
        if (closingRef.current) return; // กำลังหดปิดอยู่ อย่าเพิ่งสลับหน้า
        setOpen((i) => (i === null ? null : (i + dir + items.length) % items.length));
    }, [items.length]);

    // คลี่ออกจากรูปย่อ — วิ่งครั้งเดียวตอนเปิด ไม่วิ่งซ้ำตอนกดลูกศร
    useLayoutEffect(() => {
        if (open === null || closing) return;
        const el = imgRef.current;
        if (!el) return;

        if (flownRef.current) {
            // เปลี่ยนหน้าระหว่างเปิดอยู่ — ขยับกรอบตามสัดส่วนภาพใหม่ พร้อมวูบจางสั้นๆ
            el.style.transition =
                `left 300ms ${EASE_OPEN}, top 300ms ${EASE_OPEN}, width 300ms ${EASE_OPEN}, height 300ms ${EASE_OPEN}, opacity 200ms ease`;
            applyRect(el, fullRect(open));
            el.style.opacity = "0.35";
            requestAnimationFrame(() => { if (imgRef.current) imgRef.current.style.opacity = "1"; });
            return;
        }

        flownRef.current = true;
        const from = thumbRect(open);
        const to = fullRect(open);

        if (reduceMotion() || !from) {
            el.style.transition = "none";
            el.style.borderRadius = "12px";
            applyRect(el, to);
            requestAnimationFrame(() => { shownRef.current = true; setShown(true); });
            return;
        }

        el.style.transition = "none";
        el.style.borderRadius = "12px";
        el.style.opacity = "1";
        applyRect(el, from);
        void el.offsetWidth; // บังคับให้เบราว์เซอร์รับค่าเริ่มต้นก่อน ไม่งั้นมันข้ามไปเฟรมสุดท้ายเลย

        requestAnimationFrame(() => {
            const cur = imgRef.current;
            if (!cur) return;
            cur.style.transition =
                `left ${OPEN_MS}ms ${EASE_OPEN}, top ${OPEN_MS}ms ${EASE_OPEN}, ` +
                `width ${OPEN_MS}ms ${EASE_OPEN}, height ${OPEN_MS}ms ${EASE_OPEN}, ` +
                `border-radius ${OPEN_MS}ms ${EASE_OPEN}`;
            // ถ้าภาพใหญ่โหลดไว้แล้ว (มักมาจากแคชของรูปย่อ) ใช้สัดส่วนจริงของมันเลย
            applyRect(cur, cur.naturalWidth ? fullRect(open, { w: cur.naturalWidth, h: cur.naturalHeight }) : to);
            shownRef.current = true; setShown(true);
        });
    }, [open, closing, thumbRect, fullRect]);

    // คีย์บอร์ดสำหรับคนที่เปิดบนคอม + ล็อกการเลื่อนหน้าหลังตอนเปิดภาพเต็ม
    useEffect(() => {
        if (open === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowRight") step(1);
            else if (e.key === "ArrowLeft") step(-1);
        };
        // หมุนจอ/ย่อขยายหน้าต่างระหว่างเปิดอยู่ ต้องคำนวณกรอบใหม่ ไม่งั้นภาพล้นจอ
        const onResize = () => {
            const el = imgRef.current;
            if (!el || open === null || closing) return;
            el.style.transition = "none";
            applyRect(el, fullRect(open));
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("resize", onResize);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", onResize);
            document.body.style.overflow = prev;
        };
    }, [open, closing, close, step, fullRect]);

    useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

    /**
     * ภาพใหญ่โหลดเสร็จเมื่อไหร่ถึงจะรู้สัดส่วนจริงแน่นอน — ปรับกรอบให้ตรง
     * ถ้ายังคลี่ไม่จบ แค่เปลี่ยนค่าปลายทางเฉยๆ CSS จะไหลต่อไปหาค่าใหม่ให้เอง ไม่กระตุก
     */
    const onBigLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const el = e.currentTarget;
        // shownRef เป็นจริงตั้งแต่วินาทีที่สั่งคลี่ — ก่อนหน้านั้น transition ยังเป็น none
        // ถ้าเผลอสั่งกรอบตอนนั้นภาพจะกระโดดไปขนาดเต็มทันที ไม่เหลืออะไรให้คลี่
        if (open === null || closing || !shownRef.current) return;
        const to = fullRect(open, { w: el.naturalWidth, h: el.naturalHeight });
        const cur = el.getBoundingClientRect();
        if (Math.abs(cur.width - to.width) < 1 && Math.abs(cur.height - to.height) < 1) return;
        el.style.transition =
            `left 240ms ${EASE_OPEN}, top 240ms ${EASE_OPEN}, width 240ms ${EASE_OPEN}, height 240ms ${EASE_OPEN}`;
        applyRect(el, to);
    };

    if (items.length === 0) return null;

    const active = open !== null ? items[open] : null;

    return (
        <section className="khps-sec">
            <div className="khps-eyebrow">เปิดดูข้างในเล่ม</div>
            <h2 className="khps-h2 mt-3.5" style={{ maxWidth: "22ch" }}>
                หน้าจริงจากไฟล์ที่ได้รับ
            </h2>
            <p className="mt-4 text-[15px] font-light khps-muted" style={{ maxWidth: "58ch" }}>
                ไม่ใช่ภาพจัดฉาก — กดที่ภาพเพื่อขยายอ่านได้เลย
            </p>

            <div
                className="grid gap-5 mt-9"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}
            >
                {items.map((s, i) => (
                    <button
                        key={s.url}
                        onClick={() => openAt(i)}
                        className="khps-card-sm group text-left overflow-hidden transition hover:-translate-y-0.5"
                    >
                        <div className="relative aspect-[3/4] overflow-hidden" style={{ background: "var(--kp-slot)" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={(el) => { thumbRefs.current[i] = el; }}
                                src={s.url}
                                alt={s.caption || "ตัวอย่างหน้าในเล่ม"}
                                loading="lazy"
                                className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition"
                            />
                            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition flex items-center justify-center">
                                <ZoomIn size={22} className="text-white opacity-0 group-hover:opacity-100 transition drop-shadow" />
                            </span>
                        </div>
                        {s.caption && (
                            <div className="px-4 py-3.5 text-[12.5px] font-medium leading-snug khps-muted">
                                {s.caption}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {open !== null && active && (
                <div
                    className="fixed inset-0 z-[60]"
                    role="dialog"
                    aria-modal="true"
                    aria-label={active.caption || "ตัวอย่างหน้าในเล่ม"}
                    onClick={close}
                >
                    {/* ฉากหลังจางเข้า-จางออกพร้อมกับภาพ กดตรงไหนก็ปิด */}
                    <div
                        className={`absolute inset-0 bg-[#17181A]/90 backdrop-blur-sm transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
                    />

                    <div
                        className={`absolute top-0 inset-x-0 flex items-center justify-between gap-3 px-4 py-3 text-white transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
                    >
                        <span className="text-sm font-semibold truncate">
                            {active.caption || "ตัวอย่างหน้าในเล่ม"}
                            <span className="text-white/50 font-normal"> · {open + 1}/{items.length}</span>
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); close(); }}
                            aria-label="ปิด"
                            className="rounded-full bg-white/10 hover:bg-white/20 p-2 transition shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {items.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); step(-1); }}
                                aria-label="หน้าก่อนหน้า"
                                className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 text-white p-2.5 transition-all duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); step(1); }}
                                aria-label="หน้าถัดไป"
                                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 text-white p-2.5 transition-all duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </>
                    )}

                    {/* ตัวภาพ: กรอบถูกสั่งด้วย JS ทีละเฟรม (ดูหมายเหตุ FLIP ด้านบนไฟล์) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        ref={imgRef}
                        src={active.url}
                        alt={active.caption || "ตัวอย่างหน้าในเล่ม"}
                        onClick={(e) => e.stopPropagation()}
                        onLoad={onBigLoad}
                        className="fixed object-cover object-top bg-white shadow-2xl will-change-[left,top,width,height]"
                        style={{ left: 0, top: 0, width: 0, height: 0, borderRadius: 12 }}
                    />
                </div>
            )}
        </section>
    );
}
