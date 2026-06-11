"use client";
import type { StatsTableData } from "../types";

// Clean 2-column stats table (ตัวเลข | ความหมาย).
export default function StatsTableSection({ data }: { data: StatsTableData }) {
    if (!data.rows || data.rows.length === 0) return null;

    return (
        <section className="kh-sec">
            {data.title && (
                <div className="kh-sec-head">
                    <h2 className="kh-h2">{data.title}</h2>
                </div>
            )}

            <div className="kh-card max-w-[760px] mx-auto overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr
                            style={{
                                background: "var(--kh-tint)",
                                borderBottom: "1px solid var(--kh-pLine)",
                            }}
                        >
                            <th
                                className="kh-kanit px-5 sm:px-7 py-4 text-[13px] sm:text-sm font-semibold tracking-wide w-2/5"
                                style={{ color: "var(--kh-pText)" }}
                            >
                                {data.leftHeader}
                            </th>
                            <th
                                className="kh-kanit px-5 sm:px-7 py-4 text-[13px] sm:text-sm font-semibold tracking-wide"
                                style={{ color: "var(--kh-pText)" }}
                            >
                                {data.rightHeader}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row, i) => (
                            <tr
                                key={i}
                                className="border-b last:border-0"
                                style={{
                                    borderColor: "var(--kh-line)",
                                    background: i % 2 === 1 ? "var(--kh-paper)" : "var(--kh-card)",
                                }}
                            >
                                <td
                                    className="kh-num px-5 sm:px-7 py-4 text-xl md:text-2xl font-extrabold align-top whitespace-nowrap"
                                    style={{ color: "var(--kh-pText)" }}
                                >
                                    {row.left}
                                </td>
                                <td
                                    className="px-5 sm:px-7 py-4 leading-relaxed align-middle"
                                    style={{ color: "var(--kh-body)" }}
                                >
                                    {row.right}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
