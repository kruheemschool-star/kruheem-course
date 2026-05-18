"use client";
import type { StatsTableData } from "../types";

// Clean 2-column stats table (ตัวเลข | ความหมาย). Light theme to match the
// other sales-page sections (siblings don't use dark: variants).
export default function StatsTableSection({ data }: { data: StatsTableData }) {
    if (!data.rows || data.rows.length === 0) return null;

    return (
        <section className="max-w-3xl mx-auto px-6 py-12">
            {data.title && (
                <h2 className="text-3xl font-bold text-center text-slate-800 mb-10">{data.title}</h2>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 w-2/5">
                                {data.leftHeader}
                            </th>
                            <th className="px-6 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">
                                {data.rightHeader}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row, i) => (
                            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                                <td className="px-6 py-4 text-xl md:text-2xl font-black text-slate-900 align-top whitespace-nowrap">
                                    {row.left}
                                </td>
                                <td className="px-6 py-4 text-slate-600 leading-relaxed align-middle">
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
