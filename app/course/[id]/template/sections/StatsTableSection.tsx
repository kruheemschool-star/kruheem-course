"use client";
import type { StatsTableData } from "../types";

// Clean 2-column stats table (ตัวเลข | ความหมาย).
export default function StatsTableSection({ data }: { data: StatsTableData }) {
    if (!data.rows || data.rows.length === 0) return null;

    return (
        <section className="max-w-3xl mx-auto px-6 py-12">
            {data.title && (
                <h2 className="text-3xl font-bold text-center text-slate-800 dark:text-white mb-10">{data.title}</h2>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-6 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-2/5">
                                {data.leftHeader}
                            </th>
                            <th className="px-6 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {data.rightHeader}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-950">
                        {data.rows.map((row, i) => (
                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors">
                                <td className="px-6 py-4 text-xl md:text-2xl font-black text-slate-900 dark:text-white align-top whitespace-nowrap">
                                    {row.left}
                                </td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 leading-relaxed align-middle">
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
