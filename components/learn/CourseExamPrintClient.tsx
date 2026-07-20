"use client";

import { Loader2 } from 'lucide-react';
import ExamPrintView from '@/components/exam/ExamPrintView';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';

// ครอบหน้าพิมพ์ข้อสอบของบทเรียนด้วยสิทธิ์ "ผู้เรียนคอร์สนี้" (approved ไม่หมดอายุ /
// แอดมิน) — คนดูบทฟรี/พรีวิวทำบนเว็บได้ แต่โหลดทั้งชุดเป็น PDF ไม่ได้ (กันก๊อป/ขายต่อ)
// ผลสอบ/สมุดข้อผิดของบทเรียนอยู่ที่ users/{uid}/lessonExamResults/{lessonId}
export default function CourseExamPrintClient({
    courseId, lessonId, title, courseTitle, questions,
}: {
    courseId: string;
    lessonId: string;
    title: string;
    courseTitle?: string;
    questions: any[];
}) {
    const { isEnrolled, checking } = useCourseEnrollment(courseId);

    if (checking) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="animate-spin mb-4 text-emerald-500" size={40} />
                <p className="font-bold">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
            </div>
        );
    }

    return (
        <ExamPrintView
            examId={lessonId}
            examTitle={title}
            category={courseTitle || ''}
            level=""
            questions={questions}
            isTrial={!isEnrolled}
            backHref={`/learn/${courseId}`}
            resultDocId={lessonId}
            wrongCollection="lessonExamResults"
            lockKind="course"
            lockHref={`/course/${courseId}`}
        />
    );
}
