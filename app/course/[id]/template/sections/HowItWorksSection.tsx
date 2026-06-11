"use client";
import { Fragment } from "react";
import type { HowItWorksData, SectionContext } from "../types";

export default function HowItWorksSection({ data, ctx }: { data: HowItWorksData; ctx: SectionContext }) {
    const steps = (data.steps || []).filter((s) => s.title?.trim() || s.icon?.trim());
    if (steps.length === 0) return null;

    return (
        <section className="kh-sec">
            {/* Header */}
            <div className="kh-sec-head">
                <h2 className="kh-h2">
                    {data.title || "เรียนยังไง?"}{" "}
                    <span>🪜</span>
                </h2>
                {data.subtitle && (
                    <p className="kh-sub mt-3">
                        {data.subtitle}
                    </p>
                )}
            </div>

            {/* Steps */}
            <div className="flex flex-col justify-center sm:flex-row sm:items-stretch">
                {steps.map((step, i) => (
                    <Fragment key={i}>
                        <div className="kh-card kh-lift flex-1 p-5 text-center sm:max-w-xs sm:p-6">
                            {/* Number circle */}
                            <div
                                className="kh-kanit mx-auto grid h-10 w-10 place-items-center rounded-full text-lg font-bold leading-none"
                                style={{ background: "var(--kh-p)", color: "var(--kh-onD)" }}
                            >
                                {i + 1}
                            </div>
                            <div className="mt-4 text-4xl md:text-5xl">{step.icon || "•"}</div>
                            <h3 className="kh-h3 mt-4">
                                {step.title}
                            </h3>
                            {step.desc && (
                                <p className="mt-2 text-sm leading-relaxed md:text-[15px]" style={{ color: "var(--kh-mut)" }}>
                                    {step.desc}
                                </p>
                            )}
                        </div>

                        {/* Connector between steps */}
                        {i < steps.length - 1 && (
                            <>
                                <div className="mx-auto h-7 w-0.5 sm:hidden" style={{ background: "var(--kh-pLine)" }} />
                                <div className="hidden h-0.5 w-5 flex-shrink-0 self-center sm:block md:w-9" style={{ background: "var(--kh-pLine)" }} />
                            </>
                        )}
                    </Fragment>
                ))}
            </div>

            {/* Optional CTA */}
            {data.ctaText?.trim() && (
                <div className="mt-12 text-center">
                    <button
                        onClick={() => ctx.onCTAClick()}
                        className="kh-cta-btn"
                    >
                        {data.ctaText}
                    </button>
                </div>
            )}
        </section>
    );
}
