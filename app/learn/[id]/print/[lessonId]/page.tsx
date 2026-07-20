import { Metadata } from "next";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { notFound } from "next/navigation";
import CourseExamPrintClient from "@/components/learn/CourseExamPrintClient";

// หน้า "พิมพ์ / บันทึกเป็น PDF" ของข้อสอบในบทเรียน (lesson type practice/html)
// — ใช้เครื่องจัดหน้า A4 + กระดาษคำตอบ + เลือกชุด ตัวเดียวกับคลังข้อสอบ
// สิทธิ์: ผู้เรียนคอร์สนี้ (enrollment approved) / แอดมิน — เช็คฝั่ง client
export const revalidate = 60;

export const metadata: Metadata = {
    title: "พิมพ์ข้อสอบบทเรียน | Kruheem Math",
    robots: { index: false, follow: false },
};

interface Props {
    params: Promise<{ id: string; lessonId: string }>;
}

// เกณฑ์เดียวกับ components/learn/utils.ts (tryParseQuestions) — ทำซ้ำฝั่ง server
const tryParseQuestions = (content: string): any[] | null => {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question) return parsed;
    } catch { /* not JSON */ }
    return null;
};

export default async function LessonPrintPage(props: Props) {
    const { id, lessonId } = await props.params;
    if (!id || !lessonId) notFound();

    let lesson: any = null;
    let courseTitle = "";
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const [lessonSnap, courseSnap] = await Promise.all([
                getDoc(doc(db, "courses", id, "lessons", lessonId)),
                getDoc(doc(db, "courses", id)),
            ]);
            if (lessonSnap.exists()) lesson = lessonSnap.data();
            if (courseSnap.exists()) courseTitle = (courseSnap.data() as any).title || "";
            break;
        } catch {
            if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
        }
    }
    if (!lesson) notFound();

    const questions = tryParseQuestions(lesson.content || "");
    if (!questions) notFound();

    // Normalize เหมือนหน้าพิมพ์คลัง (เฉลยอยู่ใน solution ของบางชุด / answerIndex เก่า)
    const normalized = questions.map((q: any) => ({
        ...q,
        explanation: q.explanation || q.solution || "",
        correctIndex: q.correctIndex ?? q.answerIndex ?? 0,
    }));

    return (
        <CourseExamPrintClient
            courseId={id}
            lessonId={lessonId}
            title={lesson.title || "ข้อสอบบทเรียน"}
            courseTitle={courseTitle}
            questions={normalized}
        />
    );
}
