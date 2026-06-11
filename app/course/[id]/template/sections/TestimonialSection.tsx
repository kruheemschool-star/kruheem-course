"use client";
import type { TestimonialData } from "../types";

export default function TestimonialSection({ data }: { data: TestimonialData }) {
    if (!data.stories || data.stories.length === 0) return null;

    return (
        <section className="kh-sec">
            <div className="kh-sec-head">
                <h2 className="kh-h2">{data.title || "เรื่องจริงจากนักเรียน 💪"}</h2>
                {data.subtitle && <p className="kh-sub mt-3">{data.subtitle}</p>}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {data.stories.map((story, i) => (
                    <div key={i} className="kh-card kh-lift p-6 flex flex-col">
                        {/* Student */}
                        <div className="flex items-center gap-4 mb-4">
                            {story.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={story.imageUrl}
                                    alt={story.name}
                                    className="w-14 h-14 rounded-full object-cover border-2 shrink-0"
                                    style={{ borderColor: "var(--kh-pLine)" }}
                                    loading="lazy"
                                />
                            ) : (
                                <div
                                    className="kh-kanit w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-xl shrink-0"
                                    style={{
                                        background: "linear-gradient(135deg, var(--kh-p), var(--kh-p2))",
                                        color: "var(--kh-onD)",
                                        borderColor: "var(--kh-pLine)",
                                    }}
                                >
                                    {story.name.charAt(0)}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h3 className="kh-kanit font-semibold" style={{ color: "var(--kh-ink)" }}>{story.name}</h3>
                                {story.role && <p className="text-sm" style={{ color: "var(--kh-mut)" }}>{story.role}</p>}
                            </div>
                        </div>

                        {/* Score transformation */}
                        {(story.beforeScore || story.afterScore) && (
                            <div className="flex items-center justify-center flex-wrap gap-2.5 mb-4">
                                {story.beforeScore && (
                                    <span
                                        className="kh-chip"
                                        style={{ background: "var(--kh-urgBg)", color: "var(--kh-urgText)", borderColor: "transparent" }}
                                    >
                                        ก่อน
                                        <span className="kh-num font-bold text-[15px]">{story.beforeScore}</span>
                                    </span>
                                )}
                                <span aria-hidden="true" className="text-lg" style={{ color: "var(--kh-mut)" }}>→</span>
                                {story.afterScore && (
                                    <span
                                        className="kh-chip"
                                        style={{ background: "var(--kh-goodBg)", color: "var(--kh-goodText)", borderColor: "transparent" }}
                                    >
                                        หลัง
                                        <span className="kh-num font-bold text-[15px]">{story.afterScore}</span>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Quote */}
                        <div className="relative mt-1">
                            <span
                                aria-hidden="true"
                                className="kh-kanit absolute -top-2 -left-1 text-5xl leading-none select-none"
                                style={{ color: "var(--kh-pLine)" }}
                            >
                                “
                            </span>
                            <p className="relative pl-7 leading-relaxed" style={{ color: "var(--kh-body)" }}>{story.quote}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
