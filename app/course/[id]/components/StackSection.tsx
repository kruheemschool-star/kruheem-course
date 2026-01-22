'use client';

import { GrandSlamContent } from '../grandSlamContent';

interface StackSectionProps {
    content: GrandSlamContent['stack'];
}

export default function StackSection({ content }: StackSectionProps) {
    return (
        <section className="py-20 bg-slate-50">
            <div className="max-w-3xl mx-auto px-6">
                {/* Section Header */}
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-10 text-center">
                    {content.intro}
                </h2>

                {/* Stack Items - Simple Table-like */}
                <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                    {content.items.map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                        >
                            {/* Left: Icon + Content */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                                <div className="min-w-0">
                                    <h3 className="text-xl font-bold text-slate-900 truncate">
                                        {item.title}
                                    </h3>
                                    <p className="text-lg text-slate-500 truncate">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Value */}
                            <div className="flex-shrink-0 ml-4 text-right">
                                {item.value === 'priceless' ? (
                                    <span className="text-lg text-slate-500">ประเมินค่าไม่ได้</span>
                                ) : (
                                    <span className="text-lg font-bold text-slate-900">
                                        ฿{item.value.toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total - Simple */}
                <div className="mt-6 p-5 bg-slate-900 text-white rounded-lg flex items-center justify-between">
                    <span className="text-2xl font-bold">รวมมูลค่าทั้งหมด</span>
                    <span className="text-4xl font-black">฿{content.totalValue.toLocaleString()}</span>
                </div>
            </div>
        </section>
    );
}
