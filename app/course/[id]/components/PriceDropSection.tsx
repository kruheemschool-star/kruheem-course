'use client';

import { GrandSlamContent } from '../grandSlamContent';

interface PriceDropSectionProps {
    content: GrandSlamContent['pricing'];
    stack: GrandSlamContent['stack'];
    onCTAClick: () => void;
}

export default function PriceDropSection({ content, stack, onCTAClick }: PriceDropSectionProps) {
    const displayPrice = content.isEarlyBird ? content.earlyBirdPrice : content.regularPrice;
    const savings = stack.totalValue - displayPrice;

    return (
        <section className="py-20 bg-white">
            <div className="max-w-3xl mx-auto px-6 text-center">
                {/* Total Value Intro */}
                <p className="text-2xl text-slate-600 mb-4">
                    {content.totalValueIntro}
                </p>

                {/* Total Value */}
                <p className="text-5xl font-black text-slate-900 mb-12">
                    {stack.totalValue.toLocaleString()} บาท
                </p>

                {/* Price Drop Intro */}
                <p className="text-3xl md:text-4xl text-slate-700 mb-8 leading-normal font-bold">
                    แต่เดี๋ยวก่อน...<br />
                    ผมไม่ได้ทำคอร์สนี้มา<br />
                    เพื่อจะรวยจากการขายแพงๆ<br />
                    แต่ผมต้องการสร้าง "ผลลัพธ์"
                </p>

                {/* Not Pay Text */}
                <p className="text-xl text-slate-500 mb-2">
                    {content.notPayText}
                </p>

                {/* Original Price - Strikethrough */}
                <p className="text-4xl text-slate-400 line-through decoration-2 mb-8">
                    {stack.totalValue.toLocaleString()} บาท
                </p>

                {/* Early Bird Label */}
                <p className="text-xl text-slate-500 mb-4">สำหรับรุ่น Early Bird ราคาที่เพียง</p>

                {/* Final Price - Big and Bold */}
                <p className="text-7xl md:text-8xl font-black text-slate-900 mb-2 leading-relaxed">
                    {displayPrice.toLocaleString()} บาท<br />
                    เท่านั้น!
                </p>
                <p className="text-2xl text-slate-500 mb-8">
                    (ประหยัดทันที {savings.toLocaleString()} บาท!)
                </p>

                {/* CTA Button - Simple */}
                <button
                    onClick={onCTAClick}
                    className="w-full max-w-md py-4 bg-slate-900 text-white text-2xl font-bold rounded-lg hover:bg-slate-800 transition-colors"
                >
                    จองสิทธิ์ราคา {displayPrice.toLocaleString()} บาท
                </button>

                <div className="flex items-center justify-center gap-2 mt-4 text-slate-500 text-sm md:text-base">
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        การันตีคืนเงิน 100%
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>🔒 ชำระเงินปลอดภัย</span>
                </div>
            </div>
        </section>
    );
}
