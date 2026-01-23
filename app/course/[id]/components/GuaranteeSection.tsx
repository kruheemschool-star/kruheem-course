'use client';

import { GrandSlamContent } from '../grandSlamContent';

interface GuaranteeSectionProps {
    content: GrandSlamContent['guarantee'];
    price: number;
}

export default function GuaranteeSection({ content, price }: GuaranteeSectionProps) {
    return (
        <section className="py-16 bg-white">
            <div className="max-w-3xl mx-auto px-6">
                {/* Main Card */}
                <div className="text-center p-8 md:p-12 border-2 border-slate-200 rounded-lg mb-10">
                    {/* Shield Icon */}
                    <div className="text-5xl mb-6">🛡️</div>

                    {/* Title */}
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">
                        {content.title}
                    </h2>

                    {/* Promise */}
                    <p className="text-2xl text-slate-600 leading-relaxed mb-8 max-w-xl mx-auto">
                        {content.promise}
                    </p>

                    {/* Zero Risk - Custom Layout */}
                    <div className="flex flex-col items-center justify-center pt-2">
                        {content.zeroRiskText.split('<br>').map((text, index, arr) => {
                            if (index === arr.length - 1) {
                                // The "0" - MASSIVE & BLACK (Even Bigger)
                                return (
                                    <p key={index} className="text-[15rem] md:text-[20rem] leading-[0.8] font-black text-slate-900 tracking-tighter mt-4 mb-8">
                                        {text}
                                    </p>
                                );
                            }
                            // Text lines
                            return (
                                <p key={index} className={`font-black text-slate-900 ${index === 0 ? "text-2xl md:text-3xl text-slate-600 mb-2 font-bold" : "text-3xl md:text-5xl"
                                    }`}>
                                    {text}
                                </p>
                            );
                        })}
                    </div>
                </div>

                {/* Link Warnings - Full text */}
                <div className="space-y-4">
                    {content.linkWarning.map((warning, index) => (
                        <p
                            key={index}
                            className={`text-center ${index === 0
                                ? 'text-2xl font-bold text-slate-900'
                                : 'text-xl text-slate-600'
                                } leading-relaxed`}
                        >
                            {warning}
                        </p>
                    ))}
                </div>
            </div>
        </section>
    );
}
