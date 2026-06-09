"use client";
/**
 * Shared in-app-browser detection + "escape to the real browser" helper.
 *
 * Used by <BrowserWarning> (the amber banner) and by CTAs that should bounce the
 * user straight into Chrome/Safari when the page was opened inside LINE /
 * Messenger / Facebook / Instagram / etc. (where Google login + some sign-up
 * steps are unreliable). One source of truth so the user-agent list and the
 * intent:// / x-safari- jumps never drift apart.
 */
import { useSyncExternalStore } from "react";

export type Platform = "ios" | "android" | "other";
export type InAppDetection = { isInApp: boolean; platform: Platform; appName: string };

const SERVER_SNAPSHOT: InAppDetection = { isInApp: false, platform: "other", appName: "แอปนี้" };
let cached: InAppDetection | null = null;

/** Detect the in-app browser once on the client; cache so the snapshot ref stays stable. */
export function getInAppBrowser(): InAppDetection {
    if (typeof navigator === "undefined") return SERVER_SNAPSHOT;
    if (cached) return cached;
    const ua = navigator.userAgent || navigator.vendor || "";
    // Test aid: ?preview_warning=android | ios | 1 forces in-app detection on any
    // browser, so the banner + escape buttons can be verified without opening
    // inside Messenger/LINE.
    const preview = /[?&]preview_warning=(android|ios|1)/.exec(window.location.search)?.[1];
    const realApp =
        /Line/i.test(ua) ? "LINE"
        : /FBAN|FBAV/i.test(ua) ? "Messenger"
        : /FB_IAB/i.test(ua) ? "Facebook"
        : /Instagram/i.test(ua) ? "Instagram"
        : /Twitter/i.test(ua) ? "Twitter (X)"
        : /TikTok/i.test(ua) ? "TikTok"
        : null;
    cached = {
        isInApp: !!preview || /Line|FBAN|FBAV|FB_IAB|Instagram|Twitter|TikTok/i.test(ua),
        platform: preview === "android" ? "android"
            : preview === "ios" ? "ios"
            : /Android/i.test(ua) ? "android"
            : /iPhone|iPad|iPod/i.test(ua) ? "ios"
            : "other",
        appName: realApp ?? (preview ? "Messenger" : "แอปนี้"),
    };
    return cached;
}

const subscribe = () => () => {};
const getServerSnapshot = () => SERVER_SNAPSHOT;

/** React hook: the in-app detection, SSR-safe (returns "not in-app" on the server). */
export function useInAppBrowser(): InAppDetection {
    return useSyncExternalStore(subscribe, getInAppBrowser, getServerSnapshot);
}

/**
 * Hand `url` to the device's real browser to escape an in-app webview.
 *  - Android: intent:// → Chrome (falls back to the plain https URL if Chrome is absent).
 *  - iOS: x-safari-https:// → Safari (LINE honors this; Meta's webview may ignore it,
 *    so callers should keep a fallback for that case).
 * Returns true if an escape was actually attempted (i.e. platform is iOS/Android).
 */
export function openInExternalBrowser(url: string, platform: Platform): boolean {
    if (platform === "android") {
        const bare = url.replace(/^https?:\/\//, "");
        window.location.href =
            `intent://${bare}#Intent;scheme=https;package=com.android.chrome;` +
            `S.browser_fallback_url=${encodeURIComponent(url)};end`;
        return true;
    }
    if (platform === "ios") {
        window.location.href = `x-safari-${url}`;
        return true;
    }
    return false;
}
