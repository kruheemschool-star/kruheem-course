import { sanitizeExamData } from '@/lib/exam-utils';
import { ExamQuestion } from '@/types/exam';

// JSON export for an exam set, intended for external typesetting/layout.
// Keeps โจทย์ (problems) and เฉลย (solutions) cleanly separated so the
// downstream system can render the question paper and the answer key as
// independent documents. The correct answer for each item is resolved with
// the SAME canonical logic the learner-facing app uses (sanitizeExamData —
// explanation answer always wins over any stored field), so the exported
// answer key matches what students see.

const OPTION_LABELS = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];

export interface ExamExportMeta {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    difficulty: string;
    questionCount: number;       // count of valid/exported questions
    timeLimit: number | null;    // minutes, if set
    source: string;
    exportedAt: string;          // ISO timestamp
}

export interface ExportedProblem {
    number: number;              // 1-based, matches the matching solution
    question: string;            // LaTeX-enabled prompt
    options: string[];           // choice texts; position = ก/ข/ค/ง
    image?: string;
    svg?: string;
    tags?: string[];
}

export interface ExportedSolution {
    number: number;              // 1-based, matches the matching problem
    answerIndex: number;         // 0-based index into options
    answerLabel: string;         // ก/ข/ค/ง
    answerText: string;          // text of the correct option
    explanation: string;         // LaTeX-enabled detailed solution
}

export interface ExamExport {
    meta: ExamExportMeta;
    problems: ExportedProblem[];
    solutions: ExportedSolution[];
}

// The stored `questions` field may be a JSON string or an already-parsed
// array (see the exam data model). Normalize to an array either way.
export function parseExamQuestions(raw: unknown): any[] {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

// Build the full export object from a raw exam doc. `questionsInput` lets the
// caller pass questions it already resolved (e.g. fetched from questionsUrl);
// otherwise the inline `exam.questions` field is parsed.
export function buildExamExport(exam: any, questionsInput?: any[]): ExamExport {
    const rawQuestions = questionsInput ?? parseExamQuestions(exam?.questions);
    const clean = sanitizeExamData(rawQuestions as ExamQuestion[]);

    const problems: ExportedProblem[] = clean.map((q: any, idx) => {
        const p: ExportedProblem = {
            number: idx + 1,
            question: q.question || '',
            options: Array.isArray(q.options) ? q.options : [],
        };
        if (q.image) p.image = q.image;
        if (q.svg) p.svg = q.svg;
        if (Array.isArray(q.tags) && q.tags.length) p.tags = q.tags;
        return p;
    });

    const solutions: ExportedSolution[] = clean.map((q: any, idx) => {
        const opts: string[] = Array.isArray(q.options) ? q.options : [];
        const ai = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
        return {
            number: idx + 1,
            answerIndex: ai,
            answerLabel: OPTION_LABELS[ai] || String(ai + 1),
            answerText: opts[ai] ?? '',
            explanation: q.explanation || '',
        };
    });

    const meta: ExamExportMeta = {
        id: exam?.id || '',
        title: exam?.title || '',
        description: exam?.description || '',
        category: exam?.category || '',
        level: exam?.level || '',
        difficulty: exam?.difficulty || '',
        questionCount: clean.length,
        timeLimit: typeof exam?.timeLimit === 'number' ? exam.timeLimit : null,
        source: 'kruheemmath.com',
        exportedAt: new Date().toISOString(),
    };

    return { meta, problems, solutions };
}

// Filename-safe slug from a (Thai or English) exam title. Thai characters are
// kept — they render fine on disk — only filesystem-illegal chars are stripped.
export function examFilenameSlug(title: string, fallback = 'exam'): string {
    const base = (title || '')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 60);
    return base || fallback;
}
