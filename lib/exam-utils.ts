import { ExamQuestion } from '@/types/exam';

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

// Sanitize exam data: per-question bounds checking + explanation cross-check
// CRITICAL: explanation answer ALWAYS wins over any stored field
export const sanitizeExamData = (examData: ExamQuestion[]): ExamQuestion[] => {
    return examData.map((q: any) => {
        const optLen = Array.isArray(q.options) ? q.options.length : 4;

        // Step 1: Try explanation FIRST — most reliable source of truth
        const explAnswer = extractAnswerFromExplanation(q.explanation || q.solution || '');
        if (explAnswer !== null && explAnswer >= 0 && explAnswer < optLen) {
            return { ...q, correctIndex: explAnswer, answerIndex: explAnswer };
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

        return { ...q, correctIndex: idx, answerIndex: idx };
    });
};

// Transform external exam format to internal format (used in admin import)
export const transformExamQuestion = (q: any) => {
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

    return {
        question: q.question || "",
        image: q.image,
        options: q.options || [],
        correctIndex: answerIndex,
        explanation: finalExplanation,
        tags: q.tags || (q.space ? [q.space] : [])
    };
};
