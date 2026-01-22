'use client';

import { GrandSlamContent } from '../grandSlamContent';

interface ScarcitySectionProps {
    content: GrandSlamContent['scarcity'];
    regularPrice: number;
}

export default function ScarcitySection({ content, regularPrice }: ScarcitySectionProps) {
    return (
        <section className="py-16 bg-slate-50">
            <div className="max-w-3xl mx-auto px-6">
                {/* Question */}
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 text-center mb-8">
                    {content.question}
                </h2>

                {/* Answer - Simple Card */}
                <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8">
                    {/* Answer Intro */}
                    <p className="text-2xl text-center mb-4">
                        {content.answer}
                    </p>

                    {/* Limited Spots */}
                    <p className="text-3xl text-center mb-6 font-black text-slate-900">
                        "ผมรับจำกัดแค่ {content.limitedSpots} คนแรก"
                    </p>

                    {/* Reason */}
                    <div className="p-5 bg-slate-50 rounded-lg mb-6">
                        <p className="text-xl text-slate-700 leading-relaxed">
                            {content.reason}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
