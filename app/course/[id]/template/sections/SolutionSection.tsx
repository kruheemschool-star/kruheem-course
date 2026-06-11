"use client";
import type { SolutionData } from "../types";

export default function SolutionSection({ data }: { data: SolutionData }) {
    return (
        <section className="kh-sec">
            <div className="kh-sec-head">
                <span className="kh-eyebrow">สิ่งที่จะได้รับ</span>
                <h2 className="kh-h2 mt-4">{data.title}</h2>
                {data.subtitle && <p className="kh-sub mt-3">{data.subtitle}</p>}
            </div>

            <div className="grid gap-5 md:grid-cols-2 md:gap-6">
                {data.items.map((item, i) => (
                    <div key={i} className="kh-card kh-lift p-6 sm:p-8">
                        <div className="kh-tintbox mb-5 grid h-14 w-14 place-items-center text-3xl">
                            {item.icon}
                        </div>
                        <h3 className="kh-h3 mb-2">{item.title}</h3>
                        <p className="leading-relaxed" style={{ color: "var(--kh-body)" }}>{item.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
