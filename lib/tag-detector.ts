import keywordsData from '@/data/keywords.json';
import { ExamQuestion } from '@/types/exam';

// Types
export interface KeywordData {
    version: string;
    lastUpdated: string;
    categories: Category[];
    globalKeywords: KeywordEntry[];
}

export interface Category {
    id: string;
    name: string;
    level: string[];
    keywords: KeywordEntry[];
}

export interface KeywordEntry {
    term: string;
    aliases?: string[];
    weight: number;
    promptTemplate?: string;
}

export interface DetectionResult {
    tag: string;
    category: string;
    categoryId: string;
    confidence: number;
    foundIn: ('question' | 'explanation' | 'options')[];
}

// Singleton cache
let _keywords: KeywordData | null = null;

export function loadKeywords(): KeywordData {
    if (_keywords) return _keywords;
    _keywords = keywordsData as KeywordData;
    return _keywords;
}

// Strip LaTeX for cleaner matching
function stripLatex(text: string): string {
    return text
        .replace(/\\\[[\s\S]*?\\\]/g, ' ')
        .replace(/\$\$[\s\S]*?\$\$/g, ' ')
        .replace(/\\\([\s\S]*?\\\)/g, ' ')
        .replace(/\$[^$]+\$/g, ' ')
        .replace(/\\[a-zA-Z]+/g, ' ')
        .replace(/[{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeText(text: string): string {
    return stripLatex(text).toLowerCase().trim();
}

function matchKeywordInText(text: string, kw: KeywordEntry): { matched: boolean; score: number } {
    const normalized = normalizeText(text);
    if (!normalized) return { matched: false, score: 0 };

    let score = 0;

    // Match main term
    if (normalized.includes(kw.term.toLowerCase())) {
        score += kw.weight;
    }

    // Match aliases
    if (kw.aliases) {
        for (const alias of kw.aliases) {
            if (normalized.includes(alias.toLowerCase())) {
                score += kw.weight * 0.8;
                break; // Only count first alias match
            }
        }
    }

    return { matched: score > 0, score };
}

/**
 * Detect tags from a single text string
 */
export function detectTagsFromText(text: string): DetectionResult[] {
    const keywords = loadKeywords();
    const results: DetectionResult[] = [];

    for (const category of keywords.categories) {
        for (const kw of category.keywords) {
            const { matched, score } = matchKeywordInText(text, kw);
            if (matched) {
                results.push({
                    tag: kw.term,
                    category: category.name,
                    categoryId: category.id,
                    confidence: Math.min(score, 1.0),
                    foundIn: ['question'],
                });
            }
        }
    }

    // Global keywords
    for (const kw of keywords.globalKeywords) {
        const { matched, score } = matchKeywordInText(text, kw);
        if (matched) {
            results.push({
                tag: kw.term,
                category: 'ทั่วไป',
                categoryId: 'global',
                confidence: Math.min(score, 1.0),
                foundIn: ['question'],
            });
        }
    }

    return results;
}

/**
 * Detect tags from an ExamQuestion by scanning question, explanation, and options
 */
export function detectTagsFromQuestion(q: ExamQuestion): DetectionResult[] {
    const keywords = loadKeywords();
    const resultMap = new Map<string, DetectionResult>();

    const scanText = (text: string, source: 'question' | 'explanation' | 'options') => {
        const allKeywords: { kw: KeywordEntry; catName: string; catId: string }[] = [];

        for (const cat of keywords.categories) {
            for (const kw of cat.keywords) {
                allKeywords.push({ kw, catName: cat.name, catId: cat.id });
            }
        }
        for (const kw of keywords.globalKeywords) {
            allKeywords.push({ kw, catName: 'ทั่วไป', catId: 'global' });
        }

        for (const { kw, catName, catId } of allKeywords) {
            const { matched, score } = matchKeywordInText(text, kw);
            if (matched) {
                const existing = resultMap.get(kw.term);
                if (existing) {
                    // Boost confidence if found in multiple fields
                    existing.confidence = Math.min(existing.confidence + score * 0.3, 1.0);
                    if (!existing.foundIn.includes(source)) {
                        existing.foundIn.push(source);
                    }
                } else {
                    resultMap.set(kw.term, {
                        tag: kw.term,
                        category: catName,
                        categoryId: catId,
                        confidence: Math.min(score, 1.0),
                        foundIn: [source],
                    });
                }
            }
        }
    };

    // Scan question text
    if (q.question) scanText(q.question, 'question');

    // Scan explanation
    if (q.explanation) scanText(q.explanation, 'explanation');

    // Scan options
    if (q.options && Array.isArray(q.options)) {
        const optionsText = q.options.join(' ');
        scanText(optionsText, 'options');
    }

    // Sort by confidence desc
    return Array.from(resultMap.values()).sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect tags for a batch of questions and return unique tags sorted by frequency
 */
export function detectTagsFromQuestions(questions: ExamQuestion[]): DetectionResult[] {
    const tagFreq = new Map<string, DetectionResult & { count: number }>();

    for (const q of questions) {
        const results = detectTagsFromQuestion(q);
        for (const r of results) {
            const existing = tagFreq.get(r.tag);
            if (existing) {
                existing.count++;
                existing.confidence = Math.max(existing.confidence, r.confidence);
                for (const src of r.foundIn) {
                    if (!existing.foundIn.includes(src)) existing.foundIn.push(src);
                }
            } else {
                tagFreq.set(r.tag, { ...r, count: 1 });
            }
        }
    }

    // Sort by count desc, then confidence desc
    return Array.from(tagFreq.values())
        .sort((a, b) => b.count - a.count || b.confidence - a.confidence)
        .map(({ count, ...rest }) => rest);
}

/**
 * Get all available tags from keywords.json (for autocomplete)
 */
export function getAllAvailableTags(): { term: string; category: string; categoryId: string }[] {
    const keywords = loadKeywords();
    const tags: { term: string; category: string; categoryId: string }[] = [];

    for (const cat of keywords.categories) {
        for (const kw of cat.keywords) {
            tags.push({ term: kw.term, category: cat.name, categoryId: cat.id });
        }
    }
    for (const kw of keywords.globalKeywords) {
        tags.push({ term: kw.term, category: 'ทั่วไป', categoryId: 'global' });
    }

    return tags;
}
