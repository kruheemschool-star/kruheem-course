"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ExamQuestion } from '@/types/exam';
import { sanitizeExamData, formatDuration, getTimeVerdict, getCombinedVerdict, getCountdownState, getPaceStatus, getProficiencyLevel, percentileFromBuckets, DEFAULT_RECOMMENDED_SECONDS_PER_QUESTION } from '@/lib/exam-utils';
import { QuestionCard } from './QuestionCard';
import { useSavedQuestions } from '@/hooks/useSavedQuestions';
import { ChevronLeft, ChevronRight, CheckCircle, RotateCcw, Trophy, Award, Lock, Trash2, Target, Cloud, CloudCheck, Clock, AlertTriangle, Pause, Play, Coffee } from 'lucide-react';
import { useUserAuth } from '@/context/AuthContext';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';

// Charts are loaded on demand (they only appear on the results screen), so
// recharts stays out of the exam page's initial JS bundle. Fixed-height
// placeholders keep the layout from shifting while the chunk loads.
const TopicRadarChart = dynamic(() => import('./TopicRadarChart'), {
    ssr: false,
    loading: () => <div style={{ height: 300 }} />,
});
const ScoreDistributionChart = dynamic(() => import('./ScoreDistributionChart'), {
    ssr: false,
    loading: () => <div style={{ height: 150 }} />,
});

// === localStorage Auto-Save Helpers ===
interface SavedExamProgress {
    answers: Record<number, number>;
    checkedQuestions: Record<number, boolean>;
    currentQuestionIndex: number;
    questionTimes: Record<number, number>;
    elapsedBeforeSeconds?: number; // accumulated active exam time (sec) up to this save — resume-safe
    savedAt: number; // timestamp
}

const PROGRESS_KEY_PREFIX = 'exam_progress_';
const PROGRESS_EXPIRY_HOURS = 72; // Auto-expire after 72 hours

const getProgressKey = (examId: string): string => `${PROGRESS_KEY_PREFIX}${examId}`;

const saveProgressToLocal = (examId: string, data: SavedExamProgress): void => {
    try {
        localStorage.setItem(getProgressKey(examId), JSON.stringify(data));
    } catch (e) {
        console.warn('[ExamAutoSave] Failed to save progress:', e);
    }
};

const loadProgressFromLocal = (examId: string): SavedExamProgress | null => {
    try {
        const raw = localStorage.getItem(getProgressKey(examId));
        if (!raw) return null;
        const data: SavedExamProgress = JSON.parse(raw);
        // Check expiry
        const ageHours = (Date.now() - data.savedAt) / (1000 * 60 * 60);
        if (ageHours > PROGRESS_EXPIRY_HOURS) {
            localStorage.removeItem(getProgressKey(examId));
            return null;
        }
        return data;
    } catch (e) {
        console.warn('[ExamAutoSave] Failed to load progress:', e);
        return null;
    }
};

const clearProgressFromLocal = (examId: string): void => {
    try {
        localStorage.removeItem(getProgressKey(examId));
    } catch (e) {
        console.warn('[ExamAutoSave] Failed to clear progress:', e);
    }
};

// === Cloud Save Helpers (cross-device resume) ===
// Stored at users/{uid}/inProgressExams/{examId}. Writes happen ONLY on
// explicit user action ("save to cloud" button) and on successful submit
// (which deletes the doc), so Firestore writes are bounded to ~2 per exam.
const saveProgressToCloud = async (uid: string, examId: string, data: SavedExamProgress) => {
    try {
        await setDoc(doc(db, "users", uid, "inProgressExams", examId), {
            ...data,
            savedAt: serverTimestamp(),
            clientSavedAt: data.savedAt,
        });
        return true;
    } catch (e) {
        console.warn('[ExamCloudSave] Failed to save to cloud:', e);
        return false;
    }
};

const loadProgressFromCloud = async (uid: string, examId: string): Promise<SavedExamProgress | null> => {
    try {
        const snap = await getDoc(doc(db, "users", uid, "inProgressExams", examId));
        if (!snap.exists()) return null;
        const data = snap.data() as Partial<SavedExamProgress> & { clientSavedAt?: number };
        if (!data.answers || Object.keys(data.answers).length === 0) return null;
        const savedAt = data.clientSavedAt || data.savedAt || Date.now();
        // Respect the same 72h expiry rule as localStorage
        const ageHours = (Date.now() - savedAt) / (1000 * 60 * 60);
        if (ageHours > PROGRESS_EXPIRY_HOURS) return null;
        return {
            answers: data.answers,
            checkedQuestions: data.checkedQuestions || {},
            currentQuestionIndex: data.currentQuestionIndex || 0,
            questionTimes: data.questionTimes || {},
            elapsedBeforeSeconds: data.elapsedBeforeSeconds || 0,
            savedAt,
        };
    } catch (e) {
        console.warn('[ExamCloudSave] Failed to load from cloud:', e);
        return null;
    }
};

const clearProgressFromCloud = async (uid: string, examId: string) => {
    try {
        await deleteDoc(doc(db, "users", uid, "inProgressExams", examId));
    } catch (e) {
        // Non-blocking — if delete fails, doc will auto-expire client-side
        console.warn('[ExamCloudSave] Failed to clear cloud progress:', e);
    }
};

interface ExamSystemProps {
    examData: ExamQuestion[];
    examTitle: string;
    examId?: string;
    category?: string;
    level?: string;
    initialQuestionIndex?: number;
    onComplete?: (score: number, total: number) => void;
    isTrial?: boolean;
    showAnswerChecking?: boolean;
    enableResultTracking?: boolean;
    recommendedSecondsPerQuestion?: number; // pacing benchmark (sec); defaults to 90
    timedMode?: boolean; // run a countdown + auto-submit (uses timeLimitMinutes as the budget)
    timeLimitMinutes?: number; // the exam's time budget in minutes (Exam.timeLimit)
}

// Grade Calculation Helper
interface FinalScore {
    score: number;
    total: number;
    percent: number;
    grade: string;
    label: string;
    gradeColor: string;
    bgColor: string;
    durationSeconds: number;
}

const getGradeFromPercent = (percent: number): { grade: string; label: string; gradeColor: string; bgColor: string } => {
    if (percent >= 80) return { grade: 'A', label: 'ยอดเยี่ยม! 🏆', gradeColor: 'text-emerald-600', bgColor: 'bg-emerald-500' };
    if (percent >= 60) return { grade: 'B', label: 'ดี 👍', gradeColor: 'text-blue-600', bgColor: 'bg-blue-500' };
    if (percent >= 40) return { grade: 'C', label: 'พอใช้ 📚', gradeColor: 'text-amber-600', bgColor: 'bg-amber-500' };
    return { grade: 'D', label: 'ต้องปรับปรุง 💪', gradeColor: 'text-rose-600', bgColor: 'bg-rose-500' };
};

// Helper removed: getCorrectIndex (Logic cleanup)

