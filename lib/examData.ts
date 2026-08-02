import { cache } from "react";
import { getDocument } from "@/lib/firestoreRest";
import { PUBLIC_SETTINGS_DOC, PUBLIC_SETTINGS_REVALIDATE } from "@/lib/publicSettings";

// Shared exam-set loader for /exam/[id] and /exam/[id]/print.
//
// Replaces the two near-duplicate client-SDK getDoc() copies those pages had.
// The client SDK can never use Next's data cache, so every page view was a
// fresh Firestore read of a 250KB–1MiB doc — twice on /exam/[id], because
// generateMetadata and the page each called their own copy. Via REST fetch the
// data cache applies even on a dynamic route (same pattern as /course/[id]):
// ~1 read per exam per hour instead of 2-3 per view, and React cache() dedupes
// the metadata+page calls within a single request. Admin edits stay instant:
// tagged "exams-feed", which /api/revalidate-exams busts on save.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getExamData = cache(async (id: string): Promise<any | null> => {
    if (!id) return null;

    // Retry logic: try up to 2 times to handle intermittent Firestore failures
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const data = await getDocument(`exams/${id}`, {
                revalidate: 3600,
                tags: ["exams-feed"],
            });
            if (!data) break; // Document doesn't exist — no need to retry

            let questions: unknown = [];
            if (data.questions) {
                if (typeof data.questions === "string") {
                    try {
                        questions = JSON.parse(data.questions);
                    } catch {
                        questions = [];
                    }
                } else {
                    questions = data.questions;
                }
            } else if (data.questionsUrl) {
                try {
                    const res = await fetch(data.questionsUrl as string, { signal: AbortSignal.timeout(8000) });
                    if (res.ok) questions = await res.json();
                } catch (fetchErr) {
                    console.error("Error fetching questionsUrl:", fetchErr);
                    questions = [];
                }
            }

            // Normalize question fields for consistency
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const normalizedQuestions = Array.isArray(questions) ? questions.map((q: any) => ({
                ...q,
                explanation: q.explanation || q.solution || "",
                correctIndex: q.correctIndex ?? q.answerIndex ?? 0,
            })) : [];

            return { ...data, questions: normalizedQuestions, id: data.id };
        } catch (error) {
            console.error(`Error fetching exam (attempt ${attempt + 1}):`, error);
            if (attempt === 0) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
    }

    return null;
});

export const getExamConfig = cache(async (): Promise<{ showExamDashboard?: boolean; enableResultTracking?: boolean }> => {
    try {
        // สวิตช์คลังข้อสอบอยู่ใน field `examConfig` ของ settings/homepage_promotion
        // (doc เดียวใน settings ที่ rules เปิดให้เซิร์ฟเวอร์อ่านแบบไม่ล็อกอินได้ —
        // ห้ามอ่าน settings/examConfig ตรงๆ จะโดน 403 เงียบ ดู lib/publicSettings.ts)
        // doc เดียว ทุกหน้าข้อสอบแชร์แคชเดียวกัน — ไม่เพิ่มยอดอ่านต่อวิว
        const data = await getDocument(PUBLIC_SETTINGS_DOC, { revalidate: PUBLIC_SETTINGS_REVALIDATE });
        const cfg = data?.examConfig as { showExamDashboard?: boolean; enableResultTracking?: boolean } | undefined;
        if (cfg) return cfg;
    } catch { /* ignore */ }
    return { showExamDashboard: false, enableResultTracking: false };
});
