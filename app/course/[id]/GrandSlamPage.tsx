'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { GrandSlamContent } from './grandSlamContent';
import HookSection from './components/HookSection';
import ProblemSection from './components/ProblemSection';
import SolutionSection from './components/SolutionSection';
import StackSection from './components/StackSection';
import PriceDropSection from './components/PriceDropSection';
import ScarcitySection from './components/ScarcitySection';
import GuaranteeSection from './components/GuaranteeSection';
import CTASection from './components/CTASection';

interface GrandSlamPageProps {
    content: GrandSlamContent;
    courseId: string;
    courseTitle: string;
    enrollmentStatus: 'none' | 'pending' | 'approved';
    attendanceStatus: 'none' | 'good' | 'warning' | 'critical';
    user: any;
    onLogin: () => Promise<void>;
}

export default function GrandSlamPage({
    content,
    courseId,
    courseTitle,
    enrollmentStatus,
    attendanceStatus,
    user,
    onLogin,
}: GrandSlamPageProps) {
    const router = useRouter();

    const handlePaymentClick = async () => {
        if (user) {
            router.push('/payment');
        } else {
            await onLogin();
        }
    };

    const displayPrice = content.pricing.isEarlyBird
        ? content.pricing.earlyBirdPrice
        : content.pricing.regularPrice;

    // If user is already enrolled, show different UI
    if (enrollmentStatus === 'approved') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
                <Navbar />
                <div className="pt-32 pb-20">
                    <div className="max-w-3xl mx-auto px-6 text-center">
                        {/* Attendance Banner */}
                        {attendanceStatus === 'critical' && (
                            <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-4">
                                <div className="p-3 bg-white rounded-full text-2xl shadow-sm">🚨</div>
                                <div className="text-left">
                                    <h3 className="font-bold text-rose-700 text-lg">หายไปนานเลยนะ!</h3>
                                    <p className="text-rose-600 text-sm mt-1">ไม่ได้เข้าเรียนมาเกิน 7 วันแล้ว กลับมาลุยต่อเถอะ!</p>
                                </div>
                            </div>
                        )}
                        {attendanceStatus === 'warning' && (
                            <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-4">
                                <div className="p-3 bg-white rounded-full text-2xl shadow-sm">⚡</div>
                                <div className="text-left">
                                    <h3 className="font-bold text-amber-700 text-lg">อย่าลืมแวะมาทบทวนนะ</h3>
                                    <p className="text-amber-600 text-sm mt-1">ไม่ได้เข้าเรียนมาเกิน 3 วันแล้ว แวะมาดูคลิปสั้นๆ สักหน่อยก็ยังดีครับ</p>
                                </div>
                            </div>
                        )}
                        {attendanceStatus === 'good' && (
                            <div className="mb-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-4">
                                <div className="p-3 bg-white rounded-full text-2xl shadow-sm">🔥</div>
                                <div className="text-left">
                                    <h3 className="font-bold text-emerald-700 text-lg">สุดยอดมาก! ขยันสุดๆ</h3>
                                    <p className="text-emerald-600 text-sm mt-1">เข้าเรียนสม่ำเสมอแบบนี้ เกรด 4 รออยู่แน่นอนครับ!</p>
                                </div>
                            </div>
                        )}

                        <div className="text-6xl mb-6">🎉</div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
                            ยินดีต้อนรับกลับสู่ห้องเรียน!
                        </h1>
                        <p className="text-xl text-slate-600 mb-8">
                            คุณลงทะเบียนคอร์ส <span className="font-bold text-indigo-600">{courseTitle}</span> เรียบร้อยแล้ว
                        </p>

                        <Link href={`/learn/${courseId}`}>
                            <button className="group relative px-12 py-5 rounded-2xl font-bold text-xl text-white overflow-hidden transition-all hover:scale-105 shadow-xl shadow-emerald-200/50">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500" />
                                <div className="relative flex items-center justify-center gap-3">
                                    <span>เข้าสู่ห้องเรียน</span>
                                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </div>
                            </button>
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    // If user has pending enrollment
    if (enrollmentStatus === 'pending') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
                <Navbar />
                <div className="pt-32 pb-20">
                    <div className="max-w-3xl mx-auto px-6 text-center">
                        <div className="text-6xl mb-6 animate-pulse">⏳</div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">
                            รอตรวจสอบการชำระเงิน
                        </h1>
                        <p className="text-xl text-slate-600 mb-8">
                            เราได้รับการลงทะเบียนของคุณแล้ว กำลังตรวจสอบสลิปการโอนเงิน
                        </p>
                        <div className="flex items-center justify-center gap-2 text-amber-600">
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                            <span className="font-semibold">ปกติใช้เวลา 1-2 ชั่วโมงในเวลาทำการ</span>
                        </div>

                        <button
                            onClick={() => router.push('/payment')}
                            className="mt-8 px-8 py-4 rounded-2xl font-bold bg-white border border-amber-200 text-amber-700 shadow-lg hover:shadow-xl transition-all"
                        >
                            ดูสถานะการลงทะเบียน
                        </button>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    // Main Grand Slam Offer Page
    return (
        <div className="min-h-screen bg-white font-sans text-slate-800">
            <Navbar />

            {/* Section 1: The Hook */}
            <HookSection content={content.hook} />

            {/* Section 2: The Problem */}
            <ProblemSection content={content.problem} />

            {/* Section 3: The Solution */}
            <SolutionSection content={content.solution} />

            {/* Section 4: The Stack */}
            <StackSection content={content.stack} />

            {/* Section 5: Price Drop */}
            <PriceDropSection
                content={content.pricing}
                stack={content.stack}
                onCTAClick={handlePaymentClick}
            />

            {/* Section 6: Scarcity */}
            <ScarcitySection
                content={content.scarcity}
                regularPrice={content.pricing.regularPrice}
            />

            {/* Section 7: Guarantee */}
            <GuaranteeSection
                content={content.guarantee}
                price={displayPrice}
            />

            {/* Section 8: CTA */}
            <CTASection
                content={content.cta}
                price={displayPrice}
                onCTAClick={handlePaymentClick}
            />

            <Footer />
        </div>
    );
}
