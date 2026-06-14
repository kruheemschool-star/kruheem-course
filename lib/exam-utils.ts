import { ExamQuestion } from '@/types/exam';
import { detectTagsFromQuestion } from '@/lib/tag-detector';

// Thai letter to 0-based index mapping
export const thaiToIdx = (val: any): number | null => {
    if (typeof val !== 'string') return null;
    const map: Record<string, number> = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
    const m = val.trim().match(/([\u0e01\u0e02\u0e04\u0e07])/);
    return m && map[m[1]] !== undefined ? map[m[1]] : null;
};

// Extended Thai letter to index — also matches "ก." / "ข้อ ก" patterns
export const thaiLetterToIndex = (val: any): number | null => {
    if (typeof val !== 'string') return null;
    const s = val.trim();
    const map: Record<string, number> = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
    const letterMatch = s.match(/^[ข้อ]*\s*([\u0e01\u0e02\u0e04\u0e07])[\s\.\)]/)
        || s.match(/^([\u0e01\u0e02\u0e04\u0e07])$/);
    if (letterMatch && map[letterMatch[1]] !== undefined) return map[letterMatch[1]];
    return null;
};

// Extract stated correct answer from explanation text (returns 0-based index or null)
// Strips LaTeX before matching to avoid false positives
export const extractAnswerFromExplanation = (explanation: string): number | null => {
    if (!explanation || typeof explanation !== 'string') return null;
    const clean = explanation
        .replace(/\\\[[\s\S]*?\\\]/g, '')
        .replace(/\$\$[\s\S]*?\$\$/g, '')
        .replace(/\\\([\s\S]*?\\\)/g, '')
        .replace(/\$[^$]+\$/g, '')
        .replace(/\*\*/g, '');
    // Number patterns: "คำตอบ: ข้อ 2", "เฉลย: ข้อ 3", "ดังนั้น ข้อ 1"
    const numberPatterns = [
        /คำตอบ\s*:?\s*ข้อ\s*(\d)/,
        /คำตอบคือ\s*ข้อ\s*(\d)/,
        /คำตอบที่ถูกต้อง\s*(?:คือ)?\s*:?\s*ข้อ\s*(\d)/,
        /เฉลย\s*:?\s*ข้อ\s*(\d)/,
        /ตอบ\s*ข้อ\s*(\d)/,
        /ข้อที่ถูกต้อง\s*(?:คือ)?\s*:?\s*(?:ข้อ\s*)?(\d)/,
        /ดังนั้น\s*ข้อ\s*(\d)/,
        /ตอบข้อ\s*(\d)/,
    ];
    for (const pattern of numberPatterns) {
        const match = clean.match(pattern);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= 1 && num <= 4) return num - 1;
        }
    }
    // Thai letter patterns: "คำตอบ ก", "เฉลย ข"
    // IMPORTANT: Use ข้อ prefix to avoid capturing ข in ข้อ
    const thaiMap: Record<string, number> = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
    const thaiLetterPatterns = [
        /คำตอบ\s*:?\s*ข้อ\s*([กคง])/,
        /เฉลย\s*:?\s*ข้อ\s*([กคง])/,
        /คำตอบ\s*:?\s*([กขคง])(?!้)/,
        /เฉลย\s*:?\s*([กขคง])(?!้)/,
    ];
    for (const pattern of thaiLetterPatterns) {
        const match = clean.match(pattern);
        if (match && thaiMap[match[1]] !== undefined) return thaiMap[match[1]];
    }
    return null;
};

