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
            <div className="kh-card flex items-center justify-center min-w-[60px] sm:min-w-[76px] md:min-w-[96px] px-2 py-2.5 sm:px-3 sm:py-3 md:py-4">
                <span
                    className="kh-num font-extrabold tabular-nums leading-none"
                    style={{ fontSize: "clamp(26px, 4vw, 40px)", color: "var(--kh-urgText)" }}
                >
                    {String(value).padStart(2, "0")}
                </span>
            </div>
            <span className="kh-kanit text-xs md:text-sm font-medium mt-2" style={{ color: "var(--kh-mut)" }}>{label}</span>
        </div>
    );
}

function Colon() {
    return (
        <span
            className="kh-num font-bold pb-6"
            style={{ fontSize: "clamp(22px, 3.4vw, 34px)", color: "var(--kh-urg)" }}
            aria-hidden="true"
        >
            :
        </span>
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
    const hasHead = Boolean(data.title || data.subtitle);

    if (timeLeft.expired) {
        return (
            <section className="max-w-4xl mx-auto px-6 py-8">
                <div className="kh-card p-6 text-center">
                    <p className="kh-kanit font-semibold" style={{ color: "var(--kh-body)" }}>
                        ⏱️ {data.expiredMessage || "โปรโมชั่นหมดแล้ว"}
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className={isBanner ? "w-full" : "max-w-4xl mx-auto px-6 py-8"}>
            <div
                className={isBanner ? "px-5 py-8 sm:px-6" : "rounded-[24px] p-6 sm:p-8 md:p-10"}
                style={
                    isBanner
                        ? {
                            background: "var(--kh-urgBg)",
                            borderTop: "1px solid var(--kh-urg)",
                            borderBottom: "1px solid var(--kh-urg)",
                        }
                        : {
                            background: "var(--kh-urgBg)",
                            border: "1px solid var(--kh-urg)",
                            boxShadow: "var(--kh-shadow-sm)",
                        }
                }
            >
                <div className="text-center">
                    {data.title && (
                        <h2
                            className="kh-kanit font-bold"
                            style={{ fontSize: "clamp(22px, 3vw, 30px)", color: "var(--kh-urgText)" }}
                        >
                            {data.title}
                        </h2>
                    )}
                    {data.subtitle && (
                        <p className="text-sm md:text-base mt-1.5 opacity-80" style={{ color: "var(--kh-urgText)" }}>
                            {data.subtitle}
                        </p>
                    )}

                    <div className={`flex items-center justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap ${hasHead ? "mt-6" : ""}`}>
                        <Cell value={timeLeft.days} label="วัน" />
                        <Colon />
                        <Cell value={timeLeft.hours} label="ชั่วโมง" />
                        <Colon />
                        <Cell value={timeLeft.minutes} label="นาที" />
                        <Colon />
                        <Cell value={timeLeft.seconds} label="วินาที" />
                    </div>
                </div>
            </div>
        </section>
    );
}
