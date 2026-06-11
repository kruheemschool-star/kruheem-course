"use client";
import { useEffect, useRef, useState } from "react";
import type { TrustBadgesData, TrustBadgeStat, SectionContext } from "../types";
import { resolveStudentToken } from "../liveStats";

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
            className={`flex-1 basis-[42%] sm:basis-0 min-w-[130px] max-w-[260px] px-3 sm:px-5 text-center ${index > 0 ? "sm:border-l" : ""}`}
            style={{ borderColor: "var(--kh-line)" }}
        >
            <div className="kh-tintbox mx-auto mb-3 grid h-12 w-12 place-items-center text-2xl">
                {stat.icon}
            </div>
            <div
                className="kh-num mb-1.5 font-extrabold leading-none tabular-nums"
                style={{ color: "var(--kh-pText)", fontSize: "clamp(28px, 3.4vw, 36px)" }}
            >
                <AnimatedNumber value={stat.number} started={started} />
            </div>
            <div className="text-[13px] sm:text-sm font-medium leading-snug" style={{ color: "var(--kh-mut)" }}>
                {stat.label}
            </div>
        </div>
    );
}

export default function TrustBadgesSection({ data, ctx }: { data: TrustBadgesData; ctx?: SectionContext }) {
    const [started, setStarted] = useState(false);
    if (!data.stats || data.stats.length === 0) return null;

    // Auto-fill the live student count into any stat using the {students} token.
    const stats = data.stats.map((s) => ({
        ...s,
        number: resolveStudentToken(s.number, ctx?.totalStudents),
    }));

    return (
        <section className="kh-sec">
            {data.title && (
                <div className="kh-sec-head">
                    <h2 className="kh-h2">{data.title}</h2>
                </div>
            )}

            <div className="kh-card px-3 py-8 sm:px-6 md:px-10 md:py-10">
                <div className="flex flex-wrap justify-center gap-y-8">
                    {stats.map((stat, i) => (
                        <StatCard
                            key={i}
                            stat={stat}
                            index={i}
                            onVisible={() => setStarted(true)}
                            started={started}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
