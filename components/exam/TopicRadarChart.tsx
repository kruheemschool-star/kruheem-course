"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

// Extracted verbatim from ExamSystem's results view so recharts can be
// loaded with next/dynamic only when the results screen actually renders,
// instead of shipping ~100KB of chart code with every exam page load.
export default function TopicRadarChart({
    data,
    colors,
}: {
    data: { tag: string; percent: number }[];
    colors: { grid: string; tick: string; stroke: string };
}) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data} outerRadius="72%">
                <PolarGrid stroke={colors.grid} />
                <PolarAngleAxis dataKey="tag" tick={{ fontSize: 12, fill: colors.tick, fontWeight: 600 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="percent" stroke={colors.stroke} fill={colors.stroke} fillOpacity={0.35} strokeWidth={2} />
            </RadarChart>
        </ResponsiveContainer>
    );
}
