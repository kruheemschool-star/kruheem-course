'use client';

import { GrandSlamContent } from '../grandSlamContent';

interface CTASectionProps {
    content: GrandSlamContent['cta'];
    price: number;
    onCTAClick: () => void;
}

export default function CTASection({ content, price, onCTAClick }: CTASectionProps) {
    return (
        <section className="py-20 bg-slate-50">
            <div className="max-w-3xl mx-auto px-6">
                {/* Headline */}
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 text-center mb-12">
                    {content.headline}
                </h2>

                {/* Steps - Simple */}
                <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 mb-10">
                    <h3 className="text-2xl font-bold text-slate-900 mb-6">
                        {content.stepsIntro}
                    </h3>

                    <div className="space-y-4">
                        {content.steps.map((step, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <span className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    {index + 1}
                                </span>
                                <p className="text-xl text-slate-700 pt-1">{step}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main CTA Button */}
                <button
                    onClick={onCTAClick}
                    className="w-full py-5 bg-green-600 text-white text-2xl font-bold rounded-lg hover:bg-green-700 transition-colors mb-4"
                >
                    {content.buttonText}
                </button>

                {/* Price Reminder */}
                <p className="text-center text-xl text-slate-500">
                    ราคาพิเศษเพียง <span className="font-bold text-slate-900">{price.toLocaleString()} บาท</span>
                </p>
            </div>
        </section>
    );
}