// SINGLE source of truth for "is this question renderable/scoreable?".
// Used by: runtime sanitize + scoring (sanitizeExamData below), the admin
// editor save guard (app/admin/exams/[id]/page.tsx), the audit cleanup
// tool (app/admin/exams/audit/page.tsx), and SEO/JSON-LD counts
// (app/exam/[id]/page.tsx). Changing it affects ALL of them at once.
//
// Deliberately permissive: a question is valid if it has ANY of a text
// prompt, options, or media (image/svg). This must NOT be tightened to
// match bulkImportQuestions' stricter `options.length >= 2` import-time
// check, or legitimate image-only / in-progress questions would be
// destroyed by the save guard and the cleanup tool.
export const isValidExamQuestion = (q: any): boolean => {
    if (!q || typeof q !== 'object') return false;
    const hasQuestion = typeof q.question === 'string' && q.question.trim() !== '';
    const hasOptions = Array.isArray(q.options) && q.options.length > 0;
    const hasMedia = (typeof q.image === 'string' && q.image.trim() !== '')
        || (typeof q.svg === 'string' && q.svg.trim() !== '');
    return hasQuestion || hasOptions || hasMedia;
};

// Count only the questions a learner can actually see/answer.
export const getValidQuestionCount = (questions: any): number =>
    Array.isArray(questions) ? questions.filter(isValidExamQuestion).length : 0;

// ── Fill-in (เติมคำ) support ──────────────────────────────────────────────
// A question is "fill-in" when it explicitly sets type:'fill', OR it carries an
// accepted-answers list and has no multiple-choice options. Everything else is MCQ.
export const isFillQuestion = (q: any): boolean =>
    !!q && typeof q === 'object' && (
        q.type === 'fill' ||
        (Array.isArray(q.answers) && q.answers.length > 0 && !(Array.isArray(q.options) && q.options.length > 0))
    );

// Normalize a typed answer for forgiving comparison: trim, lowercase, convert
// Thai digits (๐-๙) → Arabic (0-9), and drop spaces / commas / currency that a
// student might add (e.g. "1,000,000 บาท" === "1000000").
export const normalizeFillAnswer = (s: any): string => {
    if (s == null) return '';
    let t = String(s).trim().toLowerCase();
    t = t.replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0e50)); // ๐-๙ → 0-9
    t = t.replace(/\s+/g, '').replace(/,/g, '').replace(/฿/g, '').replace(/บาท/g, '');
    return t;
};

// True when the typed answer matches ANY accepted answer after normalization.
export const isFillCorrect = (userText: any, acceptedAnswers: any): boolean => {
    if (!Array.isArray(acceptedAnswers) || acceptedAnswers.length === 0) return false;
    const u = normalizeFillAnswer(userText);
    if (!u) return false;
    return acceptedAnswers.some((a) => normalizeFillAnswer(a) === u);
};

// Sanitize exam data: per-question bounds checking + explanation cross-check
// CRITICAL: explanation answer ALWAYS wins over any stored field
//
// Also guards against corrupt records: completely empty questions
// (no prompt, no options, no media — e.g. `{ correctIndex: 0, options: [] }`)
// are dropped, because they (a) crash the renderer when `.question` is
// undefined and (b) distort scoring by inflating the total count.
// Surviving questions get their `question`/`options` coerced to safe
// types so a partially-malformed record renders instead of throwing.
export const sanitizeExamData = (examData: ExamQuestion[]): ExamQuestion[] => {
    if (!Array.isArray(examData)) return [];

    return examData
        .filter(isValidExamQuestion)
        .map((q: any) => {
            // Normalize field types so a partially-malformed question still
            // renders instead of throwing (e.g. question/options not strings).
            const safeQuestion = typeof q.question === 'string'
                ? q.question
                : (q.question == null ? '' : String(q.question));

            // Fill-in (เติมคำ): no options/index to bounds-check — keep the
            // accepted-answers list intact and leave the rest untouched.
            if (isFillQuestion(q)) {
                return {
                    ...q,
                    type: 'fill',
                    question: safeQuestion,
                    answers: Array.isArray(q.answers) ? q.answers.map((a: any) => (typeof a === 'string' ? a : String(a ?? ''))) : [],
                };
            }

            const safeOptions = Array.isArray(q.options)
                ? q.options.map((o: any) => (typeof o === 'string' ? o : (o == null ? '' : String(o))))
                : [];

            const optLen = safeOptions.length || 4;

            // Step 1: Try explanation FIRST — most reliable source of truth
            const explAnswer = extractAnswerFromExplanation(q.explanation || q.solution || '');
            if (explAnswer !== null && explAnswer >= 0 && explAnswer < optLen) {
                return { ...q, question: safeQuestion, options: safeOptions, correctIndex: explAnswer, answerIndex: explAnswer };
            }

            // Step 2: Fallback to stored fields if no explanation match
            const raw = q.answerIndex ?? q.correctIndex ?? q.correctAnswer ?? 0;
            let idx: number;
            const thIdx = thaiToIdx(raw);
            if (thIdx !== null) {
                idx = thIdx;
            } else {
                idx = Number(raw);
                if (isNaN(idx)) idx = 0;
            }

            // Step 3: Bounds check — 1-based → 0-based
            if (idx >= optLen && idx > 0) idx = idx - 1;
            if (idx < 0 || idx >= optLen) idx = 0;

            return { ...q, question: safeQuestion, options: safeOptions, correctIndex: idx, answerIndex: idx };
        });
};

