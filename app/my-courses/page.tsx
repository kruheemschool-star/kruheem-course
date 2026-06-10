"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, where, getDocs, onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCachedData } from "@/lib/dataCache";
import { useUserAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Settings, ArrowLeft, Star, Copy, Gift, X, CheckCircle, BookOpen, BarChart3, SlidersHorizontal, Sparkles, RotateCcw, Check, Clock, Lock } from "lucide-react";
import ReviewForm from "@/app/reviews/ReviewForm";

/* ============================================================
   "Dot Pop" design system (spec §2–§6) — light-only, scoped to
   this page. Tokens mirror the Graph theme; the multicolour dot
   background is composed here and injected as an inline style.
   ============================================================ */

// §3 — dot palettes (r,g,b)
const DOT_PALETTES: Record<string, number[][]> = {
    classic: [[20, 184, 166], [14, 165, 233], [244, 114, 182], [250, 204, 21]],
    cool: [[96, 165, 250], [139, 92, 246], [236, 72, 153], [45, 212, 191]],
    warm: [[251, 146, 60], [250, 204, 21], [251, 113, 133], [244, 114, 182]],
    rainbow: [[239, 68, 68], [249, 115, 22], [250, 204, 21], [34, 197, 94], [59, 130, 246], [168, 85, 247]],
    mono: [[13, 148, 136], [20, 184, 166], [45, 212, 191], [94, 234, 212]],
};

// §3 — base colour under the dots
const DOT_BASES: Record<string, string> = {
    white: "#FDFEFD",
    mint: "#E2F9F1",
    sky: "#DFF2FE",
    lemon: "#FEF6D8",
    pink: "#FDE9F2",
    lavender: "#EFEAFE",
    rainbow: "linear-gradient(160deg, #DFF8EE 0%, #DFF0FE 32%, #FDEAF3 64%, #FEF7D9 100%)",
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

// shared decorative layers
const VEIL = "linear-gradient(180deg, rgba(255,255,255,.92) 0, rgba(255,255,255,.5) 230px, rgba(255,255,255,0) 520px)";
const SOFT = "radial-gradient(640px 420px at 0% 0%, rgba(45,212,191,.14), transparent 58%), radial-gradient(700px 460px at 100% 4%, rgba(56,189,248,.12), transparent 55%)";

// §3 — compose the Dot Pop background string (top → bottom)
function buildDotPop(p: ThemePrefs): string {
    const colors = DOT_PALETTES[p.palette] || DOT_PALETTES.classic;
    const offs = dotOffsets(p.arrange, colors.length);
    const dots = colors
        .map(([r, g, b], i) => {
            const [ox, oy] = offs[i];
            return `radial-gradient(rgba(${r},${g},${b},${p.opacity}) ${p.size}px, transparent ${(p.size + 0.4).toFixed(1)}px) ${(ox * p.space).toFixed(2)}px ${(oy * p.space).toFixed(2)}px / ${p.space}px ${p.space}px`;
        })
        .join(", ");
    const baseVal = DOT_BASES[p.base] || DOT_BASES.lemon;
    return `${VEIL}, ${dots}, ${SOFT}, ${baseVal}`;
}

// §3 — alternative backgrounds (switchable from the Tweak panel)
function buildBg(p: ThemePrefs): string {
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
            const d = `radial-gradient(rgba(${r},${g},${b},${p.opacity}) ${p.size}px, transparent ${(p.size + 0.4).toFixed(1)}px) 0 0 / ${p.space}px ${p.space}px`;
            return `${VEIL}, ${d}, ${SOFT}, ${baseVal}`;
        }
        case "aurora": {
            const a = "radial-gradient(900px 600px at 8% -4%, rgba(45,212,191,.30), transparent 60%), radial-gradient(900px 620px at 96% 6%, rgba(56,189,248,.28), transparent 60%), radial-gradient(820px 620px at 50% 108%, rgba(168,85,247,.16), transparent 62%)";
            return `${VEIL}, ${a}, ${baseVal}`;
        }
        case "dotpop":
        default:
            return buildDotPop(p);
    }
}

