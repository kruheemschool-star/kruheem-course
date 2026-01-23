'use client';

interface CalloutPoint {
    id: number;
    title: string;
    description: string;
    position: 'left' | 'right';
    dotPosition: { top: string; left: string };
    textPosition: { top: string };
}

const calloutPoints: CalloutPoint[] = [
    {
        id: 1,
        title: 'Check Point กันพลาด',
        description: 'มีการทบทวนความรู้เดิมก่อนเริ่มเรื่องใหม่ เพื่อปิดรอยรั่ว ป้องกันเด็กงงกลางทาง',
        position: 'left',
        dotPosition: { top: '12%', left: '35%' },
        textPosition: { top: '8%' },
    },
    {
        id: 2,
        title: 'Visual Concept',
        description: 'สรุปหลักการด้วยสีและภาพ จำง่ายกว่าท่องตัวหนังสือยาวๆ เห็นปุ๊บเข้าใจปั๊บ',
        position: 'right',
        dotPosition: { top: '38%', left: '70%' },
        textPosition: { top: '32%' },
    },
    {
        id: 3,
        title: 'Algorithm Logic (สอนคิดเป็นระบบ)',
        description: 'แยกกระบวนการคิดทีละขั้นตอน (Step 1 → Step 2) ช่วยให้เด็กแก้โจทย์เป็นระบบ ไม่สับสนเครื่องหมาย',
        position: 'right',
        dotPosition: { top: '68%', left: '65%' },
        textPosition: { top: '62%' },
    },
];

