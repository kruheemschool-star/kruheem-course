import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExamCategoryPage from "@/components/exam/ExamCategoryPage";
import { fetchExamsByType } from "@/lib/exam-fetch";

export const metadata: Metadata = {
    title: "ข้อสอบฟรี | คลังข้อสอบคณิตศาสตร์ | KruHeem Course",
    description: "ข้อสอบฟรี ทำได้เลยไม่ต้องสมัครสมาชิก โปรโมชั่นพิเศษ",
};

export const dynamic = 'force-dynamic';

export default async function FreeExamPage() {
    const exams = await fetchExamsByType("free");

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
            <Navbar />
            <div className="pt-16 flex-grow">
                <ExamCategoryPage
                    examType="free"
                    title="ข้อสอบฟรี"
                    description="โปรโมชั่นพิเศษ ทำได้เลยไม่ต้องสมัครสมาชิก"
                    icon="🎁"
                    themeColor="teal"
                    initialExams={exams}
                />
            </div>
            <Footer />
        </div>
    );
}