// tint a hex toward white (cover backgrounds) without color-mix dependency
function tint(hex: string, whitePct: number): string {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const w = whitePct / 100;
    const mix = (c: number) => Math.round(c * (1 - w) + 255 * w);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

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
    status?: string; // from enrollment
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
    const [courses, setCourses] = useState<Course[]>([]);
    const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
    const [lastSession, setLastSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
    const [reviewedCourseIds, setReviewedCourseIds] = useState<Set<string>>(new Set());
    const [reviewModal, setReviewModal] = useState<{ courseId: string; courseName: string } | null>(null);

    // ── Theme preferences (vivid / cardful / Dot Pop params) ──
    const [prefs, setPrefs] = useState<ThemePrefs>(DEFAULT_PREFS);
    const [tweakOpen, setTweakOpen] = useState(false);

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

    const bgString = useMemo(() => buildBg(prefs), [prefs]);

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
                // 1. Fetch Static Courses Data (Catalog)
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

                                // Auto-generate expiry for legacy/manual enrollments if missing
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

    // Calculate progress map (runs when courses, progress, or cache updates)
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
                    <div className="h-12 w-12 rounded-full border-[3px] border-teal-200 border-t-teal-500 animate-spin mb-4" />
                    <p className="text-sm" style={{ color: "#5A6B7C" }}>กำลังโหลดข้อมูล...</p>
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
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold transition-colors group" style={{ color: "#5A6B7C" }}>
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        กลับหน้าแรก
                    </Link>
                </div>

                {/* §7.1 — Hero */}
                <header className="mb-8 mc-rise">
                    <div className="flex items-center gap-2.5 mb-3">
                        <span className="h-0.5 w-7 rounded-full" style={{ background: "#14B8A6" }} />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#0D9488" }}>
                            พื้นที่การเรียนของฉัน
                        </span>
                        {isAdmin && (
                            <span className="ml-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: "#FCE7E2", color: "#B4533F", border: "1px solid #F3C9BF" }}>
                                👁️ Admin View
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "#1A2A3C" }}>
                        คอร์สเรียน
                        <span style={vivid ? gradTextStyle : { color: "#2F6DB5" }}>ของฉัน</span>
                    </h1>
                </header>

                {/* §7.2 — Profile */}
                <ProfileHeader profile={userProfile || user} coursesCount={courses.length} avgProgress={avgProgress} vivid={vivid} cardful={cardful} />

                <div className="h-7" />

                {/* §7.3 — Resume */}
                {lastSession && (() => {
                    const resumeCourse = courses.find((c) => c.id === lastSession.courseId);
                    return <ResumeCard session={lastSession} course={resumeCourse} vivid={vivid} cardful={cardful} />;
                })()}

                {/* §7.4 — Coupons */}
                {userCoupons.length > 0 && (
                    <>
                        <div className="h-7" />
                        <CouponBanner coupons={userCoupons} cardful={cardful} />
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
                />
            </main>

            <div className="mc-content">
                <Footer />
            </div>

            {/* Tweak panel (vivid / cardful / Dot Pop params) */}
            <TweakPanel open={tweakOpen} onToggle={() => setTweakOpen((v) => !v)} prefs={prefs} update={updatePrefs} onReset={() => updatePrefs(DEFAULT_PREFS)} />

            {/* Review Modal */}
            {reviewModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setReviewModal(null)}>
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

// gradient ink used by vivid headings (§4)
const gradTextStyle: React.CSSProperties = {
    backgroundImage: "linear-gradient(90deg, #0D9488, #0EA5E9 55%, #22C55E)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
};

const tealSky = "linear-gradient(135deg, #0D9488, #0EA5E9)";

// ============================================================
// §7.2 — Profile card
// ============================================================
function ProfileHeader({
    profile,
    coursesCount = 0,
    avgProgress = 0,
    vivid,
    cardful,
}: {
    profile: any;
    coursesCount?: number;
    avgProgress?: number;
    vivid: boolean;
    cardful: boolean;
}) {
    const { user } = useUserAuth();
    if (!profile) return null;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "อรุณสวัสดิ์" : hour < 17 ? "สวัสดียามบ่าย" : "สวัสดียามค่ำ";
    const displayName = profile.displayName || "นักเรียน";
    const statusLabel = coursesCount === 0 ? "—" : avgProgress >= 80 ? "เซียน" : avgProgress >= 30 ? "กำลังลุย" : "เริ่มต้น";

    const cardStyle: React.CSSProperties = cardful
        ? { background: "linear-gradient(180deg, #FFFEF9, #FFF8E6)", border: "1px solid #EFDCA4", boxShadow: "0 22px 54px -34px rgba(31,78,136,.30)" }
        : { background: "#fff", border: "1px solid #E4EAF0", boxShadow: "0 22px 54px -34px rgba(31,78,136,.30)" };
    const divider = cardful ? "#F2E5BC" : "#EEF2F6";

    return (
        <section className="mc-rise">
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                {/* Header: avatar + identity + edit */}
                <div className="flex items-center gap-4 sm:gap-5 px-5 sm:px-7 pt-6 pb-5">
                    <div className="relative shrink-0">
                        <div className="rounded-[18px] p-[2px]" style={{ background: vivid ? tealSky : "#E4EAF0" }}>
                            <div className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-2xl bg-white overflow-hidden flex items-center justify-center">
                                {profile.avatar || profile.photoURL ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={profile.avatar || profile.photoURL} alt={displayName} className="w-full h-full object-contain" loading="lazy" />
                                ) : (
                                    <span className="text-2xl font-semibold mc-kanit" style={vivid ? gradTextStyle : { color: "#2F6DB5" }}>
                                        {displayName[0]}
                                    </span>
                                )}
                            </div>
                        </div>
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" aria-label="online" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-[10.5px] uppercase tracking-[0.16em] font-medium mb-1" style={{ color: "#9AA8B5" }}>
                            {greeting} · นักเรียนของ KruHeem
                        </p>
                        <h2 className="text-[22px] sm:text-2xl font-bold leading-tight tracking-tight truncate mc-kanit" style={{ color: "#1A2A3C" }}>
                            {displayName}
                        </h2>
                        {profile.caption && (
                            <p className="text-sm mt-1 truncate" style={{ color: "#5A6B7C" }}>
                                {profile.caption}
                            </p>
                        )}
                    </div>

                    <Link
                        href="/profile"
                        prefetch={false}
                        aria-label="แก้ไขโปรไฟล์"
                        className="hidden sm:inline-flex shrink-0 items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-colors hover:bg-white/70"
                        style={{ color: "#5A6B7C" }}
                    >
                        <Settings size={14} strokeWidth={2} />
                        <span>แก้ไข</span>
                    </Link>
                </div>

                {/* Stats — 3 coloured numbers (§5) */}
                <div className="grid grid-cols-3" style={{ borderTop: `1px solid ${divider}` }}>
                    <Stat value={coursesCount > 0 ? `${coursesCount}` : "—"} label="คอร์ส" color={cardful ? "#0D9488" : "#1A2A3C"} divider={divider} first />
                    <Stat value={coursesCount > 0 ? `${avgProgress}` : "—"} suffix={coursesCount > 0 ? "%" : ""} label="ความคืบหน้า" color={cardful ? "#0284C7" : "#1A2A3C"} divider={divider} />
                    <Stat value={statusLabel} label="สถานะ" color={cardful ? "#D97706" : "#5A6B7C"} divider={divider} />
                </div>

                {/* Action strip */}
                {user && (
                    <div className="grid grid-cols-2" style={{ borderTop: `1px solid ${divider}` }}>
                        <ActionLink href="/guide" icon={<BookOpen size={15} strokeWidth={1.75} />} label="คู่มือใช้งาน" badge="ใหม่" divider={divider} first />
                        <ActionLink href={`/parent-dashboard/${user.uid}`} icon={<BarChart3 size={15} strokeWidth={1.75} />} label="ติดตามผลการเรียน" divider={divider} />
                    </div>
                )}

                {/* Mobile edit */}
                <div className="sm:hidden" style={{ borderTop: `1px solid ${divider}` }}>
                    <Link href="/profile" prefetch={false} className="flex items-center justify-center gap-2 px-5 py-3.5 text-xs font-medium active:bg-white/70 transition-colors" style={{ color: "#5A6B7C" }}>
                        <Settings size={13} strokeWidth={2} />
                        <span>แก้ไขโปรไฟล์</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}

function Stat({ value, suffix, label, color, divider, first }: { value: string; suffix?: string; label: string; color: string; divider: string; first?: boolean }) {
    return (
        <div className="px-4 sm:px-6 py-4 sm:py-5" style={first ? undefined : { borderLeft: `1px solid ${divider}` }}>
            <div className="text-2xl sm:text-[26px] font-semibold tracking-tight tabular-nums leading-none mc-kanit" style={{ color }}>
                {value}
                {suffix && <span className="text-base font-normal ml-0.5" style={{ color: "#9AA8B5" }}>{suffix}</span>}
            </div>
            <div className="mt-1.5 text-[11px] uppercase tracking-[0.12em] font-medium" style={{ color: "#9AA8B5" }}>
                {label}
            </div>
        </div>
    );
}

function ActionLink({ href, icon, label, badge, divider, first }: { href: string; icon: React.ReactNode; label: string; badge?: string; divider: string; first?: boolean }) {
    return (
        <Link href={href} prefetch={false} className="group flex items-center justify-between gap-3 px-5 sm:px-6 py-4 transition-colors hover:bg-white/60" style={first ? undefined : { borderLeft: `1px solid ${divider}` }}>
            <div className="flex items-center gap-3 min-w-0">
                <span style={{ color: "#7C8B98" }} className="group-hover:text-slate-700 transition-colors">
                    {icon}
                </span>
                <span className="text-sm font-medium truncate" style={{ color: "#3F505F" }}>
                    {label}
                </span>
                {badge && (
                    <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full leading-none" style={{ color: "#B4533F", border: "1px solid #F3C9BF" }}>
                        {badge}
                    </span>
                )}
            </div>
            <span className="text-sm transition-all group-hover:translate-x-0.5" style={{ color: "#C2CDD8" }}>→</span>
        </Link>
    );
}

// ============================================================
// §7.3 — Resume card
// ============================================================
function ResumeCard({ session, course, vivid, cardful }: { session: any; course?: Course; vivid: boolean; cardful: boolean }) {
    const href = course?.isExamBank ? "/exam" : `/learn/${session.courseId}?lessonId=${session.lessonId}&t=${session.timestamp}`;
    const cardStyle: React.CSSProperties = cardful
        ? { background: "linear-gradient(115deg, #EFF8FF, #FFFFFF 62%)", border: "1px solid #B9DDF5" }
        : { background: "#fff", border: "1px solid #E4EAF0" };
    const coverFallback = "linear-gradient(135deg, #BFE3FA, #D6F3EC)";
    const mm = Math.floor(session.timestamp / 60);
    const ss = String(session.timestamp % 60).padStart(2, "0");

    return (
        <Link href={href} prefetch={false} className="block mc-rise">
            <div
                className="group relative w-full rounded-2xl p-5 md:p-6 transition-all duration-300 overflow-hidden cursor-pointer hover:-translate-y-0.5"
                style={{ ...cardStyle, boxShadow: "0 22px 54px -34px rgba(31,78,136,.30)" }}
            >
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-7">
                    {/* Cover */}
                    <div className="w-full md:w-60 aspect-video rounded-xl overflow-hidden relative shrink-0" style={{ background: coverFallback, border: "1px solid #C7E3F4" }}>
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
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: "#E0F2FE", color: "#0369A1" }}>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#38BDF8" }} />
                                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#0EA5E9" }} />
                                </span>
                                เรียนต่อจากครั้งล่าสุด
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 rounded-md" style={{ background: "#EFF6FB", color: "#5A6B7C" }}>
                                <Clock size={11} /> {mm}:{ss}
                            </span>
                        </div>

                        <h2 className="text-xl md:text-2xl font-bold leading-snug line-clamp-2 mc-kanit transition-colors group-hover:text-sky-700" style={{ color: "#1A2A3C" }}>
                            {session.lessonTitle}
                        </h2>

                        <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-sm font-medium" style={{ color: "#5A6B7C" }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#B9C6D2" }} />
                            <span className="line-clamp-1">{session.courseTitle || course?.title}</span>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="hidden md:flex items-center justify-center pr-2">
                        <div
                            className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                            style={{ background: vivid ? tealSky : "#2F6DB5", color: "#fff", boxShadow: "0 10px 24px -10px rgba(14,165,233,.55)" }}
                        >
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
}: {
    courses: Course[];
    progressMap: Record<string, Progress>;
    reviewedCourseIds: Set<string>;
    onReview: (courseId: string, courseName: string) => void;
    vivid: boolean;
    cardful: boolean;
}) {
    if (courses.length === 0)
        return (
            <div className="text-center py-16 rounded-2xl mc-rise" style={{ background: "rgba(255,255,255,.7)", border: "2px dashed #D0DAE4", color: "#5A6B7C" }}>
                <div className="text-6xl mb-4">🎒</div>
                <p className="text-lg font-medium mb-6">ยังไม่ได้ลงทะเบียนคอร์สเรียน</p>
                <Link href="/" className="inline-block text-white px-8 py-3 rounded-full font-bold transition shadow-lg" style={{ background: tealSky }}>
                    ดูคอร์สทั้งหมด
                </Link>
            </div>
        );

    const grouped: Record<GradeKey, Course[]> = { primary: [], junior: [], senior: [], other: [] };
    courses.forEach((c) => grouped[getCourseCategory(c.title)].push(c));
    const sorter = (a: Course, b: Course) => getCourseWeight(a.title) - getCourseWeight(b.title);
    (Object.values(grouped) as Course[][]).forEach((list) => list.sort(sorter));

    return (
        <div>
            {GRADE_META.map(({ key, thai, en }) => {
                const list = grouped[key];
                if (list.length === 0) return null;
                const sec = SEC[key];
                return (
                    <section key={key} className="mb-10 mc-rise" style={{ ["--sec" as any]: sec }}>
                        {/* §6 — section header: short line + Thai name + EN · n คอร์ส */}
                        <div className="flex items-center gap-3 mb-5">
                            <span className="h-1 w-8 rounded-full shrink-0" style={{ background: sec }} />
                            <h2 className="text-lg sm:text-xl font-bold mc-kanit" style={{ color: "#1A2A3C", whiteSpace: "nowrap" }}>
                                {thai}{" "}
                                <span className="font-medium text-sm" style={{ color: "#7C8B98" }}>
                                    {en} · {list.length} คอร์ส
                                </span>
                            </h2>
                            <span className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #E4EAF0, transparent)" }} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {list.map((course) => (
                                <CourseCard key={course.id} course={course} progress={progressMap[course.id]} isReviewed={reviewedCourseIds.has(course.id)} onReview={onReview} sec={sec} vivid={vivid} cardful={cardful} />
                            ))}
                        </div>
                    </section>
                );
            })}

            {/* §7.6 — Refund policy */}
            <div className="mt-10 pt-5" style={{ borderTop: "1px solid #E4EAF0" }}>
                <p className="text-[11px] text-center leading-relaxed max-w-2xl mx-auto" style={{ color: "#9AA8B5" }}>
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
}: {
    course: Course;
    progress?: Progress;
    isReviewed: boolean;
    onReview: (courseId: string, courseName: string) => void;
    sec: string;
    vivid: boolean;
    cardful: boolean;
}) {
    const daysRemaining = getDaysRemaining(course.expiryDate);
    const isExpired = daysRemaining !== null && daysRemaining <= 0;
    const isApproved = course.status === "approved";
    const pct = progress?.percent ?? 0;
    const done = pct === 100;

    const cardStyle: React.CSSProperties = {
        background: "#fff",
        border: "1px solid #E4EAF0",
        borderTop: cardful ? `4px solid ${sec}` : "1px solid #E4EAF0",
        boxShadow: "0 10px 24px -18px rgba(31,78,136,.28)",
        opacity: isExpired ? 0.78 : 1,
    };
    const coverBg = cardful ? tint(sec, 87) : "#F4F8FB";

    // progress fill: 100% always green; else sec (cardful) / teal-sky (vivid) / accent
    const fill = done
        ? "linear-gradient(90deg, #22C55E, #16A34A)"
        : cardful
        ? `linear-gradient(90deg, ${sec}, ${shade(sec, "#1F4E88", 28)})`
        : vivid
        ? tealSky
        : "#2F6DB5";

    const ctaBg = isExpired
        ? "#EEF2F6"
        : cardful
        ? `linear-gradient(135deg, ${sec}, ${shade(sec, "#1F4E88", 38)})`
        : vivid
        ? tealSky
        : "#2F6DB5";

    return (
        <div className="rounded-2xl p-4 flex flex-col transition-all duration-300 hover:-translate-y-1 group" style={cardStyle}>
            {/* Cover */}
            <div className="aspect-video rounded-xl mb-4 overflow-hidden relative" style={{ background: coverBg }}>
                {course.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={course.image} alt={course.title} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isExpired ? "grayscale-[.4]" : ""}`} loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl" style={{ color: tint(sec, 35) }}>📘</div>
                )}

                {/* Pending overlay (§7.5) */}
                {!isApproved && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 backdrop-blur-[2px]" style={{ background: "rgba(26,42,60,.62)" }}>
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
                        <ValidityBadge days={daysRemaining} />
                    </div>
                )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-[17px] leading-snug mb-2 line-clamp-2 mc-kanit" style={{ color: "#1A2A3C", minHeight: "2.8rem" }}>
                {course.title}
            </h3>

            {/* Dates */}
            {isApproved && (
                <div className="mb-3 text-[11px] py-1.5 px-3 rounded-lg flex justify-between items-center gap-2" style={{ background: "#F7FAFC", border: "1px solid #EAF0F5", color: "#5A6B7C" }}>
                    <span>
                        <span style={{ color: "#9AA8B5" }}>เริ่ม </span>
                        {formatDate(course.startedAt)}
                    </span>
                    <span style={{ color: "#D0DAE4" }}>·</span>
                    <span>
                        <span style={{ color: "#9AA8B5" }}>หมดอายุ </span>
                        {formatDate(course.expiryDate)}
                    </span>
                </div>
            )}

            {/* Progress */}
            {progress && isApproved && (
                <div className="mb-4 p-3.5 rounded-xl" style={{ background: "#F7FAFC", border: "1px solid #EAF0F5" }}>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-semibold" style={{ color: "#5A6B7C" }}>
                            {course.isExamBank ? "ทดสอบแล้ว " : "เรียนแล้ว "}
                            <span className="text-sm font-bold" style={{ color: done ? "#16A34A" : sec }}>{progress.completed}</span>
                            <span style={{ color: "#9AA8B5" }}> / {progress.total} {course.isExamBank ? "ชุด" : "คลิป"}</span>
                        </span>
                        <span className="text-xs font-bold" style={{ color: done ? "#16A34A" : pct === 0 ? "#9AA8B5" : sec }}>
                            {done ? "✓ จบคอร์ส" : `${pct}%`}
                        </span>
                    </div>

                    <div className="h-2.5 rounded-full overflow-hidden relative" style={{ background: "#E6EDF3" }}>
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
                        style={{
                            background: ctaBg,
                            color: isExpired ? "#9AA8B5" : "#fff",
                            cursor: isExpired ? "not-allowed" : "pointer",
                            boxShadow: isExpired ? "none" : "0 10px 22px -12px rgba(31,78,136,.5)",
                        }}
                    >
                        {isExpired ? "หมดอายุ" : course.isExamBank ? "ทำข้อสอบเลย" : pct > 0 ? "เรียนต่อ" : "เริ่มเรียน"}
                    </Link>
                ) : (
                    <button disabled className="w-full py-3 font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2" style={{ background: "#EEF2F6", color: "#9AA8B5" }}>
                        <Lock size={14} /> {course.status === "pending" ? "รออนุมัติ" : "เข้าเรียนไม่ได้"}
                    </button>
                )}

                {/* Review CTA (§7.5) */}
                {isApproved && !isExpired && !isReviewed && (
                    <button
                        onClick={() => onReview(course.id, course.title)}
                        className="w-full mt-2 py-2.5 font-bold text-sm rounded-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(90deg, #FFF7E6, #FFF1F0)", border: "1px solid #FBD9A8", color: "#B45309" }}
                    >
                        <Star size={14} fill="currentColor" />
                        ★ รีวิวคอร์สนี้ รับส่วนลด ฿100
                    </button>
                )}

                {isReviewed && isApproved && (
                    <div className="w-full mt-2 py-2 text-center text-xs font-bold flex items-center justify-center gap-1" style={{ color: "#16A34A" }}>
                        <CheckCircle size={12} /> ✓ รีวิวแล้ว — ขอบคุณ!
                    </div>
                )}
            </div>
        </div>
    );
}

function ValidityBadge({ days }: { days: number }) {
    if (days <= 0) return <Badge text="หมดอายุ" bg="#B4533F" pulse />;
    if (days <= 7) return <Badge text={`เหลือ ${days} วัน`} bg="#B4533F" pulse />;
    if (days <= 30) return <Badge text={`เหลือ ${days} วัน`} bg="#D97706" />;
    return <Badge text={`เหลือ ${days} วัน`} bg="rgba(26,42,60,.62)" />;
}

function Badge({ text, bg, pulse }: { text: string; bg: string; pulse?: boolean }) {
    return (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-md text-white shadow-sm backdrop-blur-sm ${pulse ? "animate-pulse" : ""}`} style={{ background: bg }}>
            {text}
        </span>
    );
}

