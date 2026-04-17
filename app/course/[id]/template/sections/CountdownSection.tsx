"use client";
import { useEffect, useState } from "react";
import type { CountdownData } from "../types";

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
}

function calcTimeLeft(endDate: string): TimeLeft {
    const diff = new Date(endDate).getTime() - new Date().getTime();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        expired: false,
    };
}

function Cell({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col items-center">
            <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-3 md:px-6 md:py-4 min-w-[72px] md:min-w-[96px] shadow-lg">
                <span className="text-3xl md:text-5xl font-black text-white tabular-nums">
                    {String(value).padStart(2, "0")}
                </span>
            </div>
            <span className="text-xs md:text-sm font-bold text-white/80 mt-2 uppercase tracking-wider">{label}</span>
        </div>
    );
}

export default function CountdownSection({ data }: { data: CountdownData }) {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(data.endDate));

    useEffect(() => {
        const tick = () => setTimeLeft(calcTimeLeft(data.endDate));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [data.endDate]);

    const isBanner = data.style === "banner";

    if (timeLeft.expired) {
        return (
            <section className="max-w-4xl mx-auto px-6 py-8">
                <div className="bg-slate-100 rounded-2xl p-6 text-center border border-slate-200">
                    <p className="text-slate-600 font-bold">
                        ⏱️ {data.expiredMessage || "โปรโมชั่นหมดแล้ว"}
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className={isBanner ? "w-full" : "max-w-4xl mx-auto px-6 py-8"}>
            <div
                className={`relative overflow-hidden bg-gradient-to-br from-red-500 via-rose-500 to-orange-500 ${isBanner ? "px-6 py-8" : "rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-rose-200/40"}`}
            >
                {/* Decorative */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl bg-yellow-300/30 translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl bg-pink-300/30 -translate-x-1/2 translate-y-1/2"></div>

                <div className="relative z-10 text-center">
                    {data.title && (
                        <h2 className="text-2xl md:text-3xl font-black text-white mb-2 drop-shadow-sm">
                            {data.title}
                        </h2>
                    )}
                    {data.subtitle && (
                        <p className="text-white/90 mb-6 text-base md:text-lg">{data.subtitle}</p>
                    )}

                    <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
                        <Cell value={timeLeft.days} label="วัน" />
                        <span className="text-3xl md:text-5xl font-black text-white/50">:</span>
                        <Cell value={timeLeft.hours} label="ชั่วโมง" />
                        <span className="text-3xl md:text-5xl font-black text-white/50">:</span>
                        <Cell value={timeLeft.minutes} label="นาที" />
                        <span className="text-3xl md:text-5xl font-black text-white/50">:</span>
                        <Cell value={timeLeft.seconds} label="วินาที" />
                    </div>
                </div>
            </div>
        </section>
    );
}
