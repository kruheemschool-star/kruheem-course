"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChartData {
    label: string;
    value: number;
    fullLabel: string;
}

export default function TrafficChart({ data }: { data: ChartData[] }) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (!data || data.length < 2) {
        return (
            <div className="h-64 flex items-center justify-center text-stone-400 bg-stone-50 rounded-2xl border border-stone-100">
                ต้องการข้อมูลอย่างน้อย 2 วันเพื่อแสดงกราฟ
            </div>
        );
    }

    const height = 300;
    const width = 1000; // High resolution viewBox
    const paddingX = 20;
    const paddingY = 40;
    const graphHeight = height - paddingY * 2;
    const graphWidth = width - paddingX * 2;

    const maxValue = Math.max(...data.map((d) => d.value), 5); // Ensure at least 5 y-axis range

    // Calculate coordinates
    const points = data.map((d, i) => {
        const x = paddingX + (i / (data.length - 1)) * graphWidth;
        const y = height - paddingY - (d.value / maxValue) * graphHeight;
        return { x, y, ...d };
    });

    // Generate Smooth Path (Monotone-ish interpolation)
    const pathData = points.reduce((acc, point, i, a) => {
        if (i === 0) return `M ${point.x} ${point.y}`;

        const prev = a[i - 1];
        // Control points for smooth S-curve
        const cp1x = prev.x + (point.x - prev.x) * 0.4;
        const cp1y = prev.y;
        const cp2x = point.x - (point.x - prev.x) * 0.4;
        const cp2y = point.y;

        return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
    }, "");

    // Close the path for the area fill
    const areaPath = `${pathData} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return (
        <div className="w-full h-full relative select-none">
            {/* Container for SVG ensuring responsive scaling */}
            <div className="w-full h-[300px] relative">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                >
                    {/* Defs for gradients */}
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="50%" stopColor="#0ea5e9" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Grid Lines (Horizontal) */}
                    {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                        const y = height - paddingY - tick * graphHeight;
                        return (
                            <g key={tick}>
                                <line
                                    x1={paddingX}
                                    y1={y}
                                    x2={width - paddingX}
                                    y2={y}
                                    stroke="#e7e5e4"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                />
                                <text
                                    x={0}
                                    y={y + 4}
                                    fontSize="10"
                                    fill="#a8a29e"
                                    textAnchor="start"
                                >
                                    {Math.round(tick * maxValue)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Area Fill */}
                    <motion.path
                        d={areaPath}
                        fill="url(#areaGradient)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                    />

                    {/* Line Path */}
                    <motion.path
                        d={pathData}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        filter="url(#glow)"
                    />

                    {/* Interactive Points */}
                    {points.map((point, index) => (
                        <g key={index}>
                            {/* Invisible trigger area for hover */}
                            <rect
                                x={point.x - (graphWidth / points.length / 2)}
                                y={0}
                                width={graphWidth / points.length}
                                height={height}
                                fill="transparent"
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                className="cursor-pointer"
                            />

                            {/* Point Dot */}
                            <motion.circle
                                cx={point.x}
                                cy={point.y}
                                r={hoveredIndex === index ? 6 : 0}
                                fill="#fff"
                                stroke="#0ea5e9"
                                strokeWidth="3"
                                initial={{ r: 0 }}
                                animate={{ r: hoveredIndex === index ? 6 : 4 }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className="pointer-events-none"
                            />
                        </g>
                    ))}
                </svg>

                {/* Labels X-Axis */}
                <div className="absolute bottom-0 left-0 w-full flex justify-between px-2 text-xs text-stone-400 font-medium pointer-events-none">
                    {points.map((p, i) => (
                        <div key={i} style={{ left: `${(p.x / width) * 100}%`, position: 'absolute', transform: 'translateX(-50%)' }}>
                            {p.label}
                        </div>
                    ))}
                </div>

                {/* Tooltip */}
                <AnimatePresence>
                    {hoveredIndex !== null && points[hoveredIndex] && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute pointer-events-none bg-stone-800 text-white rounded-lg p-2 px-3 shadow-xl z-10 text-xs flex flex-col items-center gap-0.5"
                            style={{
                                left: `${(points[hoveredIndex].x / width) * 100}%`,
                                top: `${(points[hoveredIndex].y / height) * 100}%`,
                                transform: 'translate(-50%, -120%)' // Move up above point
                            }}
                        >
                            <span className="font-bold text-sm">{points[hoveredIndex].value} คน</span>
                            <span className="text-stone-400 text-[10px] whitespace-nowrap">{points[hoveredIndex].fullLabel}</span>
                            {/* Arrow */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-t-4 border-t-stone-800 border-x-4 border-x-transparent border-b-0 w-0 h-0"></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