export default function AnatomySection() {
    return (
        <section className="py-20 bg-slate-50 overflow-hidden">
            <div className="max-w-6xl mx-auto px-6">
                {/* Section Title */}
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 text-center mb-4">
                    🔬 เจาะลึกเบื้องหลังความสำเร็จ
                </h2>
                <p className="text-xl text-slate-500 text-center mb-12 max-w-2xl mx-auto">
                    ดูให้ดี ทุกจุดในเอกสารนี้ ถูกออกแบบมาเพื่อ &quot;แก้ปัญหาเด็กอ่อนเลข&quot; โดยเฉพาะ
                </p>

                {/* Desktop Layout */}
                <div className="hidden md:block relative max-w-[1000px] mx-auto" style={{ minHeight: '800px' }}>

                    {/* Main Image Container - Centered */}
                    <div className="absolute left-1/2 top-10 transform -translate-x-1/2 w-[480px] z-10 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/course-doc-main.jpg"
                            alt="เอกสารประกอบการเรียน"
                            className="w-full h-auto rounded-xl shadow-2xl shadow-slate-300 transform transition-transform duration-700 hover:rotate-0 -rotate-1 relative z-20"
                        />

                        {/* Avatar A: Climbing (Bottom Center) */}
                        {/* Hands over paper (z-50), body below. Using high z-index but positioned at bottom edge. */}
                        <div className="absolute bottom-[6px] left-[calc(50%-150px)] transform -translate-x-1/2 translate-y-4 w-52 z-50 transition-transform duration-500 hover:translate-y-0 filter drop-shadow-2xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/avatar-climbing.png"
                                alt="น้องแว่นสงสัย"
                                className="w-full h-auto object-contain"
                            />
                        </div>

                        {/* Avatar B: Pop-out (Bottom Right) */}
                        {/* Pop-out over everything (z-50) - Moved down to clear text boxes */}
                        <div className="absolute top-[320px] -right-[166px] w-48 z-50 transition-transform duration-500 hover:translate-x-2 filter drop-shadow-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/avatar-popout.png"
                                alt="น้องแว่นแลบลิ้น"
                                className="w-full h-auto object-contain transform rotate-6"
                            />
                        </div>
                    </div>

                    {/* SVG Connector Layer */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                        <defs>
                            <marker id="dot-red" markerWidth="8" markerHeight="8" refX="4" refY="4">
                                <circle cx="4" cy="4" r="3" fill="#fb7185" />
                            </marker>
                        </defs>

                        {/* Line 1: Check Point (Left Top) */}
                        <path
                            d="M 420 180 L 300 180 L 300 140"
                            fill="none"
                            stroke="#fb7185"
                            strokeWidth="2"
                            strokeDasharray="6,4"
                        />
                        <circle cx="420" cy="180" r="6" fill="#fb7185" className="animate-ping opacity-75" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
                        <circle cx="420" cy="180" r="6" fill="#fb7185" stroke="white" strokeWidth="2" />

                        {/* Line 2: Visual Concept (Right Top) */}
                        <path
                            d="M 650 350 L 750 350 L 750 300"
                            fill="none"
                            stroke="#fb7185"
                            strokeWidth="2"
                            strokeDasharray="6,4"
                        />
                        <circle cx="650" cy="350" r="6" fill="#fb7185" className="animate-ping opacity-75" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
                        <circle cx="650" cy="350" r="6" fill="#fb7185" stroke="white" strokeWidth="2" />

                        {/* Line 3: Algorithm Logic (Right Bottom) */}
                        <path
                            d="M 600 490 L 750 490 L 750 620"
                            fill="none"
                            stroke="#fb7185"
                            strokeWidth="2"
                            strokeDasharray="6,4"
                        />
                        <circle cx="600" cy="490" r="6" fill="#fb7185" className="animate-ping opacity-75" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
                        <circle cx="600" cy="490" r="6" fill="#fb7185" stroke="white" strokeWidth="2" />
                    </svg>

                    {/* Check Point Text Box (Left) */}
                    <div className="absolute top-[80px] left-0 w-[280px] z-30">
                        <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-100 relative group hover:-translate-y-1 transition-transform cursor-default">
                            <div className="absolute top-[60px] -right-3 w-4 h-4 bg-white transform -translate-y-1/2 rotate-45 border-r border-t border-slate-100"></div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="w-8 h-8 bg-rose-400 text-white rounded-lg flex items-center justify-center font-bold shadow-md shadow-rose-200">1</span>
                                <h4 className="font-bold text-slate-800 text-lg">Check Point กันพลาด</h4>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                มีการทบทวนความรู้เดิมก่อนเริ่มเรื่องใหม่ เพื่อปิดรอยรั่ว ป้องกันเด็กงงกลางทาง
                            </p>
                        </div>
                    </div>

                    {/* Visual Concept Text Box (Right) */}
                    <div className="absolute top-[220px] right-0 w-[280px] z-30">
                        <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-100 relative group hover:-translate-y-1 transition-transform cursor-default">
                            <div className="absolute top-[80px] -left-3 w-4 h-4 bg-white transform -translate-y-1/2 rotate-45 border-l border-b border-slate-100"></div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="w-8 h-8 bg-rose-400 text-white rounded-lg flex items-center justify-center font-bold shadow-md shadow-rose-200">2</span>
                                <h4 className="font-bold text-slate-800 text-lg">Visual Concept</h4>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                สรุปหลักการด้วยสีและภาพ จำง่ายกว่าท่องตัวหนังสือยาวๆ เห็นปุ๊บเข้าใจปั๊บ
                            </p>
                        </div>
                    </div>

                    {/* Algorithm Logic Text Box (Right Bottom) */}
                    <div className="absolute top-[640px] right-0 w-[280px] z-30">
                        <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-100 relative group hover:-translate-y-1 transition-transform cursor-default">
                            <div className="absolute -top-3 left-10 w-4 h-4 bg-white transform rotate-45 border-l border-t border-slate-100"></div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="w-8 h-8 bg-rose-400 text-white rounded-lg flex items-center justify-center font-bold shadow-md shadow-rose-200">3</span>
                                <h4 className="font-bold text-slate-800 text-lg">Algorithm Logic</h4>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                แยกกระบวนการคิดทีละขั้นตอน (Step 1 → Step 2) ช่วยให้เด็กแก้โจทย์เป็นระบบ ไม่สับสนเครื่องหมาย
                            </p>
                        </div>
                    </div>

                </div>

                {/* Mobile Layout - Stacked */}
                <div className="md:hidden">
                    {/* Main Document Image */}
                    <div className="mb-8 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/course-doc-main.jpg"
                            alt="เอกสารประกอบการเรียน"
                            className="w-full h-auto rounded-2xl shadow-xl"
                        />
                        {/* Avatar on Mobile - Climbing */}
                        <div className="absolute -bottom-6 right-0 w-24 z-20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/avatar-climbing.png"
                                alt="น้องนักเรียน"
                                className="w-full h-auto rounded-xl shadow-lg"
                            />
                        </div>
                    </div>

                    {/* Stacked Callout Cards */}
                    <div className="space-y-4 mt-8">
                        {calloutPoints.map((point) => (
                            <div
                                key={point.id}
                                className="bg-white rounded-xl p-5 border-2 border-rose-100 shadow-sm"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-8 h-8 bg-rose-400 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                        {point.id}
                                    </span>
                                    <div>
                                        <h4 className="font-bold text-slate-900 mb-1">{point.title}</h4>
                                        <p className="text-slate-600 text-sm leading-relaxed">{point.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
