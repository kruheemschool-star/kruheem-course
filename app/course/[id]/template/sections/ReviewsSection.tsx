"use client";
import { useState } from "react";
import type { ReviewsData } from "../types";

export default function ReviewsSection({ data }: { data: ReviewsData }) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    if (!data.images || data.images.length === 0) return null;

    return (
        <section className="w-full py-16 overflow-hidden bg-white">
            <div className="text-center mb-12 px-4">
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">
                    {data.title || "อย่าเชื่อแค่คำพูด..."} <span className="text-indigo-600">แต่จงเชื่อ &ldquo;ผลลัพธ์&rdquo;</span>
                </h2>
                {data.subtitle && <p className="text-slate-500 text-lg">{data.subtitle}</p>}
                <div className="w-24 h-1.5 bg-indigo-600 mx-auto rounded-full opacity-20 mt-4"></div>
            </div>

            <div className="relative w-full overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

                <div className="flex gap-6 animate-marquee hover:[animation-play-state:paused]">
                    {[...data.images, ...data.images].map((img, i) => (
                        <div
                            key={i}
                            className="flex-shrink-0 w-[280px] md:w-[350px] transition-transform duration-300 hover:scale-105 cursor-pointer"
                            onClick={() => setSelectedImage(img)}
                        >
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden h-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={img}
                                    alt={`Review ${i + 1}`}
                                    className="w-full h-auto object-contain"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.currentTarget.src = `https://placehold.co/400x300/indigo/white?text=Review+${(i % data.images.length) + 1}`;
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-12 right-0 md:-right-12 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white z-50 border border-white/30"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={selectedImage}
                            alt="Review fullscreen"
                            className="max-w-full max-h-[85vh] object-contain rounded-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 120s linear infinite;
                    width: max-content;
                }
            `}</style>
        </section>
    );
}
