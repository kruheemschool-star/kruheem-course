"use client";
import type { CSSProperties } from "react";
import type { RichTextData } from "../types";

const HEX6 = /^#[0-9a-fA-F]{6}$/;

/** Background pattern/tint for the content box, tinted by the accent colour. */
function boxBackground(bg: RichTextData["bg"], color: string): CSSProperties {
    const faint = `${color}1f`;      // ~12% alpha
    const veryFaint = `${color}0d`;  // ~5% alpha
    switch (bg) {
        case "soft":
            return { backgroundColor: veryFaint };
        case "gradient":
            return { backgroundImage: `linear-gradient(135deg, ${color}26, ${color}05)` };
        case "grid": // graph-paper — fits a math school
            return {
                backgroundColor: veryFaint,
                backgroundImage: `linear-gradient(${faint} 1px, transparent 1px), linear-gradient(90deg, ${faint} 1px, transparent 1px)`,
                backgroundSize: "22px 22px",
            };
        case "dots":
            return {
                backgroundColor: veryFaint,
                backgroundImage: `radial-gradient(${color}40 1.5px, transparent 1.5px)`,
                backgroundSize: "20px 20px",
            };
        case "lines":
            return {
                backgroundColor: veryFaint,
                backgroundImage: `repeating-linear-gradient(45deg, ${faint}, ${faint} 1px, transparent 1px, transparent 11px)`,
            };
        default:
            return {};
    }
}

export default function RichTextSection({ data }: { data: RichTextData }) {
    const html = (data.html || "").trim();
    if (!html || html === "<p></p>") return null;

    const color = HEX6.test(data.color || "") ? data.color : "#6366f1";
    const boxStyle: CSSProperties = {
        ...boxBackground(data.bg, color),
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
