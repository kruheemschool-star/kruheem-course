"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ExternalLink, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

export type SlipOrigin = { x: number; y: number } | null;

interface Props {
    /** ส่ง url ของสลิปเข้ามาเพื่อเปิด, ส่ง null เพื่อปิด */
    url: string | null;
    /** จุดที่แอดมินคลิก (clientX/clientY) — ใช้ให้รูปโตออกมาจากจุดนั้นแล้วหดกลับไปที่เดิม */
    origin?: SlipOrigin;
    title?: string;
    onClose: () => void;
}

/** ต้องเท่ากับ transition ตอนปิดใน .khsl-* (globals.css) */
const CLOSE_MS = 280;

export default function SlipLightbox({ url, origin = null, title = "สลิปการโอนเงิน", onClose }: Props) {
    // เก็บ url ไว้เอง เพื่อให้รูปยังอยู่บนจอตลอดช่วงอนิเมชันตอนปิด
    const [shown, setShown] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [closing, setClosing] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [zoom, setZoom] = useState(false);
    const [fromTransform, setFromTransform] = useState("scale(.84)");
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const originRef = useRef<SlipOrigin>(origin);
    originRef.current = origin;

    useEffect(() => {
        if (!url) return;
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        setShown(url);
        setLoaded(false);
        setZoom(false);
        setClosing(false);

        // ระยะจากจุดคลิกไปกลางจอ — ย่อลง .32 เท่า ให้ขยับพอรู้สึก ไม่กระชาก
        const o = originRef.current;
        const dx = o ? o.x - window.innerWidth / 2 : 0;
        const dy = o ? o.y - window.innerHeight / 2 : 0;
        setFromTransform(`translate(${Math.round(dx * 0.32)}px, ${Math.round(dy * 0.32)}px) scale(.84)`);

        // สองเฟรม: เฟรมแรกวางสถานะเริ่มต้น เฟรมสองค่อยสั่งให้เคลื่อน (ไม่งั้นเบราว์เซอร์ข้าม transition)
        // มี setTimeout สำรองด้วย เพราะแท็บที่ถูกซ่อนอยู่จะหยุด requestAnimationFrame — ป๊อปอัพจะได้ไม่ค้างโปร่งใส
        let inner = 0;
        const raf = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setOpen(true)); });
        const fallback = setTimeout(() => setOpen(true), 60);
        return () => { cancelAnimationFrame(raf); cancelAnimationFrame(inner); clearTimeout(fallback); };
    }, [url]);

    const requestClose = useCallback(() => {
        setOpen(false);
        setClosing(true);
        closeTimer.current = setTimeout(() => {
            closeTimer.current = null;
            setShown(null);
            setClosing(false);
            onClose();
        }, CLOSE_MS);
    }, [onClose]);

    // Esc ปิด + ล็อกสกรอลล์พื้นหลัง
    useEffect(() => {
        if (!shown) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") requestClose(); };
        window.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [shown, requestClose]);

    useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

    if (!shown) return null;

    return (
        <div
            className={`kh-admin khsl-backdrop${open ? " is-open" : ""}${closing ? " is-closing" : ""}`}
            style={{ ["--khsl-from" as string]: fromTransform } as React.CSSProperties}
            onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className={`khsl-panel${zoom ? " is-zoom" : ""}`}>
                <div className="kh-card !p-0 overflow-hidden shadow-xl">
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
                        <span className="text-sm font-medium kh-ink">{title}</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setZoom(z => !z)}
                                className="p-1.5 rounded-lg transition kh-ink3 hover:bg-[var(--card-2)] hover:text-[var(--accent)]"
                                title={zoom ? "ย่อรูป" : "ขยายรูป"}
                            >
                                {zoom ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                            </button>
                            <a
                                href={shown}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg transition kh-ink3 hover:bg-[var(--card-2)] hover:text-[var(--accent)]"
                                title="เปิดรูปเต็มในแท็บใหม่"
                            >
                                <ExternalLink size={16} />
                            </a>
                            <button
                                onClick={requestClose}
                                className="p-1.5 rounded-lg transition kh-ink3 hover:bg-[var(--card-2)] hover:text-[var(--ink)]"
                                title="ปิด"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="khsl-stage" onClick={() => setZoom(z => !z)}>
                        {!loaded && (
                            <div className="khsl-loading">
                                <Loader2 size={22} className="animate-spin" />
                            </div>
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={shown}
                            alt="สลิปการโอนเงิน"
                            className={`khsl-img${loaded ? " is-loaded" : ""}`}
                            onLoad={() => setLoaded(true)}
                            onError={() => setLoaded(true)}
                        />
                    </div>

                    <div className="px-4 py-2 text-[11px] kh-ink3 text-center" style={{ borderTop: "1px solid var(--line)" }}>
                        คลิกพื้นที่ว่างรอบๆ หรือกด Esc เพื่อปิด · คลิกที่รูปเพื่อขยาย
                    </div>
                </div>
            </div>
        </div>
    );
}
