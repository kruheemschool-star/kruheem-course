"use client";
import { useState } from "react";
import type { FAQData } from "../types";

// Render inline **bold** markdown within a line of text.
function renderInline(text: string) {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i} className="font-bold" style={{ color: "var(--kh-ink)" }}>
                {part.slice(2, -2)}
            </strong>
        ) : (
            <span key={i}>{part}</span>
        )
    );
}

// Turn a plain-text answer (with \n line breaks, blank-line paragraphs,
// • bullets and **bold**) into a readable, well-spaced block.
function renderAnswer(text: string) {
    const sections = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    return (
        <div className="space-y-4">
            {sections.map((section, si) => {
                const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
                return (
                    <div key={si} className="space-y-1.5">
                        {lines.map((line, li) =>
                            line.startsWith("•") ? (
                                <div key={li} className="flex gap-2 pl-1">
                                    <span className="flex-shrink-0" style={{ color: "var(--kh-p)" }}>•</span>
                                    <span>{renderInline(line.replace(/^•\s*/, ""))}</span>
                                </div>
                            ) : (
                                <p key={li}>{renderInline(line)}</p>
                            )
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function FAQSection({ data }: { data: FAQData }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="kh-sec">
            <div className="kh-sec-head">
                <h2 className="kh-h2">{data.title || "🔥 ถามตรง-ตอบเคลียร์!"}</h2>
                {data.subtitle && <p className="kh-sub mt-3">{data.subtitle}</p>}
            </div>

            <div className="max-w-[760px] mx-auto space-y-3.5">
                {data.faqs.map((faq, i) => {
                    const isOpen = openIndex === i;
                    return (
                        <div key={i} className={`kh-accItem ${isOpen ? "open" : ""}`}>
                            <button
                                type="button"
                                className="kh-accHead"
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            >
                                <span
                                    className="kh-tintbox kh-kanit w-9 h-9 flex-shrink-0 grid place-items-center text-[15px] font-bold"
                                    style={{ borderRadius: 11, color: "var(--kh-pText)" }}
                                    aria-hidden="true"
                                >
                                    Q
                                </span>
                                <span className="kh-h3 flex-1 min-w-0" style={{ fontSize: "17.5px" }}>
                                    {faq.q}
                                </span>
                                <span className="kh-accPlus">+</span>
                            </button>
                            <div className="kh-accBody">
                                <div className="kh-accInner">
                                    <div
                                        className="px-5 sm:px-6 pb-5 pt-4 text-[15px]"
                                        style={{
                                            color: "var(--kh-body)",
                                            lineHeight: 1.7,
                                            borderTop: "1px solid var(--kh-line)",
                                        }}
                                    >
                                        {renderAnswer(faq.a)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
