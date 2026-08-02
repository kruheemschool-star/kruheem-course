import { Metadata } from "next";
import { notFound } from "next/navigation";
import ExamAccessGuard from "@/components/exam/ExamAccessGuard";
import ExamPrintView from "@/components/exam/ExamPrintView";
import { getExamData } from "@/lib/examData";

// หน้า "พิมพ์ / บันทึกเป็น PDF" ของชุดข้อสอบ — จัดหน้าแบบข้อสอบกระดาษ
// (แต่ละข้อเป็นก้อนเดียว ไม่โดนตัดกลางหน้า) · สิทธิ์เหมือนหน้าทำข้อสอบ:
// ชุดฟรีพิมพ์ได้เลย ชุดสมาชิกต้อง approve แล้ว (ทดลองฟรี → หน้าล็อก)
// ข้อมูลชุดข้อสอบมาจาก lib/examData (REST + data cache 1 ชม. + tag exams-feed)
// แทน client SDK เดิมที่ cache ไม่ได้และอ่านเอกสาร ~1MB ใหม่ทุกวิว
export const revalidate = 60;

export const metadata: Metadata = {
    title: "พิมพ์ชุดข้อสอบ | Kruheem Math",
    robots: { index: false, follow: false },
};

interface Props {
    params: Promise<{ id: string }>;
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
