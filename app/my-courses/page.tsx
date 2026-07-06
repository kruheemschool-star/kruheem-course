"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, where, getDocs, onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { useTheme } from "next-themes";
import { auth, db } from "@/lib/firebase";
import { getCachedData } from "@/lib/dataCache";
import { useUserAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Settings, ArrowLeft, Star, Copy, Gift, X, CheckCircle, BookOpen, BarChart3, SlidersHorizontal, Sparkles, RotateCcw, Check, Clock, Lock, Sun, Moon, FileText, Download, Loader2 } from "lucide-react";
import ReviewForm from "@/app/reviews/ReviewForm";

/* ============================================================
   "Dot Pop" design system (spec §2–§6 + Dark-Mode spec).
   Light is the default; dark mode is the site-wide next-themes
   `.dark` class. All colours are computed from palette(isDark)
   and the Dot Pop background is composed per-mode in JS.
   ============================================================ */

// §3 — dot palettes (r,g,b)
const DOT_PALETTES: Record<string, number[][]> = {
    classic: [[20, 184, 166], [14, 165, 233], [244, 114, 182], [250, 204, 21]],
    cool: [[96, 165, 250], [139, 92, 246], [236, 72, 153], [45, 212, 191]],
    warm: [[251, 146, 60], [250, 204, 21], [251, 113, 133], [244, 114, 182]],
    rainbow: [[239, 68, 68], [249, 115, 22], [250, 204, 21], [34, 197, 94], [59, 130, 246], [168, 85, 247]],
    mono: [[13, 148, 136], [20, 184, 166], [45, 212, 191], [94, 234, 212]],
};

// §3 — base colour under the dots (light / dark per Dark-Mode spec §3)
const DOT_BASES: Record<string, string> = {
    white: "#FDFEFD",
    mint: "#E2F9F1",
    sky: "#DFF2FE",
    lemon: "#FEF6D8",
    pink: "#FDE9F2",
    lavender: "#EFEAFE",
    rainbow: "linear-gradient(160deg, #DFF8EE 0%, #DFF0FE 32%, #FDEAF3 64%, #FEF7D9 100%)",
};
const DOT_BASES_DARK: Record<string, string> = {
    white: "#0C1320",
    mint: "#0A1F1A",
    sky: "#091A2B",
    lemon: "#1A1708",
    pink: "#1E0E1A",
    lavender: "#120E24",
    rainbow: "linear-gradient(160deg, #0A1F1A 0%, #091A2B 36%, #1B0C18 68%, #1A1708 100%)",
};

// §6 — grade-level accent (`--sec`)
const SEC: Record<GradeKey, string> = {
    primary: "#22C55E",
    junior: "#14B8A6",
    senior: "#0EA5E9",
    other: "#F59E0B",
};

const GRADE_META: { key: GradeKey; thai: string; en: string }[] = [
    { key: "primary", thai: "ระดับประถมศึกษา", en: "Primary" },
    { key: "junior", thai: "ระดับมัธยมต้น", en: "Junior High" },
    { key: "senior", thai: "ระดับมัธยมปลาย", en: "Senior High" },
    { key: "other", thai: "คอร์สอื่น ๆ", en: "General" },
];

type GradeKey = "primary" | "junior" | "senior" | "other";

// ── Palette: every base colour resolves through here (light / dark) ──
function palette(d: boolean) {
    return d
        ? {
              card: "#182336",
              card2: "#1F2D44",
              subtle: "#1F2D44",
              track: "#0E1726",
              ink: "#EAF1FB",
              ink2: "#94A6C0",
              ink3: "#6B7E99",
              line: "#263650",
              line2: "#37496A",
              accent: "#4F9DF0",
              accentDeep: "#8CBEF8",
              good: "#46C98A",
              shadow: "0 28px 64px -30px rgba(0,0,0,.72)",
              shadowSm: "0 14px 32px -18px rgba(0,0,0,.6)",
              overlay: "rgba(4,9,18,.68)",
              disabledBg: "#1F2D44",
              disabledFg: "#6B7E99",
              btnFg: "#06101F",
          }
        : {
              card: "#FFFFFF",
              card2: "#F4F8FB",
              subtle: "#F7FAFC",
              track: "#E6EDF3",
              ink: "#1A2A3C",
              ink2: "#5A6B7C",
              ink3: "#9AA8B5",
              line: "#E4EAF0",
              line2: "#D0DAE4",
              accent: "#2F6DB5",
              accentDeep: "#1F4E88",
              good: "#16A34A",
              shadow: "0 22px 54px -34px rgba(31,78,136,.30)",
              shadowSm: "0 10px 24px -18px rgba(31,78,136,.28)",
              overlay: "rgba(0,0,0,.5)",
              disabledBg: "#EEF2F6",
              disabledFg: "#9AA8B5",
              btnFg: "#FFFFFF",
          };
}
type Pal = ReturnType<typeof palette>;

// vivid gradient ink for the hero word / avatar initial (§4 / dark §4.1)
const gradText = (d: boolean): React.CSSProperties => ({
    backgroundImage: d ? "linear-gradient(100deg, #5EEAD4, #7DD3FC 58%, #86EFAC)" : "linear-gradient(90deg, #0D9488, #0EA5E9 55%, #22C55E)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
});
// vivid teal→sky used by avatar ring / resume arrow / CTAs / FAB
const tealSky = (d: boolean) => (d ? "linear-gradient(135deg, #2DD4BF, #7DD3FC)" : "linear-gradient(135deg, #0D9488, #0EA5E9)");

interface ThemePrefs {
    vivid: boolean;
    cardful: boolean;
    style: string;
    palette: string;
    base: string;
    arrange: string;
    size: number;
    space: number;
    opacity: number;
}

const DEFAULT_PREFS: ThemePrefs = {
    vivid: true,
    cardful: true,
    style: "dotpop",
    palette: "classic",
    base: "lemon",
    arrange: "checker",
    size: 2,
    space: 38,
    opacity: 0.8,
};

const PREFS_KEY = "mc-theme-prefs-v1";

// §3 — offset table per arrangement (fraction of dotSpace)
function dotOffsets(arrange: string, n: number): number[][] {
    if (arrange === "diag") return Array.from({ length: n }, (_, i) => [i / n, i / n]);
    if (arrange === "rows") return Array.from({ length: n }, (_, i) => [i / n, 0]);
    if (arrange === "columns") return Array.from({ length: n }, (_, i) => [0, i / n]);
    const base = [[0, 0], [0.5, 0.5], [0.25, 0.75], [0.75, 0.25], [0.25, 0.25], [0.75, 0.75]];
    return Array.from({ length: n }, (_, i) => base[i % base.length]);
}

// shared decorative layers (light / dark — Dark spec §3)
const VEIL = "linear-gradient(180deg, rgba(255,255,255,.92) 0, rgba(255,255,255,.5) 230px, rgba(255,255,255,0) 520px)";
const VEIL_DARK = "linear-gradient(180deg, rgba(11,19,32,.94) 0, rgba(11,19,32,.55) 230px, rgba(11,19,32,0) 520px)";
const SOFT = "radial-gradient(640px 420px at 0% 0%, rgba(45,212,191,.14), transparent 58%), radial-gradient(700px 460px at 100% 4%, rgba(56,189,248,.12), transparent 55%)";
const SOFT_DARK = "radial-gradient(640px 420px at 0% 0%, rgba(45,212,191,.20), transparent 58%), radial-gradient(700px 460px at 100% 4%, rgba(56,189,248,.18), transparent 55%)";
// §3 — fallback for any non-dotpop background while in dark mode
const DARK_FALLBACK = "radial-gradient(1000px 620px at 50% -12%, rgba(79,157,240,.18), transparent 66%), radial-gradient(820px 560px at 100% 4%, rgba(45,212,191,.12), transparent 60%), #0B1320";

