"use client";
import type { ComparisonData } from "../types";

export default function ComparisonSection({ data }: { data: ComparisonData }) {
    return (
        <section className="kh-sec">
            <div className="kh-sec-head">
                <h2 className="kh-h2">{data.title || "ทำไมต้องเลือกเรา?"}</h2>
                {data.subtitle && <p className="kh-sub mt-3">{data.subtitle}</p>}
            </div>

            <div className="grid md:grid-cols-3 gap-5 md:gap-6 pt-3">
                {data.columns.map((col, i) => (
                    <div
                        key={i}
                        className={
                            col.highlight
                                ? "relative order-first md:order-none rounded-[20px] border-2 p-6 md:p-7 lg:scale-[1.03]"
                                : "kh-card kh-lift p-6 md:p-7"
                        }
                        style={
                            col.highlight
                                ? {
                                      borderColor: "var(--kh-p)",
                                      background: "var(--kh-tint)",
                                      boxShadow: "var(--kh-shadow)",
                                  }
                                : undefined
                        }
                    >
                        {col.highlight && (
                            <span
                                className="kh-kanit absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[13px] font-bold whitespace-nowrap"
                                style={{
                                    background: "var(--kh-p)",
                                    color: "var(--kh-onD)",
                                    boxShadow: "var(--kh-shadow-sm)",
                                }}
                            >
                                แนะนำ
                            </span>
                        )}
                        <h3 className="kh-h3 mb-5 text-center">{col.title}</h3>
                        <ul className="space-y-3.5">
                            {col.features.map((feat, j) => (
                                <li key={j} className="flex items-start gap-3">
                                    {feat.included ? (
                                        <span
                                            className="flex-shrink-0 mt-0.5 text-[17px] font-bold"
                                            style={{ color: "var(--kh-good)" }}
                                            aria-hidden="true"
                                        >
                                            ✓
                                        </span>
                                    ) : (
                                        <span
                                            className="flex-shrink-0 mt-0.5 text-[17px] font-bold"
                                            style={{ color: "var(--kh-mut)" }}
                                            aria-hidden="true"
                                        >
                                            ✗
                                        </span>
                                    )}
                                    <span style={{ color: feat.included ? "var(--kh-body)" : "var(--kh-mut)" }}>
                                        {feat.text}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </section>
    );
}
