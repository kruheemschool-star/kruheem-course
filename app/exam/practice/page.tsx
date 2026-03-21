import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExamCategoryPage from "@/components/exam/ExamCategoryPage";
import { fetchExamsByType } from "@/lib/exam-fetch";

export const metadata: Metadata = {
    title: "แบบฝึกหัดคณิตศาสตร์ | คลังข้อสอบ | KruHeem Course",
    description: "แบบฝึกหัดคณิตศาสตร์ ฝึกทำโจทย์เตรียมสอบ พร้อมเฉลยละเอียดทุกข้อ",
};

export const dynamic = 'force-dynamic';

export default async function PracticeExamPage() {
    const exams = await fetchExamsByType("practice");

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
            <Navbar />
            <div className="pt-16 flex-grow">
                <ExamCategoryPage
                    examType="practice"
                    title="แบบฝึกหัด"
                    description="เตรียมตัวสอบด้วยแบบฝึกหัดหลากหลาย ฝึกทำโจทย์เพื่อเพิ่มทักษะ"
                    icon="📝"
                    themeColor="emerald"
                    initialExams={exams}
                />
            </div>
            <Footer />
        </div>
    );
}
