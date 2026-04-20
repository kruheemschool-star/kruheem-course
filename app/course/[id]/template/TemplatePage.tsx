"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SalesPageConfig, SectionContext } from "./types";
import { renderSection } from "./sectionRegistry";
import StickyCTA from "./boosters/StickyCTA";
import SocialProofToast from "./boosters/SocialProofToast";
import ExitIntentPopup from "./boosters/ExitIntentPopup";

interface Props {
    config: SalesPageConfig;
    courseId: string;
    courseTitle: string;
    coursePrice: number;
    courseFullPrice?: number;
    courseImage?: string;
    user: any;
    enrollmentStatus: "none" | "pending" | "approved";
    onLogin: () => Promise<void>;
}

export default function TemplatePage({
    config,
    courseId,
    courseTitle,
    coursePrice,
    courseFullPrice,
    courseImage,
    user,
    enrollmentStatus,
    onLogin,
}: Props) {
    const router = useRouter();

    const handleCTAClick = async () => {
        if (user) {
            router.push("/payment");
        } else {
            await onLogin();
        }
    };

    // Enrolled users → redirect to learning page preview
    if (enrollmentStatus === "approved") {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
                <Navbar />
                <div className="pt-32 pb-20 max-w-3xl mx-auto px-6 text-center">
                    <div className="text-6xl mb-6">🎉</div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
                        ยินดีต้อนรับกลับสู่ห้องเรียน!
                    </h1>
                    <p className="text-xl text-slate-600 mb-8">
                        คุณลงทะเบียนคอร์ส <span className="font-bold text-indigo-600">{courseTitle}</span> เรียบร้อยแล้ว
                    </p>
                    <Link
                        href={`/learn/${courseId}`}
                        prefetch={false}
                        className="inline-block px-12 py-5 rounded-2xl font-bold text-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                        เข้าสู่ห้องเรียน →
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    if (enrollmentStatus === "pending") {
        return (
            <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
                <Navbar />
                <div className="pt-32 pb-20 max-w-3xl mx-auto px-6 text-center">
                    <div className="text-6xl mb-6 animate-pulse">⏳</div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
                        รอตรวจสอบการชำระเงิน
                    </h1>
                    <p className="text-xl text-slate-600 mb-8">
                        เราได้รับการลงทะเบียนของคุณแล้ว กำลังตรวจสอบสลิปการโอนเงิน
                    </p>
                    <button
                        onClick={() => router.push("/payment")}
                        className="mt-4 px-8 py-4 rounded-2xl font-bold bg-white border border-amber-200 text-amber-700 shadow-lg hover:shadow-xl transition-all active:scale-95"
                    >
                        ดูสถานะการลงทะเบียน
                    </button>
                </div>
                <Footer />
            </div>
        );
    }

    // Filter + sort sections
    const visibleSections = [...config.sections]
        .filter((s) => s.enabled !== false)
        .sort((a, b) => a.order - b.order);

    const ctx: SectionContext = {
        courseId,
        courseTitle,
        coursePrice,
        courseFullPrice,
        courseImage,
        user,
        enrollmentStatus,
        onCTAClick: handleCTAClick,
    };

    const boosters = config.boosters;

    return (
        <div className="min-h-screen bg-[#F8F9FD] font-sans text-slate-800">
            <Navbar />
            <main className="pb-24">
                {visibleSections.map((section) => (
                    <div key={section.id}>{renderSection(section, ctx)}</div>
                ))}
            </main>
            <Footer />

            {/* Conversion Boosters */}
            {boosters?.stickyCTA?.enabled && (
                <StickyCTA config={boosters.stickyCTA} onCTAClick={handleCTAClick} courseTitle={courseTitle} />
            )}
            {boosters?.socialProof?.enabled && (
                <SocialProofToast config={boosters.socialProof} />
            )}
            {boosters?.exitIntent?.enabled && (
                <ExitIntentPopup config={boosters.exitIntent} onCTAClick={handleCTAClick} courseId={courseId} />
            )}
        </div>
    );
}
