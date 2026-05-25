// ============================================================
// Live stats — auto-fill student counts on sales pages.
//
// Any stat string containing the {students} token (or the legacy
// "___" placeholder) is replaced with the live total number of
// registrations across ALL courses (the whole enrollments
// collection — same number shown in the admin students table).
//
// Example:  "{students}+"  ->  "815+"
//           "___+"         ->  "815+"
// ============================================================

const STUDENT_TOKEN = /\{students\}|_{2,}/gi;

/** True if the raw stat string asks for the live student count. */
export function hasStudentToken(raw?: string): boolean {
    if (!raw) return false;
    return /\{students\}|_{2,}/i.test(raw);
}

/**
 * Replace the {students} token (and legacy "___") with the live count.
 * - count known   → token becomes the formatted number (e.g. "815")
 * - count unknown → token is stripped so we never show "{students}" / "___"
 * Any prefix/suffix the admin wrote around the token is preserved
 * (so "{students}+" → "815+").
 */
export function resolveStudentToken(raw: string | undefined, totalStudents?: number): string {
    if (raw == null) return "";
    const replacement = typeof totalStudents === "number" ? totalStudents.toLocaleString("th-TH") : "";
    return raw.replace(STUDENT_TOKEN, replacement);
}
