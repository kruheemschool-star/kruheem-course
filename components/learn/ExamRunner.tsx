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
} from "@/lib/exam-utils";
import { Clock, Zap, AlertTriangle, ArrowLeft, History, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { useUserAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { useParams } from "next/navigation";

interface ExamRunnerProps {
    questions: any[];
    onComplete: () => void;
    onNext?: () => void;
    lessonId?: string;
    lessonTitle?: string;
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

export const ExamRunner: React.FC<ExamRunnerProps> = ({ questions: initialQuestions, onComplete, onNext, lessonId, lessonTitle }) => {
    // `questions` is the ACTIVE set — normally all questions, but shrinks to the
    // previously-wrong ones during "ฝึกเฉพาะข้อที่ผิด" (focused practice).
    const [questions, setQuestions] = useState(initialQuestions);
    const [isFocused, setIsFocused] = useState(false);
    const [mode, setMode] = useState<Mode | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
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

    const startTime = useRef<number>(0);   // exam start (ms)
    const qStartTime = useRef<number>(0);  // current question start (ms)
    const qTimes = useRef<Record<number, number>>({}); // accumulated seconds per question

    const total = questions.length;
    const paceTarget = DEFAULT_RECOMMENDED_SECONDS_PER_QUESTION; // 90s/question
    // Time budget for exam mode = total questions × target pace (rounded up to a minute).
    const timeLimitMinutes = Math.max(1, Math.ceil((total * paceTarget) / 60));

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

    /* ── Timing ── */
    const elapsedNow = () => startTime.current ? Math.max(0, Math.round((Date.now() - startTime.current) / 1000)) : 0;

    const commitQuestionTime = () => {
        if (!startTime.current) return;
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
        startTime.current = Date.now();
        qStartTime.current = Date.now();
    };

    // Live timer tick (stops once submitted)
    useEffect(() => {
        if (!mode || isSubmitted) return;
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [mode, isSubmitted]);

    // Auto-submit when the countdown runs out (exam mode only)
    useEffect(() => {
        if (mode !== 'exam' || isSubmitted || !startTime.current) return;
        if (getCountdownState(elapsedNow(), timeLimitMinutes).expired) doSubmit(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick, mode, isSubmitted]);

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
    useEffect(() => {
        if (!isSubmitted || persistedRef.current) return;
        if (!user?.uid || !lessonId || isFocused) return; // focused practice = review only, don't save
        persistedRef.current = true;
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
                    updatedAt: serverTimestamp(),
                });
                const allSnap = await getDocs(collection(db, 'users', user.uid, 'lessonExamResults'));
                const weak = allSnap.docs
                    .map((d) => d.data() as StoredResult)
                    .filter((d) => (d.courseId || '') === courseId && d.lessonId !== lessonId && !!d.lessonTitle && typeof d.bestPercent === 'number' && d.bestPercent < 70)
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

    const handleSelect = (idx: number) => {
        if (isSubmitted || revealed[currentIndex]) return;
        setAnswers({ ...answers, [currentIndex]: idx });
    };

    const toggleReveal = () => setRevealed((prev) => ({ ...prev, [currentIndex]: true }));

    const doSubmit = (force = false) => {
        if (isSubmitted) return;
        if (!force && !confirm("ยืนยันส่งคำตอบหรือไม่?")) return;
        commitQuestionTime();
        let s = 0;
        questions.forEach((q, i) => { if (answers[i] === getCorrectIndex(q)) s++; });
        setScore(s);
        setFinalDuration(elapsedNow());
        setIsSubmitted(true);
        onComplete();
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        qTimes.current = {};
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
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">นับถอยหลัง <b className="text-indigo-600 dark:text-indigo-400">{timeLimitMinutes} นาที</b> · ส่งอัตโนมัติเมื่อหมดเวลา · จำลองห้องสอบจริง</p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ════════════════════ 2) RESULT SCREEN ════════════════════ */
    if (isSubmitted && reviewingIndex === null) {
        const percent = total > 0 ? Math.round((score / total) * 100) : 0;
        const g = getGrade(percent);
        const wrongCount = total - score;

        const perQ = questions.map((q, idx) => ({
            idx,
            seconds: qTimes.current[idx] ?? 0,
            answered: answers[idx] !== undefined,
            isCorrect: answers[idx] === getCorrectIndex(q),
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
        const wrongQs = questions.filter((q, i) => answers[i] === undefined || answers[i] !== getCorrectIndex(q));

        // Phase 4.3: sub-topic weak analysis — active ONLY when questions carry
        // a tag/tags/topic field. A tag is "weak" with >=2 attempts and >=40% wrong.
        const tagStats: Record<string, { wrong: number; total: number }> = {};
        questions.forEach((q, i) => {
            const correct = answers[i] !== undefined && answers[i] === getCorrectIndex(q);
            const tags: string[] = Array.isArray(q.tags) ? q.tags.filter(Boolean)
                : (typeof q.tag === 'string' && q.tag.trim()) ? [q.tag.trim()]
                    : (typeof q.topic === 'string' && q.topic.trim()) ? [q.topic.trim()] : [];
            tags.forEach((t) => {
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

        return (
            <div className="w-full min-h-full py-10 px-4 bg-slate-50 dark:bg-slate-900">
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
                                <span className="text-slate-400 dark:text-slate-500 text-sm font-bold">{score}/{total} ข้อ</span>
                            </div>
                        </div>
                        <div className={`px-7 py-2.5 rounded-2xl ${g.bg} text-white font-black text-xl shadow-lg mb-2`}>Grade {g.grade}</div>
                        <p className={`text-lg font-bold ${g.color}`}>{g.label}</p>
                        {isFocused && <p className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">🔁 ทบทวนเฉพาะข้อที่ผิด · ไม่นับเป็นคะแนนของชุด</p>}
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
                            <div className="flex flex-wrap gap-2">
                                {weakTags.map((w) => (
                                    <span key={w.tag} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900/40 border border-rose-100 dark:border-rose-900/40 text-slate-700 dark:text-slate-200">
                                        {w.tag} <span className="text-rose-500 dark:text-rose-400">ผิด {w.wrong}/{w.total} ({w.pct}%)</span>
                                    </span>
                                ))}
                            </div>
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
                        question={{ id: reviewingIndex, question: q.question, options: q.options, correctIndex: getCorrectIndex(q), explanation: q.explanation, image: q.image, svg: q.svg }}
                        questionNumber={reviewingIndex + 1}
                        totalQuestions={total}
                        selectedOption={answers[reviewingIndex] ?? null}
                        onSelectOption={() => { }}
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
            <div className="w-full max-w-4xl space-y-5">

                {/* ⏱ Live timer bar */}
                <div className="sticky top-2 z-30 bg-white dark:bg-slate-800 rounded-2xl px-5 py-3 shadow-md border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isExam ? 'bg-indigo-500' : 'bg-emerald-500'} text-white`}>
                            {isExam ? <Clock size={18} /> : <Zap size={18} />}
                        </div>
                        <div>
                            <div className={`text-xl font-black tabular-nums leading-none ${timerColor}`}>
                                {isExam ? formatDuration(cd.remainingSeconds) : formatDuration(elapsed)}
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{isExam ? `เหลือเวลา · จาก ${timeLimitMinutes} นาที` : 'โหมดฝึก · นับเวลาขึ้น'}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`text-sm font-black ${pace.color}`}>{pace.label}</div>
                        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500">ทำแล้ว {answeredCount}/{total} ข้อ</div>
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
                            const isDone = answers[idx] !== undefined;
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
                        question={{ id: currentIndex, question: currentQ.question, options: currentQ.options, correctIndex: getCorrectIndex(currentQ), explanation: currentQ.explanation, image: currentQ.image, svg: currentQ.svg }}
                        questionNumber={currentIndex + 1}
                        totalQuestions={total}
                        selectedOption={answers[currentIndex] ?? null}
                        onSelectOption={handleSelect}
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
            </div>
        </div>
    );
};
