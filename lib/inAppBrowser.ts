"use client";
/**
 * Shared in-app-browser detection + "escape to the real browser" helper.
 *
 * Used by <BrowserWarning> (the amber banner) and by CTAs that should bounce the
 * user straight into Chrome/Safari when the page was opened inside LINE /
 * Messenger / Facebook / Instagram / etc. (where Google login + some sign-up
 * steps are unreliable, and window.print() is a silent no-op — so "บันทึกเป็น
 * PDF" can never work there). One source of truth so the user-agent list and the
 * intent:// / x-safari- jumps never drift apart.
 */
import { useSyncExternalStore } from "react";

export type Platform = "ios" | "android" | "other";
export type InAppDetection = { isInApp: boolean; platform: Platform; appName: string };

const SERVER_SNAPSHOT: InAppDetection = { isInApp: false, platform: "other", appName: "แอปนี้" };
let cached: InAppDetection | null = null;

/**
 * Name of the app whose webview we're in, or null when the UA has no known
 * app marker. Order matters: Messenger's UA also carries the generic FB tokens.
 */
function detectAppName(ua: string): string | null {
    if (/Line\//i.test(ua)) return "LINE";
    if (/MessengerForiOS|Orca-Android|FB_IAB\/Orca/i.test(ua)) return "Messenger";
    if (/FBAN|FBAV|FB_IAB|FB4A|FBIOS/i.test(ua)) return "Facebook";
    if (/Instagram/i.test(ua)) return "Instagram";
    if (/Twitter/i.test(ua)) return "Twitter (X)";
    if (/TikTok|musical_ly|Bytedance/i.test(ua)) return "TikTok";
    return null;
}

/**
 * Generic webview heuristics (no app name in the UA):
 *  - Android: Chrome stamps "; wv" into every WebView UA (Gmail, LINE OpenChat, etc.).
 *  - iOS: every real browser (Safari/Chrome/Firefox/Edge…) carries a "Safari/…"
 *    token; a bare WKWebView UA ends at "Mobile/15E148" without it.
 */
function looksLikeGenericWebView(ua: string): boolean {
    if (/Android/i.test(ua)) return /;\s*wv\)/.test(ua);
    if (/iPhone|iPad|iPod/i.test(ua)) return !/Safari\//i.test(ua);
    return false;
}

/** Detect the in-app browser once on the client; cache so the snapshot ref stays stable. */
export function getInAppBrowser(): InAppDetection {
    if (typeof navigator === "undefined") return SERVER_SNAPSHOT;
    if (cached) return cached;
    const ua = navigator.userAgent || navigator.vendor || "";
    // Test aid: ?preview_warning=android | ios | 1 forces in-app detection on any
    // browser, so the banner + escape buttons can be verified without opening
    // inside Messenger/LINE.
    const preview = /[?&]preview_warning=(android|ios|1)/.exec(window.location.search)?.[1];
    const realApp = detectAppName(ua);
    cached = {
        isInApp: !!preview || realApp !== null || looksLikeGenericWebView(ua),
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

/**
 * Try to escape to the real browser and report whether it actually happened.
 * Resolves true when this webview got hidden (Safari/Chrome took over) within
 * ~1.5s, false when nothing happened — Meta's iOS webview silently swallows the
 * x-safari- jump, so callers can then show the manual "••• → เปิดในเบราว์เซอร์"
 * steps instead of leaving the user staring at a button that did nothing.
 */
export function tryEscapeToBrowser(url: string, platform: Platform, waitMs = 1500): Promise<boolean> {
    return new Promise((resolve) => {
        if (!openInExternalBrowser(url, platform)) { resolve(false); return; }
        let escaped = false;
        const markEscaped = () => { escaped = true; };
        document.addEventListener("visibilitychange", markEscaped, { once: true });
        window.addEventListener("pagehide", markEscaped, { once: true });
        window.setTimeout(() => {
            document.removeEventListener("visibilitychange", markEscaped);
            window.removeEventListener("pagehide", markEscaped);
            // นับเฉพาะ "เพิ่งถูกซ่อนหลังกด" — อย่าอ่าน visibilityState ตรงๆ เพราะ
            // แท็บ/พรีวิวที่ซ่อนอยู่แล้วจะรายงาน hidden ทั้งที่ไม่ได้เด้งออกไปไหน
            resolve(escaped);
        }, waitMs);
    });
}

/** Copy `text` to the clipboard, with the execCommand fallback older webviews need. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(ta);
            return ok;
        } catch {
            return false;
        }
    }
}
