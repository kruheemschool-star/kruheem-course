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
                <p className="text-2xl text-slate-600 mb-8 leading-relaxed">
                    {content.priceDropIntro}
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
                <p className="text-xl text-slate-500 mb-4">สำหรับรุ่น Early Bird ผมเปิดราคาที่:</p>

                {/* Final Price - Big and Bold */}
                <p className="text-7xl md:text-8xl font-black text-slate-900 mb-2">
                    💥 {displayPrice.toLocaleString()} บาท เท่านั้น! 💥
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

                <p className="text-slate-400 text-lg mt-4">
                    🔒 ชำระเงินอย่างปลอดภัย • เริ่มเรียนได้ทันที
                </p>
            </div>
        </section>
    );
}
