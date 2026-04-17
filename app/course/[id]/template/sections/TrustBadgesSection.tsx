"use client";
import { useEffect, useRef, useState } from "react";
import type { TrustBadgesData, TrustBadgeStat } from "../types";

function parseNumber(raw: string): { num: number; prefix: string; suffix: string } {
    // Extract the first number + surrounding text (e.g. "1,500+" → 1500, suffix="+")
    const match = raw.match(/^(\D*)([\d.,]+)(.*)$/);
    if (!match) return { num: NaN, prefix: "", suffix: raw };
    const num = parseFloat(match[2].replace(/,/g, ""));
    return { num, prefix: match[1], suffix: match[3] };
}

function AnimatedNumber({ value, started }: { value: string; started: boolean }) {
    const parsed = parseNumber(value);
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (!started || isNaN(parsed.num)) return;
        const duration = 1400;
        const startTime = performance.now();
        let raf = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - startTime) / duration);
            // ease-out
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(parsed.num * eased);
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [started, parsed.num]);

    if (isNaN(parsed.num)) return <span>{value}</span>;

    const isInt = Number.isInteger(parsed.num);
    const formatted = isInt
        ? Math.floor(display).toLocaleString("th-TH")
        : display.toFixed(1);

    return (
        <span>
            {parsed.prefix}
            {formatted}
            {parsed.suffix}
        </span>
    );
}

function StatCard({ stat, index, onVisible, started }: { stat: TrustBadgeStat; index: number; onVisible: () => void; started: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            (entries) => {
                for (const e of entries) if (e.isIntersecting) onVisible();
            },
            { threshold: 0.3 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [onVisible]);

    return (
        <div
            ref={ref}
            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm text-center hover:shadow-lg transition-all"
            style={{ transitionDelay: `${index * 50}ms` }}
        >
            <div className="text-4xl mb-3">{stat.icon}</div>
            <div className="text-3xl md:text-4xl font-black text-indigo-600 mb-1 tabular-nums">
                <AnimatedNumber value={stat.number} started={started} />
            </div>
            <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
        </div>
    );
}

export default function TrustBadgesSection({ data }: { data: TrustBadgesData }) {
    const [started, setStarted] = useState(false);
    if (!data.stats || data.stats.length === 0) return null;

    return (
        <section className="max-w-6xl mx-auto px-6 py-12">
            {data.title && (
                <h2 className="text-3xl font-bold text-center text-slate-800 mb-10">{data.title}</h2>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {data.stats.map((stat, i) => (
                    <StatCard
                        key={i}
                        stat={stat}
                        index={i}
                        onVisible={() => setStarted(true)}
                        started={started}
                    />
                ))}
            </div>
        </section>
    );
}