// Transform external exam format to internal format (used in admin import)
export const transformExamQuestion = (q: any) => {
    // Fill-in (เติมคำ): no options / no correct index — preserve the accepted
    // answers list verbatim and skip all the MCQ answer-resolution below.
    if (isFillQuestion(q)) {
        return {
            type: 'fill' as const,
            question: q.question || "",
            image: q.image,
            svg: q.svg,
            answers: Array.isArray(q.answers) ? q.answers.map((a: any) => String(a)) : [],
            explanation: q.solution || q.explanation || "",
            tags: Array.isArray(q.tags) ? q.tags : (q.space ? [q.space] : []),
            suggestedTags: [],
        };
    }

    let answerIndex = q.answerIndex ?? q.correctIndex ?? 0;
    if (q.answer && typeof q.answer === 'string') {
        // Try number format first: "1. ...", "2. ..."
        const numberMatch = q.answer.match(/^([1-4])\s*\./);
        if (numberMatch) {
            answerIndex = parseInt(numberMatch[1]) - 1;
        } else {
            // Try Thai letter format: "ก. ...", "ข. ...", "ข้อ ก", etc.
            const thaiIdx = thaiLetterToIndex(q.answer);
            if (thaiIdx !== null) answerIndex = thaiIdx;
        }
    }
    // Also check correctAnswer field for Thai letters
    if (q.correctAnswer && typeof q.correctAnswer === 'string') {
        const thaiIdx = thaiLetterToIndex(q.correctAnswer);
        if (thaiIdx !== null) answerIndex = thaiIdx;
    }
    // If answerIndex is a Thai letter string
    const thaiFromIndex = thaiLetterToIndex(String(answerIndex));
    if (thaiFromIndex !== null) answerIndex = thaiFromIndex;

    answerIndex = Number(answerIndex);
    if (isNaN(answerIndex)) answerIndex = 0;
    const optionsLength = q.options?.length || 4;
    if (answerIndex < 0 || answerIndex >= optionsLength) {
        answerIndex = 0;
    }

    // Cross-check: if explanation clearly states a different answer, trust the explanation
    const explanation = q.solution || q.explanation || "";
    const explAnswer = extractAnswerFromExplanation(explanation);
    if (explAnswer !== null && explAnswer !== answerIndex) {
        console.warn(`⚠️ Answer mismatch fixed: index=${answerIndex} → explanation says ${explAnswer}`);
        answerIndex = explAnswer;
    }

    // Auto-append answer badge if explanation doesn't already state the answer clearly
    let finalExplanation = explanation;
    if (finalExplanation && typeof finalExplanation === 'string') {
        const existingAnswer = extractAnswerFromExplanation(finalExplanation);
        if (existingAnswer === null) {
            finalExplanation = finalExplanation.trimEnd() + `\n\n**คำตอบ: ข้อ ${answerIndex + 1}**`;
        }
    }

    // Build base question for tag detection
    const baseQuestion: ExamQuestion = {
        id: q.id || 0,
        question: q.question || "",
        options: q.options || [],
        correctIndex: answerIndex,
        explanation: finalExplanation,
    };

    // Auto-detect tags if none provided
    const existingTags: string[] = q.tags || (q.space ? [q.space] : []);
    let finalTags = existingTags;
    let suggestedTags: string[] = [];

    if (existingTags.length === 0) {
        const detected = detectTagsFromQuestion(baseQuestion);
        finalTags = detected.map(d => d.tag);
        suggestedTags = finalTags;
    } else {
        // Still detect for suggestions, but keep existing tags
        const detected = detectTagsFromQuestion(baseQuestion);
        suggestedTags = detected.map(d => d.tag).filter(t => !existingTags.includes(t));
    }

    return {
        type: 'choice' as const,
        question: q.question || "",
        image: q.image,
        svg: q.svg,
        options: q.options || [],
        correctIndex: answerIndex,
        explanation: finalExplanation,
        tags: finalTags,
        suggestedTags,
    };
};

