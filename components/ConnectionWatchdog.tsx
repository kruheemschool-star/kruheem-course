"use client";

/**
 * ยามเฝ้าการเชื่อมต่อ — แก้อาการ "เปิดเว็บทิ้งไว้นาน ๆ แล้วกลับมากดปุ่มไม่ได้"
 *
 * อาการที่เจอ (ทั้งหน้าบ้านและหลังบ้าน): เปิดหน้าเว็บค้างไว้ พอกลับมากดปุ่ม
 * มันหมุนค้าง ปุ่มกลายเป็นสีจาง กดอะไรไม่ได้ทั้งหน้า
 *
 * ต้นเหตุ: ช่องสัญญาณของ Firestore กับ token ของ Firebase Auth "ตายเงียบ"
 * ระหว่างที่เครื่องหลับ/แท็บถูกพัก (รายละเอียดใน lib/netGuard.ts)
 *
 * ตัวนี้คอยจับ "จังหวะที่หน้าเว็บตื่น" แล้วรีบต่อสัญญาณใหม่ให้ก่อนที่ผู้ใช้
 * จะทันได้กดปุ่ม จับ 4 ทาง เพราะไม่มีทางไหนครอบคลุมครบเอง
 *
 *   1) กลับมาที่แท็บ หลังซ่อนไปนานกว่า 5 นาที  → visibilitychange
 *   2) เครื่องหลับแล้วตื่น ทั้งที่แท็บอยู่หน้าสุด → นาฬิกาเดินกระโดด (ตัวหลัก
 *      ของเคส "เปิดคอมทิ้งไว้แล้วปิดฝา" ซึ่ง visibilitychange ไม่ยิง)
 *   3) กดปุ่มย้อนกลับของเบราว์เซอร์เข้าหน้าที่แคชไว้ → pageshow (persisted)
 *   4) เน็ตกลับมา                                → online
 *
 * และดักอีกอาการหนึ่งที่ให้ผลเหมือนกัน: เปิดแท็บค้างข้ามวันแล้วเว็บถูก deploy
 * ใหม่จนไฟล์ย่อย (chunk) ของบิลด์เก่าหายไป — กดปุ่มที่ต้องโหลดไฟล์เพิ่มแล้ว
 * เงียบสนิท ตรงนี้จะรีเฟรชหน้าให้อัตโนมัติหนึ่งครั้ง
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { reviveConnection } from "@/lib/netGuard";

/** ซ่อนแท็บไว้นานกว่านี้ถือว่า "ตื่นมาใหม่" ต้องต่อสัญญาณใหม่
 *  ตั้งไว้ 5 นาที: สลับแท็บแป๊บเดียวช่องสัญญาณยังดีอยู่ ไม่ต้องต่อใหม่ให้
 *  เปลืองโควตาอ่านของ Firestore (เคสเครื่องหลับมีตัวจับนาฬิกาด้านล่างดูแลอยู่) */
const HIDDEN_WAKE_MS = 5 * 60_000;
/** นาฬิกาเดินกระโดดเกินนี้ = เครื่องหลับไปแล้วตื่น */
const CLOCK_GAP_MS = 90_000;
/** จังหวะเช็คนาฬิกา */
const TICK_MS = 30_000;

type Status = "ok" | "reconnecting" | "offline";

