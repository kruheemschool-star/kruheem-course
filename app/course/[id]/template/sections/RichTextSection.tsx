"use client";
import type { CSSProperties } from "react";
import type { RichTextData } from "../types";

const HEX6 = /^#[0-9a-fA-F]{6}$/;

/** opacity (0–1) → 2-digit hex alpha suffix. */
const alphaHex = (o: number) => Math.max(0, Math.min(255, Math.round(o * 255))).toString(16).padStart(2, "0");

/**
 * Background pattern/tint for the content box, tinted by the accent colour.
 * `k` (intensity, default 2) scales every opacity — higher = darker/stronger.
 * At k=2 it matches the original look.
 */
function boxBackground(bg: RichTextData["bg"], color: string, k: number): CSSProperties {
    const tint = `${color}${alphaHex(0.025 * k)}`;   // base fill
    const pat = `${color}${alphaHex(0.06 * k)}`;     // grid / line pattern
    const dot = `${color}${alphaHex(0.10 * k)}`;     // dots (a touch stronger)
    const gradA = `${color}${alphaHex(0.075 * k)}`;
    const gradB = `${color}${alphaHex(0.02 * k)}`;
    switch (bg) {
        case "soft":
            return { backgroundColor: `${color}${alphaHex(0.04 * k)}` };
        case "gradient":
            return { backgroundImage: `linear-gradient(135deg, ${gradA}, ${gradB})` };
        case "grid": // graph-paper — fits a math school
            return {
                backgroundColor: tint,
                backgroundImage: `linear-gradient(${pat} 1px, transparent 1px), linear-gradient(90deg, ${pat} 1px, transparent 1px)`,
                backgroundSize: "22px 22px",
            };
        case "dots":
            return {
                backgroundColor: tint,
                backgroundImage: `radial-gradient(${dot} 1.5px, transparent 1.5px)`,
                backgroundSize: "20px 20px",
            };
        case "lines":
            return {
                backgroundColor: tint,
                backgroundImage: `repeating-linear-gradient(45deg, ${pat}, ${pat} 1px, transparent 1px, transparent 11px)`,
            };
        default:
            return {};
    }
}

export default function RichTextSection({ data }: { data: RichTextData }) {
    const html = (data.html || "").trim();
    if (!html || html === "<p></p>") return null;

    const color = HEX6.test(data.color || "") ? data.color : "#6366f1";
    const intensity = Math.max(1, Math.min(5, data.bgIntensity ?? 2));
    const boxStyle: CSSProperties = {
        ...boxBackground(data.bg, color, intensity),
        ...(data.framed ? { borderColor: color } : {}),
    };

    return (
        <section className="w-full py-12 md:py-16">
            <div className="max-w-3xl mx-auto px-4 md:px-6">
                <div
                    className={`rounded-3xl px-6 py-8 md:px-10 md:py-10 ${data.framed ? "border-2 shadow-sm" : ""}`}
                    style={boxStyle}
                >
                    <div
                        className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-slate-800 dark:prose-headings:text-white prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-strong:text-slate-800 dark:prose-strong:text-white prose-a:text-indigo-600 dark:prose-a:text-indigo-400"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                </div>
            </div>
        </section>
    );
}