/* ============================================================
   Timing helpers — exam stopwatch + per-question pacing analysis.
   Pure functions (no React / Firestore) so they're reusable from
   ExamSystem and the dashboard, and easy to reason about.
   ============================================================ */

/** Benchmark used when an exam doesn't set its own recommended time. */
export const DEFAULT_RECOMMENDED_SECONDS_PER_QUESTION = 90;

/** Format seconds as "m:ss" (e.g. 125 -> "2:05"). Guards NaN/negative. */
export const formatDuration = (totalSeconds: number): string => {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
    const s = Math.round(totalSeconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export type TimeVerdictKey = 'veryFast' | 'fast' | 'good' | 'slow' | 'verySlow';

export interface TimeVerdict {
    key: TimeVerdictKey;
    label: string; // Thai
    color: string; // Tailwind text classes (light + dark)
    bg: string;    // Tailwind bg classes (light + dark)
    dot: string;   // Tailwind bg for a small indicator dot
}

/** Classify the time spent on one question against the target T (seconds). */
export const getTimeVerdict = (seconds: number, targetSeconds: number): TimeVerdict => {
    const T = targetSeconds > 0 ? targetSeconds : DEFAULT_RECOMMENDED_SECONDS_PER_QUESTION;
    const r = seconds / T;
    if (r < 0.4) return { key: 'veryFast', label: 'เร็วไป', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30', dot: 'bg-rose-400' };
    if (r < 0.75) return { key: 'fast', label: 'เร็ว', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', dot: 'bg-emerald-400' };
    if (r <= 1.5) return { key: 'good', label: 'พอดี', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', dot: 'bg-emerald-500' };
    if (r <= 2.5) return { key: 'slow', label: 'ช้าไป', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', dot: 'bg-amber-400' };
    return { key: 'verySlow', label: 'ช้ามาก', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30', dot: 'bg-rose-500' };
};

export interface CombinedVerdict {
    label: string; // e.g. "ช้า + ผิด → ควรทบทวน"
    color: string;
    bg: string;
    shouldReview: boolean;
}

/** Combine the time verdict with correctness into one actionable label. */
export const getCombinedVerdict = (
    seconds: number,
    targetSeconds: number,
    isCorrect: boolean,
    answered: boolean,
): CombinedVerdict => {
    if (!answered) {
        return { label: 'ไม่ได้ตอบ', color: 'text-slate-400 dark:text-slate-500', bg: 'bg-slate-50 dark:bg-slate-700/40', shouldReview: false };
    }
    const v = getTimeVerdict(seconds, targetSeconds);
    const isSlow = v.key === 'slow' || v.key === 'verySlow';
    const isFast = v.key === 'fast' || v.key === 'veryFast';
    if (!isCorrect && isSlow) return { label: 'ช้า + ผิด → ควรทบทวน', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30', shouldReview: true };
    if (!isCorrect && isFast) return { label: 'เร็ว + ผิด → อาจเดา', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', shouldReview: true };
    if (!isCorrect) return { label: 'พอดี + ผิด → ทบทวนแนวคิด', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30', shouldReview: true };
    if (isSlow) return { label: 'ช้า + ถูก → ใช้เวลาเยอะ', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', shouldReview: false };
    if (isFast) return { label: 'เร็ว + ถูก → แม่นยำ', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', shouldReview: false };
    return { label: 'พอดี + ถูก → เยี่ยม', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', shouldReview: false };
};

/* ============================================================
   Timed mode (countdown) + live pacing — pure helpers.
   ============================================================ */

export interface CountdownState {
    totalSeconds: number;     // budget = timeLimit (minutes) * 60
    remainingSeconds: number; // max(0, total - elapsed)
    expired: boolean;         // true ONLY when a real budget is set and it's used up
    warnLevel: 'none' | 'warn' | 'critical';
    ratioLeft: number;        // remaining / total, 0..1
}

/**
 * Countdown state for timed exams. The budget is timeLimitMinutes; remaining =
 * budget - elapsed. `expired` can only be true when totalSeconds > 0, so a
 * misconfigured 0-minute limit safely falls back to count-up (never "expired").
 * warnLevel: warn at <=60s or <=20% left; critical at <=30s or <=10% left.
 */
export const getCountdownState = (
    elapsedSeconds: number,
    timeLimitMinutes: number,
): CountdownState => {
    const totalSeconds = Math.max(0, Math.round((timeLimitMinutes || 0) * 60));
    const elapsed = Math.max(0, elapsedSeconds || 0);
    const remainingSeconds = Math.max(0, totalSeconds - elapsed);
    const ratioLeft = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
    let warnLevel: CountdownState['warnLevel'] = 'none';
    if (totalSeconds > 0) {
        if (remainingSeconds <= 30 || ratioLeft <= 0.1) warnLevel = 'critical';
        else if (remainingSeconds <= 60 || ratioLeft <= 0.2) warnLevel = 'warn';
    }
    return {
        totalSeconds,
        remainingSeconds,
        expired: totalSeconds > 0 && remainingSeconds <= 0,
        warnLevel,
        ratioLeft,
    };
};

export interface PaceStatus {
    onPace: boolean;
    deltaQuestions: number; // signed: + ahead of pace, - behind pace
    label: string;          // Thai
    color: string;          // Tailwind text classes (light + dark)
    barColor: string;       // Tailwind bg for the progress fill
    progressRatio: number;  // answered / totalAnswerable, 0..1 (bar fill width)
}

/**
 * Compare the student's progress to where they "should" be by now.
 * Timed mode paces against the whole time budget; count-up mode paces against
 * the recommended seconds-per-question. Progress is the count of ANSWERED
 * questions (not the current index, which skipping ahead would inflate).
 * A ±0.75-question tolerance band keeps the label from flickering each second.
 */
export const getPaceStatus = (params: {
    answeredCount: number;
    totalAnswerable: number;
    elapsedSeconds: number;
    timedMode: boolean;
    timeLimitSeconds: number;
    recommendedSecondsPerQuestion: number;
}): PaceStatus => {
    const answered = Math.max(0, params.answeredCount || 0);
    const total = Math.max(0, params.totalAnswerable || 0);
    const elapsed = Math.max(0, params.elapsedSeconds || 0);

    let expectedDone: number;
    if (params.timedMode && params.timeLimitSeconds > 0) {
        expectedDone = (elapsed / params.timeLimitSeconds) * total;
    } else {
        const target = params.recommendedSecondsPerQuestion > 0
            ? params.recommendedSecondsPerQuestion
            : DEFAULT_RECOMMENDED_SECONDS_PER_QUESTION;
        expectedDone = elapsed / target;
    }
    if (total > 0) expectedDone = Math.min(expectedDone, total);

    const deltaQuestions = Math.round((answered - expectedDone) * 10) / 10;
    const progressRatio = total > 0 ? Math.min(1, answered / total) : 0;

    if (deltaQuestions >= 0.75) {
        return { onPace: true, deltaQuestions, label: 'เร็วกว่ากำหนด', color: 'text-emerald-600 dark:text-emerald-400', barColor: 'bg-emerald-500', progressRatio };
    }
    if (deltaQuestions >= -0.75) {
        return { onPace: true, deltaQuestions, label: 'ตามทัน', color: 'text-emerald-600 dark:text-emerald-400', barColor: 'bg-emerald-500', progressRatio };
    }
    return { onPace: false, deltaQuestions, label: 'ช้ากว่ากำหนด', color: 'text-amber-600 dark:text-amber-400', barColor: 'bg-amber-500', progressRatio };
};

/* ============================================================
   Proficiency level — turn a result into a friendly "level".
   ============================================================ */

export interface ProficiencyLevel {
    key: 'beginner' | 'developing' | 'good' | 'ready' | 'expert';
    emoji: string;
    label: string;   // Thai
    color: string;   // Tailwind text classes (light + dark)
    bg: string;      // Tailwind gradient + border classes for the card
    meaning: string; // "ระดับนี้แปลว่า..."
    nextStep: string; // "ควรทำต่อ..."
}

/**
 * Map accuracy (%) + pace ratio (avgSecondsPerQuestion / target) to a friendly
 * proficiency band. Pace is a SECONDARY signal — only "fast AND accurate" reaches
 * the top "expert" band; lower bands are decided by accuracy alone. paceRatio
 * defaults to 1 (on-pace) when no timing data is available.
 */
export const getProficiencyLevel = (percent: number, paceRatio = 1): ProficiencyLevel => {
    const p = Math.max(0, Math.min(100, percent || 0));
    const fast = paceRatio > 0 && paceRatio <= 1; // at or under the target pace

    if (p >= 85 && fast) {
        return { key: 'expert', emoji: '💎', label: 'เชี่ยวชาญ', color: 'text-violet-600 dark:text-violet-400', bg: 'from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/20 border-violet-200 dark:border-violet-700/50', meaning: 'แม่นและเร็วในระดับท็อป คุมเนื้อหาชุดนี้ได้ขาด', nextStep: 'ลองชุดที่ยากขึ้น หรือจับเวลาให้กระชับเพื่อรักษาฟอร์ม' };
    }
    if (p >= 75) {
        return { key: 'ready', emoji: '🥇', label: 'พร้อมสอบ', color: 'text-amber-600 dark:text-amber-400', bg: 'from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 border-amber-200 dark:border-amber-700/50', meaning: 'พื้นฐานแน่น ทำข้อสอบแนวนี้ได้ดีแล้ว', nextStep: 'เก็บข้อที่ยังพลาด + ฝึกความเร็วให้คงที่ ก็พร้อมสนามจริง' };
    }
    if (p >= 55) {
        return { key: 'good', emoji: '🥈', label: 'กำลังไปได้สวย', color: 'text-blue-600 dark:text-blue-400', bg: 'from-blue-50 to-sky-50 dark:from-blue-900/30 dark:to-sky-900/20 border-blue-200 dark:border-blue-700/50', meaning: 'เข้าใจเกินครึ่ง แต่ยังมีบางจุดที่หลุดอยู่', nextStep: 'โฟกัสหัวข้อที่อ่อนสุด แล้วทำซ้ำให้คล่อง' };
    }
    if (p >= 35) {
        return { key: 'developing', emoji: '🥉', label: 'กำลังพัฒนา', color: 'text-orange-600 dark:text-orange-400', bg: 'from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20 border-orange-200 dark:border-orange-700/50', meaning: 'เริ่มจับทางได้ แต่พื้นฐานบางเรื่องยังไม่แน่น', nextStep: 'กลับไปทบทวนเฉลยทีละข้อ + ฝึกหัวข้อพื้นฐานก่อน' };
    }
    return { key: 'beginner', emoji: '🌱', label: 'เริ่มต้น', color: 'text-emerald-600 dark:text-emerald-400', bg: 'from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-700/50', meaning: 'เพิ่งเริ่ม ยังต้องปูพื้นอีกนิด — ไม่เป็นไร ทุกคนเริ่มจากตรงนี้', nextStep: 'ดูเฉลยให้ครบ เข้าใจวิธีคิดก่อน แล้วค่อยๆ ไต่ระดับ' };
};

/* ============================================================
   Goal projection — "how many more attempts to reach X%".
   ============================================================ */

export interface GoalProjection {
    reached: boolean;
    attemptsToGoal: number | null; // est. more attempts; null when not projectable
    trend: 'up' | 'flat' | 'down';
    message: string; // Thai
}

/**
 * Estimate how many more attempts until the student reaches `goal`%, using a
 * least-squares slope over the most recent scores (up to 6). `history` is a
 * chronological list of percent scores. Returns a friendly Thai message.
 */
export const projectAttemptsToGoal = (history: number[], goal = 80): GoalProjection => {
    const pts = (history || []).filter((v) => typeof v === 'number' && !Number.isNaN(v));
    const n = pts.length;
    const latest = n > 0 ? pts[n - 1] : 0;

    if (latest >= goal) {
        return { reached: true, attemptsToGoal: 0, trend: 'up', message: `เยี่ยมมาก! ทำถึงเป้า ${goal}% แล้ว 🎉 รักษาระดับนี้ไว้นะ` };
    }
    if (n < 2) {
        return { reached: false, attemptsToGoal: null, trend: 'flat', message: `ทำข้อสอบอีกสัก 2–3 ครั้ง แล้วระบบจะคาดการณ์เส้นทางสู่เป้า ${goal}% ให้` };
    }

    const recent = pts.slice(-6);
    const m = recent.length;
    const meanX = (m - 1) / 2;
    const meanY = recent.reduce((a, b) => a + b, 0) / m;
    let num = 0, den = 0;
    for (let i = 0; i < m; i++) { num += (i - meanX) * (recent[i] - meanY); den += (i - meanX) ** 2; }
    const slope = den === 0 ? 0 : num / den; // percent gained per attempt

    if (slope <= 0.5) {
        return {
            reached: false,
            attemptsToGoal: null,
            trend: slope < -0.5 ? 'down' : 'flat',
            message: slope < -0.5
                ? 'คะแนนช่วงนี้มีแนวโน้มลดลง — ลองกลับไปทบทวนหัวข้อที่อ่อนก่อนนะ'
                : `คะแนนยังทรงตัว — โฟกัสหัวข้อที่ผิดบ่อย เพื่อดันให้ถึงเป้า ${goal}%`,
        };
    }

    const attempts = Math.max(1, Math.ceil((goal - latest) / slope));
    return { reached: false, attemptsToGoal: attempts, trend: 'up', message: `กำลังไปได้สวย! ถ้าพัฒนาแบบนี้ อีกประมาณ ${attempts} ครั้งน่าจะถึงเป้า ${goal}% 🚀` };
};

/* ============================================================
   Percentile rank — "better than X%" from a score histogram.
   ============================================================ */

/**
 * Percentile rank from a 10-bucket histogram of percents (bucket i = scores in
 * [i*10, i*10+10)). `count` is the total attempts. Returns 0–100 = "scored
 * better than X% of attempts". Ties within the same bucket are split in half.
 */
export const percentileFromBuckets = (buckets: number[], count: number, yourPercent: number): number => {
    if (!Array.isArray(buckets) || buckets.length === 0 || count <= 0) return 0;
    const yb = Math.min(9, Math.max(0, Math.floor((yourPercent || 0) / 10)));
    let below = 0;
    for (let i = 0; i < yb; i++) below += buckets[i] || 0;
    below += (buckets[yb] || 0) / 2; // ties share the bucket
    return Math.max(0, Math.min(99, Math.round((below / count) * 100))); // cap at 99 — can't beat everyone
};
