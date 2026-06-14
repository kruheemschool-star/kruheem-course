import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { adminAuth } from "@/lib/firebase-admin";
import { ADMIN_EMAILS } from "@/lib/constants";

// Admin-only guard. This is a destructive maintenance endpoint (it can rewrite
// exam answer keys), so it must never be public. Fails closed: no/invalid token
// — or missing Admin SDK creds — returns 401. Returns null when the caller is a
// verified admin and the handler may proceed.
async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const decoded = await adminAuth.verifyIdToken(token);
        const email = (decoded.email || "").toLowerCase();
        if (!ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return null;
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

// Extract stated correct answer from explanation text (returns 0-based index or null)
function extractAnswerFromExplanation(explanation: string): number | null {
    if (!explanation || typeof explanation !== 'string') return null;
    const clean = explanation
        .replace(/\\\[[\s\S]*?\\\]/g, '')
        .replace(/\$\$[\s\S]*?\$\$/g, '')
        .replace(/\\\([\s\S]*?\\\)/g, '')
        .replace(/\$[^$]+\$/g, '')
        .replace(/\*\*/g, '');

    // Number patterns: "คำตอบ: ข้อ 2", "เฉลย: ข้อ 3", "ตอบ ข้อ 1"
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

    // Thai letter patterns — avoid capturing ข in ข้อ
    const thaiMap: Record<string, number> = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
    const thaiPatterns = [
        /คำตอบ\s*:?\s*ข้อ\s*([กคง])/,
        /เฉลย\s*:?\s*ข้อ\s*([กคง])/,
        /คำตอบ\s*:?\s*([กขคง])(?!้)/,
        /เฉลย\s*:?\s*([กขคง])(?!้)/,
    ];
    for (const pattern of thaiPatterns) {
        const match = clean.match(pattern);
        if (match && thaiMap[match[1]] !== undefined) {
            return thaiMap[match[1]];
        }
    }
    return null;
}

export async function POST(request: NextRequest) {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    try {
        const snapshot = await getDocs(collection(db, "exams"));
        const results: any[] = [];
        let totalFixed = 0;

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const questions = data.questions;
            if (!Array.isArray(questions) || questions.length === 0) continue;

            let hasChanges = false;
            const updatedQuestions = questions.map((q: any, idx: number) => {
                const explanation = q.explanation || q.solution || '';
                const explAnswer = extractAnswerFromExplanation(explanation);
                // Check ALL answer fields — any could override the display
                const displayedAnswer = q.answerIndex ?? q.correctIndex ?? 0;
                const optLen = Array.isArray(q.options) ? q.options.length : 4;

                if (explAnswer !== null && explAnswer !== displayedAnswer && explAnswer >= 0 && explAnswer < optLen) {
                    hasChanges = true;
                    totalFixed++;
                    results.push({
                        exam: data.title || docSnap.id,
                        question: idx + 1,
                        old: displayedAnswer + 1,
                        new: explAnswer + 1,
                        text: (q.question || '').substring(0, 60),
                    });
                    // Update ALL answer fields to prevent any field from overriding
                    const fixed = { ...q, correctIndex: explAnswer, answerIndex: explAnswer };
                    delete fixed.correctAnswer;
                    return fixed;
                }
                return q;
            });

            if (hasChanges) {
                const docRef = doc(db, "exams", docSnap.id);
                await updateDoc(docRef, { questions: updatedQuestions });
            }
        }

        return NextResponse.json({
            success: true,
            totalExams: snapshot.docs.length,
            totalFixed,
            fixes: results,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// GET for easy browser testing
export async function GET(request: NextRequest) {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    // Scan only, don't fix
    try {
        const snapshot = await getDocs(collection(db, "exams"));
        const mismatches: any[] = [];
        let totalQuestions = 0;
        let checked = 0;

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const questions = data.questions;
            if (!Array.isArray(questions)) continue;

            questions.forEach((q: any, idx: number) => {
                totalQuestions++;
                const explanation = q.explanation || q.solution || '';
                const explAnswer = extractAnswerFromExplanation(explanation);
                if (explAnswer === null) return;
                checked++;

                // Check the ACTUAL displayed answer (answerIndex takes priority in client code)
                const displayedAnswer = q.answerIndex ?? q.correctIndex ?? 0;
                if (explAnswer !== displayedAnswer) {
                    mismatches.push({
                        exam: data.title || docSnap.id,
                        examId: docSnap.id,
                        question: idx + 1,
                        stored: displayedAnswer + 1,
                        explained: explAnswer + 1,
                        text: (q.question || '').substring(0, 60),
                    });
                }
            });
        }

        return NextResponse.json({
            totalExams: snapshot.docs.length,
            totalQuestions,
            checked,
            mismatches: mismatches.length,
            details: mismatches,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
