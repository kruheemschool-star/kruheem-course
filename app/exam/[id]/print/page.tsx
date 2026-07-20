import { Metadata } from "next";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { notFound } from "next/navigation";
import ExamAccessGuard from "@/components/exam/ExamAccessGuard";
import ExamPrintView from "@/components/exam/ExamPrintView";

// หน้า "พิมพ์ / บันทึกเป็น PDF" ของชุดข้อสอบ — จัดหน้าแบบข้อสอบกระดาษ
// (แต่ละข้อเป็นก้อนเดียว ไม่โดนตัดกลางหน้า) · สิทธิ์เหมือนหน้าทำข้อสอบ:
// ชุดฟรีพิมพ์ได้เลย ชุดสมาชิกต้อง approve แล้ว (ทดลองฟรี → หน้าล็อก)
export const revalidate = 60;

export const metadata: Metadata = {
    title: "พิมพ์ชุดข้อสอบ | Kruheem Math",
    robots: { index: false, follow: false },
};

interface Props {
    params: Promise<{ id: string }>;
}

// โหลดชุดข้อสอบ (ย่อจาก app/exam/[id]/page.tsx — รองรับ questions inline/JSON string/questionsUrl)
async function getExamData(id: string) {
    if (!id) return null;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const snap = await getDoc(doc(db, "exams", id));
            if (snap.exists()) {
                const data = snap.data();
                let questions: any[] = [];
                if (data.questions) {
                    if (typeof data.questions === "string") {
                        try { questions = JSON.parse(data.questions); } catch { questions = []; }
                    } else {
                        questions = data.questions;
                    }
                } else if (data.questionsUrl) {
                    try {
                        const res = await fetch(data.questionsUrl, { signal: AbortSignal.timeout(8000) });
                        if (res.ok) questions = await res.json();
                    } catch { questions = []; }
                }
                const normalized = Array.isArray(questions) ? questions.map((q: any) => ({
                    ...q,
                    explanation: q.explanation || q.solution || "",
                    correctIndex: q.correctIndex ?? q.answerIndex ?? 0,
                })) : [];
                return { id: snap.id, ...data, questions: normalized } as any;
            }
            break;
        } catch (e) {
            if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
        }
    }
    return null;
}

export default async function ExamPrintPage(props: Props) {
    const params = await props.params;
    const exam = await getExamData(params.id);
    if (!exam || !Array.isArray(exam.questions) || exam.questions.length === 0) notFound();

    return (
        // จงใจส่ง isFree={false} เสมอ: ชุดฟรีเปิดให้ "ทำบนเว็บ" ฟรี แต่การดาวน์โหลด/
        // พิมพ์ทั้งชุดเป็น PDF ต้องเป็นสมาชิกคลังข้อสอบเท่านั้น (กันโหลดไปก๊อป/ขายต่อ)
        // guard จะเช็ค enrollment จริง → ไม่ใช่สมาชิก = isTrial → หน้าล็อกชวนสมัคร
        <ExamAccessGuard isFree={false}>
            <ExamPrintView
                examId={exam.id}
                examTitle={exam.title || "ชุดข้อสอบ"}
                category={exam.category || ""}
                level={exam.level || ""}
                questions={exam.questions}
            />
        </ExamAccessGuard>
    );
}
