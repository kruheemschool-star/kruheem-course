"use client";
import { useCallback, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc, increment, serverTimestamp } from "firebase/firestore";
import { usePathname } from "next/navigation";
import { useUserAuth } from "@/context/AuthContext";
import { bumpExamStat, parseExamPathname } from "@/lib/examStats";

// Helper: Detect device type
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';

    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipod|android.*mobile|windows phone|blackberry/.test(ua);
    const isTablet = /ipad|android(?!.*mobile)|tablet/.test(ua);

    if (isMobile) return 'mobile';
    if (isTablet) return 'tablet';
    return 'desktop';
}

// Helper: Get referrer source category
function getReferrerSource(): string {
    if (typeof document === 'undefined') return 'direct';

    const referrer = document.referrer;
    if (!referrer) return 'direct';

    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();

    // Social Media
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) return 'facebook';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('youtube.com')) return 'youtube';
    if (hostname.includes('line.me') || hostname.includes('line.naver')) return 'line';

    // Search Engines
    if (hostname.includes('google.')) return 'google';
    if (hostname.includes('bing.com')) return 'bing';
    if (hostname.includes('yahoo.')) return 'yahoo';

    // Same site
    if (hostname.includes('kruheem') || hostname.includes('localhost')) return 'internal';

    return 'other';
}

// Helper: Check if current session is admin (using localStorage for persistence)
function isAdminSession(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('isAdminSession') === 'true';
}

// Helper: กรองบอต/crawler ที่รัน JavaScript (Googlebot, ตัวดึงพรีวิวลิงก์ของ
// Facebook/LINE, Lighthouse ฯลฯ) — พวกนี้เคยถูกนับเป็นผู้เข้าชมจริงและกินโควตา
// เขียนฟรีไปด้วย · ระวัง: จับเฉพาะ crawler ไม่แตะเบราว์เซอร์ในแอป FB/LINE
// ของคนจริง (UA คนจริงคือ FBAV/FB_IAB/Line ซึ่งไม่ตรง pattern นี้)
function isLikelyBot(): boolean {
    if (typeof navigator === 'undefined') return false;
    if ((navigator as { webdriver?: boolean }).webdriver) return true;
    return /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|prerender/i.test(navigator.userAgent);
}

