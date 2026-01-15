"use client";
import { useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { usePathname } from "next/navigation";

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

export default function VisitorTracker() {
    const hasRun = useRef(false);
    const pathname = usePathname();
    const lastPathRef = useRef<string | null>(null);

    // === 1. Daily Visit Counter (Runs Once Per Day) ===
    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const recordDailyVisit = async () => {
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
    }, []);

    // === 2. Page View Tracking (Runs On Every Page Change) ===
    useEffect(() => {
        // Skip if same page or no pathname
        if (!pathname || pathname === lastPathRef.current) return;
        lastPathRef.current = pathname;

        const recordPageView = async () => {
            try {
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

                // Update page view stats
                const pageStatsRef = doc(db, "stats", "page_views");
                await setDoc(pageStatsRef, {
                    // Lifetime page counts
                    [normalizedPath]: increment(1),
                    total_page_views: increment(1),
                    // Daily page counts
                    [`${today}_${normalizedPath}`]: increment(1),
                    // Hourly distribution (for heatmap)
                    [`hour_${hour}`]: increment(1),
                    last_updated: serverTimestamp(),
                }, { merge: true });

            } catch (error) {
                console.error("Error recording page view:", error);
            }
        };

        recordPageView();
    }, [pathname]);

    return null;
}
