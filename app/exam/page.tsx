import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fetchAllExams, fetchFeaturedExams, groupExamsByType } from "@/lib/exam-fetch";
import ExamHubClient from "@/components/exam/ExamHubClient";

export const metadata: Metadata = {
    title: "คลังข้อสอบคณิตศาสตร์ออนไลน์ | KruHeem Course",
    description: "ฝึกทำโจทย์คณิตศาสตร์ ป.1 - ม.6 จับเวลาจำลองสอบจริง พร้อมเฉลยละเอียด ตะลุยโจทย์ O-NET, A-Level เพื่อวัดระดับความรู้",
    keywords: ["ฝึกทำโจทย์คณิต", "คลังข้อสอบ", "จับเวลาทำข้อสอบ", "จำลองสอบ", "ตะลุยโจทย์", "ข้อสอบ A-Level"],
};

export const dynamic = 'force-dynamic';

export default async function ExamHubPage() {
    const allExams = await fetchAllExams();
    const featuredExams = fetchFeaturedExams(allExams);
    const groupedExams = groupExamsByType(allExams);

    return (
        <div className="min-h-screen bg-white font-sans flex flex-col">
            <Navbar />

            <div className="pt-16">
                <ExamHubClient
                    featuredExams={featuredExams}
                    groupedExams={groupedExams}
                    totalExams={allExams.length}
                />
            </div>

            <Footer />
        </div>
    );
}
