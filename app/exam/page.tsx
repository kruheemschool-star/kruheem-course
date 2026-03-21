import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight, BarChart3 } from "lucide-react";
import { fetchAllExams, countExamsByType } from "@/lib/exam-fetch";
import ExamHubClient from "@/components/exam/ExamHubClient";

export const metadata: Metadata = {
    title: "คลังข้อสอบคณิตศาสตร์ออนไลน์ | KruHeem Course",
    description: "ฝึกทำโจทย์คณิตศาสตร์ ป.1 - ม.6 จับเวลาจำลองสอบจริง พร้อมเฉลยละเอียด ตะลุยโจทย์ O-NET, A-Level เพื่อวัดระดับความรู้",
    keywords: ["ฝึกทำโจทย์คณิต", "คลังข้อสอบ", "จับเวลาทำข้อสอบ", "จำลองสอบ", "ตะลุยโจทย์", "ข้อสอบ A-Level"],
};

export const dynamic = 'force-dynamic';

export default async function ExamHubPage() {
    const allExams = await fetchAllExams();
    const counts = countExamsByType(allExams);

    // Latest 8 exams for "ข้อสอบล่าสุด" section
    const latestExams = [...allExams]
        .sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        })
        .slice(0, 8);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans flex flex-col transition-colors">
            <Navbar />

            <div className="pt-24">
                <ExamHubClient counts={counts} latestExams={latestExams} totalExams={allExams.length} />
            </div>

            <Footer />
        </div>
    );
}
