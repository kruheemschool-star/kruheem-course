import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExamCategoryPage from "@/components/exam/ExamCategoryPage";
import { fetchExamsByType } from "@/lib/exam-fetch";

export const metadata: Metadata = {
    title: "แนวข้อสอบรายบท | คลังข้อสอบคณิตศาสตร์ | KruHeem Course",
    description: "แนวข้อสอบรายบท สมการ จำนวนจริง เลขยกกำลัง และอื่นๆ พร้อมเฉลยละเอียด",
};

export const dynamic = 'force-dynamic';

export default async function ChapterExamPage() {
    const exams = await fetchExamsByType("chapter");

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
            <Navbar />
            <div className="pt-16 flex-grow">
                <ExamCategoryPage
                    examType="chapter"
                    title="แนวข้อสอบรายบท"
                    description="แยกตามบทเรียน เช่น สมการ จำนวนจริง เลขยกกำลัง เจาะลึกทีละหัวข้อ"
                    icon="📖"
                    themeColor="violet"
                    initialExams={exams}
                />
            </div>
            <Footer />
        </div>
    );
}
