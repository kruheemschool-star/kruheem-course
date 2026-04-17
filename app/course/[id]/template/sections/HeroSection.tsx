"use client";
import type { HeroData, SectionContext } from "../types";

interface Props {
    data: HeroData;
    ctx: SectionContext;
}

export default function HeroSection({ data, ctx }: Props) {
    const [blob1, blob2] = data.blobColors || ["bg-indigo-200/40", "bg-rose-200/40"];

    return (
        <header className="relative pt-32 pb-20 bg-gradient-to-b from-[#F8F9FD] via-white to-[#F8F9FD] overflow-hidden">
            {/* Decorative blobs */}
            <div className={`absolute top-10 left-10 w-72 h-72 rounded-full blur-3xl animate-blob ${blob1}`}></div>
            <div className={`absolute bottom-10 right-10 w-72 h-72 rounded-full blur-3xl animate-blob animation-delay-2000 ${blob2}`}></div>

            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-16 items-center relative z-10">
                <div className="flex-1 space-y-8 text-center md:text-left">
                    {data.badgeText && (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/50 bg-white/30 backdrop-blur-md shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="text-sm font-bold text-slate-600 tracking-wide uppercase">
                                {data.badgeText}
                            </span>
                        </div>
                    )}

                    <h1 className="text-5xl md:text-7xl font-black leading-relaxed tracking-tight text-slate-800">
                        {data.title}
                    </h1>

                    {data.subtitle && (
                        <p className="text-xl md:text-2xl text-slate-600 font-medium">{data.subtitle}</p>
                    )}

                    <div className="flex flex-col items-center md:items-start gap-5 pt-2">
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <button
                                onClick={ctx.onCTAClick}
                                className="group relative px-10 py-5 rounded-2xl font-bold text-xl text-white overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-200/50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                                <div className="relative flex items-center gap-3">
                                    <span>{data.ctaText || "สมัครเรียนทันที"}</span>
                                    {data.ctaPriceText && (
                                        <span className="bg-white/20 border border-white/20 px-2 py-0.5 rounded text-sm backdrop-blur-sm">
                                            {data.ctaPriceText}
                                        </span>
                                    )}
                                </div>
                            </button>

                            {data.secondaryCtaText && (
                                <a
                                    href={`/learn/${ctx.courseId}`}
                                    className="px-10 py-5 rounded-2xl font-bold text-xl text-slate-600 bg-white/50 border border-white/60 backdrop-blur-md hover:bg-white transition-all flex items-center gap-2"
                                >
                                    <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-500 shadow-sm">▶</span>
                                    {data.secondaryCtaText}
                                </a>
                            )}
                        </div>

                        {data.pricePerDayText && (
                            <div className="flex items-center gap-2 text-lg text-slate-600 font-medium bg-white/40 px-6 py-3 rounded-full backdrop-blur-sm border border-white/50 w-fit shadow-sm">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <p>{data.pricePerDayText}</p>
                            </div>
                        )}
                    </div>
                </div>

                {(data.imageUrl || ctx.courseImage) && (
                    <div className="w-full md:w-5/12">
                        <div className="relative rounded-[2.5rem] p-3 bg-white/30 backdrop-blur-xl border border-white/50 shadow-2xl shadow-indigo-100/50 transition-all duration-500 hover:scale-[1.02] hover:-rotate-1">
                            <div className="relative rounded-[2rem] overflow-hidden shadow-inner">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={data.imageUrl || ctx.courseImage}
                                    alt={ctx.courseTitle}
                                    className="w-full h-auto object-cover"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
            `}</style>
        </header>
    );
}
