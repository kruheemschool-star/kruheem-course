import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExamCategoryPage from "@/components/exam/ExamCategoryPage";
import { fetchExamsByType } from "@/lib/exam-fetch";

export const metadata: Metadata = {
    title: "ข้อสอบเข้า | คลังข้อสอบคณิตศาสตร์ | KruHeem Course",
    description: "รวมข้อสอบเข้า ม.1 ม.4 พร้อมเฉลยละเอียด ฝึกทำโจทย์จำลองสอบจริง",
};

export const dynamic = 'force-dynamic';

export default async function EntranceExamPage() {
    const exams = await fetchExamsByType("entrance");

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
            <Navbar />
            <div className="pt-16 flex-grow">
                <ExamCategoryPage
                    examType="entrance"
                    title="ข้อสอบเข้า"
                    description="สอบเข้า ม.1, ม.4 และโรงเรียนดัง พร้อมเฉลยละเอียด"
                    icon="🏫"
                    themeColor="indigo"
                    initialExams={exams}
                />
            </div>
            <Footer />
        </div>
    );
}
