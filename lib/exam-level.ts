/**
 * Derive exam level from exam category / level / title strings.
 * Used for matching against enrollment.allowedExamLevel.
 *
 * The `title` argument is a DEFENSIVE signal: admins sometimes leave the
 * default category ("ม.ต้น") unchanged when quick-adding exams whose title
 * clearly indicates another level (e.g. "สอบเข้า ม.1 ชุดที่ 7"). Including
 * the title means the detector still resolves to the correct level even when
 * category metadata is wrong.
 *
 * Priority order matters: we check "primary" first because "สอบเข้า ม.1"
 * must NOT be misread as "lower" just because it also contains "ม.1".
 *
 * Returns undefined when level cannot be determined — in which case the
 * access guard falls back to the legacy behavior (any "คลังข้อสอบ" enrollment grants access).
 */
export type ExamLevel = "primary" | "lower" | "upper";

export function deriveExamLevel(
    category?: string | null,
    level?: string | null,
    title?: string | null
): ExamLevel | undefined {
    const text = `${category || ""} ${level || ""} ${title || ""}`.trim();
    if (!text) return undefined;

    // Primary: ประถม, สอบเข้า ม.1, ป.1-ป.6
    if (/ประถม|สอบเข้า\s*ม\.?\s*1|ป\.[1-6]/.test(text)) return "primary";

    // Lower secondary: ม.ต้น, ม.1-ม.3
    if (/ม\.ต้น|มัธยมต้น|ม\.?\s*[1-3](?!\d)/.test(text)) return "lower";

    // Upper secondary: ม.ปลาย, ม.4-ม.6
    if (/ม\.ปลาย|มัธยมปลาย|ม\.?\s*[4-6](?!\d)/.test(text)) return "upper";

    return undefined;
}
