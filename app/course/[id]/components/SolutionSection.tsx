'use client';

import { GrandSlamContent } from '../grandSlamContent';

interface SolutionSectionProps {
    content: GrandSlamContent['solution'];
    onCTAClick?: () => void;
}

export default function SolutionSection({ content, onCTAClick }: SolutionSectionProps) {
    return (
        <section className="py-20 bg-white">
            <div className="max-w-3xl mx-auto px-6">
                {/* Intro Text */}
                <p className="text-2xl text-slate-500 mb-4 text-center">
                    {content.intro}
                </p>

                {/* System Name - Big and Bold */}
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 text-center mb-8">
                    {content.systemName}
                </h2>

                {/* System Intro - ข้อความแนะนำระบบ */}
                <p className="text-2xl text-slate-600 text-center mb-12 leading-relaxed">
                    {content.systemIntro}
                </p>

                {/* Diagram Image (Optional) */}
                {content.diagramImage && (
                    <div className="mb-12 rounded-xl overflow-hidden shadow-2xl border-4 border-white mx-auto max-w-4xl">
                        <img
                            src={content.diagramImage}
                            alt="Blueprint System Diagram"
                            className="w-full h-auto object-cover"
                        />
                    </div>
                )}

                {/* Features - Simple List */}
                <div className="space-y-8">
                    {content.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-5">
                            {/* Icon */}
                            <div className="flex-shrink-0 w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">{feature.icon}</span>
                            </div>

                            {/* Content */}
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                    {index + 1}. {feature.title}
                                </h3>
                                <p className="text-xl text-slate-600 leading-relaxed">
                                    {feature.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* YouTube Video Section */}
                <div className="mt-16 text-center">
                    <p className="text-2xl md:text-3xl text-slate-700 mb-8 leading-relaxed font-medium">
                        "ลองกดดูคลิปสั้นๆ นี้แค่ 2 นาทีครับ...<br />
                        แล้วคุณจะเข้าใจว่าทำไมเด็กๆ ถึงบอกว่า 'รู้งี้มาเรียนกับครูฮีมตั้งนานแล้ว'<br />
                        <span className="text-slate-500 text-xl">(นี่คือตัวอย่างสไตล์การสอนจริงในคอร์ส)</span>"
                    </p>
                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-xl shadow-slate-300/50">
                        <iframe
                            src="https://www.youtube.com/embed/hJYJf2FHxIQ"
                            title="ตัวอย่างการสอนครูฮีม"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                        />
                    </div>

                    {/* CTA Button after Video */}
                    {onCTAClick && (
                        <button
                            onClick={onCTAClick}
                            className="mt-10 w-full max-w-md mx-auto block py-4 bg-white text-slate-900 text-lg font-medium rounded-lg hover:bg-slate-50 transition-colors border border-slate-200"
                        >
                            สมัครเลย
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
