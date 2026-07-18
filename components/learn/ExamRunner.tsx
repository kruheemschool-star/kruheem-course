import React, { useState, useEffect, useRef } from 'react';
import { QuestionCard } from "@/components/exam/QuestionCard";
import {
    DEFAULT_RECOMMENDED_SECONDS_PER_QUESTION,
    formatDuration,
    getTimeVerdict,
    getCombinedVerdict,
    getCountdownState,
    getPaceStatus,
    getProficiencyLevel,
    percentileFromBuckets,
    isFillQuestion,
    isFillCorrect,
    extractQuestionTags,
    getConstantTags,
    classifyDiagnosticTag,
    getQuestionKey,
    accumulateTopicStats,
    isDiagnosticExam,
    buildDiagnosticBreakdown,
    sampleDiagnosticQuiz,
} from "@/lib/exam-utils";
import { Clock, Zap, AlertTriangle, ArrowLeft, History, Target, TrendingUp, TrendingDown, Pause, Play, Coffee } from 'lucide-react';
import { useUserAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";

// Loaded on demand — the chart only appears on the results screen, so
// recharts stays out of the learn page's initial JS bundle.
const ScoreDistributionChart = dynamic(() => import("@/components/exam/ScoreDistributionChart"), {
    ssr: false,
    loading: () => <div style={{ height: 140 }} />,
});
import CelebrationModal from "@/components/gamification/CelebrationModal";

interface ExamRunnerProps {
    questions: any[];
    onComplete: () => void;
    onNext?: () => void;
    lessonId?: string;
    lessonTitle?: string;
    // P3.2: emitted when the student taps "ฝึกหัวข้อนี้เพิ่ม" on a weak sub-topic —
    // the page pools questions of that tag across sets and launches a drill.
    onTopicDrill?: (tag: string) => void;
    // P3.2: set on a topic-drill run — its questions all share this one tag, so
    // the save effect records mastery for it explicitly (the constant-tag filter
    // would otherwise drop a tag that's on 100% of the questions).
    topicDrillTag?: string;
}

type Mode = 'practice' | 'exam';

// One stored attempt summary (kept small — used for history + compare).
interface AttemptSummary {
    percent: number;
    score: number;
    total: number;
    durationSeconds: number;
    mode: string;
    at: number; // ms epoch
}
interface StoredResult {
    lessonId?: string;
    lessonTitle?: string;
    courseId?: string;
    attempts?: number;
    bestPercent?: number;
    best?: AttemptSummary;
    last?: AttemptSummary;
    history?: AttemptSummary[];
    // P2: persistent per-topic mastery (สาระ/หัวข้อย่อย only, cumulative) —
    // feeds the cross-set topic radar + "หัวข้ออ่อนสุด" card in the dashboard.
    topicStats?: Record<string, { c: number; t: number }>;
    // P2: mistake notebook — questions still answered wrong. Added on a wrong
    // answer, removed once answered correctly (any mode, incl. focused runs).
    wrongQuestions?: Record<string, { at: number }>;
    // P2: every question key this student has ever been served (for the
    // upcoming mini-quiz sampler to prefer unseen questions).
    seen?: Record<string, number>;
}

const getGrade = (p: number) => {
    if (p >= 80) return { grade: 'A', label: 'ยอดเยี่ยม! 🏆', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500' };
    if (p >= 60) return { grade: 'B', label: 'ดี 👍', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500' };
    if (p >= 40) return { grade: 'C', label: 'พอใช้ 📚', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' };
    return { grade: 'D', label: 'ต้องปรับปรุง 💪', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500' };
};

/* ── เทียบกับครั้งก่อน ── */
export const CompareCard: React.FC<{ attemptNumber: number; prevPercent: number; prevSeconds: number; nowPercent: number; nowSeconds: number; bestPercent: number }> = ({ attemptNumber, prevPercent, prevSeconds, nowPercent, nowSeconds, bestPercent }) => {
    const delta = nowPercent - prevPercent;
    const msg = nowPercent >= bestPercent && delta > 0 ? '🎉 ทำลายสถิติเดิม!'
        : delta > 0 ? 'เก่งขึ้น! พัฒนาการดีมาก 👏'
            : delta < 0 ? 'ครั้งนี้พลาดไปนิด ลองอีกครั้งได้นะ'
                : 'รักษาระดับไว้ได้';
    const msgColor = delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400';
    return (
        <div className="mb-8 rounded-3xl border border-indigo-100 dark:border-slate-700 bg-gradient-to-br from-indigo-50/60 to-white dark:from-slate-800 dark:to-slate-800/40 p-5 md:p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500 text-white flex items-center justify-center"><History size={20} /></div>
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">เทียบกับครั้งก่อน</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">นี่คือครั้งที่ {attemptNumber} ของบทนี้</p>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3 items-center">
                <div className="text-center bg-white dark:bg-slate-900/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-700">
                    <div className="text-xl font-black text-slate-500 dark:text-slate-400 tabular-nums">{prevPercent}%</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">ครั้งก่อน · {formatDuration(prevSeconds)}</div>
                </div>
                <div className="text-center">
                    {delta > 0 ? <TrendingUp className="mx-auto text-emerald-500" size={22} /> : delta < 0 ? <TrendingDown className="mx-auto text-rose-500" size={22} /> : <span className="text-slate-300 text-xl font-black">=</span>}
                    <div className={`text-sm font-black tabular-nums ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>{delta > 0 ? `+${delta}` : delta}%</div>
                </div>
                <div className="text-center bg-white dark:bg-slate-900/40 rounded-2xl p-3 border-2 border-indigo-200 dark:border-indigo-700">
                    <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{nowPercent}%</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">ครั้งนี้ · {formatDuration(nowSeconds)}</div>
                </div>
            </div>
            <p className={`text-center text-sm font-bold mt-3 ${msgColor}`}>{msg}</p>
            {bestPercent > nowPercent && <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-1">สถิติดีที่สุดของบทนี้: {bestPercent}%</p>}
        </div>
    );
};

/* ── หัวข้ออื่นที่ควรกลับไปเก็บ (ข้ามชุดในคอร์สเดียวกัน) ── */
export const WeakTopicsCard: React.FC<{ items: { title: string; percent: number }[] }> = ({ items }) => (
    <div className="mb-8 rounded-3xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-5 md:p-6">
        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><Target size={18} className="text-amber-500" /> หัวข้ออื่นที่ควรกลับไปเก็บ</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">จากผลที่ผ่านมา หัวข้อเหล่านี้คะแนนยังไม่ถึง 70% — ลองกลับไปฝึกเพิ่มอีกหน่อย</p>
        <div className="space-y-2">
            {items.map((w, i) => (
                <div key={i} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900/40 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{w.title}</span>
                    <span className="text-sm font-black text-rose-500 dark:text-rose-400 flex-shrink-0 tabular-nums">{w.percent}%</span>
                </div>
            ))}
        </div>
    </div>
);

export const ExamRunner: React.FC<ExamRunnerProps> = ({ questions: initialQuestions, onComplete, onNext, lessonId, lessonTitle, onTopicDrill, topicDrillTag }) => {
    // `questions` is the ACTIVE set — normally all questions, but shrinks to the
    // previously-wrong ones during "ฝึกเฉพาะข้อที่ผิด" (focused practice).
    const [questions, setQuestions] = useState(initialQuestions);
    const [isFocused, setIsFocused] = useState(false);
    const [mode, setMode] = useState<Mode | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    // MCQ answers are option indices (number); fill-in answers are typed text (string).
    const [answers, setAnswers] = useState<Record<number, number | string>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [revealed, setRevealed] = useState<Record<number, boolean>>({});
    const [tick, setTick] = useState(0); // bumps every second to re-render the live timer
    const [finalDuration, setFinalDuration] = useState(0);
    const [reviewingIndex, setReviewingIndex] = useState<number | null>(null);
    const questionCardRef = useRef<HTMLDivElement>(null);

    // Phase 2: history + compare + cross-lesson weak topics
    const { user } = useUserAuth();
    const params = useParams();
    const [previousAttempt, setPreviousAttempt] = useState<{ percent: number; durationSeconds: number } | null>(null);
    const [bestPercent, setBestPercent] = useState(0);
    const [attemptNumber, setAttemptNumber] = useState(0);
    const [weakLessons, setWeakLessons] = useState<{ title: string; percent: number }[]>([]);
    const persistedRef = useRef(false);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [percentile, setPercentile] = useState<{ percentile: number; count: number; buckets: number[]; yourBucket: number } | null>(null);
    const percentileFetchedRef = useRef(false);
    const [celebration, setCelebration] = useState<{ emoji: string; title: string; message: string } | null>(null);
    const celebratedRef = useRef(false);
    // P2: questions still in the mistake notebook (สมุดข้อผิด) for this set —
    // offered as a focused run from the start screen.
    const [wrongBook, setWrongBook] = useState<any[] | null>(null);
    // หยุดเวลาชั่วคราว (พักเข้าห้องน้ำ/ดื่มน้ำ) — ใช้ได้ทั้งโหมดสอบและโหมดฝึก
    const [isPaused, setIsPaused] = useState(false);
    // ควิซวินิจฉัย (P3): ทำชุดย่อยสุ่มครอบทุกหัวข้อ แทนการทำทั้งชุด → เห็นจุดอ่อนเร็ว
    const [isMini, setIsMini] = useState(false);
    // ส่งเท่าที่ทำ (P3): ดูจุดอ่อนตอนนี้โดยไม่ต้องทำครบ — คิดคะแนนจากข้อที่ตอบเท่านั้น
    const [isPartial, setIsPartial] = useState(false);
    // seen/wrong keys ของนักเรียน (โหลดตอน mount) — ใช้เอียงการสุ่มควิซวินิจฉัย
    const seenRef = useRef<Set<string>>(new Set());
    const wrongRef = useRef<Set<string>>(new Set());
    const MINI_QUIZ_SIZE = 20;

    const startTime = useRef<number>(0);   // start of the current running stretch (ms)
    const qStartTime = useRef<number>(0);  // current question start (ms)
    const qTimes = useRef<Record<number, number>>({}); // accumulated seconds per question
    // Pause bookkeeping (mirrors the exam bank): elapsedBeforeRef banks active
    // seconds before the current running stretch; isPausedRef freezes the clock
    // without waiting for a re-render.
    const isPausedRef = useRef(false);
    const elapsedBeforeRef = useRef(0);

    const total = questions.length;
    const paceTarget = DEFAULT_RECOMMENDED_SECONDS_PER_QUESTION; // 90s — "เป้าความเร็ว" ที่ใช้วิเคราะห์ในหน้าผล
    // เวลานับถอยหลังโหมดจำลองสอบ = จำนวนข้อ × เวลาต่อข้อ (ครูฮีมตั้ง 3 นาที/ข้อ อิงเวลา
    // สอบเข้าจริงแนวปรนัย) — คนละตัวกับ paceTarget ที่เป็นเป้าความเร็วในการวิเคราะห์
    const EXAM_SECONDS_PER_QUESTION = 180; // 3 นาที/ข้อ
    const examMinutesPerQuestion = Math.round(EXAM_SECONDS_PER_QUESTION / 60);
    const timeLimitMinutes = Math.max(1, Math.ceil((total * EXAM_SECONDS_PER_QUESTION) / 60));

    /* ── Answer-key resolution (explanation wins, then stored fields) ── */
    const extractAnswerFromExplanation = (explanation: string): number | null => {
        if (!explanation || typeof explanation !== 'string') return null;
        const clean = explanation
            .replace(/\\\[[\s\S]*?\\\]/g, '').replace(/\$\$[\s\S]*?\$\$/g, '')
            .replace(/\\\([\s\S]*?\\\)/g, '').replace(/\$[^$]+\$/g, '').replace(/\*\*/g, '');
        const patterns = [
            /คำตอบ\s*:?\s*ข้อ\s*(\d)/, /คำตอบคือ\s*ข้อ\s*(\d)/,
            /คำตอบที่ถูกต้อง\s*(?:คือ)?\s*:?\s*ข้อ\s*(\d)/,
            /เฉลย\s*:?\s*ข้อ\s*(\d)/, /ตอบ\s*ข้อ\s*(\d)/,
            /ดังนั้น\s*ข้อ\s*(\d)/, /ตอบข้อ\s*(\d)/,
        ];
        for (const p of patterns) {
            const m = clean.match(p);
            if (m) { const n = parseInt(m[1]); if (n >= 1 && n <= 4) return n - 1; }
        }
        const thaiMap: Record<string, number> = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
        const thaiPats = [
            /คำตอบ\s*:?\s*ข้อ\s*([กคง])/, /เฉลย\s*:?\s*ข้อ\s*([กคง])/,
            /คำตอบ\s*:?\s*([กขคง])(?!้)/, /เฉลย\s*:?\s*([กขคง])(?!้)/,
        ];
        for (const p of thaiPats) {
            const m = clean.match(p);
            if (m && thaiMap[m[1]] !== undefined) return thaiMap[m[1]];
        }
        return null;
    };

    const getCorrectIndex = (q: any) => {
        const optLen = Array.isArray(q.options) ? q.options.length : 4;
        const explAnswer = extractAnswerFromExplanation(q.explanation || q.solution || '');
        if (explAnswer !== null && explAnswer >= 0 && explAnswer < optLen) return explAnswer;
        const raw = q.answerIndex ?? q.correctIndex ?? q.correctAnswer ?? 0;
        let idx: number;
        if (typeof raw === 'string') {
            const map: Record<string, number> = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
            const m = raw.trim().match(/([กขคง])/);
            idx = (m && map[m[1]] !== undefined) ? map[m[1]] : Number(raw);
        } else {
            idx = Number(raw);
        }
        if (isNaN(idx)) idx = 0;
        if (idx >= optLen && idx > 0) idx = idx - 1;
        if (idx < 0 || idx >= optLen) idx = 0;
        return idx;
    };

    /* ── Timing (pause-aware) ── */
    const elapsedNow = () => {
        if (!startTime.current) return 0;
        if (isPausedRef.current) return elapsedBeforeRef.current; // frozen while paused
        return elapsedBeforeRef.current + Math.max(0, Math.round((Date.now() - startTime.current) / 1000));
    };

    const commitQuestionTime = () => {
        if (!startTime.current || isPausedRef.current) return;
        const spent = Math.max(0, Math.round((Date.now() - qStartTime.current) / 1000));
        qTimes.current[currentIndex] = (qTimes.current[currentIndex] || 0) + spent;
        qStartTime.current = Date.now();
    };

    const goTo = (idx: number) => {
        if (idx === currentIndex) return;
        commitQuestionTime();
        setCurrentIndex(idx);
    };

    const start = (m: Mode) => {
        setMode(m);
        setIsMini(false);
        setIsPartial(false);
        elapsedBeforeRef.current = 0;
        startTime.current = Date.now();
        qStartTime.current = Date.now();
    };

    // ควิซวินิจฉัยสุ่ม (P3): หยิบ ~20 ข้อครอบทุกหัวข้อจากทั้งชุด แล้วรันเป็น attempt จริง
    // (บันทึก+สะสม topicStats เหมือนทำเต็มชุด แต่ใช้เวลาน้อย). ไม่ใช่ focused run.
    const startMiniQuiz = () => {
        const subset = sampleDiagnosticQuiz(initialQuestions, MINI_QUIZ_SIZE, seenRef.current, wrongRef.current);
        if (subset.length === 0) return;
        setQuestions(subset);
        setIsFocused(false);
        setIsMini(true);
        setIsPartial(false);
        setCurrentIndex(0);
        setAnswers({});
        setRevealed({});
        setReviewingIndex(null);
        setScore(0);
        setFinalDuration(0);
        setIsSubmitted(false);
        persistedRef.current = false;
        celebratedRef.current = false;
        percentileFetchedRef.current = false;
        qTimes.current = {};
        elapsedBeforeRef.current = 0;
        isPausedRef.current = false;
        setIsPaused(false);
        startTime.current = Date.now();
        qStartTime.current = Date.now();
        setMode('exam'); // ควิซวินิจฉัย = โหมดจำลองสอบ (วัดจริง ไม่เปิดเฉลยระหว่างทำ)
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // หยุด/เล่นต่อ นาฬิกา — เด็กพักได้โดยเวลาไม่เดิน (เข้าห้องน้ำ/ดื่มน้ำ/กินขนม)
    // ใช้ได้ทั้งโหมดจำลองสอบ (นับถอยหลัง) และโหมดฝึก (นับขึ้น)
    const togglePause = () => {
        if (isPausedRef.current) {
            // เล่นต่อ: เริ่มจับเวลาช่วงใหม่จาก "ตอนนี้" ช่วงที่พักจึงถูกข้าม
            startTime.current = Date.now();
            qStartTime.current = Date.now();
            isPausedRef.current = false;
            setIsPaused(false);
        } else {
            // พัก: เก็บเวลาข้อปัจจุบัน + พับเวลาที่เดินมาแล้ว แล้วแช่แข็ง
            commitQuestionTime();
            elapsedBeforeRef.current = elapsedNow();
            isPausedRef.current = true;
            setIsPaused(true);
        }
    };

    // Live timer tick (stops once submitted or while paused)
    useEffect(() => {
        if (!mode || isSubmitted || isPaused) return;
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [mode, isSubmitted, isPaused]);

    // P2: load this set's leftover mistake notebook once, so the start screen
    // can offer "ฝึกข้อที่เคยผิด". Matches stored keys against the FULL question
    // list (not the active subset). Degrades silently when logged out / error.
    useEffect(() => {
        if (!user?.uid || !lessonId) return;
        (async () => {
            try {
                const snap = await getDoc(doc(db, 'users', user.uid, 'lessonExamResults', lessonId));
                if (!snap.exists()) return;
                const data = snap.data() as StoredResult;
                const wrongMap = data.wrongQuestions || {};
                wrongRef.current = new Set(Object.keys(wrongMap));
                seenRef.current = new Set(Object.keys(data.seen || {}));
                const keys = wrongRef.current;
                if (keys.size === 0) return;
                const subset = initialQuestions.filter((q) => keys.has(getQuestionKey(q)));
                if (subset.length > 0) setWrongBook(subset);
            } catch { /* non-fatal: button just won't show */ }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid, lessonId]);

    // Auto-submit when the countdown runs out (exam mode only; never while paused)
    useEffect(() => {
        if (mode !== 'exam' || isSubmitted || !startTime.current || isPaused) return;
        if (getCountdownState(elapsedNow(), timeLimitMinutes).expired) doSubmit(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick, mode, isSubmitted, isPaused]);

    // Auto-scroll to the question when it changes
    useEffect(() => {
        const t = setTimeout(() => {
            questionCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return () => clearTimeout(t);
    }, [currentIndex]);

    // On submit: save this attempt, read the previous one to compare, and find
    // weak topics across other lessons in the same course. Runs once; skips
    // gracefully when logged out or no lessonId (e.g. preview/test).
    // Focused runs (ฝึกเฉพาะข้อที่ผิด/สมุดข้อผิด) don't count as attempts, but
    // they DO settle the mistake notebook: answer a wrong question correctly
    // and it drops out of wrongQuestions.
    useEffect(() => {
        if (!isSubmitted || persistedRef.current) return;
        if (!user?.uid || !lessonId) return;
        persistedRef.current = true;

        if (isFocused) {
            (async () => {
                try {
                    const ref = doc(db, 'users', user.uid, 'lessonExamResults', lessonId);
                    const snap = await getDoc(ref);
                    if (!snap.exists()) return; // no prior real attempt → nothing to settle
                    const wrong = { ...((snap.data() as StoredResult).wrongQuestions || {}) };
                    questions.forEach((q, i) => {
                        const k = getQuestionKey(q);
                        if (answers[i] !== undefined && isAnswerCorrect(q, answers[i])) delete wrong[k];
                        else wrong[k] = { at: Date.now() };
                    });
                    // updateDoc replaces the whole map (setDoc+merge would deep-merge
                    // and resurrect cleared keys).
                    await updateDoc(ref, { wrongQuestions: wrong, updatedAt: serverTimestamp() });
                } catch (e) {
                    console.warn('[ExamRunner] could not settle mistake notebook:', e);
                }
            })();
            return;
        }

        const courseId = (typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '') || '';
        const pct = total > 0 ? Math.round((score / total) * 100) : 0;
        const nowSummary: AttemptSummary = { percent: pct, score, total, durationSeconds: finalDuration, mode: mode || 'practice', at: Date.now() };
        (async () => {
            try {
                const ref = doc(db, 'users', user.uid, 'lessonExamResults', lessonId);
                const snap = await getDoc(ref);
                const prev = snap.exists() ? (snap.data() as StoredResult) : null;
                const prevBestPct = typeof prev?.bestPercent === 'number' ? prev.bestPercent : 0;
                const newBest = Math.max(prevBestPct, pct);
                if (prev?.last) setPreviousAttempt({ percent: prev.last.percent ?? 0, durationSeconds: prev.last.durationSeconds ?? 0 });
                setAttemptNumber((prev?.attempts || 0) + 1);
                setBestPercent(newBest);
                const history = [...(Array.isArray(prev?.history) ? prev.history : []), nowSummary].slice(-12);

                // P2/P3: cumulative per-topic mastery + mistake notebook + seen set.
                // นับเฉพาะข้อที่ "ตอบแล้ว" — ข้อที่ข้าม (เช่นกดส่งเท่าที่ทำ) ไม่ถือว่าทำ
                // จึงไม่ลงสถิติหัวข้อ/สมุดข้อผิด/seen (การวินิจฉัยสะท้อนเฉพาะที่ลงมือทำจริง)
                const answeredItems = questions
                    .map((q, i) => ({ q, answered: answers[i] !== undefined, isCorrect: answers[i] !== undefined && isAnswerCorrect(q, answers[i]) }))
                    .filter((x) => x.answered);
                const topicStats = accumulateTopicStats(prev?.topicStats,
                    answeredItems.map((x) => ({ tags: extractQuestionTags(x.q), isCorrect: x.isCorrect })));
                // topic-drill: every question shares topicDrillTag, so accumulateTopicStats
                // (which drops constant tags) skips it — record that one tag explicitly.
                if (topicDrillTag && answeredItems.length > 0) {
                    const c = answeredItems.filter((x) => x.isCorrect).length;
                    const p0 = topicStats[topicDrillTag] || { c: 0, t: 0 };
                    topicStats[topicDrillTag] = { c: p0.c + c, t: p0.t + answeredItems.length };
                }
                const wrongQuestions = { ...(prev?.wrongQuestions || {}) };
                const seen = { ...(prev?.seen || {}) };
                answeredItems.forEach((x) => {
                    const k = getQuestionKey(x.q);
                    seen[k] = 1;
                    if (x.isCorrect) delete wrongQuestions[k];
                    else wrongQuestions[k] = { at: Date.now() };
                });

                await setDoc(ref, {
                    lessonId,
                    lessonTitle: lessonTitle || '',
                    courseId,
                    studentName: user.displayName || '',
                    studentEmail: user.email || '',
                    attempts: (prev?.attempts || 0) + 1,
                    last: nowSummary,
                    previous: prev?.last || null,
                    best: pct >= prevBestPct ? nowSummary : (prev?.best || nowSummary),
                    bestPercent: newBest,
                    history,
                    topicStats,
                    wrongQuestions,
                    seen,
                    updatedAt: serverTimestamp(),
                });
                const allSnap = await getDocs(collection(db, 'users', user.uid, 'lessonExamResults'));
                const weak = allSnap.docs
                    .map((d) => d.data() as StoredResult)
                    .filter((d) => (d.courseId || '') === courseId && d.lessonId !== lessonId && d.lessonId !== 'topic-drill' && !!d.lessonTitle && typeof d.bestPercent === 'number' && d.bestPercent < 70)
                    .sort((a, b) => (a.bestPercent || 0) - (b.bestPercent || 0))
                    .slice(0, 3)
                    .map((d) => ({ title: d.lessonTitle as string, percent: d.bestPercent as number }));
                setWeakLessons(weak);
            } catch (e) {
                console.warn('[ExamRunner] could not save/compare attempt:', e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSubmitted]);

    // L-F4: fetch peer score distribution for this lesson → percentile (once).
    // Skips for focused runs / logged-out / no lessonId; degrades silently on error.
    useEffect(() => {
        if (!isSubmitted || isFocused || !lessonId || percentileFetchedRef.current) return;
        percentileFetchedRef.current = true;
        const pct = total > 0 ? Math.round((score / total) * 100) : 0;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        fetch('/api/lesson-exam-averages', { signal: controller.signal })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                const pl = data?.perLesson?.[lessonId];
                if (pl && Array.isArray(pl.buckets) && pl.count > 0) {
                    const yourBucket = Math.min(9, Math.max(0, Math.floor(pct / 10)));
                    setPercentile({ percentile: percentileFromBuckets(pl.buckets, pl.count, pct), count: pl.count, buckets: pl.buckets, yourBucket });
                }
            })
            .catch(() => { /* non-fatal: card just won't show */ })
            .finally(() => clearTimeout(timeoutId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSubmitted]);

    // G1: celebrate great results (A / perfect) with confetti — real runs only, once.
    useEffect(() => {
        if (!isSubmitted || isFocused || celebratedRef.current) return;
        celebratedRef.current = true;
        const pct = total > 0 ? Math.round((score / total) * 100) : 0;
        if (pct === 100) setCelebration({ emoji: '🏆', title: 'สุดยอด! คะแนนเต็ม! 🏆', message: 'ทำได้เต็ม 100% ไม่พลาดเลยสักข้อ เก่งมากๆ!' });
        else if (pct >= 80) setCelebration({ emoji: '🎉', title: 'ยอดเยี่ยม! ได้เกรด A', message: `ทำได้ ${pct}% เก่งมาก รักษาฟอร์มแบบนี้ไว้นะ!` });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSubmitted]);

    // Unified correctness check: fill-in compares typed text against accepted
    // answers (forgiving), MCQ compares the chosen option index.
    const isAnswerCorrect = (q: any, ans: number | string | undefined) => {
        if (isFillQuestion(q)) return isFillCorrect(typeof ans === 'string' ? ans : (ans == null ? '' : String(ans)), q.answers);
        return ans === getCorrectIndex(q);
    };

    const handleSelect = (idx: number) => {
        if (isSubmitted || revealed[currentIndex]) return;
        setAnswers({ ...answers, [currentIndex]: idx });
    };

    const handleTextChange = (value: string) => {
        if (isSubmitted || revealed[currentIndex]) return;
        setAnswers((prev) => {
            const next = { ...prev };
            if (value === '') delete next[currentIndex];
            else next[currentIndex] = value;
            return next;
        });
    };

    const toggleReveal = () => setRevealed((prev) => ({ ...prev, [currentIndex]: true }));

    const doSubmit = (force = false) => {
        if (isSubmitted) return;
        if (!force && !confirm("ยืนยันส่งคำตอบหรือไม่?")) return;
        commitQuestionTime();
        let s = 0;
        questions.forEach((q, i) => { if (isAnswerCorrect(q, answers[i])) s++; });
        setScore(s);
        setFinalDuration(elapsedNow());
        setIsSubmitted(true);
        onComplete();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // P3: "ส่งเท่าที่ทำ · ดูจุดอ่อน" — จบก่อนโดยไม่ต้องทำครบ. คิดคะแนน/วิเคราะห์เฉพาะ
    // ข้อที่ตอบแล้ว (ข้อที่ข้ามไม่นับ). งานที่ทำไปสะสมลง topicStats ตามปกติ.
    const submitPartial = () => {
        if (isSubmitted) return;
        const answered = Object.keys(answers).length;
        if (!confirm(`ดูจุดอ่อนจาก ${answered} ข้อที่ทำไปเลยไหม?\n(ข้อที่ยังไม่ได้ทำจะไม่ถูกนับ · ทำต่อทีหลังได้ ระบบสะสมให้)`)) return;
        setIsPartial(true);
        doSubmit(true);
    };

    // Re-run a subset of questions (used by "ฝึกเฉพาะข้อที่ผิด"). Always starts
    // in practice mode; focused runs are review-only and never saved as an attempt.
    const restartWith = (subset: any[], focused: boolean) => {
        setQuestions(subset);
        setIsFocused(focused);
        setCurrentIndex(0);
        setAnswers({});
        setRevealed({});
        setReviewingIndex(null);
        setScore(0);
        setFinalDuration(0);
        setIsSubmitted(false);
        setPreviousAttempt(null);
        setWeakLessons([]);
        persistedRef.current = false;
        setIsMini(false);
        setIsPartial(false);
        qTimes.current = {};
        elapsedBeforeRef.current = 0;
        isPausedRef.current = false;
        setIsPaused(false);
        startTime.current = Date.now();
        qStartTime.current = Date.now();
        setMode('practice');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /* ════════════════════ 1) START SCREEN ════════════════════ */
    if (!mode) {
        return (
            <div className="w-full min-h-full flex flex-col items-center justify-center py-12 px-4 bg-slate-50 dark:bg-slate-900">
                <div className="w-full max-w-2xl">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2">เลือกโหมดทำข้อสอบ</h2>
                        <p className="text-slate-500 dark:text-slate-400">ทั้งหมด {total} ข้อ — เลือกแบบที่เหมาะกับตอนนี้</p>
                    </div>
                    {/* ⚡ ควิซวินิจฉัย (P3) — สำหรับชุดใหญ่: ทำ ~20 ข้อครอบทุกหัวข้อ รู้จุดอ่อนเร็ว */}
                    {total > MINI_QUIZ_SIZE + 5 && (
                        <button
                            onClick={startMiniQuiz}
                            className="group mb-4 w-full text-left bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 rounded-3xl p-5 border-2 border-violet-200 dark:border-violet-700/50 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-4"
                        >
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center text-3xl shadow-lg shadow-violet-500/20">⚡</div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-0.5">ควิซวินิจฉัยเร็ว — {MINI_QUIZ_SIZE} ข้อ รู้จุดอ่อนใน ~30 นาที</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">สุ่มให้ครอบทุกหัวข้อจากทั้ง {total} ข้อ · ไม่ต้องทำครบก็เห็นจุดอ่อนครบ · ทำซ้ำได้เจอข้อใหม่เรื่อยๆ</p>
                            </div>
                        </button>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Practice */}
                        <button
                            onClick={() => start('practice')}
                            className="group text-left bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20 mb-4">📝</div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">โหมดฝึก</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">จับเวลาแบบนับขึ้น ไม่กดดัน · เปิดดูเฉลยรายข้อได้ · เหมาะกับการทำความเข้าใจ</p>
                        </button>
                        {/* Exam */}
                        <button
                            onClick={() => start('exam')}
                            className="group text-left bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/20 mb-4">⏱️</div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">โหมดจำลองสอบ</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">นับถอยหลัง <b className="text-indigo-600 dark:text-indigo-400">{timeLimitMinutes} นาที</b> <span className="text-slate-400 dark:text-slate-500">({total} ข้อ × {examMinutesPerQuestion} นาที)</span> · หยุดพักได้ · ส่งอัตโนมัติเมื่อหมดเวลา</p>
                        </button>
                    </div>

                    {/* ✍️ สมุดข้อผิด (P2) — leftover wrong questions from past attempts */}
                    {wrongBook && wrongBook.length > 0 && (
                        <button
                            onClick={() => restartWith(wrongBook, true)}
                            className="group mt-4 w-full text-left bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-3xl p-5 border-2 border-amber-200 dark:border-amber-700/50 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-4"
                        >
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">✍️</div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-0.5">สมุดข้อผิด — ฝึกข้อที่เคยผิด ({wrongBook.length} ข้อ)</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">ข้อที่ยังตอบผิดค้างอยู่จากรอบก่อนๆ · ทำถูกเมื่อไหร่ ข้อจะหลุดจากสมุดอัตโนมัติ</p>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    /* ════════════════════ 2) RESULT SCREEN ════════════════════ */
    if (isSubmitted && reviewingIndex === null) {
        // ส่งเท่าที่ทำ (P3): คิดคะแนนจากข้อที่ตอบเท่านั้น (ข้อที่ข้ามไม่นับ)
        const answeredTotal = questions.filter((_, i) => answers[i] !== undefined).length;
        const scoreDenom = isPartial ? Math.max(1, answeredTotal) : total;
        const percent = scoreDenom > 0 ? Math.round((score / scoreDenom) * 100) : 0;
        const g = getGrade(percent);
        const wrongCount = scoreDenom - score;

        const perQ = questions.map((q, idx) => ({
            idx,
            seconds: qTimes.current[idx] ?? 0,
            answered: answers[idx] !== undefined,
            isCorrect: isAnswerCorrect(q, answers[idx]),
        }));
        const timed = perQ.filter((p) => p.answered && p.seconds > 0);
        const hasTiming = timed.length > 0;
        const totalTimeSec = finalDuration;
        const avgPaceAll = total > 0 ? Math.round(totalTimeSec / total) : 0;
        const tooSlow = perQ.filter((p) => p.seconds > 1.5 * paceTarget).length;
        const tooFast = perQ.filter((p) => p.answered && p.seconds > 0 && p.seconds < 0.4 * paceTarget).length;
        const pacing = (() => {
            if (avgPaceAll <= paceTarget && percent >= 60) return { text: 'จังหวะดีมาก ทำได้รวดเร็วและแม่นยำ 👏', color: 'text-emerald-600 dark:text-emerald-400' };
            if (avgPaceAll <= paceTarget) return { text: 'ทำเร็วแต่ยังพลาดหลายข้อ ลองทบทวนแนวคิดให้แม่นขึ้น', color: 'text-amber-600 dark:text-amber-400' };
            if (avgPaceAll <= 1.5 * paceTarget) return { text: 'จังหวะใกล้เคียงเป้าหมาย ฝึกอีกนิดให้คล่องขึ้น', color: 'text-amber-600 dark:text-amber-400' };
            return { text: 'ใช้เวลามากกว่าเป้าหมาย ลองฝึกความเร็วในข้อที่ช้า', color: 'text-rose-600 dark:text-rose-400' };
        })();
        const paceRatio = (paceTarget > 0 && avgPaceAll > 0) ? avgPaceAll / paceTarget : 1;
        const proficiency = getProficiencyLevel(percent, paceRatio);
        const reviewList = perQ.filter((p) =>
            !p.answered || getCombinedVerdict(p.seconds, paceTarget, p.isCorrect, p.answered).shouldReview
        );
        const maxSec = Math.max(paceTarget, ...perQ.map((p) => p.seconds), 1);
        const wrongQs = questions.filter((q, i) => answers[i] === undefined || !isAnswerCorrect(q, answers[i]));

        // Phase 4.3 + P1: sub-topic weak analysis — active ONLY when questions
        // carry a tag/tags/topic field. Only genuine sub-topics count: set-wide
        // constant tags (สอบเข้า ม.1, พีชคณิต) and non-topic dimensions
        // (ระดับ/ทักษะ/ชั้นต้นทาง) are excluded so this card shows หัวข้อย่อย only —
        // the ระดับ/ทักษะ angles get their own diagnostic breakdown elsewhere.
        // A tag is "weak" with >=2 attempts and >=40% wrong.
        const perQuestionTags = questions.map(extractQuestionTags);
        const constantTags = getConstantTags(perQuestionTags);
        const tagStats: Record<string, { wrong: number; total: number }> = {};
        questions.forEach((q, i) => {
            if (answers[i] === undefined) return;                 // ข้อที่ข้าม ไม่นับในการวินิจฉัย
            const correct = isAnswerCorrect(q, answers[i]);
            perQuestionTags[i].forEach((t) => {
                if (constantTags.has(t)) return;                 // set-wide label
                if (classifyDiagnosticTag(t) !== 'topic') return; // ระดับ/ทักษะ/ชั้น
                if (!tagStats[t]) tagStats[t] = { wrong: 0, total: 0 };
                tagStats[t].total++;
                if (!correct) tagStats[t].wrong++;
            });
        });
        const weakTags = Object.entries(tagStats)
            .filter(([, s]) => s.total >= 2 && s.wrong / s.total >= 0.4)
            .map(([tag, s]) => ({ tag, wrong: s.wrong, total: s.total, pct: Math.round((s.wrong / s.total) * 100) }))
            .sort((a, b) => b.pct - a.pct || b.wrong - a.wrong)
            .slice(0, 3);

        // P3 (parity with exam bank): 4-angle diagnostic breakdown — lights up
        // when the set carries the content standard's skill+level tags. Skipped
        // for focused runs (a wrong-only subset would skew every angle).
        const diag = (!isFocused && isDiagnosticExam(questions))
            ? buildDiagnosticBreakdown(questions
                .map((q, i) => ({ tags: extractQuestionTags(q), isCorrect: perQ[i].isCorrect, answered: perQ[i].answered }))
                .filter((x) => x.answered))
            : null;
        const skillMeta: Record<string, { label: string; hint: string }> = {
            'คิดเลข': { label: 'คิดเลขแม่น', hint: 'บวกลบคูณหาร/ทำตามขั้นตอน' },
            'เข้าใจ': { label: 'เข้าใจมโนทัศน์', hint: 'รู้ว่าทำไปทำไม ไม่ใช่ท่องจำ' },
            'แปลโจทย์': { label: 'แปลโจทย์ปัญหา', hint: 'อ่านโจทย์ยาวแล้วตั้งต้นถูก' },
        };
        const levelMeta: Record<string, string> = {
            'ง่าย': 'พื้นฐาน — ต้องเก็บให้ครบ', 'กลาง': 'สนามจริงออกเยอะสุด',
            'ยาก': 'ตัวตัดสินอันดับ', 'ยากมาก': 'โจทย์ท้าเซียน พลาดได้ไม่บาป',
        };
        const pctBar = (p: number) => p >= 75
            ? { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', track: 'bg-emerald-100 dark:bg-emerald-900/30' }
            : p >= 50
                ? { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', track: 'bg-amber-100 dark:bg-amber-900/30' }
                : { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', track: 'bg-rose-100 dark:bg-rose-900/30' };

        return (
            <div className="w-full min-h-full py-10 px-4 bg-slate-50 dark:bg-slate-900">
                {celebration && (
                    <CelebrationModal isOpen type="custom" customEmoji={celebration.emoji} customTitle={celebration.title} customMessage={celebration.message} onClose={() => setCelebration(null)} />
                )}
                <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl p-7 md:p-10 border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                    <div className={`absolute top-0 inset-x-0 h-52 bg-gradient-to-b ${g.bg} opacity-10 -z-10`} />

                    {/* Score ring */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative w-40 h-40 mb-4">
                            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-700" />
                                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${percent * 2.83} 283`} className={g.color} style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-4xl font-black ${g.color}`}>{percent}%</span>
                                <span className="text-slate-400 dark:text-slate-500 text-sm font-bold">{score}/{scoreDenom} ข้อ</span>
                            </div>
                        </div>
                        <div className={`px-7 py-2.5 rounded-2xl ${g.bg} text-white font-black text-xl shadow-lg mb-2`}>Grade {g.grade}</div>
                        <p className={`text-lg font-bold ${g.color}`}>{g.label}</p>
                        {isFocused && <p className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">🔁 ทบทวนเฉพาะข้อที่ผิด · ไม่นับเป็นคะแนนของชุด</p>}
                        {isMini && !isFocused && <p className="mt-2 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-full">⚡ ควิซวินิจฉัย {total} ข้อ (สุ่มครอบทุกหัวข้อ) · จุดอ่อนสะสมต่อเนื่อง</p>}
                        {isPartial && !isFocused && <p className="mt-2 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-full">📊 วิเคราะห์จาก {answeredTotal} ข้อที่ทำ · ที่เหลือยังทำต่อได้ ระบบสะสมให้</p>}
                    </div>

                    {/* 🎯 ระดับความพร้อม (L-F1) */}
                    {!isFocused && (
                        <div className={`mb-8 rounded-3xl border bg-gradient-to-br ${proficiency.bg} p-5 md:p-6 text-center`}>
                            <div className="text-4xl mb-1">{proficiency.emoji}</div>
                            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ระดับความพร้อม</div>
                            <h3 className={`text-2xl font-black ${proficiency.color} mb-2`}>{proficiency.label}</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto mb-3">{proficiency.meaning}</p>
                            <div className="inline-flex items-start gap-2 text-left bg-white/70 dark:bg-slate-900/40 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 max-w-md">
                                <span className="flex-shrink-0">👉</span><span>{proficiency.nextStep}</span>
                            </div>
                        </div>
                    )}

                    {/* 🏆 อันดับ/เปอร์เซ็นไทล์เทียบเพื่อน (L-F4) */}
                    {!isFocused && percentile && percentile.count >= 5 && (
                        <div className="mb-8 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/70 to-white dark:from-indigo-900/20 dark:to-slate-800/40 p-5 md:p-6">
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">🏆 อันดับของคุณ</h3>
                            <p className="text-slate-600 dark:text-slate-300 mb-3">
                                ทำได้ <span className="text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400 align-middle">เก่งกว่า {percentile.percentile}%</span>{' '}
                                <span className="text-sm">ของคนที่ทำชุดนี้ ({percentile.count} คน)</span>
                            </p>
                            <ScoreDistributionChart buckets={percentile.buckets} yourBucket={percentile.yourBucket} isDark={isDark} height={140} />
                            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-1">การกระจายคะแนนของทุกคน · <span className="text-amber-500 font-bold">แท่งสีส้ม</span> = ช่วงคะแนนของคุณ</p>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-8 text-center">
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl p-4">
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{score}</div>
                            <div className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">ตอบถูก ✓</div>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-900/30 rounded-2xl p-4">
                            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{wrongCount}</div>
                            <div className="text-rose-600 dark:text-rose-400 text-xs font-medium">ผิด/ไม่ตอบ ✗</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-4">
                            <div className="text-2xl font-black text-slate-600 dark:text-slate-300">{formatDuration(totalTimeSec)}</div>
                            <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">เวลารวม ⏱</div>
                        </div>
                    </div>

                    {/* Pacing overview */}
                    {hasTiming && (
                        <div className="mb-8 rounded-3xl border border-indigo-100 dark:border-slate-700 bg-gradient-to-br from-indigo-50/60 to-white dark:from-slate-800 dark:to-slate-800/40 p-5 md:p-6">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-md"><Clock size={22} /></div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">ภาพรวมการจับเวลา</h3>
                                    <p className={`text-sm font-bold ${pacing.color}`}>{pacing.text}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 text-center">
                                    <div className={`text-xl font-black tabular-nums ${avgPaceAll <= paceTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{avgPaceAll} วิ</div>
                                    <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">เฉลี่ย/ข้อ · เป้า {paceTarget}</div>
                                </div>
                                <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 text-center">
                                    <div className={`text-xl font-black tabular-nums ${tooSlow > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>{tooSlow}</div>
                                    <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">ข้อที่ช้าเกินเป้า</div>
                                </div>
                                <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 text-center">
                                    <div className={`text-xl font-black tabular-nums ${tooFast > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>{tooFast}</div>
                                    <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">ข้อที่เร็วผิดปกติ</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Per-question time bars */}
                    {hasTiming && (
                        <div className="mb-8 rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 md:p-6">
                            <div className="flex items-center justify-between mb-1 gap-2">
                                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">เวลาที่ใช้รายข้อ</h3>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 dark:text-indigo-400 flex-shrink-0"><span className="inline-block w-0.5 h-3 bg-indigo-500/70" /> เป้า {paceTarget} วิ</span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">แท่งยิ่งยาว = ยิ่งใช้เวลามาก · สีบอกความเร็ว · กดที่ข้อเพื่อดูเฉลย</p>
                            <div className="flex flex-col gap-1.5">
                                {perQ.map((p) => {
                                    const v = getTimeVerdict(p.seconds, paceTarget);
                                    const widthPct = p.seconds > 0 ? Math.max(3, Math.min(100, (p.seconds / maxSec) * 100)) : 0;
                                    return (
                                        <button key={p.idx} onClick={() => setReviewingIndex(p.idx)} title={getCombinedVerdict(p.seconds, paceTarget, p.isCorrect, p.answered).label}
                                            className="group flex items-center gap-2 w-full text-left">
                                            <span className="w-7 flex-shrink-0 text-xs font-bold text-slate-400 dark:text-slate-500 text-right">{p.idx + 1}</span>
                                            <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${p.answered ? (p.isCorrect ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-300 dark:bg-slate-600'}`} />
                                            <div className="flex-1 h-5 rounded-md bg-slate-100 dark:bg-slate-700/50 overflow-hidden relative">
                                                <div className={`h-full ${v.dot} opacity-80 rounded-md transition-all group-hover:opacity-100`} style={{ width: `${widthPct}%` }} />
                                                <div className="absolute inset-y-0 w-px bg-indigo-500/60" style={{ left: `${Math.min(100, (paceTarget / maxSec) * 100)}%` }} />
                                            </div>
                                            <span className="w-12 flex-shrink-0 text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">{p.seconds > 0 ? `${p.seconds}วิ` : '—'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Review list */}
                    {reviewList.length > 0 && (
                        <div className="mb-8 rounded-3xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-5 md:p-6">
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> ข้อที่ควรทบทวน ({reviewList.length})</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">รวมข้อที่ตอบผิด ไม่ได้ตอบ หรือใช้เวลานานผิดปกติ — กดเพื่อดูเฉลย</p>
                            <div className="flex flex-wrap gap-2">
                                {reviewList.map((p) => {
                                    const cv = getCombinedVerdict(p.seconds, paceTarget, p.isCorrect, p.answered);
                                    return (
                                        <button key={p.idx} onClick={() => setReviewingIndex(p.idx)}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold transition hover:-translate-y-0.5 ${cv.bg} ${cv.color}`}>
                                            ข้อ {p.idx + 1} · {cv.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* หัวข้อย่อยที่ควรเก็บ (Phase 4.3 — shows only when questions have tags) */}
                    {weakTags.length > 0 && (
                        <div className="mb-8 rounded-3xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-900/10 p-5 md:p-6">
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">🏷️ หัวข้อย่อยที่ควรเก็บ (ในชุดนี้)</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">หัวข้อที่ตอบผิดบ่อยในชุดนี้ — โฟกัสทบทวนตรงนี้ก่อน</p>
                            <div className="space-y-2">
                                {weakTags.map((w) => (
                                    <div key={w.tag} className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/40 border border-rose-100 dark:border-rose-900/40">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 min-w-0">
                                            <span className="truncate">{w.tag}</span> <span className="text-rose-500 dark:text-rose-400 whitespace-nowrap">ผิด {w.wrong}/{w.total} ({w.pct}%)</span>
                                        </span>
                                        {onTopicDrill && !topicDrillTag && (
                                            <button
                                                onClick={() => onTopicDrill(w.tag)}
                                                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-500 hover:scale-[1.03] active:scale-95 transition shadow-sm"
                                            >
                                                🎯 ฝึกเพิ่ม 10 ข้อ
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 🧠📶🔍 4 มุมวินิจฉัย (P3 — parity กับคลังข้อสอบ, ชุดที่ tag ครบมาตรฐานเท่านั้น) */}
                    {diag && (diag.skills.length > 0 || diag.levels.length > 0) && (
                        <div className="mb-8 grid gap-4 md:grid-cols-2">
                            {diag.skills.length > 0 && (
                                <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 md:p-6">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">🧠 อ่อนทักษะไหน</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">แยกว่าพลาดเพราะคิดเลข เข้าใจ หรือแปลโจทย์</p>
                                    <div className="flex flex-col gap-4">
                                        {diag.skills.map((s) => {
                                            const c = pctBar(s.percent);
                                            const meta = skillMeta[s.tag] || { label: s.tag, hint: '' };
                                            return (
                                                <div key={s.tag}>
                                                    <div className="flex items-baseline justify-between mb-1">
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{meta.label}</span>
                                                        <span className={`text-sm font-black tabular-nums ${c.text}`}>{s.percent}%</span>
                                                    </div>
                                                    <div className={`h-2.5 rounded-full ${c.track} overflow-hidden`}>
                                                        <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${s.percent}%` }}></div>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{meta.hint} · ถูก {s.correct}/{s.total}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {diag.levels.length > 0 && (
                                <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 md:p-6">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">📶 อ่อนระดับไหน</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">ดูว่าหลุดตั้งแต่ข้อพื้นฐาน หรือไปตายตรงข้อยาก</p>
                                    <div className="flex flex-col gap-4">
                                        {diag.levels.map((l) => {
                                            const c = pctBar(l.percent);
                                            return (
                                                <div key={l.tag}>
                                                    <div className="flex items-baseline justify-between mb-1">
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{l.tag}</span>
                                                        <span className={`text-sm font-black tabular-nums ${c.text}`}>{l.percent}%</span>
                                                    </div>
                                                    <div className={`h-2.5 rounded-full ${c.track} overflow-hidden`}>
                                                        <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${l.percent}%` }}></div>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{levelMeta[l.tag] || ''} · ถูก {l.correct}/{l.total}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {diag.origins.length >= 2 && (
                                <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 md:p-6 md:col-span-2">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">🔍 รูรั่วอยู่ชั้นไหน</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">บอกว่าจุดอ่อนเป็นของเก่าติดมา หรือเนื้อหาชั้นปัจจุบัน</p>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {diag.origins.map((o) => {
                                            const c = pctBar(o.percent);
                                            return (
                                                <div key={o.tag}>
                                                    <div className="flex items-baseline justify-between mb-1">
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{o.tag}</span>
                                                        <span className={`text-sm font-black tabular-nums ${c.text}`}>{o.percent}%</span>
                                                    </div>
                                                    <div className={`h-2.5 rounded-full ${c.track} overflow-hidden`}>
                                                        <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${o.percent}%` }}></div>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">ถูก {o.correct}/{o.total}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* เทียบกับครั้งก่อน (Phase 2) */}
                    {previousAttempt && (
                        <CompareCard attemptNumber={attemptNumber} prevPercent={previousAttempt.percent} prevSeconds={previousAttempt.durationSeconds} nowPercent={percent} nowSeconds={totalTimeSec} bestPercent={bestPercent} />
                    )}

                    {/* หัวข้ออื่นที่ควรเก็บ (Phase 2) */}
                    {weakLessons.length > 0 && <WeakTopicsCard items={weakLessons} />}

                    {/* ฝึกเฉพาะข้อที่ผิด (Phase 4) */}
                    {wrongQs.length > 0 && (
                        <button onClick={() => restartWith(wrongQs, true)} className="w-full mb-3 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25 hover:scale-[1.01] active:scale-95 transition flex items-center justify-center gap-2">
                            🔁 ฝึกเฉพาะข้อที่ผิด ({wrongQs.length} ข้อ)
                        </button>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => setReviewingIndex(0)} className="flex-1 py-3.5 rounded-2xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition">📖 ดูเฉลยทุกข้อ</button>
                        {onNext && (
                            <button onClick={() => onNext()} className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-95 transition">ไปบทเรียนต่อไป →</button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    /* ════════════════════ 2b) REVIEW A QUESTION (after submit) ════════════════════ */
    if (isSubmitted && reviewingIndex !== null) {
        const q = questions[reviewingIndex];
        return (
            <div className="w-full min-h-full py-8 px-4 bg-slate-50 dark:bg-slate-900">
                <div className="w-full max-w-4xl mx-auto space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <button onClick={() => setReviewingIndex(null)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                            <ArrowLeft size={18} /> กลับไปหน้าผล
                        </button>
                        <div className="flex gap-1.5">
                            <button onClick={() => setReviewingIndex(Math.max(0, reviewingIndex - 1))} disabled={reviewingIndex === 0} className="px-3 py-2 rounded-xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30">←</button>
                            <button onClick={() => setReviewingIndex(Math.min(total - 1, reviewingIndex + 1))} disabled={reviewingIndex === total - 1} className="px-3 py-2 rounded-xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30">→</button>
                        </div>
                    </div>
                    <QuestionCard
                        question={isFillQuestion(q)
                            ? { id: reviewingIndex, type: 'fill', question: q.question, answers: q.answers, explanation: q.explanation, image: q.image, svg: q.svg }
                            : { id: reviewingIndex, question: q.question, options: q.options, correctIndex: getCorrectIndex(q), explanation: q.explanation, image: q.image, svg: q.svg }}
                        questionNumber={reviewingIndex + 1}
                        totalQuestions={total}
                        selectedOption={typeof answers[reviewingIndex] === 'number' ? (answers[reviewingIndex] as number) : null}
                        textAnswer={typeof answers[reviewingIndex] === 'string' ? (answers[reviewingIndex] as string) : ''}
                        onSelectOption={() => { }}
                        onChangeText={() => { }}
                        isSubmitted={true}
                    />
                </div>
            </div>
        );
    }

    /* ════════════════════ 3) EXAM IN PROGRESS ════════════════════ */
    const currentQ = questions[currentIndex];
    const elapsed = elapsedNow();
    const cd = getCountdownState(elapsed, timeLimitMinutes);
    const answeredCount = Object.keys(answers).length;
    const pace = getPaceStatus({
        answeredCount, totalAnswerable: total, elapsedSeconds: elapsed,
        timedMode: mode === 'exam', timeLimitSeconds: timeLimitMinutes * 60, recommendedSecondsPerQuestion: paceTarget,
    });
    const isExam = mode === 'exam';
    const timerColor = !isExam ? 'text-slate-700 dark:text-slate-200'
        : cd.warnLevel === 'critical' ? 'text-rose-600 dark:text-rose-400'
            : cd.warnLevel === 'warn' ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-700 dark:text-slate-200';

    return (
        <div className="w-full min-h-full flex flex-col items-center py-6 px-4 bg-slate-50 dark:bg-slate-900">
            {/* ⏸ Overlay ตอนพัก — บังโจทย์ไว้เพื่อไม่ให้ทำต่อระหว่างพัก เวลาหยุดเดิน */}
            {isPaused && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
                    <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-100 dark:border-slate-700 px-8 py-10 text-center">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                            <Coffee size={30} className="text-amber-500 dark:text-amber-400" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">พักก่อนได้เลย</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">เวลาหยุดเดินแล้ว ไปเข้าห้องน้ำ ดื่มน้ำ หรือกินขนมได้ตามสบาย</p>
                        <p className="text-lg font-black tabular-nums text-slate-700 dark:text-slate-200 mb-6">
                            {isExam ? `เวลาคงเหลือ ${formatDuration(cd.remainingSeconds)}` : `เวลาที่ใช้ไป ${formatDuration(elapsed)}`}
                        </p>
                        <button
                            onClick={togglePause}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-black py-3.5 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            <Play size={20} /> พร้อมแล้ว เล่นต่อ
                        </button>
                    </div>
                </div>
            )}
            <div className="w-full max-w-4xl space-y-5">

                {/* ⏱ Live timer bar */}
                <div className="sticky top-2 z-30 bg-white dark:bg-slate-800 rounded-2xl px-5 py-3 shadow-md border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isPaused ? 'bg-slate-400' : isExam ? 'bg-indigo-500' : 'bg-emerald-500'} text-white`}>
                            {isPaused ? <Coffee size={18} /> : isExam ? <Clock size={18} /> : <Zap size={18} />}
                        </div>
                        <div>
                            <div className={`text-xl font-black tabular-nums leading-none ${isPaused ? 'text-slate-400 dark:text-slate-500' : timerColor}`}>
                                {isExam ? formatDuration(cd.remainingSeconds) : formatDuration(elapsed)}
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{isPaused ? 'พักอยู่ · เวลาหยุดเดิน' : isExam ? `เหลือเวลา · จาก ${timeLimitMinutes} นาที` : 'โหมดฝึก · นับเวลาขึ้น'}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className={`text-sm font-black ${pace.color}`}>{pace.label}</div>
                            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500">ทำแล้ว {answeredCount}/{total} ข้อ</div>
                        </div>
                        {/* ⏸ ปุ่มหยุด/เล่นต่อ (ทั้งสองโหมด) */}
                        <button
                            onClick={togglePause}
                            aria-label={isPaused ? 'เล่นต่อ' : 'หยุดพักชั่วคราว'}
                            className={`flex-shrink-0 flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors ${isPaused ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        >
                            {isPaused ? <><Play size={16} /> เล่นต่อ</> : <><Pause size={16} /> พัก</>}
                        </button>
                    </div>
                </div>

                {/* 🗺️ Question map */}
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-slate-700 dark:text-slate-200 flex items-center gap-2 text-sm">🗺️ แผนที่ข้อสอบ <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg font-bold">{total} ข้อ</span></h3>
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500">ข้อที่ {currentIndex + 1}</div>
                    </div>
                    <div className="grid grid-cols-5 md:grid-cols-10 xl:grid-cols-[repeat(15,minmax(0,1fr))] gap-2">
                        {questions.map((_, idx) => {
                            const isCurrent = idx === currentIndex;
                            const isDone = answers[idx] !== undefined && answers[idx] !== '';
                            let btnStyle = "bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent";
                            if (isCurrent) btnStyle = "bg-yellow-400 text-yellow-900 font-black shadow-lg shadow-yellow-200 dark:shadow-yellow-900/30 scale-110 z-10 ring-2 ring-white dark:ring-slate-800";
                            else if (isDone) btnStyle = "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold border-indigo-100 dark:border-indigo-700";
                            return (
                                <button key={idx} onClick={() => goTo(idx)} className={`aspect-square rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-200 ${btnStyle}`}>{idx + 1}</button>
                            );
                        })}
                    </div>
                </div>

                {/* 📝 Question */}
                <div ref={questionCardRef} className="scroll-mt-4">
                    <QuestionCard
                        question={isFillQuestion(currentQ)
                            ? { id: currentIndex, type: 'fill', question: currentQ.question, answers: currentQ.answers, explanation: currentQ.explanation, image: currentQ.image, svg: currentQ.svg }
                            : { id: currentIndex, question: currentQ.question, options: currentQ.options, correctIndex: getCorrectIndex(currentQ), explanation: currentQ.explanation, image: currentQ.image, svg: currentQ.svg }}
                        questionNumber={currentIndex + 1}
                        totalQuestions={total}
                        selectedOption={typeof answers[currentIndex] === 'number' ? (answers[currentIndex] as number) : null}
                        textAnswer={typeof answers[currentIndex] === 'string' ? (answers[currentIndex] as string) : ''}
                        onSelectOption={handleSelect}
                        onChangeText={handleTextChange}
                        isSubmitted={revealed[currentIndex]}
                    />
                </div>

                {/* Footer controls */}
                <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-4 pt-4 pb-20">
                    <button onClick={() => goTo(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="px-6 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition flex items-center gap-2 w-full md:w-auto justify-center"><span>←</span> ข้อก่อนหน้า</button>

                    {/* Peek answer — practice mode only */}
                    {mode === 'practice' && !revealed[currentIndex] && (
                        <button onClick={toggleReveal} className="px-6 py-3 rounded-xl font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition flex items-center gap-2 w-full md:w-auto justify-center">💡 ดูเฉลยข้อนี้</button>
                    )}

                    {currentIndex === total - 1 ? (
                        <button onClick={() => doSubmit(false)} className="px-8 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 hover:scale-105 transition">✨ ส่งคำตอบทั้งหมด</button>
                    ) : (
                        <button onClick={() => goTo(Math.min(total - 1, currentIndex + 1))} className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg transition flex items-center gap-2">ข้อต่อไป <span>→</span></button>
                    )}
                </div>

                {/* 📊 ส่งเท่าที่ทำ · ดูจุดอ่อน (P3) — ทำชุดใหญ่ไม่ต้องครบก็เห็นจุดอ่อนได้ */}
                {!isFocused && answeredCount >= 5 && answeredCount < total && (
                    <div className="flex justify-center -mt-14 pb-6">
                        <button onClick={submitPartial} className="text-sm font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800/50 rounded-full px-4 py-2 transition">
                            📊 ส่งเท่าที่ทำ · ดูจุดอ่อนตอนนี้ ({answeredCount} ข้อ)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