export default function VisitorTracker() {
    const pathname = usePathname();
    const lastPathRef = useRef<string | null>(null);

    // Get admin status and user from AuthContext
    const { isAdmin, loading, user } = useUserAuth();

    // Store admin session flag in localStorage for persistence
    useEffect(() => {
        if (!loading && isAdmin) {
            localStorage.setItem('isAdminSession', 'true');
        }
    }, [isAdmin, loading]);

    // === 1. Daily Visit Counter (Runs Once Per Day) ===
    useEffect(() => {
        // Wait for auth to fully load before recording
        if (loading) return;

        const recordDailyVisit = async () => {
            // ❌ Skip tracking for Admin users + bots
            if (isAdmin || isAdminSession() || isLikelyBot()) {
                return;
            }

            const now = new Date();
            const dateInThailand = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
            const today = dateInThailand.toISOString().split("T")[0]; // YYYY-MM-DD

            const storageKey = `visited_${today}`;

            // Only count once per day per session
            if (!sessionStorage.getItem(storageKey)) {
                sessionStorage.setItem(storageKey, "true");

                try {
                    const statsRef = doc(db, "stats", "daily_visits");
                    const device = getDeviceType();
                    const source = getReferrerSource();

                    // Update daily visits + device stats + source stats
                    await setDoc(statsRef, {
                        [today]: increment(1),
                        total_visits: increment(1),
                        // Device breakdown (lifetime)
                        [`device_${device}`]: increment(1),
                        // Source breakdown (lifetime)
                        [`source_${source}`]: increment(1),
                        // Daily device breakdown
                        [`${today}_${device}`]: increment(1),
                        // Daily source breakdown
                        [`${today}_${source}`]: increment(1),
                    }, { merge: true });

                } catch (error) {
                    console.error("Error recording daily visit:", error);
                }
            }
        };

        recordDailyVisit();
    }, [loading, isAdmin]);

    // === 1b. Anonymous Visitor Presence (Heartbeat for non-logged-in users) ===
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const pathnameRef = useRef(pathname);
    pathnameRef.current = pathname; // Always keep latest pathname in ref

    useEffect(() => {
        // Wait for auth to settle before deciding to track
        if (loading) return;

        // Only track anonymous (non-logged-in) visitors, skip admin + bots
        if (user || isAdmin || isAdminSession() || isLikelyBot()) {
            // If user just logged in, clean up anonymous doc
            if (sessionIdRef.current) {
                deleteDoc(doc(db, "anonymous_visitors", sessionIdRef.current)).catch(() => {});
                sessionIdRef.current = null;
            }
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }
            return;
        }

        // Generate or retrieve session ID
        let sessionId = sessionStorage.getItem('anon_session_id');
        if (!sessionId) {
            sessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            sessionStorage.setItem('anon_session_id', sessionId);
        }
        sessionIdRef.current = sessionId;

        const device = getDeviceType();

        // Write presence document (once)
        setDoc(doc(db, "anonymous_visitors", sessionId), {
            sessionId: sessionId,
            lastActive: serverTimestamp(),
            device: device,
            currentPage: pathnameRef.current || '/',
            createdAt: serverTimestamp(),
        }, { merge: true }).catch(() => {});

        // Heartbeat every 5 minutes (uses ref for latest pathname)
        heartbeatRef.current = setInterval(() => {
            setDoc(doc(db, "anonymous_visitors", sessionId!), {
                lastActive: serverTimestamp(),
                currentPage: pathnameRef.current || '/',
            }, { merge: true }).catch(() => {});
        }, 5 * 60 * 1000);

        // Cleanup on unmount / page close
        const cleanup = () => {
            if (sessionIdRef.current) {
                deleteDoc(doc(db, "anonymous_visitors", sessionIdRef.current)).catch(() => {});
            }
        };

        window.addEventListener('beforeunload', cleanup);

        return () => {
            window.removeEventListener('beforeunload', cleanup);
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }
            cleanup();
        };
    }, [user, isAdmin, loading]);

    // === 2. Page View Tracking (Runs On Every Page Change) ===
    // เขียนแบบ throttle: ครั้งแรกของช่วงเขียนทันที (กันวิวแบบเข้าแล้วออกเลยหาย)
    // จากนั้นรวมยอดในหน่วยความจำแล้วเขียนสรุปครั้งเดียวทุก ~45 วิ + ตอนซ่อน/ปิด
    // แท็บ — เดิมเขียน 1 write ต่อทุกการเปลี่ยนหน้า เป็นตัวกินโควตาเขียนฟรี
    // อันดับ 1 (ใช้ไป 72% ของ 20K/วัน) และอัดใส่เอกสารเดียวจนชนลิมิต 1 write/วิ
    const pvBufferRef = useRef<Record<string, number>>({});
    const pvTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pvLastWriteRef = useRef(0);

    const flushPageViews = useCallback(() => {
        if (pvTimerRef.current) {
            clearTimeout(pvTimerRef.current);
            pvTimerRef.current = null;
        }
        const buf = pvBufferRef.current;
        const keys = Object.keys(buf);
        if (keys.length === 0) return;
        pvBufferRef.current = {};
        pvLastWriteRef.current = Date.now();

        const payload: Record<string, unknown> = { last_updated: serverTimestamp() };
        for (const k of keys) payload[k] = increment(buf[k]);
        setDoc(doc(db, "stats", "page_views"), payload, { merge: true }).catch((error) => {
            console.error("Error recording page view:", error);
        });
    }, []);

    // Flush ยอดค้างตอนผู้ใช้ซ่อน/ปิดแท็บ และตอน component ถูกถอด
    useEffect(() => {
        const onVisibilityHidden = () => {
            if (document.visibilityState === "hidden") flushPageViews();
        };
        window.addEventListener("pagehide", flushPageViews);
        document.addEventListener("visibilitychange", onVisibilityHidden);
        return () => {
            window.removeEventListener("pagehide", flushPageViews);
            document.removeEventListener("visibilitychange", onVisibilityHidden);
            flushPageViews();
        };
    }, [flushPageViews]);

    useEffect(() => {
        // Skip if same page or no pathname
        if (!pathname || pathname === lastPathRef.current) return;
        lastPathRef.current = pathname;

        // ❌ Skip tracking for Admin users + bots
        if (isAdmin || isAdminSession() || isLikelyBot()) {
            return;
        }

        // ❌ Skip tracking for admin pages (extra safety)
        if (pathname.startsWith('/admin')) {
            return;
        }

        const now = new Date();
        const dateInThailand = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        const today = dateInThailand.toISOString().split("T")[0];
        const hour = dateInThailand.getHours();

        // Normalize path for aggregation
        let normalizedPath = pathname;

        // Group dynamic routes
        if (pathname.startsWith('/course/')) normalizedPath = '/course/[id]';
        else if (pathname.startsWith('/exam/')) normalizedPath = '/exam/[id]';
        else if (pathname.startsWith('/learn/')) normalizedPath = '/learn/[id]';
        else if (pathname.startsWith('/summary/') && pathname !== '/summary') normalizedPath = '/summary/[slug]';
        else if (pathname.startsWith('/blog/') && pathname !== '/blog') normalizedPath = '/blog/[slug]';

        // สะสมยอดลง buffer (field ชุดเดิมเป๊ะ — แดชบอร์ดแอดมินอ่านเหมือนเดิม)
        const bump = (key: string) => {
            pvBufferRef.current[key] = (pvBufferRef.current[key] || 0) + 1;
        };
        bump(normalizedPath);            // Lifetime page counts
        bump('total_page_views');
        bump(`${today}_${normalizedPath}`); // Daily page counts
        bump(`hour_${hour}`);            // Hourly distribution (for heatmap)

        const sinceLastWrite = Date.now() - pvLastWriteRef.current;
        if (sinceLastWrite >= 45_000) {
            flushPageViews();
        } else if (!pvTimerRef.current) {
            pvTimerRef.current = setTimeout(flushPageViews, 45_000 - sinceLastWrite);
        }

        // สถิติคลังข้อสอบรายชุด: หน้า /exam/[id] ถูก normalize รวมเป็นก้อนเดียว
        // ด้านบน (แยกชุดไม่ได้) — ตรงนี้นับแยกรายชุดลง stats/exam_YYYY-MM-DD แทน
        // พร้อมแหล่งที่มาของคนดู (นับเฉพาะตอนเปิดดูหน้าปกติ ไม่นับหน้าพิมพ์)
        const examPage = parseExamPathname(pathname);
        if (examPage) {
            bumpExamStat(
                examPage.examId,
                examPage.isPrint ? { vp: 1 } : { v: 1, [`src_${getReferrerSource()}`]: 1 }
            );
        }
    }, [pathname, isAdmin, flushPageViews]);

    // === 3. Logged-in Member Presence: record the page they're currently on ===
    //     Anonymous visitors are handled above; this mirrors it for members so the
    //     admin "online users" list can show each member's current page. Writes ONLY
    //     on an actual route change (throttle), and skips admins + admin pages.
    const lastMemberPathRef = useRef<string | null>(null);
    const lastMemberWriteRef = useRef(0);
    useEffect(() => {
        if (loading || !user) return;
        if (isAdmin || isAdminSession()) return;
        if (!pathname || pathname.startsWith('/admin')) return;
        if (pathname === lastMemberPathRef.current) return;
        lastMemberPathRef.current = pathname;

        // เขียนไม่ถี่กว่า 1 ครั้ง/60 วิ — จุดนี้แพงสองเด้ง: นอกจากตัว write เอง
        // ทุกการเขียน users/{uid} ยังไปสะกิด onSnapshot ใน AuthContext ให้อ่าน
        // ซ้ำอีก 1 read เสมอ (หน้า "ออนไลน์" ฝั่งแอดมินช้าลงสูงสุด 1 นาที รับได้)
        if (Date.now() - lastMemberWriteRef.current < 60_000) return;
        lastMemberWriteRef.current = Date.now();

        setDoc(doc(db, "users", user.uid), {
            currentPage: pathname,
            lastActive: serverTimestamp(),
        }, { merge: true }).catch(() => {});
    }, [pathname, user, isAdmin, loading]);

    return null;
}