// §3 — compose the Dot Pop background string (top → bottom), mode-aware
function buildDotPop(p: ThemePrefs, d: boolean): string {
    const colors = DOT_PALETTES[p.palette] || DOT_PALETTES.classic;
    const offs = dotOffsets(p.arrange, colors.length);
    const op = d ? Math.min(1, p.opacity + 0.12) : p.opacity;
    const dots = colors
        .map(([r, g, b], i) => {
            const [ox, oy] = offs[i];
            return `radial-gradient(rgba(${r},${g},${b},${op}) ${p.size}px, transparent ${(p.size + 0.4).toFixed(1)}px) ${(ox * p.space).toFixed(2)}px ${(oy * p.space).toFixed(2)}px / ${p.space}px ${p.space}px`;
        })
        .join(", ");
    const veil = d ? VEIL_DARK : VEIL;
    const soft = d ? SOFT_DARK : SOFT;
    const baseVal = (d ? DOT_BASES_DARK : DOT_BASES)[p.base] || (d ? DOT_BASES_DARK : DOT_BASES).lemon;
    return `${veil}, ${dots}, ${soft}, ${baseVal}`;
}

// §3 — alternative backgrounds (light only; dark non-dotpop → DARK_FALLBACK)
function buildBg(p: ThemePrefs, d: boolean): string {
    if (p.style === "dotpop") return buildDotPop(p, d);
    if (d) return DARK_FALLBACK;
    const baseVal = DOT_BASES[p.base] || DOT_BASES.lemon;
    switch (p.style) {
        case "plain":
            return `${VEIL}, ${SOFT}, ${baseVal}`;
        case "graph": {
            const s = p.space;
            const lines = `repeating-linear-gradient(0deg, transparent 0 ${s - 1}px, rgba(47,109,181,.10) ${s - 1}px ${s}px), repeating-linear-gradient(90deg, transparent 0 ${s - 1}px, rgba(47,109,181,.10) ${s - 1}px ${s}px)`;
            return `${VEIL}, ${lines}, ${SOFT}, ${baseVal}`;
        }
        case "notebook": {
            const s = p.space;
            const lines = `repeating-linear-gradient(0deg, transparent 0 ${s - 1}px, rgba(47,109,181,.13) ${s - 1}px ${s}px)`;
            return `${VEIL}, ${lines}, ${SOFT}, ${baseVal}`;
        }
        case "dots": {
            const [r, g, b] = (DOT_PALETTES[p.palette] || DOT_PALETTES.classic)[0];
            const dot = `radial-gradient(rgba(${r},${g},${b},${p.opacity}) ${p.size}px, transparent ${(p.size + 0.4).toFixed(1)}px) 0 0 / ${p.space}px ${p.space}px`;
            return `${VEIL}, ${dot}, ${SOFT}, ${baseVal}`;
        }
        case "aurora": {
            const a = "radial-gradient(900px 600px at 8% -4%, rgba(45,212,191,.30), transparent 60%), radial-gradient(900px 620px at 96% 6%, rgba(56,189,248,.28), transparent 60%), radial-gradient(820px 620px at 50% 108%, rgba(168,85,247,.16), transparent 62%)";
            return `${VEIL}, ${a}, ${baseVal}`;
        }
        default:
            return buildDotPop(p, d);
    }
}

// mix `hex` toward `towardHex` by pct% (both must be 6-digit hex)
function shade(hex: string, towardHex: string, pct: number): string {
    const a = hex.replace("#", "");
    const b = towardHex.replace("#", "");
    const t = pct / 100;
    const mix = (i: number) => {
        const ca = parseInt(a.slice(i, i + 2), 16);
        const cb = parseInt(b.slice(i, i + 2), 16);
        return Math.round(ca * (1 - t) + cb * t);
    };
    return `rgb(${mix(0)}, ${mix(2)}, ${mix(4)})`;
}
const tint = (hex: string, whitePct: number) => shade(hex, "#FFFFFF", whitePct);

// Helpers (data — unchanged from the original page)
const formatDate = (date: any) => {
    if (!date) return "-";
    try {
        const d = date.toDate ? date.toDate() : new Date(date.seconds ? date.seconds * 1000 : date);
        if (isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
    } catch (e) {
        return "-";
    }
};

const getDaysRemaining = (expiryDate: any) => {
    if (!expiryDate) return null;
    try {
        const now = new Date();
        const expiry = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate.seconds ? expiryDate.seconds * 1000 : expiryDate);
        if (isNaN(expiry.getTime())) return null;
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    } catch (e) {
        return null;
    }
};

// Types
interface Course {
    id: string;
    title: string;
    image?: string;
    category?: string;
    status?: string;
    expiryDate?: any;
    startedAt?: any;
    totalLessons?: number;
    isAdminView?: boolean;
    isExamBank?: boolean;
}

interface Progress {
    completed: number;
    total: number;
    percent: number;
}

interface UserCoupon {
    code: string;
    discountAmount: number;
    isUsed: boolean;
    courseId?: string;
    source: string;
}

