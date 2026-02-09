'use client';

import { GrandSlamContent } from '../grandSlamContent';
import RiskReversalCard from './RiskReversalCard';

interface CTASectionProps {
    content: GrandSlamContent['cta'];
    price: number;
    onCTAClick: () => void;
    courseTitle?: string;
}

export default function CTASection({ content, price, onCTAClick, courseTitle = "คอร์สเรียนเพิ่มเกรด" }: CTASectionProps) {
    return (
        <section className="py-24 bg-slate-50 overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">

                {/* Left Column: Risk Card */}
                <div className="order-2 lg:order-1">
                    <RiskReversalCard
                        title={courseTitle}
                        subtitle="ความเสี่ยงเดียวที่คุณมีตอนนี้"
                        items={[
                            "คือการปิดหน้านี้ทิ้งไป",
                            "แล้วปล่อยให้เด็กๆ ต้องทนเรียน...",
                            "แบบงงๆ ต่อไป (เหมือนเดิม)"
                        ]}
                    />
                </div>

                {/* Right Column: CTA & Guarantee */}
                <div className="order-1 lg:order-2 text-center lg:text-left">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-6 leading-relaxed">
                        {content.stepsIntro || "อย่าปล่อยให้โอกาสหลุดมือ"}
                    </h2>

                    <p className="text-lg text-slate-600 mb-10 leading-relaxed">
                        การตัดสินใจของคุณในวันนี้ อาจเปลี่ยนอนาคตของลูกคุณไปตลอดกาล
                        ที่นี่เรามีความรู้และเทคนิคที่พร้อมส่งต่อให้เขาเก่งขึ้นทันที
                        <br /><br />
                        <span className="font-bold text-slate-900">ไม่ต้องเสี่ยงอะไรเลย!</span> เพราะเรารับประกันความพอใจ
                    </p>

                    {/* Main CTA Button */}
                    <button
                        onClick={onCTAClick}
                        className="w-full max-w-md py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-2xl font-bold rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.6)] hover:-translate-y-1 transform duration-200"
                    >
                        {content.buttonText}
                    </button>

                    <div className="flex flex-col md:flex-row items-center justify-center lg:justify-start gap-4 mt-8 text-sm md:text-base">
                        <span className="flex items-center gap-2 text-emerald-700 font-bold bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            รับประกันคืนเงินภายใน 7 วัน
                        </span>
                        <span className="text-slate-400 hidden md:inline">|</span>
                        <p className="text-lg text-slate-500">
                            ราคาเพียง <span className="font-black text-slate-900 text-2xl">{price.toLocaleString()}.-</span>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