export default function ConnectionWatchdog() {
    const [status, setStatus] = useState<Status>("ok");
    const hiddenAtRef = useRef<number | null>(null);
    const lastTickRef = useRef<number>(Date.now());
    const busyRef = useRef(false);

    const revive = useCallback(async (reason: string) => {
        if (busyRef.current) return;
        busyRef.current = true;

        // โชว์ป้ายเฉพาะตอนที่ต่อใหม่ช้ากว่า 2 วิ — ต่อติดไวจะได้ไม่รบกวนสายตา
        const slowTimer = setTimeout(() => setStatus("reconnecting"), 2_000);
        try {
            await reviveConnection(reason);
            setStatus(navigator.onLine ? "ok" : "offline");
        } finally {
            clearTimeout(slowTimer);
            busyRef.current = false;
        }
    }, []);

    /* ---- 1) กลับเข้าแท็บหลังซ่อนไปนาน + 3) กลับมาจากแคชของเบราว์เซอร์ ---- */
    useEffect(() => {
        const onVisibility = () => {
            if (document.hidden) {
                hiddenAtRef.current = Date.now();
                return;
            }
            const hiddenAt = hiddenAtRef.current;
            hiddenAtRef.current = null;
            lastTickRef.current = Date.now(); // กันตัวจับนาฬิกายิงซ้ำซ้อน
            if (hiddenAt && Date.now() - hiddenAt >= HIDDEN_WAKE_MS) {
                void revive("tab-visible");
            }
        };

        const onPageShow = (e: PageTransitionEvent) => {
            if (e.persisted) void revive("bfcache");
        };

        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pageshow", onPageShow);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pageshow", onPageShow);
        };
    }, [revive]);

    /* ---- 2) เครื่องหลับแล้วตื่น (แท็บยังอยู่หน้าสุด) ---- */
    useEffect(() => {
        const id = setInterval(() => {
            const now = Date.now();
            const gap = now - lastTickRef.current;
            lastTickRef.current = now;
            if (gap > CLOCK_GAP_MS) void revive("clock-gap");
        }, TICK_MS);
        return () => clearInterval(id);
    }, [revive]);

    /* ---- 4) เน็ตหลุด / เน็ตกลับมา ---- */
    useEffect(() => {
        const onOnline = () => void revive("online");
        const onOffline = () => setStatus("offline");
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        if (!navigator.onLine) setStatus("offline");
        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
        };
    }, [revive]);

    /* ---- ไฟล์ย่อยของบิลด์เก่าหาย (เว็บถูก deploy ใหม่ระหว่างเปิดแท็บค้าง) ---- */
    useEffect(() => {
        const RELOAD_KEY = "kh_chunk_reload_at";

        const reloadOnce = () => {
            const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
            // รีเฟรชได้ไม่เกิน 1 ครั้งต่อ 1 นาที — กันหน้าเว็บวนรีโหลดไม่จบ
            if (Date.now() - last < 60_000) return;
            sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
            window.location.reload();
        };

        // โหลด <script>/<link> ของ Next ไม่สำเร็จ (404 เพราะบิลด์เก่าถูกลบ)
        const onResourceError = (e: Event) => {
            const el = e.target as HTMLElement | null;
            if (!el || (el.tagName !== "SCRIPT" && el.tagName !== "LINK")) return;
            const url = (el as HTMLScriptElement).src || (el as HTMLLinkElement).href || "";
            if (url.includes("/_next/static/")) reloadOnce();
        };

        // import แบบ dynamic ล้มเหลว (next/dynamic เช่นกราฟในหน้าผลสอบ)
        const onRejection = (e: PromiseRejectionEvent) => {
            const msg = String((e.reason as Error)?.message || e.reason || "");
            if (/Loading chunk|ChunkLoadError|dynamically imported module|Importing a module script failed/i.test(msg)) {
                reloadOnce();
            }
        };

        window.addEventListener("error", onResourceError, true);
        window.addEventListener("unhandledrejection", onRejection);
        return () => {
            window.removeEventListener("error", onResourceError, true);
            window.removeEventListener("unhandledrejection", onRejection);
        };
    }, []);

    if (status === "ok") return null;

    const offline = status === "offline";
    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: "fixed",
                left: "50%",
                bottom: 16,
                transform: "translateX(-50%)",
                zIndex: 10000,
                display: "flex",
                alignItems: "center",
                gap: 10,
                maxWidth: "calc(100vw - 24px)",
                padding: "9px 14px",
                borderRadius: 999,
                fontSize: 13,
                lineHeight: 1.4,
                color: "#fff",
                background: offline ? "#b45309" : "#1f2937",
                boxShadow: "0 6px 20px rgba(0,0,0,.22)",
            }}
        >
            <span
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: offline ? "#fbbf24" : "#34d399",
                }}
            />
            <span>{offline ? "อินเทอร์เน็ตหลุด — รอสัญญาณกลับมา" : "กำลังเชื่อมต่อใหม่..."}</span>
            <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                    flexShrink: 0,
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff",
                    background: "rgba(255,255,255,.18)",
                }}
            >
                โหลดใหม่
            </button>
        </div>
    );
}
