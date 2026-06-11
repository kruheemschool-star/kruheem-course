"use client";
import type { PainPointData } from "../types";

export default function PainPointSection({ data }: { data: PainPointData }) {
    return (
        <section className="kh-sec">
            <div className="kh-sec-head">
                <h2 className="kh-h2">{data.title}</h2>
                {data.subtitle && <p className="kh-sub mt-3">{data.subtitle}</p>}
            </div>

            <div className="grid items-start gap-6 md:grid-cols-2 md:gap-8">
                {/* Problems */}
                <div>
                    <h3 className="kh-h3 mb-4 flex items-center gap-2">
                        <span className="text-2xl sm:text-3xl">{data.problemIcon || "🔓"}</span>
                        {data.problemTitle || "ปัญหาที่เจอ"}
                    </h3>
                    <ul className="space-y-3">
                        {data.problems.map((item, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-3 rounded-2xl p-4 sm:p-5"
                                style={{ background: "var(--kh-urgBg)" }}
                            >
                                <span className="flex-shrink-0 text-xl font-bold leading-7" style={{ color: "var(--kh-urgText)" }}>
                                    {item.icon}
                                </span>
                                <span className="text-[15px] font-medium leading-relaxed sm:text-base" style={{ color: "var(--kh-urgText)" }}>
                                    {item.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Solutions */}
                <div className="kh-dark p-6 sm:p-8">
                    <h3 className="kh-kanit flex items-center gap-2 text-xl font-bold sm:text-2xl" style={{ color: "var(--kh-onD)" }}>
                        <span className="text-2xl sm:text-3xl">{data.solutionIcon || "💡"}</span>
                        {data.solutionTitle || "สิ่งที่จะได้รับ"}
                    </h3>
                    {data.solutionDesc && (
                        <p className="mt-3 text-[15px] leading-relaxed sm:text-base" style={{ color: "var(--kh-onDmut)" }}>
                            {data.solutionDesc}
                        </p>
                    )}
                    <ul className="mt-4">
                        {data.solutions.map((item, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-3 border-b py-3.5 last:border-0 last:pb-0"
                                style={{ borderColor: "var(--kh-onDline)" }}
                            >
                                <span
                                    className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-sm font-bold leading-none"
                                    style={{ background: "var(--kh-good)", color: "var(--kh-onD)" }}
                                >
                                    {item.icon}
                                </span>
                                <span className="text-[15px] leading-relaxed sm:text-base" style={{ color: "var(--kh-onD)" }}>
                                    {item.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}