// 🛡️ Last line of defense: if a single question throws for any unforeseen
// reason (bad data shape, renderer bug), show a recoverable card instead of
// letting it bubble to app/error.tsx and kill the whole exam session.
class QuestionErrorBoundary extends React.Component<
    { children: React.ReactNode; resetKey: number; onSkip: () => void; canSkip: boolean },
    { hasError: boolean }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error: Error) {
        // eslint-disable-next-line no-console
        console.error('[QuestionErrorBoundary] failed to render question:', error);
    }
    // Reset when navigating to a different question
    componentDidUpdate(prevProps: { resetKey: number }) {
        if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
            this.setState({ hasError: false });
        }
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-stone-100 dark:border-slate-700 p-10 text-center">
                    <div className="text-4xl mb-3">⚠️</div>
                    <h3 className="text-lg font-bold text-stone-700 dark:text-slate-300 mb-1">ข้อนี้มีปัญหาในการแสดงผล</h3>
                    <p className="text-stone-500 dark:text-slate-400 text-sm mb-5">ข้ามข้อนี้แล้วทำข้อสอบต่อได้เลยครับ</p>
                    {this.props.canSkip && (
                        <button
                            onClick={this.props.onSkip}
                            className="px-6 py-3 rounded-full font-bold text-white bg-slate-800 hover:bg-slate-900 transition-all inline-flex items-center gap-2"
                        >
                            ข้อถัดไป
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}

export const ExamSystem: React.FC<ExamSystemProps> = ({ examData, examTitle, examId, category, level, initialQuestionIndex = 0, onComplete, isTrial = false, showAnswerChecking = false, enableResultTracking = false, recommendedSecondsPerQuestion, timedMode = false, timeLimitMinutes }) => {
    const { user } = useUserAuth();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const savedQ = useSavedQuestions();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});
    const [isFinished, setIsFinished] = useState(false); // Restore finish state
    const [showGrid, setShowGrid] = useState(false);
    const [finalScore, setFinalScore] = useState<FinalScore | null>(null);
    const [percentile, setPercentile] = useState<{ percentile: number; count: number; buckets: number[]; yourBucket: number } | null>(null);
    const percentileFetchedRef = useRef(false);
    const [wasRestored, setWasRestored] = useState(false); // Show "resumed" banner
    const [cloudSaveState, setCloudSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [restoredFromCloud, setRestoredFromCloud] = useState(false);

    // Time tracking
    const examStartTime = React.useRef<number>(Date.now());
    const questionStartTime = React.useRef<number>(Date.now());
    const questionTimes = React.useRef<Record<number, number>>({});
    const elapsedBeforeRef = React.useRef<number>(0); // active time before this session (resume-safe)
    const [stopwatchTick, setStopwatchTick] = useState(0); // bump once per second to re-render the live timer
    const [isPaused, setIsPaused] = useState(false); // student paused the clock (rest / bathroom / snack)
    const isPausedRef = useRef(false); // mirror of isPaused for the timing helpers (no re-render dep)
    const autoSubmittedRef = useRef(false); // guards exactly-once auto-submit when the countdown hits 0
    const handleFinishExamRef = useRef<(auto?: boolean) => void>(() => {}); // latest handleFinishExam (for the auto-submit effect)

    // Sanitize Data using shared utility
    const sanitizedExamData = React.useMemo(() => sanitizeExamData(examData), [examData]);

    const totalQuestions = sanitizedExamData.length;
    // Clamp index into range — guards a stale localStorage / ?q= index that
    // points past the end (e.g. after corrupt questions were filtered out).
    const safeIndex = totalQuestions > 0
        ? Math.min(Math.max(0, currentQuestionIndex), totalQuestions - 1)
        : 0;
    const currentQuestion = sanitizedExamData[safeIndex];
    const questionCardRef = useRef<HTMLDivElement>(null);

    // === Timing: helpers shared by the live stopwatch, autosave and results ===
    // Total active exam time (seconds), correct across save → resume.
    const getElapsedSeconds = useCallback(
        () => isPausedRef.current
            ? elapsedBeforeRef.current // frozen: paused time doesn't count
            : elapsedBeforeRef.current + Math.max(0, Math.round((Date.now() - examStartTime.current) / 1000)),
        []
    );

    // Timed (countdown) mode: active only when explicitly enabled AND a budget is set,
    // so existing exams with a stray timeLimit stay in count-up mode.
    const isCountdown = timedMode && (timeLimitMinutes ?? 0) > 0;
    const timeLimitSeconds = (timeLimitMinutes ?? 0) * 60;

    // Accumulate the time spent on the current question, then restart its clock.
    // Called whenever the student leaves a question (prev / next / jump / finish)
    // so every visit is counted — not just the moment of first answering.
    const commitTimeForCurrentQuestion = useCallback(() => {
        const elapsed = Math.round((Date.now() - questionStartTime.current) / 1000);
        if (elapsed > 0) {
            questionTimes.current[currentQuestionIndex] =
                (questionTimes.current[currentQuestionIndex] || 0) + elapsed;
        }
        questionStartTime.current = Date.now();
    }, [currentQuestionIndex]);

    // Pause / resume the clock — lets a student rest, use the bathroom or grab a
    // snack without it counting against their time. On pause we fold the active
    // seconds into elapsedBeforeRef and freeze; on resume we restart the clock
    // from "now" so the paused stretch is skipped for both the total and the
    // current question.
    const togglePause = useCallback(() => {
        if (isPausedRef.current) {
            // Resume
            examStartTime.current = Date.now();
            questionStartTime.current = Date.now();
            isPausedRef.current = false;
            setIsPaused(false);
        } else {
            // Pause: commit current-question time, freeze the accumulated total
            commitTimeForCurrentQuestion();
            elapsedBeforeRef.current = getElapsedSeconds();
            isPausedRef.current = true;
            setIsPaused(true);
        }
    }, [commitTimeForCurrentQuestion, getElapsedSeconds]);

    // Jump to a specific question (from the question-map grid), counting time first.
    const goToQuestion = useCallback((idx: number) => {
        commitTimeForCurrentQuestion();
        setCurrentQuestionIndex(idx);
    }, [commitTimeForCurrentQuestion]);

    // Tick the live stopwatch once per second while the exam is in progress.
    useEffect(() => {
        if (isFinished || finalScore || totalQuestions === 0 || isPaused) return;
        const id = setInterval(() => setStopwatchTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [isFinished, finalScore, totalQuestions, isPaused]);

    // Auto-submit when a timed exam's countdown reaches zero. Fires exactly once
    // (autoSubmittedRef); re-runs each second because it depends on stopwatchTick.
    // Also catches a resume that lands already past the time limit (within ~1s).
    useEffect(() => {
        if (!isCountdown || isFinished || finalScore || totalQuestions === 0) return;
        if (autoSubmittedRef.current) return;
        if (getElapsedSeconds() >= timeLimitSeconds) {
            autoSubmittedRef.current = true;
            handleFinishExamRef.current(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stopwatchTick, isCountdown, isFinished, finalScore, totalQuestions, timeLimitSeconds]);

    // Snap state back into range if it drifted out of bounds
    useEffect(() => {
        if (totalQuestions > 0 && currentQuestionIndex !== safeIndex) {
            setCurrentQuestionIndex(safeIndex);
        }
    }, [currentQuestionIndex, safeIndex, totalQuestions]);

    // F4: fetch peer score distribution → percentile rank (once, when results show)
    useEffect(() => {
        if (!isFinished || !finalScore || !examId || !showAnswerChecking || isTrial || percentileFetchedRef.current) return;
        percentileFetchedRef.current = true;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        fetch('/api/exam-averages', { signal: controller.signal })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                const pe = data?.perExam?.[examId];
                if (pe && Array.isArray(pe.buckets) && pe.count > 0) {
                    const yourBucket = Math.min(9, Math.max(0, Math.floor(finalScore.percent / 10)));
                    setPercentile({ percentile: percentileFromBuckets(pe.buckets, pe.count, finalScore.percent), count: pe.count, buckets: pe.buckets, yourBucket });
                }
            })
            .catch(() => { /* non-fatal: card just won't show */ })
            .finally(() => clearTimeout(timeoutId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFinished, finalScore, examId]);

    // 📜 Auto-scroll to question card when selecting from grid
    useEffect(() => {
        if (isFinished) return; // Don't scroll when viewing results
        const timer = setTimeout(() => {
            if (questionCardRef.current) {
                questionCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [currentQuestionIndex, isFinished]);

    // === Auto-Save: Restore saved progress on mount ===
    // Try localStorage first (fast, device-local). If empty AND user is
    // logged in, try cloud (cross-device). Cloud read is a single getDoc.
    const hasRestoredRef = useRef(false);
    useEffect(() => {
        if (!examId || isTrial || hasRestoredRef.current) return;
        hasRestoredRef.current = true;
        const local = loadProgressFromLocal(examId);
        if (local && Object.keys(local.answers).length > 0) {
            setAnswers(local.answers);
            setCheckedQuestions(local.checkedQuestions || {});
            setCurrentQuestionIndex(local.currentQuestionIndex || 0);
            questionTimes.current = local.questionTimes || {};
            elapsedBeforeRef.current = local.elapsedBeforeSeconds || 0;
            examStartTime.current = Date.now();
            questionStartTime.current = Date.now();
            setWasRestored(true);
            return;
        }
        // No local data — try cloud if user is logged in
        if (!user?.uid) return;
        (async () => {
            const cloud = await loadProgressFromCloud(user.uid, examId);
            if (cloud && Object.keys(cloud.answers).length > 0) {
                setAnswers(cloud.answers);
                setCheckedQuestions(cloud.checkedQuestions || {});
                setCurrentQuestionIndex(cloud.currentQuestionIndex || 0);
                questionTimes.current = cloud.questionTimes || {};
                elapsedBeforeRef.current = cloud.elapsedBeforeSeconds || 0;
                examStartTime.current = Date.now();
                questionStartTime.current = Date.now();
                setWasRestored(true);
                setRestoredFromCloud(true);
            }
        })();
    }, [examId, isTrial, user?.uid]);

    // === Auto-Save: Debounced save to localStorage ===
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedSave = useCallback(() => {
        if (!examId || isTrial || isFinished) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            const data: SavedExamProgress = {
                answers,
                checkedQuestions,
                currentQuestionIndex,
                questionTimes: questionTimes.current,
                elapsedBeforeSeconds: getElapsedSeconds(),
                savedAt: Date.now(),
            };
            saveProgressToLocal(examId, data);
        }, 500); // Debounce 500ms
    }, [examId, isTrial, isFinished, answers, checkedQuestions, currentQuestionIndex, getElapsedSeconds]);

    useEffect(() => {
        debouncedSave();
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [debouncedSave]);

    // ... (Keep handleSelectOption, handleCheckAnswer, handlePrev, handleNext)

    const handleSelectOption = (optionIndex: number) => {
        if (checkedQuestions[currentQuestionIndex]) return;
        // Per-question time is accumulated on navigation (commitTimeForCurrentQuestion),
        // so picking an answer no longer needs to touch the timer.
        setAnswers({ ...answers, [currentQuestionIndex]: optionIndex });
        setWasRestored(false); // Dismiss restored banner on interaction
    };

    const handleCheckAnswer = () => {
        setCheckedQuestions({ ...checkedQuestions, [currentQuestionIndex]: true });
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            commitTimeForCurrentQuestion();
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            commitTimeForCurrentQuestion();
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handleFinishExam = (auto = false) => {
        const answerableCount = isTrial ? Math.min(5, totalQuestions) : totalQuestions;
        const unansweredCount = answerableCount - Object.keys(answers).length;
        // Auto-submit (countdown expired) skips the confirm() prompts.
        if (!auto) {
            if (unansweredCount > 0) {
                if (!confirm(`คุณยังทำข้อสอบไม่ครบ ${unansweredCount} ข้อ\nต้องการส่งคำตอบเลยหรือไม่?`)) return;
            } else if (!confirm("ยืนยันการส่งคำตอบ?")) {
                return;
            }
        }

        // Freeze timing at submit: count the current question's dwell, then snapshot total time.
        commitTimeForCurrentQuestion();
        const totalDurationSec = getElapsedSeconds();

        // Calculate Score with NEW Clean Logic
        let score = 0;
        sanitizedExamData.slice(0, answerableCount).forEach((q, index) => {
            if (answers[index] === q.correctIndex) score++;
        });

        // Calculate Grade
        const percent = answerableCount > 0 ? Math.round((score / answerableCount) * 100) : 0;
        const gradeInfo = getGradeFromPercent(percent);
        setFinalScore({
            score,
            total: answerableCount,
            percent,
            durationSeconds: totalDurationSec,
            ...gradeInfo
        });

        // Reveal all answers
        const allChecked: Record<number, boolean> = {};
        for (let i = 0; i < answerableCount; i++) allChecked[i] = true;
        setCheckedQuestions(allChecked);

        setIsFinished(true);

        // Clear localStorage progress after finishing
        if (examId) clearProgressFromLocal(examId);
        // Also clear cloud progress (non-blocking) if it was used
        if (examId && user?.uid) clearProgressFromCloud(user.uid, examId);

        // Save exam result to Firestore (only if logged in and not trial)
        if (user && examId && !isTrial) {
            console.log('[ExamSystem] Saving exam result for user:', user.uid, 'exam:', examId);
            const wrongIndices: number[] = [];
            const allTags = new Set<string>();
            sanitizedExamData.slice(0, answerableCount).forEach((q, idx) => {
                if (answers[idx] !== q.correctIndex) wrongIndices.push(idx);
                if (q.tags) q.tags.forEach((t: string) => allTags.add(t));
            });
            const avgTimePerQuestion = answerableCount > 0 ? Math.round(totalDurationSec / answerableCount) : 0;
            const resultDoc = {
                examId,
                examTitle,
                category: category || '',
                level: level || '',
                score,
                total: answerableCount,
                percent,
                grade: gradeInfo.grade,
                answers,
                wrongQuestionIndices: wrongIndices,
                tags: Array.from(allTags),
                completedAt: serverTimestamp(),
                durationSeconds: totalDurationSec,
                avgTimePerQuestion,
                questionTimes: questionTimes.current,
            };
            console.log('[ExamSystem] Result doc:', resultDoc);
            setDoc(doc(db, 'users', user.uid, 'examResults', examId), resultDoc)
                .then(() => console.log('[ExamSystem] Exam result saved successfully'))
                .catch(err => console.error('[ExamSystem] Failed to save exam result:', err));
        } else {
            console.log('[ExamSystem] Not saving result - user:', !!user, 'examId:', !!examId, 'isTrial:', isTrial);
        }

        if (onComplete) onComplete(score, answerableCount);
    };
    // Keep the auto-submit effect pointing at the latest closure (fresh state).
    handleFinishExamRef.current = handleFinishExam;

    // Find first wrong answer for review
    const handleReviewWrongAnswers = () => {
        const wrongIndex = sanitizedExamData.findIndex((q, idx) =>
            answers[idx] !== undefined && answers[idx] !== q.correctIndex
        );
        if (wrongIndex !== -1) {
            setCurrentQuestionIndex(wrongIndex);
            setIsFinished(false);
        }
    };

    const handleRestart = () => {
        setCurrentQuestionIndex(0);
        setAnswers({});
        setCheckedQuestions({});
        setIsFinished(false);
        setFinalScore(null);
        setWasRestored(false);
        questionTimes.current = {};
        elapsedBeforeRef.current = 0;
        examStartTime.current = Date.now();
        questionStartTime.current = Date.now();
        // Clear localStorage
        if (examId) clearProgressFromLocal(examId);
    };

    // Reset handler for sidebar button (same as restart but with confirmation)
    const handleClearProgress = () => {
        const answeredCount = Object.keys(answers).length;
        if (answeredCount === 0) return;
        if (!confirm(`คุณตอบไปแล้ว ${answeredCount} ข้อ\nต้องการล้างคำตอบทั้งหมดแล้วเริ่มทำใหม่หรือไม่?`)) return;
        handleRestart();
    };

    // Explicit "save to cloud" action — user-triggered only, exactly 1 write
    const handleSaveToCloud = async () => {
        if (!user?.uid || !examId || isTrial || isFinished) return;
        if (Object.keys(answers).length === 0) {
            alert("ยังไม่มีคำตอบให้บันทึก");
            return;
        }
        setCloudSaveState('saving');
        const ok = await saveProgressToCloud(user.uid, examId, {
            answers,
            checkedQuestions,
            currentQuestionIndex,
            questionTimes: questionTimes.current,
            elapsedBeforeSeconds: getElapsedSeconds(),
            savedAt: Date.now(),
        });
        setCloudSaveState(ok ? 'saved' : 'error');
        // Reset back to idle after 2.5s so the button can be pressed again
        setTimeout(() => setCloudSaveState('idle'), 2500);
    };

    if (isFinished && finalScore) {
        const wrongCount = finalScore.total - finalScore.score;

        // Identify the topics (tags) the student answered worst on.
        // Per-tag: count attempts on that tag + wrong attempts. A tag is
        // "weak" if there were >=2 attempts on it AND >=40% of those were
        // wrong. Top 3 by wrong-rate are surfaced as practice suggestions.
        // No Firestore reads — uses in-memory exam + answers only.
        const weakTopics: { tag: string; wrong: number; total: number; pct: number }[] = (() => {
            if (!showAnswerChecking) return [];
            const stats: Record<string, { wrong: number; total: number }> = {};
            sanitizedExamData.slice(0, finalScore.total).forEach((q, idx) => {
                if (!q.tags || q.tags.length === 0) return;
                const isCorrect = answers[idx] === q.correctIndex;
                q.tags.forEach((tag: string) => {
                    if (!stats[tag]) stats[tag] = { wrong: 0, total: 0 };
                    stats[tag].total++;
                    if (!isCorrect) stats[tag].wrong++;
                });
            });
            return Object.entries(stats)
                .filter(([, s]) => s.total >= 2 && s.wrong / s.total >= 0.4)
                .map(([tag, s]) => ({
                    tag,
                    wrong: s.wrong,
                    total: s.total,
                    pct: Math.round((s.wrong / s.total) * 100),
                }))
                .sort((a, b) => b.pct - a.pct || b.wrong - a.wrong)
                .slice(0, 3);
        })();

        // === Per-question pacing analysis (in-memory times; no Firestore reads) ===
        const paceTarget = (recommendedSecondsPerQuestion && recommendedSecondsPerQuestion > 0)
            ? recommendedSecondsPerQuestion
            : DEFAULT_RECOMMENDED_SECONDS_PER_QUESTION;
        const perQuestionTiming = sanitizedExamData.slice(0, finalScore.total).map((q, idx) => ({
            idx,
            seconds: questionTimes.current[idx] ?? 0,
            answered: answers[idx] !== undefined,
            isCorrect: answers[idx] === q.correctIndex,
        }));
        const timedQuestions = perQuestionTiming.filter(p => p.answered && p.seconds > 0);
        const hasTimingData = timedQuestions.length > 0;
        const attemptAvgPace = hasTimingData
            ? Math.round(timedQuestions.reduce((s, p) => s + p.seconds, 0) / timedQuestions.length)
            : paceTarget;
        const totalTimeSec = finalScore.durationSeconds || 0;
        const avgPaceAll = finalScore.total > 0 ? Math.round(totalTimeSec / finalScore.total) : 0;
        const tooSlowCount = perQuestionTiming.filter(p => p.seconds > 1.5 * paceTarget).length;
        const tooFastCount = perQuestionTiming.filter(p => p.answered && p.seconds > 0 && p.seconds < 0.4 * paceTarget).length;
        const reviewQuestions = perQuestionTiming.filter(p => {
            if (!p.answered || p.seconds <= 0) return false;
            const v = getCombinedVerdict(p.seconds, paceTarget, p.isCorrect, p.answered);
            const selfSlow = p.seconds > 1.5 * attemptAvgPace;
            return v.shouldReview || (selfSlow && !p.isCorrect);
        });
        const pacingSummary = (() => {
            if (avgPaceAll <= paceTarget && finalScore.percent >= 60) return { text: 'จังหวะดีมาก ทำได้รวดเร็วและแม่นยำ 👏', color: 'text-emerald-600 dark:text-emerald-400' };
            if (avgPaceAll <= paceTarget) return { text: 'ทำเร็วแต่ยังพลาดหลายข้อ ลองทบทวนแนวคิดให้แม่นขึ้น', color: 'text-amber-600 dark:text-amber-400' };
            if (avgPaceAll <= 1.5 * paceTarget) return { text: 'จังหวะใกล้เคียงเป้าหมาย ฝึกอีกนิดให้คล่องขึ้น', color: 'text-amber-600 dark:text-amber-400' };
            return { text: 'ใช้เวลามากกว่าเป้าหมาย ลองฝึกความเร็วในข้อที่ช้า', color: 'text-rose-600 dark:text-rose-400' };
        })();

        // === Proficiency level (F1) — accuracy + pace → friendly level ===
        const paceRatio = (paceTarget > 0 && avgPaceAll > 0) ? avgPaceAll / paceTarget : 1;
        const proficiency = getProficiencyLevel(finalScore.percent, paceRatio);

        // === Topic radar (F2) — % correct per tag for this exam ===
        const radarStats: Record<string, { correct: number; total: number }> = {};
        sanitizedExamData.slice(0, finalScore.total).forEach((q, idx) => {
            if (!q.tags || q.tags.length === 0) return;
            const isCorrect = answers[idx] === q.correctIndex;
            q.tags.forEach((tag: string) => {
                if (!radarStats[tag]) radarStats[tag] = { correct: 0, total: 0 };
                radarStats[tag].total++;
                if (isCorrect) radarStats[tag].correct++;
            });
        });
        const radarData = Object.entries(radarStats).map(([tag, s]) => ({ tag, percent: Math.round((s.correct / s.total) * 100) }));
        const radarColors = { grid: isDark ? '#334155' : '#e2e8f0', tick: isDark ? '#cbd5e1' : '#475569', stroke: isDark ? '#a5b4fc' : '#6366f1' };

        return (
            <div className="max-w-4xl mx-auto py-12 px-6">
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl p-8 md:p-12 border border-stone-100 dark:border-slate-700 relative overflow-hidden">
                    <div className={`absolute top-0 inset-x-0 h-60 bg-gradient-to-b ${showAnswerChecking ? finalScore.bgColor : 'from-indigo-500'} opacity-10 -z-10`}></div>

                    <div className={`w-24 h-24 ${showAnswerChecking ? finalScore.bgColor : 'bg-indigo-500'} rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg`}>
                        {showAnswerChecking ? <Trophy size={48} /> : <CheckCircle size={48} />}
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 mb-2 text-center">{showAnswerChecking ? 'ผลการทดสอบ' : 'ส่งคำตอบเรียบร้อย!'}</h2>
                    <p className="text-stone-500 dark:text-slate-400 mb-4 font-medium text-center">ชุดข้อสอบ: {examTitle}</p>

                    {showAnswerChecking ? (
                        <>
                            {/* Score Display */}
                            <div className="flex flex-col items-center mb-10">
                                <div className="relative w-48 h-48 mb-6">
                                    <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-700" />
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${finalScore.percent * 2.83} 283`} className={finalScore.gradeColor.replace('600', '500')} style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className={`text-5xl font-black ${finalScore.gradeColor}`}>{finalScore.percent}%</span>
                                        <span className="text-stone-400 dark:text-slate-500 text-sm font-bold">{finalScore.score}/{finalScore.total} ข้อ</span>
                                    </div>
                                </div>
                                <div className={`px-8 py-3 rounded-2xl ${finalScore.bgColor} text-white font-black text-2xl shadow-lg mb-4`}>Grade {finalScore.grade}</div>
                                <p className={`text-xl font-bold ${finalScore.gradeColor}`}>{finalScore.label}</p>
                            </div>

                            {/* 🎯 ระดับความพร้อม (F1) */}
                            <div className={`mb-10 rounded-3xl border bg-gradient-to-br ${proficiency.bg} p-6 md:p-7 text-center`}>
                                <div className="text-5xl mb-2">{proficiency.emoji}</div>
                                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ระดับความพร้อม</div>
                                <h3 className={`text-2xl md:text-3xl font-black ${proficiency.color} mb-2`}>{proficiency.label}</h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-md mx-auto mb-4">{proficiency.meaning}</p>
                                <div className="inline-flex items-start gap-2 text-left bg-white/70 dark:bg-slate-900/40 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 max-w-md">
                                    <span className="flex-shrink-0">👉</span><span>{proficiency.nextStep}</span>
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-3 gap-4 mb-10 text-center">
                                <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl p-4">
                                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{finalScore.score}</div>
                                    <div className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">ตอบถูก ✓</div>
                                </div>
                                <div className="bg-rose-50 dark:bg-rose-900/30 rounded-2xl p-4">
                                    <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{wrongCount}</div>
                                    <div className="text-rose-600 dark:text-rose-400 text-sm font-medium">ตอบผิด ✗</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-4">
                                    <div className="text-3xl font-black text-slate-600 dark:text-slate-300">{finalScore.total}</div>
                                    <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">ข้อทั้งหมด</div>
                                </div>
                            </div>

                            {/* 📊 เรดาร์จุดแข็ง-จุดอ่อนรายหัวข้อ (F2) */}
                            {radarData.length >= 3 && (
                                <div className="mb-10 rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-6 md:p-8">
                                    <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">📊 จุดแข็ง-จุดอ่อนรายหัวข้อ</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">ยิ่งกางออกไกล = ยิ่งเก่งหัวข้อนั้น (เต็ม 100%)</p>
                                    <TopicRadarChart data={radarData} colors={radarColors} />
                                </div>
                            )}

                            {/* 🏆 อันดับ/เปอร์เซ็นไทล์ (F4) */}
                            {percentile && percentile.count >= 5 && (
                                <div className="mb-10 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/70 to-white dark:from-indigo-900/20 dark:to-slate-800/40 p-6 md:p-8">
                                    <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">🏆 อันดับของคุณ</h3>
                                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                                        คุณทำได้ <span className="text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400 align-middle">เก่งกว่า {percentile.percentile}%</span>{' '}
                                        <span className="text-sm">ของคนที่ทำชุดนี้ ({percentile.count} ครั้ง)</span>
                                    </p>
                                    <ScoreDistributionChart buckets={percentile.buckets} yourBucket={percentile.yourBucket} isDark={isDark} height={150} />
                                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-1">การกระจายคะแนนของทุกคน · <span className="text-amber-500 font-bold">แท่งสีส้ม</span> = ช่วงคะแนนของคุณ ({finalScore.percent}%)</p>
                                </div>
                            )}

                            {/* ⏱️ Pacing Analysis Overview */}
                            {hasTimingData && (
                                <div className="mb-10 rounded-3xl border border-indigo-100 dark:border-slate-700 bg-gradient-to-br from-indigo-50/60 to-white dark:from-slate-800 dark:to-slate-800/40 p-6 md:p-8">
                                    <div className="flex items-start gap-4 mb-5">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-300/50 dark:shadow-indigo-900/50">
                                            <Clock size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 mb-1">ภาพรวมการจับเวลา</h3>
                                            <p className={`text-sm font-bold ${pacingSummary.color}`}>{pacingSummary.text}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                                            <div className="text-2xl font-black tabular-nums text-slate-800 dark:text-slate-100">{formatDuration(totalTimeSec)}</div>
                                            <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">เวลารวม</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                                            <div className={`text-2xl font-black tabular-nums ${avgPaceAll <= paceTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{avgPaceAll} วิ</div>
                                            <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">เฉลี่ย/ข้อ · เป้า {paceTarget} วิ</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                                            <div className={`text-2xl font-black tabular-nums ${tooSlowCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>{tooSlowCount}</div>
                                            <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">ข้อที่ช้าเกินเป้า</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                                            <div className={`text-2xl font-black tabular-nums ${tooFastCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>{tooFastCount}</div>
                                            <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">ข้อที่เร็วผิดปกติ</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ⏱️ Per-question time bar chart */}
                            {hasTimingData && (() => {
                                const maxSec = Math.max(paceTarget, ...perQuestionTiming.map(p => p.seconds), 1);
                                const targetLeft = Math.min(100, (paceTarget / maxSec) * 100);
                                return (
                                    <div className="mb-10 rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-6 md:p-8">
                                        <div className="flex items-center justify-between mb-1 gap-2">
                                            <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100">เวลาที่ใช้รายข้อ</h3>
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 dark:text-indigo-400 flex-shrink-0">
                                                <span className="inline-block w-0.5 h-3 bg-indigo-500/70"></span> เป้า {paceTarget} วิ
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">แท่งยิ่งยาว = ยิ่งใช้เวลามาก · สีบอกความเร็ว · กดที่ข้อเพื่อดูเฉลย</p>
                                        <div className="flex flex-col gap-1.5">
                                            {perQuestionTiming.map((p) => {
                                                const v = getTimeVerdict(p.seconds, paceTarget);
                                                const widthPct = p.seconds > 0 ? Math.max(3, Math.min(100, (p.seconds / maxSec) * 100)) : 0;
                                                return (
                                                    <button
                                                        key={p.idx}
                                                        onClick={() => { setCurrentQuestionIndex(p.idx); setIsFinished(false); }}
                                                        title={getCombinedVerdict(p.seconds, paceTarget, p.isCorrect, p.answered).label}
                                                        className="group flex items-center gap-2 w-full text-left"
                                                    >
                                                        <span className="w-12 sm:w-14 flex-shrink-0 text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums">ข้อ {p.idx + 1}</span>
                                                        <span className="relative flex-1 h-5 rounded-md bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                                                            {p.answered && (
                                                                <span className={`absolute inset-y-0 left-0 ${v.dot} transition-all group-hover:brightness-95`} style={{ width: `${widthPct}%` }}></span>
                                                            )}
                                                            <span className="absolute inset-y-0 w-px bg-indigo-500/70 dark:bg-indigo-400/70" style={{ left: `${targetLeft}%` }}></span>
                                                        </span>
                                                        <span className={`w-12 flex-shrink-0 text-right text-xs font-black tabular-nums ${p.answered ? v.color : 'text-slate-300 dark:text-slate-600'}`}>
                                                            {p.answered ? formatDuration(p.seconds) : '—'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    ) : (
                        <p className="text-indigo-600 dark:text-indigo-400 mb-8 font-bold text-center text-lg">ตอบแล้ว {Object.keys(answers).length}/{finalScore.total} ข้อ — กดที่ข้อใดก็ได้เพื่อดูเฉลยละเอียด</p>
                    )}

                    {/* Up-sell Banner (Trial Mode) */}
                    {isTrial && (
                        <div className="mb-10 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-900/40 dark:via-orange-900/20 dark:to-rose-900/10 border border-amber-200 dark:border-amber-700/50 rounded-3xl p-8 text-center shadow-lg animate-in zoom-in relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <h3 className="text-2xl font-black text-amber-800 dark:text-amber-400 mb-3">ปลดล็อกข้อสอบทั้งหมด แล้วเก่งขึ้นแบบก้าวกระโดด!</h3>
                            <div className="text-amber-700 dark:text-amber-500 mb-5 max-w-lg mx-auto space-y-2 text-left">
                                <p className="flex items-start gap-2"><span>✅</span><span>เข้าถึงข้อสอบ <strong>ทุกชุด ทุกระดับชั้น</strong> พร้อมเฉลยละเอียดทุกข้อ</span></p>
                                <p className="flex items-start gap-2"><span>✅</span><span>ข้อสอบจาก <strong>สนามสอบจริง</strong> ทั้ง O-NET, A-Level, สอบเข้า ม.1</span></p>
                                <p className="flex items-start gap-2"><span>✅</span><span>อัพเดทข้อสอบใหม่ <strong>ต่อเนื่องตลอด</strong> ไม่มีค่าใช้จ่ายเพิ่มเติม</span></p>
                                <p className="flex items-start gap-2"><span>✅</span><span>สมัครครั้งเดียว ใช้ได้ <strong>ยาว 5 ปี</strong> คุ้มค่าที่สุด!</span></p>
                            </div>
                            <a href="/payment?course=vip" className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black py-4 px-10 rounded-full shadow-xl shadow-amber-200 transition-all hover:scale-105 hover:-translate-y-1 active:scale-95 text-lg">
                                ปลดล็อกคลังข้อสอบทั้งหมดเลย
                            </a>
                            <p className="text-xs text-amber-500/80 dark:text-amber-600 mt-3 font-medium">จ่ายครั้งเดียว ไม่มีรายเดือน • เริ่มทำได้ทันทีหลังชำระเงิน</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
                        {showAnswerChecking && wrongCount > 0 && (
                            <button
                                onClick={handleReviewWrongAnswers}
                                className="px-8 py-4 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors flex items-center justify-center gap-2"
                            >
                                📝 ดูข้อที่ผิด ({wrongCount} ข้อ)
                            </button>
                        )}
                        <button
                            onClick={() => { setCurrentQuestionIndex(0); setIsFinished(false); }}
                            className="px-8 py-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                            📝 ดูเฉลยทุกข้อ
                        </button>
                        <button
                            onClick={handleRestart}
                            className="px-8 py-4 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={20} />
                            ทำข้อสอบใหม่
                        </button>
                    </div>

                    {/* Weakness Recommendation */}
                    {weakTopics.length > 0 && (
                        <div className="mb-2 rounded-3xl border-2 border-amber-200 dark:border-amber-700/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 p-6 md:p-8">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-300/50">
                                    <Target size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl md:text-2xl font-black text-amber-800 dark:text-amber-300 mb-1">
                                        หัวข้อที่ควรฝึกเพิ่ม
                                    </h3>
                                    <p className="text-sm text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                                        จากข้อที่ตอบผิด — หัวข้อพวกนี้อ่อนสุด ลองคลิกฝึกเพิ่มได้เลยครับ
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {weakTopics.map((t) => (
                                    <Link
                                        key={t.tag}
                                        href={`/exam/practice?q=${encodeURIComponent(t.tag)}`}
                                        className="group inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/60 shadow-sm hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500 hover:-translate-y-0.5 transition-all"
                                    >
                                        <span className="font-bold text-amber-700 dark:text-amber-300">{t.tag}</span>
                                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full">
                                            ผิด {t.wrong}/{t.total}
                                        </span>
                                        <span className="text-xs text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            ฝึกต่อ →
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ⏱️ Questions to review — slow+wrong, or unusually slow for this attempt */}
                    {showAnswerChecking && reviewQuestions.length > 0 && (
                        <div className="mt-2 rounded-3xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-900/10 p-6 md:p-8">
                            <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                                <Clock size={20} className="text-rose-500" /> ข้อที่ควรทบทวน (เรื่องเวลา)
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">ข้อที่ใช้เวลามากผิดปกติ หรือช้าแล้วยังตอบผิด — คลิกเพื่อดูเฉลย</p>
                            <div className="flex flex-col gap-2">
                                {reviewQuestions.map((p) => {
                                    const cv = getCombinedVerdict(p.seconds, paceTarget, p.isCorrect, p.answered);
                                    return (
                                        <button
                                            key={p.idx}
                                            onClick={() => { setCurrentQuestionIndex(p.idx); setIsFinished(false); }}
                                            className="group flex items-center justify-between gap-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-3 text-left shadow-sm hover:shadow-md hover:border-rose-300 dark:hover:border-rose-700 transition-all"
                                        >
                                            <span className="flex items-center gap-3 min-w-0">
                                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-black text-slate-600 dark:text-slate-300">{p.idx + 1}</span>
                                                <span className={`text-sm font-bold truncate ${cv.color}`}>{cv.label}</span>
                                            </span>
                                            <span className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-sm font-black tabular-nums text-slate-700 dark:text-slate-200">{formatDuration(p.seconds)}</span>
                                                <span className="text-xs text-slate-400 group-hover:text-rose-500 transition-colors">ดู →</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Question Map with Results */}
                <div className="mt-8 bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4">แผนที่ข้อสอบ{showAnswerChecking ? ' - ผลลัพธ์' : ''}</h3>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {sanitizedExamData.slice(0, finalScore.total).map((q, idx) => {
                            const isUnanswered = answers[idx] === undefined;
                            const isCorrect = !isUnanswered && answers[idx] === q.correctIndex;
                            const secs = questionTimes.current[idx] ?? 0;
                            const tv = getTimeVerdict(secs, paceTarget);

                            let btnClass: string;
                            let content: React.ReactNode = idx + 1;

                            if (showAnswerChecking && !isUnanswered) {
                                btnClass = isCorrect
                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                                    : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-700";
                                content = isCorrect ? "✓" : "✗";
                            } else if (isUnanswered) {
                                btnClass = "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600";
                            } else {
                                btnClass = "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700";
                            }

                            const cellTitle = isUnanswered
                                ? "ไม่ได้ตอบ"
                                : showAnswerChecking
                                    ? `ข้อ ${idx + 1} · ${formatDuration(secs)} · ${getCombinedVerdict(secs, paceTarget, isCorrect, true).label}`
                                    : `ข้อ ${idx + 1} · ${formatDuration(secs)}`;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => { setCurrentQuestionIndex(idx); setIsFinished(false); }}
                                    className={`relative aspect-square rounded-lg flex flex-col items-center justify-center border transition-all hover:scale-105 ${btnClass}`}
                                    title={cellTitle}
                                >
                                    {secs > 0 && !isUnanswered && (
                                        <span className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${tv.dot}`} />
                                    )}
                                    <span className="text-sm font-bold leading-none">{content}</span>
                                    {secs > 0 && (
                                        <span className="mt-0.5 text-[9px] font-semibold leading-none tabular-nums opacity-70">{formatDuration(secs)}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Empty exam (no questions, or all filtered out as corrupt)
    if (totalQuestions === 0 || !currentQuestion) {
        return (
            <div className="max-w-2xl mx-auto py-20 px-6 text-center">
                <div className="text-5xl mb-4">📄</div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">ยังไม่มีข้อสอบในชุดนี้</h2>
                <p className="text-slate-500 dark:text-slate-400">ขออภัยครับ ข้อสอบชุดนี้ยังไม่พร้อมใช้งาน กรุณาเลือกชุดอื่นก่อน</p>
            </div>
        );
    }

    // ... (rest) ...

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 font-sans flex flex-col lg:flex-row gap-8 items-start">

            {/* Paused overlay — the clock is frozen; questions are hidden so the
                student can truly rest, use the bathroom or grab a snack. */}
            {isPaused && !finalScore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6 animate-in fade-in">
                    <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-100 dark:border-slate-700 px-8 py-10 text-center">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                            <Coffee size={30} className="text-amber-500 dark:text-amber-400" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">พักก่อนได้เลย</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">เวลาหยุดเดินแล้ว ไปเข้าห้องน้ำ ดื่มน้ำ หรือกินขนมได้ตามสบาย</p>
                        <p className="text-lg font-black tabular-nums text-slate-700 dark:text-slate-200 mb-6">
                            {isCountdown
                                ? `เวลาคงเหลือ ${formatDuration(getCountdownState(getElapsedSeconds(), timeLimitMinutes ?? 0).remainingSeconds)}`
                                : `เวลาที่ใช้ไป ${formatDuration(getElapsedSeconds())}`}
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

            {/* Sidebar: Question Grid (Desktop) */}
            <div className="hidden lg:block w-72 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 sticky top-24">
                {isTrial && (
                    <div className="mb-4 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-2 rounded-xl text-center border border-amber-100 dark:border-amber-800 w-full animate-pulse">
                        โหมดให้ทดลองทำฟรี 5 ข้อ 🔓
                    </div>
                )}
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center justify-between">
                    <span>แผนที่ข้อสอบ</span>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500 dark:text-slate-400">{currentQuestionIndex + 1}/{totalQuestions}</span>
                </h3>
                <div className="grid grid-cols-5 gap-2">
                    {sanitizedExamData.map((q, idx) => {
                        const isAnswered = answers[idx] !== undefined;
                        const isCurrent = currentQuestionIndex === idx;
                        const isChecked = checkedQuestions[idx];
                        const isCorrect = isChecked && isAnswered && answers[idx] === q.correctIndex;
                        const isWrong = isChecked && isAnswered && answers[idx] !== q.correctIndex;

                        let btnClass = "bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 border-transparent"; // Default
                        let content: React.ReactNode = idx + 1;

                        if (isChecked) {
                            if (showAnswerChecking && isCorrect) {
                                btnClass = "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold border-emerald-300 dark:border-emerald-700";
                                content = "✓";
                            } else if (showAnswerChecking && isWrong) {
                                btnClass = "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold border-rose-300 dark:border-rose-700";
                                content = "✗";
                            } else {
                                btnClass = "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold border-indigo-200 dark:border-indigo-700";
                            }
                        } else if (isAnswered) {
                            btnClass = "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold border-blue-200 dark:border-blue-700";
                        }

                        if (isCurrent) btnClass += " ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-slate-800 z-10";

                        return (
                            <button
                                key={idx}
                                onClick={() => goToQuestion(idx)}
                                className={`aspect-square rounded-lg text-sm flex items-center justify-center transition-all border ${btnClass}`}
                            >
                                {isTrial && idx >= 5 ? <Lock size={14} className="opacity-50" /> : content}
                            </button>
                        );
                    })}
                </div>

                {/* Clear Progress Button (Desktop Sidebar) */}
                {Object.keys(answers).length > 0 && !isTrial && (
                    <button
                        onClick={handleClearProgress}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all"
                    >
                        <Trash2 size={14} />
                        ล้างคำตอบ ทำใหม่
                    </button>
                )}

                {/* Save-to-cloud (cross-device resume). Logged-in only, not in trial */}
                {user?.uid && Object.keys(answers).length > 0 && !isTrial && !isFinished && (
                    <button
                        onClick={handleSaveToCloud}
                        disabled={cloudSaveState === 'saving'}
                        title="บันทึกไปทำต่อบนอุปกรณ์อื่น (เก็บไว้ 72 ชั่วโมง)"
                        className={`mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            cloudSaveState === 'saved'
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                                : cloudSaveState === 'error'
                                ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800'
                                : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-60'
                        }`}
                    >
                        {cloudSaveState === 'saved' ? (
                            <>
                                <CloudCheck size={14} />
                                บันทึกแล้ว
                            </>
                        ) : cloudSaveState === 'error' ? (
                            <>
                                <Cloud size={14} />
                                บันทึกไม่สำเร็จ
                            </>
                        ) : (
                            <>
                                <Cloud size={14} />
                                {cloudSaveState === 'saving' ? 'กำลังบันทึก...' : 'บันทึกไปทำต่ออุปกรณ์อื่น'}
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 w-full max-w-4xl">
                {/* Restored Progress Banner */}
                {wasRestored && (
                    <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl animate-in slide-in-from-top-2">
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                            {restoredFromCloud ? <CloudCheck size={16} /> : "✅"}
                            {restoredFromCloud
                                ? `ดึงคำตอบจากอุปกรณ์อื่น ${Object.keys(answers).length} ข้อ — ทำต่อได้เลย`
                                : `กลับมาทำต่อได้เลย — คำตอบที่ทำไว้ ${Object.keys(answers).length} ข้อถูกกู้คืนแล้ว`}
                        </p>
                        <button
                            onClick={() => setWasRestored(false)}
                            className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 text-lg font-bold px-1"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Countdown low-time warning */}
                {!finalScore && isCountdown && (() => {
                    const cd = getCountdownState(getElapsedSeconds(), timeLimitMinutes ?? 0);
                    if (cd.warnLevel === 'none') return null;
                    const crit = cd.warnLevel === 'critical';
                    return (
                        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-2xl border animate-in slide-in-from-top-2 ${crit ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'}`}>
                            <AlertTriangle size={16} className={`flex-shrink-0 ${crit ? 'animate-pulse' : ''}`} />
                            <p className="text-sm font-bold">เหลือเวลาอีก {formatDuration(cd.remainingSeconds)} — ระบบจะส่งคำตอบให้อัตโนมัติเมื่อหมดเวลา</p>
                        </div>
                    );
                })()}

                {/* Top Bar: Progress & Title (Mobile Only Grid Toggle) */}
                <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <Award className="text-amber-500" />
                            {examTitle}
                        </h1>
                        <p className="text-stone-500 dark:text-slate-400 text-sm mt-1 pl-1 flex items-center gap-2">
                            ทดสอบวัดระดับความรู้คณิตศาสตร์
                            {isTrial && (
                                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-bold">
                                    ให้ลองทำฟรี 5 ข้อ
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Live timer — countdown (timed mode) or count-up — hidden once finished */}
                    {!finalScore && (() => {
                        const cd = isCountdown ? getCountdownState(getElapsedSeconds(), timeLimitMinutes ?? 0) : null;
                        const critical = cd?.warnLevel === 'critical';
                        const warn = cd?.warnLevel === 'warn';
                        const shellCls = critical
                            ? 'border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/30 dark:to-slate-800/60'
                            : warn
                                ? 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800/60'
                                : 'border-indigo-100 dark:border-slate-700 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-800/60';
                        const iconWrapCls = critical ? 'bg-rose-500/10 dark:bg-rose-500/20' : warn ? 'bg-amber-500/10 dark:bg-amber-500/20' : 'bg-indigo-500/10 dark:bg-indigo-500/20';
                        const iconCls = critical ? 'text-rose-500 dark:text-rose-400' : warn ? 'text-amber-500 dark:text-amber-400' : 'text-indigo-500 dark:text-indigo-400';
                        const valueCls = critical ? 'text-rose-600 dark:text-rose-400' : warn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100';
                        const pausedShell = 'border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/60';
                        return (
                            <div className={`flex items-center gap-2.5 self-start md:self-auto rounded-2xl border px-3 py-2.5 shadow-sm ${isPaused ? pausedShell : shellCls}`}>
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isPaused ? 'bg-slate-500/10 dark:bg-slate-500/20' : iconWrapCls}`}>
                                    {isPaused
                                        ? <Coffee size={18} className="text-slate-500 dark:text-slate-400" />
                                        : critical
                                            ? <AlertTriangle size={18} className={`${iconCls} animate-pulse`} />
                                            : <Clock size={18} className={`${iconCls} animate-pulse`} />}
                                </div>
                                <div className="leading-tight">
                                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{isPaused ? 'พักอยู่' : isCountdown ? 'เวลาคงเหลือ' : 'เวลาที่ใช้'}</div>
                                    <div className={`text-xl font-black tabular-nums ${isPaused ? 'text-slate-500 dark:text-slate-400' : valueCls} ${critical && !isPaused ? 'animate-pulse' : ''}`}>
                                        {isCountdown && cd ? formatDuration(cd.remainingSeconds) : formatDuration(getElapsedSeconds())}
                                    </div>
                                </div>
                                <button
                                    onClick={togglePause}
                                    aria-label={isPaused ? 'เล่นต่อ' : 'หยุดพักชั่วคราว'}
                                    className={`ml-1 flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors ${isPaused
                                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'}`}
                                >
                                    {isPaused ? <><Play size={16} /> เล่นต่อ</> : <><Pause size={16} /> พัก</>}
                                </button>
                            </div>
                        );
                    })()}

                    {/* Mobile Progress & Grid Toggle */}
                    <div className="w-full md:w-48 lg:hidden">
                        <div className="flex justify-between text-xs font-bold text-stone-400 dark:text-slate-500 mb-2">
                            <span>ความคืบหน้า</span>
                            <span>{Math.round((Object.keys(answers).length / totalQuestions) * 100)}%</span>
                        </div>
                        <div className="h-2 w-full bg-stone-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 ease-out"
                                style={{ width: `${(Object.keys(answers).length / totalQuestions) * 100}%` }}
                            ></div>
                        </div>
                        <div className="flex items-center justify-between">
                            {Object.keys(answers).length > 0 && !isTrial && (
                                <button
                                    onClick={handleClearProgress}
                                    className="text-xs text-rose-500 font-bold flex items-center gap-1"
                                >
                                    <Trash2 size={12} /> ล้างคำตอบ
                                </button>
                            )}
                            <button onClick={() => setShowGrid(!showGrid)} className="text-xs text-indigo-500 font-bold ml-auto">
                                {showGrid ? "ซ่อนแผนที่ข้อสอบ" : "ดูแผนที่ข้อสอบ"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Live pacing bar — on-pace vs behind (works in both timed & count-up modes) */}
                {!finalScore && totalQuestions > 0 && getElapsedSeconds() > 3 && (() => {
                    const answeredCount = Object.keys(answers).length;
                    const totalAnswerable = isTrial ? Math.min(5, totalQuestions) : totalQuestions;
                    const pace = getPaceStatus({
                        answeredCount,
                        totalAnswerable,
                        elapsedSeconds: getElapsedSeconds(),
                        timedMode: isCountdown,
                        timeLimitSeconds,
                        recommendedSecondsPerQuestion: recommendedSecondsPerQuestion ?? DEFAULT_RECOMMENDED_SECONDS_PER_QUESTION,
                    });
                    return (
                        <div className="mb-6 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-4 py-3 shadow-sm">
                            <div className="flex items-center justify-between mb-2 gap-2">
                                <span className={`text-sm font-bold flex items-center gap-1.5 ${pace.color}`}>
                                    <Target size={14} /> {pace.label}
                                </span>
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums">ตอบแล้ว {answeredCount}/{totalAnswerable}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${pace.barColor} rounded-full transition-all duration-500 ease-out`}
                                    style={{ width: `${Math.round(pace.progressRatio * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })()}

                {/* Mobile Grid Dropdown */}
                {showGrid && (
                    <div className="lg:hidden mb-6 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                            {Array.from({ length: totalQuestions }).map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { goToQuestion(idx); setShowGrid(false); }}
                                    className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center border
                                        ${currentQuestionIndex === idx ? 'ring-2 ring-amber-400 ring-offset-2 z-10 border-transparent' : ''}
                                        ${answers[idx] !== undefined ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-600'}
                                    `}
                                >
                                    {isTrial && idx >= 5 ? <Lock size={14} className="opacity-50" /> : idx + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div ref={questionCardRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[400px] scroll-mt-4">
                    {isTrial && currentQuestionIndex >= 5 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 border-2 border-amber-200 dark:border-amber-900/50 shadow-xl flex flex-col items-center justify-center text-center h-full min-h-[400px] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"></div>
                            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-100/50 dark:bg-amber-900/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-200 dark:shadow-amber-900/50">
                                <Lock size={36} />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 mb-4">อยากเก่งคณิตศาสตร์กว่านี้ไหมครับ? 🚀</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-3 max-w-lg font-medium leading-relaxed text-lg text-balance">
                                ข้อสอบชุดนี้มี <strong className="text-amber-600 dark:text-amber-400">{totalQuestions} ข้อ</strong> เป็นเพียงแค่ 1 ในหลายๆ ชุดจากคลังข้อสอบของเรา — คุณเพิ่งทดลองทำไปแค่ 5 ข้อเองครับ!
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 mb-6 max-w-md w-full text-left space-y-4">
                                <p className="flex items-start gap-3">
                                    <span className="text-xl mt-0.5">💰</span>
                                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                                        <strong className="text-amber-600 dark:text-amber-400">ประหยัดเงินกว่าเห็นๆ:</strong> เทียบเท่าซื้อหนังสือแค่ 1 เล่ม แต่ได้ <strong>"แนวข้อสอบนับพันข้อ"</strong> จากสนามจริงทุกระดับชั้น
                                    </span>
                                </p>
                                <p className="flex items-start gap-3">
                                    <span className="text-xl mt-0.5">🎒</span>
                                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                                        <strong className="text-amber-600 dark:text-amber-400">เบากว่า พกพาง่าย:</strong> ย่อหนังสือหนากว่า 10 เล่ม ไว้ในสมาร์ทโฟน ทำโจทย์ได้ทุกที่ทุกเวลา หยิบขึ้นมาอัปเลเวลสมองได้ทันที
                                    </span>
                                </p>
                                <p className="flex items-start gap-3">
                                    <span className="text-xl mt-0.5">🧠</span>
                                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                                        <strong className="text-amber-600 dark:text-amber-400">เข้าใจลึกซึ้ง ไม่ทิ้งให้งง:</strong> ทำผิดไม่ต้องกลัว! มี <strong>"เฉลยละเอียดแบบ Step-by-step"</strong> อธิบายทีละบรรทัด เหมือนมีครูมานั่งสอนอยู่ข้างๆ
                                    </span>
                                </p>
                                <p className="flex items-start gap-3">
                                    <span className="text-xl mt-0.5">⏳</span>
                                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                                        <strong className="text-amber-600 dark:text-amber-400">จ่ายครั้งเดียว... ใช้ยาว 5 ปี!:</strong> ไม่มีรายเดือน อัปเดตข้อสอบใหม่ฟรีตลอด คลังข้อสอบของเราคือ <strong>"หนังสือที่ไม่มีวันจบ"</strong>
                                    </span>
                                </p>
                            </div>

                            {/* Price Banner */}
                            <div className="mb-5 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-rose-900/10 border-2 border-amber-300 dark:border-amber-700 rounded-2xl px-6 py-5 max-w-md w-full relative overflow-hidden">
                                <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl rounded-tr-xl">ลดพิเศษ!</div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-1 text-center">สมัครคลังข้อสอบวันนี้</p>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-slate-400 line-through text-xl font-bold">฿990</span>
                                    <span className="text-4xl font-black bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">฿590</span>
                                </div>
                                <p className="text-amber-600 dark:text-amber-400 text-xs font-bold text-center mt-1">ประหยัดไปถึง 40% 🔥</p>
                            </div>
                            
                            <div className="mb-4 text-rose-500/90 dark:text-rose-400 text-sm font-bold animate-pulse text-balance">
                                🔥 คู่แข่งกำลังซุ่มฝึกอยู่... อย่ารอช้านะครับ!
                            </div>

                            <a href="/payment?course=vip" className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black py-4 px-10 rounded-full shadow-xl shadow-amber-200/80 dark:shadow-amber-900/50 transition-all hover:scale-105 hover:-translate-y-1 active:scale-95 text-lg w-full sm:w-auto">
                                🔓 ปลดล็อกข้อสอบทั้งหมด
                            </a>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 font-medium">ข้อสอบอัปเดตใหม่ฟรีตลอดกาล • ไม่มีค่าใช้จ่ายเพิ่ม</p>
                        </div>
                    ) : (
                        <QuestionErrorBoundary
                            resetKey={currentQuestionIndex}
                            onSkip={handleNext}
                            canSkip={currentQuestionIndex < totalQuestions - 1}
                        >
                            <QuestionCard
                                key={currentQuestion.id ?? safeIndex}
                                question={currentQuestion}
                                questionNumber={currentQuestionIndex + 1}
                                totalQuestions={totalQuestions}
                                selectedOption={answers[currentQuestionIndex] ?? null}
                                onSelectOption={handleSelectOption}
                                isSubmitted={!!checkedQuestions[currentQuestionIndex]}
                                showAnswerChecking={showAnswerChecking}
                                isQuestionSaved={examId ? savedQ.isSaved(examId, currentQuestionIndex) : false}
                                onToggleSaveQuestion={examId ? () => savedQ.toggleSaveQuestion(
                                    examId,
                                    examTitle,
                                    currentQuestionIndex,
                                    currentQuestion,
                                    category,
                                    level,
                                ) : undefined}
                            />
                        </QuestionErrorBoundary>
                    )}
                </div>

                {/* Control Bar */}
                <div className="mt-8 flex items-center justify-between">
                    <button
                        onClick={handlePrev}
                        disabled={currentQuestionIndex === 0}
                        className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${currentQuestionIndex === 0
                            ? 'opacity-0 pointer-events-none'
                            : 'text-stone-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-700'
                            }`}
                    >
                        <ChevronLeft size={20} />
                        <span className="hidden sm:inline">ข้อก่อนหน้า</span>
                    </button>

                    <div className="flex gap-3">
                        {/* Check Answer Button (Restored) */}
                        {!checkedQuestions[currentQuestionIndex] && !(isTrial && currentQuestionIndex >= 5) && (
                            <button
                                onClick={handleCheckAnswer}
                                className={`px-4 sm:px-6 py-3 rounded-full font-bold text-sm sm:text-base border-2 transition-all ${answers[currentQuestionIndex] !== undefined
                                    ? 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'
                                    : 'border-amber-100 text-amber-600 hover:bg-amber-50'
                                    }`}
                            >
                                {answers[currentQuestionIndex] !== undefined ? "ตรวจข้อนี้" : "ดูเฉลย"}
                            </button>
                        )}

                        {/* Submit Button - always visible when at least 1 answer */}
                        {Object.keys(answers).length > 0 && !isTrial && (
                            <button
                                onClick={() => handleFinishExam(false)}
                                className="px-5 sm:px-6 py-3 rounded-full font-bold text-white bg-green-600 shadow-lg hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 transition-all transform active:scale-95 flex items-center gap-2 text-sm sm:text-base"
                            >
                                <CheckCircle size={18} />
                                <span className="hidden sm:inline">{showAnswerChecking ? `ส่งคำตอบและวิเคราะห์ผล (${Object.keys(answers).length}/${totalQuestions})` : `ส่งคำตอบ (${Object.keys(answers).length}/${totalQuestions})`}</span>
                                <span className="sm:hidden">{showAnswerChecking ? `ส่ง & วิเคราะห์ (${Object.keys(answers).length})` : `ส่ง (${Object.keys(answers).length})`}</span>
                            </button>
                        )}

                        {/* Next Button */}
                        {currentQuestionIndex < totalQuestions - 1 && (
                            <button
                                onClick={handleNext}
                                className="px-6 sm:px-8 py-3 rounded-full font-bold text-white bg-slate-800 shadow-lg hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all transform active:scale-95 flex items-center gap-2"
                            >
                                <span className="hidden sm:inline">ข้อถัดไป</span>
                                <span className="sm:hidden">ถัดไป</span>
                                <ChevronRight size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
