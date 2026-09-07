import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { listPublicExamPapers } from "@/lib/examPapers";
import { getPaperTrust } from "@/lib/paperTrust";
import { getExamCountdown } from "@/lib/examCountdown";
import ExamPapersShop from "@/components/exampapers/ExamPapersShop";
import BlobBackground from "@/components/BlobBackground";

export const metadata: Metadata = {
    // layout ต่อท้าย "| KruHeem Course" ให้เองผ่าน title.template — ใส่ซ้ำที่นี่
    // แท็บจะขึ้นชื่อแบรนด์สองรอบ
    title: "คลังข้อสอบ PDF พร้อมเฉลย โหลดได้เลย",
    description: "ดาวน์โหลดข้อสอบคณิตศาสตร์ ม.1–ม.6 พร้อมเฉลยละเอียด เป็นไฟล์ PDF ซื้อครั้งเดียว โหลดเก็บไว้ได้ตลอด O-NET, A-Level, สอบเข้า",
    keywords: ["ข้อสอบ PDF", "ดาวน์โหลดข้อสอบ", "ข้อสอบพร้อมเฉลย", "ข้อสอบคณิต", "O-NET", "A-Level"],
    openGraph: {
        title: "คลังข้อสอบ PDF พร้อมเฉลย โหลดได้เลย | KruHeem Course",
        description: "ดาวน์โหลดข้อสอบคณิตศาสตร์ ม.1–ม.6 พร้อมเฉลยละเอียด เป็นไฟล์ PDF ซื้อครั้งเดียว โหลดเก็บไว้ได้ตลอด O-NET, A-Level, สอบเข้า",
    },
};

// ISR — admin changes reflect within 5 minutes.
export const revalidate = 300;

export default async function ExamPapersPage() {
    const [papers, trust, countdown] = await Promise.all([listPublicExamPapers(), getPaperTrust(3), getExamCountdown()]);
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 bg-dot-pattern font-sans flex flex-col transition-colors">
            {/* สีฟุ้งลอยอยู่หลังลายจุด — เนื้อหาข้างล่างต้องมี z-10 ไม่งั้นโดนสีทับ */}
            <BlobBackground />
            <Navbar />
            <div className="relative z-10 pt-24 flex-1">
                <ExamPapersShop
                    papers={papers}
                    reviews={trust.reviews}
                    reviewCount={trust.reviewCount}
                    avgRating={trust.avgRating}
                    countdown={countdown}
                />
            </div>
            <Footer />
        </div>
    );
}
