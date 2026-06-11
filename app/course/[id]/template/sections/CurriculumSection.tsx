"use client";
import { useState } from "react";
import type { CurriculumData } from "../types";

export default function CurriculumSection({ data }: { data: CurriculumData }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="kh-sec">
            <div className="kh-sec-head">
                <h2 className="kh-h2">{data.title}</h2>
                {data.subtitle && <p className="kh-sub mt-3">{data.subtitle}</p>}
            </div>

            <div className="max-w-[820px] mx-auto space-y-3.5">
                {data.chapters.map((ch, i) => {
                    const isOpen = openIndex === i;
                    return (
                        <div key={ch.id} className={`kh-accItem ${isOpen ? "open" : ""}`}>
                            <button
                                type="button"
                                className="kh-accHead"
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            >
                                <span
                                    className="kh-num w-11 h-11 flex-shrink-0 rounded-xl grid place-items-center text-lg font-bold transition-colors duration-300"
                                    style={
                                        isOpen
                                            ? { background: "var(--kh-p)", color: "var(--kh-onD)" }
                                            : { background: "var(--kh-pT)", color: "var(--kh-pText)" }
                                    }
                                >
                                    {i + 1}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="kh-h3 block">{ch.title}</span>
                                    {ch.desc && (
                                        <span className="block text-sm mt-0.5" style={{ color: "var(--kh-mut)" }}>
                                            {ch.desc}
                                        </span>
                                    )}
                                </span>
                                <span className="kh-accPlus">+</span>
                            </button>
                            <div className="kh-accBody">
                                <div className="kh-accInner">
                                    <ul className="px-5 pb-5 pt-1 sm:pl-[78px] sm:pr-14 space-y-2.5">
                                        {ch.content.map((item, j) => (
                                            <li
                                                key={j}
                                                className="flex items-start gap-2.5 leading-relaxed"
                                                style={{ color: "var(--kh-body)" }}
                                            >
                                                <span
                                                    className="flex-shrink-0 mt-0.5 text-[15px] font-bold"
                                                    style={{ color: "var(--kh-p)" }}
                                                    aria-hidden="true"
                                                >
                                                    ✓
                                                </span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
