import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

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

    // Thai letter patterns: "คำตอบ: ก", "เฉลย: ข"
    const thaiMap: Record<string, number> = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
    const thaiPatterns = [
        /คำตอบ\s*:?\s*([กขคง])/,
        /เฉลย\s*:?\s*([กขคง])/,
    ];
    for (const pattern of thaiPatterns) {
        const match = clean.match(pattern);
        if (match && thaiMap[match[1]] !== undefined) {
            return thaiMap[match[1]];
        }
    }
    return null;
}

export async function POST() {
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
                const storedAnswer = q.correctIndex ?? 0;
                const optLen = Array.isArray(q.options) ? q.options.length : 4;

                if (explAnswer !== null && explAnswer !== storedAnswer && explAnswer >= 0 && explAnswer < optLen) {
                    hasChanges = true;
                    totalFixed++;
                    results.push({
                        exam: data.title || docSnap.id,
                        question: idx + 1,
                        old: storedAnswer + 1,
                        new: explAnswer + 1,
                        text: (q.question || '').substring(0, 60),
                    });
                    return { ...q, correctIndex: explAnswer };
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
export async function GET() {
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

                const storedAnswer = q.correctIndex ?? 0;
                if (explAnswer !== storedAnswer) {
                    mismatches.push({
                        exam: data.title || docSnap.id,
                        examId: docSnap.id,
                        question: idx + 1,
                        stored: storedAnswer + 1,
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
