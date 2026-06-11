"use client";
import type { GuaranteeData } from "../types";

export default function GuaranteeSection({ data }: { data: GuaranteeData }) {
    return (
        <section className="kh-sec">
            <div
                className="kh-card mx-auto max-w-[880px] overflow-hidden p-7 sm:p-10 md:p-12"
                style={{ border: "2px solid var(--kh-goodBg)", boxShadow: "var(--kh-shadow)" }}
            >
                <div className="flex flex-col items-center gap-7 md:flex-row md:gap-10">
                    <div
                        className="grid h-28 w-28 flex-shrink-0 place-items-center rounded-full md:h-36 md:w-36"
                        style={{ background: "var(--kh-goodBg)", color: "var(--kh-goodText)" }}
                    >
                        <span className="text-6xl md:text-7xl">🛡️</span>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        {data.badgeText && (
                            <span
                                className="kh-kanit mb-3 inline-block rounded-full px-4 py-1.5 text-sm font-bold"
                                style={{ background: "var(--kh-good)", color: "var(--kh-onD)" }}
                            >
                                {data.badgeText}
                            </span>
                        )}
                        <h2 className="kh-h2" style={{ fontSize: "clamp(22px, 3vw, 32px)" }}>{data.title}</h2>
                        {data.desc && <p className="kh-sub mt-3">{data.desc}</p>}

                        {data.features && data.features.length > 0 && (
                            <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                                {data.features.map((f, i) => (
                                    <span
                                        key={i}
                                        className="kh-chip"
                                        style={{ background: "var(--kh-goodBg)", borderColor: "var(--kh-goodBg)", color: "var(--kh-goodText)" }}
                                    >
                                        <span className="flex-shrink-0 font-bold">✓</span>
                                        <span>{f}</span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
