"use client";
import type { TestimonialData } from "../types";

export default function TestimonialSection({ data }: { data: TestimonialData }) {
    if (!data.stories || data.stories.length === 0) return null;

    return (
        <section className="max-w-6xl mx-auto px-6 py-16">
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
                    {data.title || "เรื่องจริงจากนักเรียน 💪"}
                </h2>
                {data.subtitle && <p className="text-lg text-slate-500 max-w-2xl mx-auto">{data.subtitle}</p>}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.stories.map((story, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md hover:shadow-xl transition-all"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            {story.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={story.imageUrl}
                                    alt={story.name}
                                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-100"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                                    {story.name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-slate-800">{story.name}</h3>
                                {story.role && <p className="text-sm text-slate-500">{story.role}</p>}
                            </div>
                        </div>

                        {(story.beforeScore || story.afterScore) && (
                            <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-r from-red-50 to-emerald-50 rounded-2xl">
                                {story.beforeScore && (
                                    <div className="flex-1 text-center">
                                        <p className="text-xs text-slate-500 mb-1">ก่อน</p>
                                        <p className="font-bold text-red-500 text-lg">{story.beforeScore}</p>
                                    </div>
                                )}
                                <span className="text-slate-400 text-xl">→</span>
                                {story.afterScore && (
                                    <div className="flex-1 text-center">
                                        <p className="text-xs text-slate-500 mb-1">หลัง</p>
                                        <p className="font-bold text-emerald-600 text-lg">{story.afterScore}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <p className="text-slate-600 leading-relaxed italic">&ldquo;{story.quote}&rdquo;</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