// ============================================================
// §7.4 — Coupons
// ============================================================
function CouponBanner({ coupons, cardful }: { coupons: UserCoupon[]; cardful: boolean }) {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const unusedCoupons = coupons.filter((c) => !c.isUsed);
    const usedCoupons = coupons.filter((c) => c.isUsed);

    return (
        <div className="rounded-2xl p-5 sm:p-6 mc-rise" style={{ background: "#fff", border: "1px solid #E4EAF0", boxShadow: "0 22px 54px -34px rgba(31,78,136,.30)" }}>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FEF3C7" }}>
                    <Gift size={20} style={{ color: "#D97706" }} />
                </div>
                <div>
                    <h3 className="font-bold mc-kanit" style={{ color: "#1A2A3C" }}>คูปองของฉัน</h3>
                    <p className="text-xs" style={{ color: "#7C8B98" }}>โค้ดส่วนลดของคุณ ดูย้อนหลังได้เสมอ</p>
                </div>
            </div>

            {/* Ready to use */}
            {unusedCoupons.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: "#0F9D6C" }}>
                        <CheckCircle size={12} /> พร้อมใช้ ({unusedCoupons.length})
                    </p>
                    <div className="space-y-2">
                        {unusedCoupons.map((coupon, i) => (
                            <button
                                key={`unused-${i}`}
                                onClick={() => handleCopy(coupon.code)}
                                className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all hover:shadow-md group"
                                style={{ background: cardful ? "#E9FBF2" : "#fff", border: `1px solid ${cardful ? "#5FD9A9" : "#E4EAF0"}` }}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-lg shrink-0">🎟️</span>
                                    <span className="font-mono font-bold tracking-wider truncate" style={{ color: "#0B7A55" }}>{coupon.code}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "#CBF3E2", color: "#0B7A55" }}>ลด ฿{coupon.discountAmount}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full transition-all shrink-0" style={copiedCode === coupon.code ? { background: "#10B981", color: "#fff" } : { background: "#fff", color: "#7C8B98", border: "1px solid #D6EFE2" }}>
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
                    <p className="text-xs font-bold mb-2" style={{ color: "#9AA8B5" }}>ใช้แล้ว ({usedCoupons.length})</p>
                    <div className="space-y-2">
                        {usedCoupons.map((coupon, i) => (
                            <div key={`used-${i}`} className="w-full flex items-center justify-between rounded-xl px-4 py-3 opacity-60" style={{ background: "#F7FAFC", border: "1px solid #EAF0F5" }}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-lg shrink-0 grayscale">🎟️</span>
                                    <span className="font-mono font-bold tracking-wider line-through truncate" style={{ color: "#9AA8B5" }}>{coupon.code}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "#EEF2F6", color: "#9AA8B5" }}>ลด ฿{coupon.discountAmount}</span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0" style={{ background: "#EEF2F6", color: "#9AA8B5" }}>ใช้แล้ว</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// §4/§5 — Tweak panel (vivid / cardful / Dot Pop params)
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
const BASE_SWATCH: Record<string, string> = { ...DOT_BASES };

function TweakPanel({ open, onToggle, prefs, update, onReset }: { open: boolean; onToggle: () => void; prefs: ThemePrefs; update: (p: Partial<ThemePrefs>) => void; onReset: () => void }) {
    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
            {open && (
                <div className="w-[290px] max-h-[76vh] overflow-y-auto rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200" style={{ background: "#fff", border: "1px solid #E4EAF0", boxShadow: "0 30px 60px -20px rgba(31,78,136,.4)" }}>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-sm flex items-center gap-1.5 mc-kanit" style={{ color: "#1A2A3C" }}>
                            <Sparkles size={15} style={{ color: "#0EA5E9" }} /> ปรับแต่งธีม
                        </h4>
                        <button onClick={onReset} className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50" style={{ color: "#7C8B98" }}>
                            <RotateCcw size={11} /> รีเซ็ต
                        </button>
                    </div>

                    {/* Toggles */}
                    <Toggle label="โหมดสีสด (Vivid)" on={prefs.vivid} onClick={() => update({ vivid: !prefs.vivid })} />
                    <Toggle label="การ์ดมีสี (Cardful)" on={prefs.cardful} onClick={() => update({ cardful: !prefs.cardful })} />

                    <Divider />

                    <FieldLabel>พื้นหลัง</FieldLabel>
                    <ChipRow options={STYLE_OPTIONS.map((s) => ({ key: s.key, label: s.label }))} value={prefs.style} onPick={(k) => update({ style: k })} />

                    <FieldLabel>สีพื้น</FieldLabel>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                        {BASE_OPTIONS.map((b) => (
                            <button
                                key={b}
                                onClick={() => update({ base: b })}
                                title={b}
                                className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                                style={{ background: BASE_SWATCH[b], border: prefs.base === b ? "2px solid #0EA5E9" : "1px solid #D0DAE4", boxShadow: prefs.base === b ? "0 0 0 2px #BAE6FD" : "none" }}
                            />
                        ))}
                    </div>

                    <FieldLabel>ชุดสีจุด</FieldLabel>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                        {PALETTE_OPTIONS.map((p) => (
                            <button key={p} onClick={() => update({ palette: p })} className="px-2 py-1 rounded-lg flex items-center gap-1" style={{ border: prefs.palette === p ? "2px solid #0EA5E9" : "1px solid #D0DAE4", background: prefs.palette === p ? "#F0F9FF" : "#fff" }}>
                                <span className="flex gap-0.5">
                                    {(DOT_PALETTES[p] || []).slice(0, 4).map(([r, g, b], i) => (
                                        <span key={i} className="w-2 h-2 rounded-full" style={{ background: `rgb(${r},${g},${b})` }} />
                                    ))}
                                </span>
                            </button>
                        ))}
                    </div>

                    <Divider />

                    <Slider label="ขนาดจุด" value={prefs.size} min={1} max={4.5} step={0.5} onChange={(v) => update({ size: v })} suffix="px" />
                    <Slider label="ระยะห่าง" value={prefs.space} min={20} max={64} step={2} onChange={(v) => update({ space: v })} suffix="px" />
                    <Slider label="ความเข้ม" value={prefs.opacity} min={0.2} max={1} step={0.05} onChange={(v) => update({ opacity: v })} />
                </div>
            )}

            <button
                onClick={onToggle}
                aria-label="ปรับแต่งธีม"
                className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
                style={{ background: tealSky, boxShadow: "0 14px 30px -10px rgba(14,165,233,.6)" }}
            >
                {open ? <X size={20} /> : <SlidersHorizontal size={20} />}
            </button>
        </div>
    );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} className="w-full flex items-center justify-between py-2 group">
            <span className="text-[13px] font-medium" style={{ color: "#3F505F" }}>{label}</span>
            <span className="w-10 h-6 rounded-full p-0.5 transition-colors flex" style={{ background: on ? "#0EA5E9" : "#D0DAE4", justifyContent: on ? "flex-end" : "flex-start" }}>
                <span className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                    {on && <Check size={11} style={{ color: "#0EA5E9" }} />}
                </span>
            </span>
        </button>
    );
}

function Divider() {
    return <div className="my-3 h-px" style={{ background: "#EEF2F6" }} />;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 mt-1" style={{ color: "#9AA8B5" }}>{children}</p>;
}

function ChipRow({ options, value, onPick }: { options: { key: string; label: string }[]; value: string; onPick: (k: string) => void }) {
    return (
        <div className="flex flex-wrap gap-1.5 mb-1">
            {options.map((o) => (
                <button
                    key={o.key}
                    onClick={() => onPick(o.key)}
                    className="px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-colors"
                    style={value === o.key ? { background: "#0EA5E9", color: "#fff" } : { background: "#F4F8FB", color: "#5A6B7C", border: "1px solid #E4EAF0" }}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function Slider({ label, value, min, max, step, onChange, suffix }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string }) {
    return (
        <div className="mb-2.5">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-medium" style={{ color: "#5A6B7C" }}>{label}</span>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: "#0EA5E9" }}>{value}{suffix}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-sky-500" style={{ accentColor: "#0EA5E9" }} />
        </div>
    );
}
