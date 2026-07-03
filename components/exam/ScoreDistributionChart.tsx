"use client";

import { BarChart, Bar, Cell, XAxis, ResponsiveContainer } from "recharts";

// Extracted verbatim from the percentile sections of ExamSystem (height 150)
// and ExamRunner (height 140) — identical markup, so one shared component —
// letting recharts load via next/dynamic only when a results screen with
// enough attempts actually shows the distribution.
export default function ScoreDistributionChart({
    buckets,
    yourBucket,
    isDark,
    height,
}: {
    buckets: number[];
    yourBucket: number;
    isDark: boolean;
    height: number;
}) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={buckets.map((c, i) => ({ label: `${i * 10}`, count: c }))} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} stroke={isDark ? '#334155' : '#e2e8f0'} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {buckets.map((_, i) => (
                        <Cell key={i} fill={i === yourBucket ? '#f59e0b' : (isDark ? '#4f46e5' : '#c7d2fe')} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