export default function MyCoursesPage() {
    const { user, userProfile, loading: authLoading } = useUserAuth();
    const { resolvedTheme, setTheme } = useTheme();
    const [courses, setCourses] = useState<Course[]>([]);
    const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
    const [lastSession, setLastSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
    const [reviewedCourseIds, setReviewedCourseIds] = useState<Set<string>>(new Set());
    const [reviewModal, setReviewModal] = useState<{ courseId: string; courseName: string } | null>(null);

    // ── Theme preferences + light/dark mode ──
    const [prefs, setPrefs] = useState<ThemePrefs>(DEFAULT_PREFS);
    const [tweakOpen, setTweakOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // §1 — URL override ?mode=dark|light (read from the live URL, no Suspense needed)
    useEffect(() => {
        const m = new URLSearchParams(window.location.search).get("mode");
        if (m === "dark" || m === "light") setTheme(m);
    }, [setTheme]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(PREFS_KEY);
            if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
        } catch {
            /* ignore */
        }
    }, []);

    const updatePrefs = (patch: Partial<ThemePrefs>) => {
        setPrefs((prev) => {
            const next = { ...prev, ...patch };
            try {
                localStorage.setItem(PREFS_KEY, JSON.stringify(next));
            } catch {
                /* ignore */
            }
            return next;
        });
    };

    const isDark = mounted && resolvedTheme === "dark";
    const c = useMemo(() => palette(isDark), [isDark]);
    const bgString = useMemo(() => buildBg(prefs, isDark), [prefs, isDark]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        let unsubscribeEnrollments: () => void;
        let unsubscribeProgress: () => void;
        let unsubscribeStates: () => void;

        const setupListeners = async () => {
            setLoading(true);
            try {
                const allCoursesData = await getCachedData("all-courses", async () => {
                    const coursesSnap = await getDocs(collection(db, "courses"));
                    return coursesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
                });

                const uid = user.uid;

                // --- Listener A: Enrollments ---
                const enrollQuery = query(collection(db, "enrollments"), where("userId", "==", uid));
                unsubscribeEnrollments = onSnapshot(enrollQuery, (enrollSnap: QuerySnapshot<DocumentData>) => {
                    const enrollments = enrollSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as any));
                    const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
                    const isAdmin = user?.email === "kruheemschool@gmail.com";

                    let myCourses: Course[];

                    if (isAdmin) {
                        myCourses = allCoursesData.map((c) => {
                            const enroll = enrollments.find((e) => e.courseId === c.id);
                            return {
                                ...c,
                                status: enroll?.status || "approved",
                                expiryDate: enroll?.expiryDate,
                                startedAt: enroll?.createdAt,
                                isAdminView: true,
                                isExamBank: c.title.includes("คลังข้อสอบ"),
                            };
                        });
                    } else {
                        myCourses = allCoursesData
                            .filter((c) => enrolledCourseIds.has(c.id))
                            .map((c) => {
                                const courseEnrollments = enrollments.filter((e) => e.courseId === c.id);

                                courseEnrollments.sort((a, b) => {
                                    if (a.status === "approved" && b.status !== "approved") return -1;
                                    if (b.status === "approved" && a.status !== "approved") return 1;
                                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                                });

                                const enroll = courseEnrollments[0];
                                let expiry = enroll?.expiryDate;
                                let start = enroll?.createdAt;

                                if (start && !expiry) {
                                    const startDate = start.toDate ? start.toDate() : new Date(start.seconds * 1000);
                                    const expiryDate = new Date(startDate);
                                    expiryDate.setFullYear(expiryDate.getFullYear() + 5);
                                    expiry = expiryDate;
                                }
                                return { ...c, status: enroll?.status, expiryDate: expiry, startedAt: start, isExamBank: c.title.includes("คลังข้อสอบ") };
                            });
                    }

                    setCourses(myCourses);
                    setLoading(false);
                });

                // --- Listener B: Progress ---
                unsubscribeProgress = onSnapshot(collection(db, "users", uid, "progress"), (snap: QuerySnapshot<DocumentData>) => {
                    const rawProgress = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                    setRawProgressData(rawProgress);
                });

                // --- Listener C: Last Session (Resume) ---
                unsubscribeStates = onSnapshot(collection(db, "users", uid, "course_states"), (snap: QuerySnapshot<DocumentData>) => {
                    const states = snap.docs.map((d: any) => ({ courseId: d.id, ...d.data() } as any));
                    states.sort((a: any, b: any) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));
                    if (states.length > 0) setLastSession(states[0]);
                });
            } catch (err) {
                console.error("Setup listeners error:", err);
                setLoading(false);
            }
        };

        setupListeners();

        return () => {
            if (unsubscribeEnrollments) unsubscribeEnrollments();
            if (unsubscribeProgress) unsubscribeProgress();
            if (unsubscribeStates) unsubscribeStates();
        };
    }, [user?.uid, authLoading]);

    // Fetch user coupons & reviewed courses
    useEffect(() => {
        if (!user) return;
        const fetchCouponsAndReviews = async () => {
            try {
                const couponQ = query(collection(db, "coupons"), where("userId", "==", user.uid));
                const couponSnap = await getDocs(couponQ);
                const coupons = couponSnap.docs.map((d) => d.data() as UserCoupon);
                setUserCoupons(coupons);

                const reviewQ = query(collection(db, "reviews"), where("userId", "==", user.uid));
                const reviewSnap = await getDocs(reviewQ);
                const ids = new Set(reviewSnap.docs.map((d) => d.data().courseId).filter(Boolean) as string[]);
                setReviewedCourseIds(ids);
            } catch (err) {
                console.error("Error fetching coupons/reviews:", err);
            }
        };
        fetchCouponsAndReviews();
    }, [user?.uid]);

    // Helper State for Progress Calculation
    const [rawProgressData, setRawProgressData] = useState<any[]>([]);
    const videoCountCacheRef = useRef<Record<string, { videoIds: string[]; total: number }>>({});
    const cachedCourseIdsRef = useRef<string>("");

    // Fetch video counts ONLY when courses change
    useEffect(() => {
        if (courses.length === 0) return;
        const courseIds = courses.map((c) => c.id).sort().join(",");
        if (courseIds === cachedCourseIdsRef.current) return;

        const fetchVideoCounts = async () => {
            const videoCountMap: Record<string, { videoIds: string[]; total: number }> = {};
            await Promise.all(
                courses.map(async (course) => {
                    if (course.isAdminView) return;

                    if (course.isExamBank) {
                        const examsData = await getCachedData("all-exams-ids", async () => {
                            const examsSnap = await getDocs(collection(db, "exams"));
                            return examsSnap.docs.map((d) => ({ id: d.id }));
                        });
                        videoCountMap[course.id] = { videoIds: examsData.map((e) => e.id), total: examsData.length };
                    } else {
                        const lessonDocs = await getCachedData(`lessons-${course.id}`, async () => {
                            const lessonsSnap = await getDocs(collection(db, "courses", course.id, "lessons"));
                            return lessonsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
                        });
                        const videoLessons = lessonDocs.filter((l: any) => l.type === "video" && !l.isHidden);
                        videoCountMap[course.id] = { videoIds: videoLessons.map((l: any) => l.id), total: videoLessons.length };
                    }
                })
            );
            videoCountCacheRef.current = videoCountMap;
            cachedCourseIdsRef.current = courseIds;
        };

        fetchVideoCounts();
    }, [courses]);

    // Calculate progress map
    useEffect(() => {
        if (courses.length === 0 || Object.keys(videoCountCacheRef.current).length === 0) return;

        const pMap: Record<string, Progress> = {};
        const cache = videoCountCacheRef.current;

        courses.forEach((c) => {
            const courseVideoData = cache[c.id] || { videoIds: [], total: 0 };
            pMap[c.id] = { completed: 0, total: courseVideoData.total, percent: 0 };
        });

        rawProgressData.forEach((data) => {
            const cId = data.id;
            const completedIds: string[] = data.completed || [];
            const courseVideoData = cache[cId] || { videoIds: [], total: 0 };
            const completedVideoCount = completedIds.filter((id) => courseVideoData.videoIds.includes(id)).length;
            const total = courseVideoData.total;
            let percent = 0;
            if (total > 0) percent = Math.round((completedVideoCount / total) * 100);
            pMap[cId] = { completed: completedVideoCount, total, percent: percent > 100 ? 100 : percent };
        });

        setProgressMap(pMap);
    }, [courses, rawProgressData]);

    // §7.2 — average progress over approved & non-expired courses only
    const avgProgress = useMemo(() => {
        const active = courses.filter((c) => c.status === "approved" && (getDaysRemaining(c.expiryDate) ?? 1) > 0);
        if (active.length === 0) return 0;
        const sum = active.reduce((s, c) => s + (progressMap[c.id]?.percent || 0), 0);
        return Math.round(sum / active.length);
    }, [courses, progressMap]);

    const isAdmin = user?.email === "kruheemschool@gmail.com";
    const { vivid, cardful } = prefs;

    if (authLoading || loading) {
        return (
            <div className="mc-theme">
                <div className="mc-bg-layer" style={{ background: bgString }} aria-hidden />
                <Navbar />
                <div className="mc-content flex flex-col items-center justify-center" style={{ minHeight: "70vh" }}>
                    <div className="h-12 w-12 rounded-full border-[3px] animate-spin mb-4" style={{ borderColor: c.line2, borderTopColor: c.accent }} />
                    <p className="text-sm" style={{ color: c.ink2 }}>กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mc-theme">
            <div className="mc-bg-layer" style={{ background: bgString }} aria-hidden />
            <Navbar />

            <main className="mc-content container mx-auto px-4 pb-24" style={{ paddingTop: "6.5rem", maxWidth: "64rem" }}>
                {/* Back link */}
                <div className="mb-4">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold transition-colors group" style={{ color: c.ink2 }}>
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        กลับหน้าแรก
                    </Link>
                </div>

                {/* §7.1 — Hero */}
                <header className="mb-8 mc-rise">
                    <div className="flex items-center gap-2.5 mb-3">
                        <span className="h-0.5 w-7 rounded-full" style={{ background: isDark ? "linear-gradient(90deg,#2DD4BF,#7DD3FC)" : "#14B8A6" }} />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: isDark ? "#5EEAD4" : "#0D9488" }}>
                            พื้นที่การเรียนของฉัน
                        </span>
                        {isAdmin && (
                            <span className="ml-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={isDark ? { background: "#2A1414", color: "#F8A4A4", border: "1px solid #5A2A2A" } : { background: "#FCE7E2", color: "#B4533F", border: "1px solid #F3C9BF" }}>
                                👁️ Admin View
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: c.ink }}>
                        คอร์สเรียน
                        <span style={vivid ? gradText(isDark) : { color: c.accent }}>ของฉัน</span>
                    </h1>
                </header>

                {/* §7.2 — Profile */}
                <ProfileHeader profile={userProfile || user} coursesCount={courses.length} avgProgress={avgProgress} vivid={vivid} cardful={cardful} c={c} isDark={isDark} />

                <div className="h-7" />

                {/* §7.3 — Resume */}
                {lastSession && (() => {
                    const resumeCourse = courses.find((c) => c.id === lastSession.courseId);
                    return <ResumeCard session={lastSession} course={resumeCourse} vivid={vivid} cardful={cardful} c={c} isDark={isDark} />;
                })()}

                {/* §7.4 — Coupons */}
                {userCoupons.length > 0 && (
                    <>
                        <div className="h-7" />
                        <CouponBanner coupons={userCoupons} cardful={cardful} c={c} isDark={isDark} />
                    </>
                )}

                <div className="h-9" />

                {/* §7.5 — Courses by grade level */}
                <CourseList
                    courses={courses}
                    progressMap={progressMap}
                    reviewedCourseIds={reviewedCourseIds}
                    onReview={(courseId, courseName) => setReviewModal({ courseId, courseName })}
                    vivid={vivid}
                    cardful={cardful}
                    c={c}
                    isDark={isDark}
                />

                {/* §7.6 — Downloadable PDF exams the student has bought */}
                <MyPapersSection c={c} isDark={isDark} />
            </main>

            <div className="mc-content">
                <Footer />
            </div>

            {/* Tweak panel */}
            <TweakPanel
                open={tweakOpen}
                onToggle={() => setTweakOpen((v) => !v)}
                prefs={prefs}
                update={updatePrefs}
                onReset={() => updatePrefs(DEFAULT_PREFS)}
                isDark={isDark}
                setMode={(m) => setTheme(m)}
                c={c}
            />

            {/* Review Modal */}
            {reviewModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" style={{ background: c.overlay }} onClick={() => setReviewModal(null)}>
                    <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setReviewModal(null)}
                            className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white shadow-sm transition"
                        >
                            <X size={18} />
                        </button>
                        <ReviewForm
                            courseId={reviewModal.courseId}
                            courseName={reviewModal.courseName}
                            onReviewSubmitted={() => {
                                if (user) {
                                    const fetchUpdated = async () => {
                                        const couponQ = query(collection(db, "coupons"), where("userId", "==", user.uid));
                                        const couponSnap = await getDocs(couponQ);
                                        setUserCoupons(couponSnap.docs.map((d) => d.data() as UserCoupon));

                                        const reviewQ = query(collection(db, "reviews"), where("userId", "==", user.uid));
                                        const reviewSnap = await getDocs(reviewQ);
                                        setReviewedCourseIds(new Set(reviewSnap.docs.map((d) => d.data().courseId).filter(Boolean) as string[]));
                                    };
                                    fetchUpdated();
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// §7.6 — Purchased PDF exams (so everything bought lives in one place)
// ============================================================
interface MyPaper {
    paperId: string;
    title: string;
    level: string;
    category: string;
    files: { id: string; label: string }[];
    status: string;
}

function MyPapersSection({ c, isDark }: { c: Pal; isDark: boolean }) {
    const { user } = useUserAuth();
    const [items, setItems] = useState<MyPaper[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyKey, setBusyKey] = useState<string | null>(null);

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        let cancelled = false;
        (async () => {
            try {
                const [enrollSnap, papersSnap] = await Promise.all([
                    getDocs(query(collection(db, "enrollments"), where("userId", "==", user.uid))),
                    getDocs(collection(db, "examPapers")),
                ]);
                const byId = new Map<string, Record<string, unknown>>();
                papersSnap.docs.forEach((d) => byId.set(d.id, d.data() as Record<string, unknown>));
                const rows: MyPaper[] = enrollSnap.docs
                    .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
                    .filter((d) => d.productType === "examPaper" && d.paperId)
                    .map((d) => {
                        const p = byId.get(d.paperId as string) || {};
                        const pfiles = Array.isArray(p.files) ? (p.files as { id: string; label: string }[]) : [];
                        const files = pfiles.length
                            ? pfiles.map((f) => ({ id: f.id, label: f.label }))
                            : (p.pdfPath ? [{ id: "legacy", label: "ดาวน์โหลด" }] : []);
                        return {
                            paperId: d.paperId as string,
                            title: (p.title as string) || ((d.courseTitle as string) || "ข้อสอบ PDF").replace(/^ข้อสอบ PDF:\s*/, ""),
                            level: (p.level as string) || "",
                            category: (p.category as string) || "",
                            files,
                            status: (d.status as string) || "pending",
                        };
                    });
                if (!cancelled) setItems(rows);
            } catch { /* non-fatal */ }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const download = async (paperId: string, fileId: string) => {
        if (!auth.currentUser) return;
        setBusyKey(`${paperId}:${fileId}`);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch("/api/download-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ paperId, fileId }),
            });
            const data = await res.json();
            if (res.ok && data.url) window.location.href = data.url;
        } catch { /* non-fatal */ }
        finally { setBusyKey(null); }
    };

    // Nothing bought → render nothing (keeps the page clean for course-only users).
    if (loading || items.length === 0) return null;

    const tealTile = isDark ? "#0F2D2A" : "#E1F5EE";
    const amberBg = isDark ? "#2A2011" : "#FBEFE0";
    const amberFg = isDark ? "#FBBF24" : "#B45309";

    return (
        <section className="mb-10 mc-rise" style={{ marginTop: "2.25rem" }}>
            <div className="flex items-center gap-2 mb-4">
                <FileText size={18} style={{ color: "#0D9488" }} />
                <h2 className="text-lg sm:text-xl font-bold mc-kanit" style={{ color: c.ink }}>ข้อสอบ PDF ของฉัน</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
                {items.map((it) => (
                    <div key={it.paperId} className="rounded-2xl border p-4 flex gap-3.5" style={{ background: c.card, borderColor: c.line, boxShadow: c.shadowSm }}>
                        <div className="w-12 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: tealTile, color: "#0D9488" }}>
                            <FileText size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                {it.level && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: tealTile, color: "#0D9488" }}>{it.level}</span>}
                                {it.category && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.subtle, color: c.ink2 }}>{it.category}</span>}
                            </div>
                            <div className="font-bold leading-snug line-clamp-2" style={{ color: c.ink }}>{it.title}</div>
                            <div className="mt-2.5">
                                {it.status === "approved" ? (
                                    it.files.length ? (
                                        <div className="flex flex-wrap gap-2">
                                            {it.files.map((f) => {
                                                const busy = busyKey === `${it.paperId}:${f.id}`;
                                                return (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => download(it.paperId, f.id)}
                                                        disabled={busy}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-60"
                                                        style={{ borderColor: c.line, color: c.ink, background: c.card }}
                                                    >
                                                        {busy ? <><Loader2 className="animate-spin" size={14} /> กำลังเตรียม...</> : <><Download size={14} style={{ color: "#0D9488" }} /> {f.label}</>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : <span className="text-[13px]" style={{ color: c.ink3 }}>ไฟล์ยังไม่พร้อม</span>
                                ) : it.status === "rejected" ? (
                                    <span className="text-[13px] font-semibold" style={{ color: c.ink3 }}>ไม่อนุมัติ</span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-lg" style={{ background: amberBg, color: amberFg }}>
                                        <Clock size={14} /> รอครูอนุมัติ
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ============================================================
// §7.2 — Profile card
// ============================================================
function ProfileHeader({
    profile,
    coursesCount = 0,
    avgProgress = 0,
    vivid,
    cardful,
    c,
    isDark,
}: {
    profile: any;
    coursesCount?: number;
    avgProgress?: number;
    vivid: boolean;
    cardful: boolean;
    c: Pal;
    isDark: boolean;
}) {
    const { user } = useUserAuth();
    if (!profile) return null;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "อรุณสวัสดิ์" : hour < 17 ? "สวัสดียามบ่าย" : "สวัสดียามค่ำ";
    const displayName = profile.displayName || "นักเรียน";
    const statusLabel = coursesCount === 0 ? "—" : avgProgress >= 80 ? "เซียน" : avgProgress >= 30 ? "กำลังลุย" : "เริ่มต้น";

    const cardStyle: React.CSSProperties = cardful
        ? {
              background: isDark ? "linear-gradient(180deg, #1C2336, #241F13)" : "linear-gradient(180deg, #FFFEF9, #FFF8E6)",
              border: `1px solid ${isDark ? "#3C3622" : "#EFDCA4"}`,
              boxShadow: c.shadow,
          }
        : { background: c.card, border: `1px solid ${c.line}`, boxShadow: c.shadow };
    const divider = cardful ? (isDark ? "#3A3624" : "#F2E5BC") : c.line;
    const statColors = cardful ? (isDark ? ["#2DD4BF", "#56B5F7", "#FBBF24"] : ["#0D9488", "#0284C7", "#D97706"]) : [c.ink, c.ink, c.ink2];

    return (
        <section className="mc-rise">
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                {/* Header: avatar + identity + edit */}
                <div className="flex items-center gap-4 sm:gap-5 px-5 sm:px-7 pt-6 pb-5">
                    <div className="relative shrink-0">
                        <div className="rounded-[18px] p-[2px]" style={{ background: vivid ? tealSky(isDark) : c.line }}>
                            <div className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: c.card }}>
                                {profile.avatar || profile.photoURL ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={profile.avatar || profile.photoURL} alt={displayName} className="w-full h-full object-contain" loading="lazy" />
                                ) : (
                                    <span className="text-2xl font-semibold mc-kanit" style={vivid ? gradText(isDark) : { color: c.accent }}>
                                        {displayName[0]}
                                    </span>
                                )}
                            </div>
                        </div>
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full" style={{ boxShadow: `0 0 0 2px ${c.card}` }} aria-label="online" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-[10.5px] uppercase tracking-[0.16em] font-medium mb-1" style={{ color: c.ink3 }}>
                            {greeting} · นักเรียนของ KruHeem
                        </p>
                        <h2 className="text-[22px] sm:text-2xl font-bold leading-tight tracking-tight truncate mc-kanit" style={{ color: c.ink }}>
                            {displayName}
                        </h2>
                        {profile.caption && (
                            <p className="text-sm mt-1 truncate" style={{ color: c.ink2 }}>
                                {profile.caption}
                            </p>
                        )}
                    </div>

                    <Link
                        href="/profile"
                        prefetch={false}
                        aria-label="แก้ไขโปรไฟล์"
                        className="hidden sm:inline-flex shrink-0 items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-colors hover:bg-black/5"
                        style={{ color: c.ink2 }}
                    >
                        <Settings size={14} strokeWidth={2} />
                        <span>แก้ไข</span>
                    </Link>
                </div>

                {/* Stats — 3 coloured numbers (§5) */}
                <div className="grid grid-cols-3" style={{ borderTop: `1px solid ${divider}` }}>
                    <Stat value={coursesCount > 0 ? `${coursesCount}` : "—"} label="คอร์ส" color={statColors[0]} divider={divider} c={c} first />
                    <Stat value={coursesCount > 0 ? `${avgProgress}` : "—"} suffix={coursesCount > 0 ? "%" : ""} label="ความคืบหน้า" color={statColors[1]} divider={divider} c={c} />
                    <Stat value={statusLabel} label="สถานะ" color={statColors[2]} divider={divider} c={c} />
                </div>

                {/* Action strip */}
                {user && (
                    <div className="grid grid-cols-2" style={{ borderTop: `1px solid ${divider}` }}>
                        <ActionLink href="/guide" icon={<BookOpen size={15} strokeWidth={1.75} />} label="คู่มือใช้งาน" badge="ใหม่" divider={divider} c={c} isDark={isDark} first />
                        <ActionLink href={`/parent-dashboard/${user.uid}`} icon={<BarChart3 size={15} strokeWidth={1.75} />} label="ติดตามผลการเรียน" divider={divider} c={c} isDark={isDark} />
                    </div>
                )}

                {/* Mobile edit */}
                <div className="sm:hidden" style={{ borderTop: `1px solid ${divider}` }}>
                    <Link href="/profile" prefetch={false} className="flex items-center justify-center gap-2 px-5 py-3.5 text-xs font-medium active:bg-black/5 transition-colors" style={{ color: c.ink2 }}>
                        <Settings size={13} strokeWidth={2} />
                        <span>แก้ไขโปรไฟล์</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}

function Stat({ value, suffix, label, color, divider, c, first }: { value: string; suffix?: string; label: string; color: string; divider: string; c: Pal; first?: boolean }) {
    return (
        <div className="px-4 sm:px-6 py-4 sm:py-5" style={first ? undefined : { borderLeft: `1px solid ${divider}` }}>
            <div className="text-2xl sm:text-[26px] font-semibold tracking-tight tabular-nums leading-none mc-kanit" style={{ color }}>
                {value}
                {suffix && <span className="text-base font-normal ml-0.5" style={{ color: c.ink3 }}>{suffix}</span>}
            </div>
            <div className="mt-1.5 text-[11px] uppercase tracking-[0.12em] font-medium" style={{ color: c.ink3 }}>
                {label}
            </div>
        </div>
    );
}

function ActionLink({ href, icon, label, badge, divider, c, isDark, first }: { href: string; icon: React.ReactNode; label: string; badge?: string; divider: string; c: Pal; isDark: boolean; first?: boolean }) {
    return (
        <Link href={href} prefetch={false} className="group flex items-center justify-between gap-3 px-5 sm:px-6 py-4 transition-colors hover:bg-black/[0.03]" style={first ? undefined : { borderLeft: `1px solid ${divider}` }}>
            <div className="flex items-center gap-3 min-w-0">
                <span style={{ color: c.ink3 }}>{icon}</span>
                <span className="text-sm font-medium truncate" style={{ color: c.ink2 }}>
                    {label}
                </span>
                {badge && (
                    <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full leading-none" style={isDark ? { color: "#F9A8D4", border: "1px solid #7A335C" } : { color: "#B4533F", border: "1px solid #F3C9BF" }}>
                        {badge}
                    </span>
                )}
            </div>
            <span className="text-sm transition-all group-hover:translate-x-0.5" style={{ color: c.line2 }}>→</span>
        </Link>
    );
}

// ============================================================
// §7.3 — Resume card
// ============================================================
function ResumeCard({ session, course, vivid, cardful, c, isDark }: { session: any; course?: Course; vivid: boolean; cardful: boolean; c: Pal; isDark: boolean }) {
    const href = course?.isExamBank ? "/exam" : `/learn/${session.courseId}?lessonId=${session.lessonId}&t=${session.timestamp}`;
    const cardStyle: React.CSSProperties = cardful
        ? {
              background: isDark ? "linear-gradient(115deg, #142A42, #1A2740 64%)" : "linear-gradient(115deg, #EFF8FF, #FFFFFF 62%)",
              border: `1px solid ${isDark ? "#2E456A" : "#B9DDF5"}`,
          }
        : { background: c.card, border: `1px solid ${c.line}` };
    const coverFallback = isDark ? "linear-gradient(135deg, #1E4A6B, #16463C)" : "linear-gradient(135deg, #BFE3FA, #D6F3EC)";
    const tagBg = isDark ? (vivid ? "#0F2E2A" : "#15294A") : "#E0F2FE";
    const tagColor = isDark ? (vivid ? "#5EEAD4" : "#7DD3FC") : "#0369A1";
    const mm = Math.floor(session.timestamp / 60);
    const ss = String(session.timestamp % 60).padStart(2, "0");

    return (
        <Link href={href} prefetch={false} className="block mc-rise">
            <div className="group relative w-full rounded-2xl p-5 md:p-6 transition-all duration-300 overflow-hidden cursor-pointer hover:-translate-y-0.5" style={{ ...cardStyle, boxShadow: c.shadow }}>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-7">
                    {/* Cover */}
                    <div className="w-full md:w-60 aspect-video rounded-xl overflow-hidden relative shrink-0" style={{ background: coverFallback, border: `1px solid ${isDark ? "#2E456A" : "#C7E3F4"}` }}>
                        {course?.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={course.image} alt={course.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>
                        )}
                        <div className="absolute inset-0 bg-black/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-all duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 pl-0.5" style={{ color: "#0EA5E9" }}>
                                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2.5 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: tagBg, color: tagColor }}>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#38BDF8" }} />
                                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#0EA5E9" }} />
                                </span>
                                เรียนต่อจากครั้งล่าสุด
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 rounded-md" style={{ background: isDark ? "#15294A" : "#EFF6FB", color: isDark ? "#9FC2EC" : "#5A6B7C" }}>
                                <Clock size={11} /> {mm}:{ss}
                            </span>
                        </div>

                        <h2 className="text-xl md:text-2xl font-bold leading-snug line-clamp-2 mc-kanit" style={{ color: c.ink }}>
                            {session.lessonTitle}
                        </h2>

                        <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-sm font-medium" style={{ color: c.ink2 }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.line2 }} />
                            <span className="line-clamp-1">{session.courseTitle || course?.title}</span>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="hidden md:flex items-center justify-center pr-2">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110" style={{ background: vivid ? tealSky(isDark) : c.accent, color: isDark ? "#06101F" : "#fff", boxShadow: "0 10px 24px -10px rgba(14,165,233,.45)" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" />
                                <path d="m12 5 7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ============================================================
// Sorting & categorisation helpers (data — unchanged)
// ============================================================
const getCourseCategory = (title: string): GradeKey => {
    const t = title.toLowerCase();
    if (t.match(/ป\.|ประถม|gifted|สอบเข้า ม\.1/)) return "primary";
    if (t.match(/ม\.1|ม\.2|ม\.3|เตรียมอุดม|mwit|สอบเข้า ม\.4/)) return "junior";
    if (t.match(/ม\.4|ม\.5|ม\.6|a-level|tgat|tpat|cal|แคล/)) return "senior";
    return "other";
};

const getCourseWeight = (title: string): number => {
    const t = title.toLowerCase();
    if (t.includes("ป.1")) return 11;
    if (t.includes("ป.2")) return 12;
    if (t.includes("ป.3")) return 13;
    if (t.includes("ป.4")) return 14;
    if (t.includes("ป.5")) return 15;
    if (t.includes("ป.6")) return 16;
    if (t.match(/gifted|สอบเข้า ม\.1/)) return 19;
    if (t.includes("ม.1")) return 21;
    if (t.includes("ม.2")) return 22;
    if (t.includes("ม.3")) return 23;
    if (t.match(/เตรียมอุดม|mwit|สอบเข้า ม\.4/)) return 29;
    if (t.includes("ม.4")) return 41;
    if (t.includes("ม.5")) return 42;
    if (t.includes("ม.6")) return 43;
    if (t.match(/a-level|tgat|tpat|net|entrance/)) return 49;
    return 99;
};

// ============================================================
// §6 / §7.5 — Course list grouped by grade level
// ============================================================
function CourseList({
    courses,
    progressMap,
    reviewedCourseIds,
    onReview,
    vivid,
    cardful,
    c,
    isDark,
}: {
    courses: Course[];
    progressMap: Record<string, Progress>;
    reviewedCourseIds: Set<string>;
    onReview: (courseId: string, courseName: string) => void;
    vivid: boolean;
    cardful: boolean;
    c: Pal;
    isDark: boolean;
}) {
    if (courses.length === 0)
        return (
            <div className="text-center py-16 rounded-2xl mc-rise" style={{ background: isDark ? "rgba(24,35,54,.55)" : "rgba(255,255,255,.7)", border: `2px dashed ${c.line2}`, color: c.ink2 }}>
                <div className="text-6xl mb-4">🎒</div>
                <p className="text-lg font-medium mb-6">ยังไม่ได้ลงทะเบียนคอร์สเรียน</p>
                <Link href="/" className="inline-block px-8 py-3 rounded-full font-bold transition shadow-lg" style={{ background: tealSky(isDark), color: isDark ? "#06101F" : "#fff" }}>
                    ดูคอร์สทั้งหมด
                </Link>
            </div>
        );

    const grouped: Record<GradeKey, Course[]> = { primary: [], junior: [], senior: [], other: [] };
    courses.forEach((cc) => grouped[getCourseCategory(cc.title)].push(cc));
    const sorter = (a: Course, b: Course) => getCourseWeight(a.title) - getCourseWeight(b.title);
    (Object.values(grouped) as Course[][]).forEach((list) => list.sort(sorter));

    return (
        <div>
            {GRADE_META.map(({ key, thai, en }) => {
                const list = grouped[key];
                if (list.length === 0) return null;
                const sec = SEC[key];
                return (
                    <section key={key} className="mb-10 mc-rise">
                        {/* §6 — section header */}
                        <div className="flex items-center gap-3 mb-5">
                            <span className="h-1 w-8 rounded-full shrink-0" style={{ background: sec }} />
                            <h2 className="text-lg sm:text-xl font-bold mc-kanit" style={{ color: c.ink, whiteSpace: "nowrap" }}>
                                {thai}{" "}
                                <span className="font-medium text-sm" style={{ color: c.ink3 }}>
                                    {en} · {list.length} คอร์ส
                                </span>
                            </h2>
                            <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${c.line}, transparent)` }} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {list.map((course) => (
                                <CourseCard key={course.id} course={course} progress={progressMap[course.id]} isReviewed={reviewedCourseIds.has(course.id)} onReview={onReview} sec={sec} vivid={vivid} cardful={cardful} c={c} isDark={isDark} />
                            ))}
                        </div>
                    </section>
                );
            })}

            {/* §7.6 — Refund policy */}
            <div className="mt-10 pt-5" style={{ borderTop: `1px solid ${c.line}` }}>
                <p className="text-[11px] text-center leading-relaxed max-w-2xl mx-auto" style={{ color: c.ink3 }}>
                    นโยบายการคืนเงิน — หากไม่พึงพอใจในคอร์สเรียน สามารถแจ้งขอคืนเงินได้ภายใน 3 วันนับตั้งแต่วันที่ได้รับการอนุมัติ โดยติดต่อผ่านระบบแชทในเว็บไซต์ หรือช่องทางที่ระบุไว้ในหน้าติดต่อเรา ทั้งนี้ขอสงวนสิทธิ์ในการพิจารณาเป็นรายกรณี
                </p>
            </div>
        </div>
    );
}

// ============================================================
// §7.5 — Course card (all states)
// ============================================================
function CourseCard({
    course,
    progress,
    isReviewed,
    onReview,
    sec,
    vivid,
    cardful,
    c,
    isDark,
}: {
    course: Course;
    progress?: Progress;
    isReviewed: boolean;
    onReview: (courseId: string, courseName: string) => void;
    sec: string;
    vivid: boolean;
    cardful: boolean;
    c: Pal;
    isDark: boolean;
}) {
    const daysRemaining = getDaysRemaining(course.expiryDate);
    const isExpired = daysRemaining !== null && daysRemaining <= 0;
    const isApproved = course.status === "approved";
    const pct = progress?.percent ?? 0;
    const done = pct === 100;

    const cardStyle: React.CSSProperties = {
        background: c.card,
        border: `1px solid ${c.line}`,
        borderTop: cardful ? `4px solid ${sec}` : `1px solid ${c.line}`,
        boxShadow: c.shadowSm,
        opacity: isExpired ? (isDark ? 0.62 : 0.78) : 1,
    };
    const coverBg = cardful ? (isDark ? shade(sec, "#162236", 76) : tint(sec, 87)) : c.subtle;

    // progress fill: 100% always green; else sec (cardful) / teal-sky (vivid) / accent
    const fill = done
        ? "linear-gradient(90deg, #22C55E, #16A34A)"
        : cardful
        ? isDark
            ? `linear-gradient(90deg, ${shade(sec, "#FFFFFF", 45)}, ${sec})`
            : `linear-gradient(90deg, ${sec}, ${shade(sec, "#1F4E88", 28)})`
        : vivid
        ? tealSky(isDark)
        : c.accent;

    const ctaBg = isExpired
        ? c.disabledBg
        : cardful
        ? isDark
            ? `linear-gradient(120deg, ${shade(sec, "#0EA5E9", 18)}, ${shade(sec, "#4F9DF0", 40)})`
            : `linear-gradient(135deg, ${sec}, ${shade(sec, "#1F4E88", 38)})`
        : vivid
        ? tealSky(isDark)
        : c.accent;
    const ctaFg = isExpired ? c.disabledFg : isDark ? "#06101F" : "#fff";

    const pctColor = done ? c.good : pct === 0 ? c.ink3 : cardful ? (isDark ? shade(sec, "#FFFFFF", 72) : sec) : c.accent;

    return (
        <div className="rounded-2xl p-4 flex flex-col transition-all duration-300 hover:-translate-y-1 group" style={cardStyle}>
            {/* Cover */}
            <div className="aspect-video rounded-xl mb-4 overflow-hidden relative" style={{ background: coverBg }}>
                {course.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={course.image} alt={course.title} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isExpired ? "grayscale-[.4]" : ""}`} loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl" style={{ color: isDark ? shade(sec, "#FFFFFF", 30) : tint(sec, 35) }}>📘</div>
                )}

                {/* Pending overlay (§7.5) */}
                {!isApproved && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 backdrop-blur-[2px]" style={{ background: isDark ? "rgba(4,9,18,.72)" : "rgba(26,42,60,.62)" }}>
                        <Clock size={22} className="text-white mb-1.5" />
                        <span className="text-white text-sm font-bold mc-kanit">
                            {course.status === "pending" ? "รอตรวจสอบสลิป" : course.status}
                        </span>
                        {course.status === "pending" && (
                            <span className="text-white/80 text-[11px] mt-1 leading-snug">ทีมงานกำลังตรวจสอบสลิป<br />อนุมัติภายใน 24 ชม.</span>
                        )}
                    </div>
                )}

                {/* Expiry badge */}
                {isApproved && daysRemaining !== null && (
                    <div className="absolute top-2 right-2">
                        <ValidityBadge days={daysRemaining} isDark={isDark} c={c} />
                    </div>
                )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-[17px] leading-snug mb-2 line-clamp-2 mc-kanit" style={{ color: c.ink, minHeight: "2.8rem" }}>
                {course.title}
            </h3>

            {/* Dates */}
            {isApproved && (
                <div className="mb-3 text-[11px] py-1.5 px-3 rounded-lg flex justify-between items-center gap-2" style={{ background: c.subtle, border: `1px solid ${c.line}`, color: c.ink2 }}>
                    <span>
                        <span style={{ color: c.ink3 }}>เริ่ม </span>
                        {formatDate(course.startedAt)}
                    </span>
                    <span style={{ color: c.line2 }}>·</span>
                    <span>
                        <span style={{ color: c.ink3 }}>หมดอายุ </span>
                        {formatDate(course.expiryDate)}
                    </span>
                </div>
            )}

            {/* Progress */}
            {progress && isApproved && (
                <div className="mb-4 p-3.5 rounded-xl" style={{ background: c.subtle, border: `1px solid ${c.line}` }}>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-semibold" style={{ color: c.ink2 }}>
                            {course.isExamBank ? "ทดสอบแล้ว " : "เรียนแล้ว "}
                            <span className="text-sm font-bold" style={{ color: done ? c.good : sec }}>{progress.completed}</span>
                            <span style={{ color: c.ink3 }}> / {progress.total} {course.isExamBank ? "ชุด" : "คลิป"}</span>
                        </span>
                        <span className="text-xs font-bold" style={{ color: pctColor }}>
                            {done ? "✓ จบคอร์ส" : `${pct}%`}
                        </span>
                    </div>

                    <div className="h-2.5 rounded-full overflow-hidden relative" style={{ background: c.track }}>
                        <div className="h-full rounded-full relative overflow-hidden transition-[width] duration-1000 ease-out" style={{ width: `${pct === 0 ? 4 : pct}%`, background: fill, opacity: pct === 0 ? 0.55 : 1 }}>
                            {pct > 0 && (
                                <span className="absolute inset-y-0 w-1/3 opacity-0 group-hover:opacity-100" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)", animation: "mc-sweep 1.4s ease-in-out infinite" }} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CTA */}
            <div className="mt-auto pt-1">
                {isApproved ? (
                    <Link
                        href={isExpired ? "#" : course.isExamBank ? "/exam" : `/learn/${course.id}`}
                        prefetch={false}
                        onClick={(e) => isExpired && e.preventDefault()}
                        className="block w-full py-3 font-bold rounded-xl text-center transition-transform hover:-translate-y-0.5"
                        style={{ background: ctaBg, color: ctaFg, cursor: isExpired ? "not-allowed" : "pointer", boxShadow: isExpired ? "none" : "0 10px 22px -12px rgba(31,78,136,.5)" }}
                    >
                        {isExpired ? "หมดอายุ" : course.isExamBank ? "ทำข้อสอบเลย" : pct > 0 ? "เรียนต่อ" : "เริ่มเรียน"}
                    </Link>
                ) : (
                    <button disabled className="w-full py-3 font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2" style={{ background: c.disabledBg, color: c.disabledFg }}>
                        <Lock size={14} /> {course.status === "pending" ? "รออนุมัติ" : "เข้าเรียนไม่ได้"}
                    </button>
                )}

                {/* Review CTA (§7.5) */}
                {isApproved && !isExpired && !isReviewed && (
                    <button
                        onClick={() => onReview(course.id, course.title)}
                        className="w-full mt-2 py-2.5 font-bold text-sm rounded-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        style={
                            isDark
                                ? { background: "transparent", border: `1px solid ${shade(sec, c.line2, 60)}`, color: shade(sec, "#FFFFFF", 42) }
                                : { background: "linear-gradient(90deg, #FFF7E6, #FFF1F0)", border: "1px solid #FBD9A8", color: "#B45309" }
                        }
                    >
                        <Star size={14} fill="currentColor" />
                        ★ รีวิวคอร์สนี้ รับส่วนลด ฿100
                    </button>
                )}

                {isReviewed && isApproved && (
                    <div className="w-full mt-2 py-2 text-center text-xs font-bold flex items-center justify-center gap-1" style={{ color: c.good }}>
                        <CheckCircle size={12} /> ✓ รีวิวแล้ว — ขอบคุณ!
                    </div>
                )}
            </div>
        </div>
    );
}

function ValidityBadge({ days, isDark, c }: { days: number; isDark: boolean; c: Pal }) {
    if (days <= 0)
        return <Badge text="หมดอายุ" {...(isDark ? { bg: "#2A1414", color: "#F8A4A4", border: "#5A2A2A" } : { bg: "#B4533F", color: "#fff" })} pulse />;
    if (days <= 7)
        return <Badge text={`เหลือ ${days} วัน`} {...(isDark ? { bg: "#2A1414", color: "#F8A4A4", border: "#5A2A2A" } : { bg: "#B4533F", color: "#fff" })} pulse />;
    if (days <= 30)
        return <Badge text={`เหลือ ${days} วัน`} {...(isDark ? { bg: "#2A2310", color: "#FBD34A", border: "#5A4A1E" } : { bg: "#D97706", color: "#fff" })} />;
    return <Badge text={`เหลือ ${days} วัน`} {...(isDark ? { bg: "#0E1726", color: c.ink2, border: c.line2 } : { bg: "rgba(26,42,60,.62)", color: "#fff" })} />;
}

function Badge({ text, bg, color, border, pulse }: { text: string; bg: string; color: string; border?: string; pulse?: boolean }) {
    return (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-md shadow-sm backdrop-blur-sm ${pulse ? "animate-pulse" : ""}`} style={{ background: bg, color, border: border ? `1px solid ${border}` : undefined }}>
            {text}
        </span>
    );
}

// ============================================================
// §7.4 — Coupons
// ============================================================
function CouponBanner({ coupons, cardful, c, isDark }: { coupons: UserCoupon[]; cardful: boolean; c: Pal; isDark: boolean }) {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const unusedCoupons = coupons.filter((cp) => !cp.isUsed);
    const usedCoupons = coupons.filter((cp) => cp.isUsed);

    const readyBg = cardful ? (isDark ? "#11241B" : "#E9FBF2") : c.card;
    const readyBorder = cardful ? (isDark ? "#2E6B53" : "#5FD9A9") : c.line;
    const codeColor = isDark ? "#5EEAD4" : "#0B7A55";
    const pillBg = isDark ? "#0F2E2A" : "#CBF3E2";
    const pillColor = isDark ? "#6EE7B7" : "#0B7A55";

    return (
        <div className="rounded-2xl p-5 sm:p-6 mc-rise" style={{ background: c.card, border: `1px solid ${c.line}`, boxShadow: c.shadow }}>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isDark ? "#2A2310" : "#FEF3C7" }}>
                    <Gift size={20} style={{ color: isDark ? "#FBBF24" : "#D97706" }} />
                </div>
                <div>
                    <h3 className="font-bold mc-kanit" style={{ color: c.ink }}>คูปองของฉัน</h3>
                    <p className="text-xs" style={{ color: c.ink3 }}>โค้ดส่วนลดของคุณ ดูย้อนหลังได้เสมอ</p>
                </div>
            </div>

            {/* Ready to use */}
            {unusedCoupons.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: c.good }}>
                        <CheckCircle size={12} /> พร้อมใช้ ({unusedCoupons.length})
                    </p>
                    <div className="space-y-2">
                        {unusedCoupons.map((coupon, i) => (
                            <button
                                key={`unused-${i}`}
                                onClick={() => handleCopy(coupon.code)}
                                className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all hover:shadow-md group"
                                style={{ background: readyBg, border: `1px solid ${readyBorder}` }}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-lg shrink-0">🎟️</span>
                                    <span className="font-mono font-bold tracking-wider truncate" style={{ color: codeColor }}>{coupon.code}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: pillBg, color: pillColor }}>ลด ฿{coupon.discountAmount}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full transition-all shrink-0" style={copiedCode === coupon.code ? { background: c.good, color: isDark ? "#06101F" : "#fff" } : { background: c.card, color: c.ink3, border: `1px solid ${isDark ? "#2E6B53" : "#D6EFE2"}` }}>
                                    {copiedCode === coupon.code ? (
                                        <><CheckCircle size={12} /> คัดลอกแล้ว</>
                                    ) : (
                                        <><Copy size={12} /> คัดลอก</>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Used history */}
            {usedCoupons.length > 0 && (
                <div>
                    <p className="text-xs font-bold mb-2" style={{ color: c.ink3 }}>ใช้แล้ว ({usedCoupons.length})</p>
                    <div className="space-y-2">
                        {usedCoupons.map((coupon, i) => (
                            <div key={`used-${i}`} className="w-full flex items-center justify-between rounded-xl px-4 py-3 opacity-60" style={{ background: c.subtle, border: `1px solid ${c.line}` }}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-lg shrink-0 grayscale">🎟️</span>
                                    <span className="font-mono font-bold tracking-wider line-through truncate" style={{ color: c.ink3 }}>{coupon.code}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: c.track, color: c.ink3 }}>ลด ฿{coupon.discountAmount}</span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0" style={{ background: c.track, color: c.ink3 }}>ใช้แล้ว</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// §4/§5 — Tweak panel (light/dark mode + vivid/cardful + Dot Pop params)
// ============================================================
const STYLE_OPTIONS = [
    { key: "dotpop", label: "Dot Pop" },
    { key: "dots", label: "จุดเดี่ยว" },
    { key: "graph", label: "กราฟ" },
    { key: "notebook", label: "สมุด" },
    { key: "aurora", label: "ออโรรา" },
    { key: "plain", label: "เรียบ" },
];
const PALETTE_OPTIONS = ["classic", "cool", "warm", "rainbow", "mono"];
const BASE_OPTIONS = ["lemon", "white", "mint", "sky", "pink", "lavender", "rainbow"];

function TweakPanel({
    open,
    onToggle,
    prefs,
    update,
    onReset,
    isDark,
    setMode,
    c,
}: {
    open: boolean;
    onToggle: () => void;
    prefs: ThemePrefs;
    update: (p: Partial<ThemePrefs>) => void;
    onReset: () => void;
    isDark: boolean;
    setMode: (m: "light" | "dark") => void;
    c: Pal;
}) {
    const swatch = isDark ? DOT_BASES_DARK : DOT_BASES;
    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
            {open && (
                <div className="w-[290px] max-h-[76vh] overflow-y-auto rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200" style={{ background: c.card, border: `1px solid ${c.line2}`, boxShadow: c.shadow }}>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-sm flex items-center gap-1.5 mc-kanit" style={{ color: c.ink }}>
                            <Sparkles size={15} style={{ color: c.accent }} /> ปรับแต่งธีม
                        </h4>
                        <button onClick={onReset} className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-black/5" style={{ color: c.ink3 }}>
                            <RotateCcw size={11} /> รีเซ็ต
                        </button>
                    </div>

                    {/* §1 — light/dark mode segmented control */}
                    <FieldLabel c={c}>โหมดแสง</FieldLabel>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl mb-1" style={{ background: c.subtle }}>
                        <ModeBtn active={!isDark} onClick={() => setMode("light")} icon={<Sun size={14} />} label="สว่าง" c={c} />
                        <ModeBtn active={isDark} onClick={() => setMode("dark")} icon={<Moon size={14} />} label="มืด" c={c} />
                    </div>

                    <Divider c={c} />

                    {/* Toggles */}
                    <Toggle label="โหมดสีสด (Vivid)" on={prefs.vivid} onClick={() => update({ vivid: !prefs.vivid })} c={c} />
                    <Toggle label="การ์ดมีสี (Cardful)" on={prefs.cardful} onClick={() => update({ cardful: !prefs.cardful })} c={c} />

                    <Divider c={c} />

                    <FieldLabel c={c}>พื้นหลัง</FieldLabel>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                        {STYLE_OPTIONS.map((o) => (
                            <button key={o.key} onClick={() => update({ style: o.key })} className="px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-colors" style={prefs.style === o.key ? { background: c.accent, color: isDark ? "#06101F" : "#fff" } : { background: c.subtle, color: c.ink2, border: `1px solid ${c.line}` }}>
                                {o.label}
                            </button>
                        ))}
                    </div>

                    <FieldLabel c={c}>สีพื้น</FieldLabel>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                        {BASE_OPTIONS.map((b) => (
                            <button key={b} onClick={() => update({ base: b })} title={b} className="w-7 h-7 rounded-lg transition-transform hover:scale-110" style={{ background: swatch[b], border: prefs.base === b ? `2px solid ${c.accent}` : `1px solid ${c.line2}` }} />
                        ))}
                    </div>

                    <FieldLabel c={c}>ชุดสีจุด</FieldLabel>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                        {PALETTE_OPTIONS.map((p) => (
                            <button key={p} onClick={() => update({ palette: p })} className="px-2 py-1 rounded-lg flex items-center gap-1" style={{ border: prefs.palette === p ? `2px solid ${c.accent}` : `1px solid ${c.line2}`, background: prefs.palette === p ? c.subtle : c.card }}>
                                <span className="flex gap-0.5">
                                    {(DOT_PALETTES[p] || []).slice(0, 4).map(([r, g, b], i) => (
                                        <span key={i} className="w-2 h-2 rounded-full" style={{ background: `rgb(${r},${g},${b})` }} />
                                    ))}
                                </span>
                            </button>
                        ))}
                    </div>

                    <Divider c={c} />

                    <Slider label="ขนาดจุด" value={prefs.size} min={1} max={4.5} step={0.5} onChange={(v) => update({ size: v })} suffix="px" c={c} />
                    <Slider label="ระยะห่าง" value={prefs.space} min={20} max={64} step={2} onChange={(v) => update({ space: v })} suffix="px" c={c} />
                    <Slider label="ความเข้ม" value={prefs.opacity} min={0.2} max={1} step={0.05} onChange={(v) => update({ opacity: v })} c={c} />
                </div>
            )}

            <button onClick={onToggle} aria-label="ปรับแต่งธีม" className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95" style={{ background: tealSky(isDark), color: isDark ? "#06101F" : "#fff", boxShadow: "0 14px 30px -10px rgba(14,165,233,.5)" }}>
                {open ? <X size={20} /> : <SlidersHorizontal size={20} />}
            </button>
        </div>
    );
}

function ModeBtn({ active, onClick, icon, label, c }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; c: Pal }) {
    return (
        <button onClick={onClick} className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-colors" style={active ? { background: c.card, color: c.accent, boxShadow: c.shadowSm } : { background: "transparent", color: c.ink3 }}>
            {icon} {label}
        </button>
    );
}

function Toggle({ label, on, onClick, c }: { label: string; on: boolean; onClick: () => void; c: Pal }) {
    return (
        <button onClick={onClick} className="w-full flex items-center justify-between py-2 group">
            <span className="text-[13px] font-medium" style={{ color: c.ink2 }}>{label}</span>
            <span className="w-10 h-6 rounded-full p-0.5 transition-colors flex" style={{ background: on ? c.accent : c.line2, justifyContent: on ? "flex-end" : "flex-start" }}>
                <span className="w-5 h-5 rounded-full shadow-sm flex items-center justify-center" style={{ background: c.card }}>
                    {on && <Check size={11} style={{ color: c.accent }} />}
                </span>
            </span>
        </button>
    );
}

function Divider({ c }: { c: Pal }) {
    return <div className="my-3 h-px" style={{ background: c.line }} />;
}

function FieldLabel({ children, c }: { children: React.ReactNode; c: Pal }) {
    return <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 mt-1" style={{ color: c.ink3 }}>{children}</p>;
}

function Slider({ label, value, min, max, step, onChange, suffix, c }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string; c: Pal }) {
    return (
        <div className="mb-2.5">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-medium" style={{ color: c.ink2 }}>{label}</span>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: c.accent }}>{value}{suffix}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" style={{ accentColor: c.accent }} />
        </div>
    );
}
