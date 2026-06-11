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

/* Theme-bound typography for the admin-authored HTML (scoped to .kh-rtx).
   Admin inline styles inside the content still win over these defaults. */
const RTX_CSS = `
.kh-rtx { color: var(--kh-body); font-size: 16px; line-height: 1.85; overflow-wrap: break-word; }
.kh-rtx > :first-child { margin-top: 0; }
.kh-rtx > :last-child { margin-bottom: 0; }
.kh-rtx p { margin: 0.9em 0; }
.kh-rtx h1, .kh-rtx h2, .kh-rtx h3, .kh-rtx h4, .kh-rtx h5, .kh-rtx h6 {
    font-family: var(--font-kanit), var(--font-mitr), sans-serif;
    color: var(--kh-ink); font-weight: 700; line-height: 1.4;
    margin: 1.5em 0 0.6em;
}
.kh-rtx h1 { font-size: 1.7em; }
.kh-rtx h2 { font-size: 1.45em; }
.kh-rtx h3 { font-size: 1.2em; }
.kh-rtx h4 { font-size: 1.05em; }
.kh-rtx strong, .kh-rtx b { color: var(--kh-ink); font-weight: 700; }
.kh-rtx a { color: var(--kh-pText); text-decoration: underline; text-underline-offset: 3px; }
.kh-rtx ul, .kh-rtx ol { margin: 0.9em 0; padding-left: 1.5em; }
.kh-rtx ul { list-style: disc; }
.kh-rtx ol { list-style: decimal; }
.kh-rtx li { margin: 0.35em 0; }
.kh-rtx li::marker { color: var(--kh-p); }
.kh-rtx blockquote { border-left: 3px solid var(--kh-pLine); padding-left: 1em; margin: 1.2em 0; color: var(--kh-mut); }
.kh-rtx hr { border: 0; border-top: 1px solid var(--kh-line); margin: 2em 0; }
.kh-rtx img { max-width: 100%; height: auto; border-radius: 12px; }
.kh-rtx code { background: var(--kh-tint); color: var(--kh-pText); padding: 2px 6px; border-radius: 6px; font-size: 0.9em; }
.kh-rtx table { width: 100%; border-collapse: collapse; margin: 1.2em 0; }
.kh-rtx th, .kh-rtx td { border: 1px solid var(--kh-line); padding: 8px 12px; text-align: left; }
.kh-rtx th { color: var(--kh-ink); background: var(--kh-tint); font-weight: 600; }
`;

export default function RichTextSection({ data }: { data: RichTextData }) {
    const html = (data.html || "").trim();
    if (!html || html === "<p></p>") return null;

    const color = HEX6.test(data.color || "") ? data.color : "#6366f1";
    const intensity = Math.max(1, Math.min(5, data.bgIntensity ?? 2));
    const boxStyle: CSSProperties = {
        ...boxBackground(data.bg, color, intensity),
        ...(data.framed ? { borderColor: color, boxShadow: "var(--kh-shadow-sm)" } : {}),
    };

    return (
        <section className="kh-sec" style={{ maxWidth: 820 }}>
            <style>{RTX_CSS}</style>
            <div
                className={`rounded-3xl px-6 py-8 md:px-10 md:py-10 ${data.framed ? "border-2" : ""}`}
                style={boxStyle}
            >
                <div className="kh-rtx max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
        </section>
    );
}
