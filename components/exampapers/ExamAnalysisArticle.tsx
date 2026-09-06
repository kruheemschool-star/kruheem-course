"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ChevronDown, ChevronUp } from "lucide-react";

// Walk a hast node and collect its plain text — used to pick a callout tone
// from the emoji the blockquote starts with.
type HastNode = { type?: string; value?: string; children?: HastNode[] };
const hastText = (n?: HastNode): string =>
    !n ? "" : n.type === "text" ? n.value || "" : (n.children || []).map(hastText).join("");

// react-markdown passes its hast `node` alongside the HTML props; strip it so
// it never reaches the DOM element.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const omitNode = <T extends { node?: unknown }>({ node, ...rest }: T) => rest;

// ธีม Studio ใช้สีเน้นสีเดียวทั้งหน้า — กล่องคำเตือน/เคล็ดลับจึงแยกกันด้วย
// น้ำหนักของพื้นและแถบข้าง ไม่ใช่ด้วยสีที่สอง (แดง/ส้ม/เหลืองไม่มีในจานสีนี้)
const CALLOUT_TONES: Record<string, { bg: string; bar: string }> = {
    warn: { bg: "var(--kp-slot)", bar: "var(--kp-ink)" },
    idea: { bg: "var(--kp-slot)", bar: "var(--kp-ink-4)" },
    tip: { bg: "var(--kp-accent-soft)", bar: "var(--kp-accent)" },
};
function calloutTone(text: string): string {
    const t = text.trim();
    if (/^[⚠📌❗🚨]/u.test(t)) return "warn";
    if (/^[💡✨🔑⭐]/u.test(t)) return "idea";
    return "tip";
}

// "บทวิเคราะห์ฉบับเต็ม" — บทความยาวที่ครูฮีมอัปโหลดเป็น Markdown ในหลังบ้าน
// วางต่อจากกราฟความถี่รายบท บทความยาวเริ่มด้วยการพับไว้หลังม่านจาง +
// ปุ่ม "อ่านฉบับเต็ม" เพื่อไม่ให้หน้าขายเสียรูป
export default function ExamAnalysisArticle({ article }: { article?: string }) {
    const [open, setOpen] = useState(false);
    const text = (article || "").trim();
    if (!text) return null;

    const collapsible = text.length > 1500;
    const collapsed = collapsible && !open;

    return (
        <section className="khps-sec">
            <div className="khps-eyebrow">บทวิเคราะห์จากครูฮีม</div>

            <div className="khps-card mt-6 p-7 md:p-12">
                <div className={collapsed ? "relative max-h-[34rem] overflow-hidden" : undefined}>
                    <article
                        className="max-w-3xl mx-auto text-[16px] md:text-[16.5px] font-light leading-[1.95]"
                        style={{ color: "var(--kp-ink-2)" }}
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                h1: (p) => <h2 className="khps-h2 text-center mb-6" style={{ color: "var(--kp-ink)" }} {...omitNode(p)} />,
                                h2: (p) => <h3 className="text-[22px] md:text-[26px] font-normal mt-12 mb-4 leading-snug" style={{ color: "var(--kp-ink)", letterSpacing: "-0.015em" }} {...omitNode(p)} />,
                                h3: (p) => <h4 className="text-[18px] font-medium mt-9 mb-3" style={{ color: "var(--kp-ink)" }} {...omitNode(p)} />,
                                p: (p) => <p className="mb-5 last:mb-0" {...omitNode(p)} />,
                                strong: (p) => <strong className="font-semibold" style={{ color: "var(--kp-ink)" }} {...omitNode(p)} />,
                                em: (p) => <em className="khps-muted" {...omitNode(p)} />,
                                ul: (p) => <ul className="list-disc pl-6 space-y-2 mb-5" {...omitNode(p)} />,
                                ol: (p) => <ol className="list-decimal pl-6 space-y-2 mb-5" {...omitNode(p)} />,
                                li: (p) => <li className="pl-1 [&>p]:mb-0" {...omitNode(p)} />,
                                hr: (p) => <hr className="my-10" style={{ border: 0, borderTop: "1px solid var(--kp-line)" }} {...omitNode(p)} />,
                                a: (p) => <a className="underline underline-offset-2" style={{ color: "var(--kp-accent)" }} target="_blank" rel="noopener noreferrer" {...omitNode(p)} />,
                                code: (p) => <code className="rounded px-1.5 py-0.5 text-[0.9em]" style={{ background: "var(--kp-slot)" }} {...omitNode(p)} />,
                                blockquote: ({ node, children }) => {
                                    const tone = CALLOUT_TONES[calloutTone(hastText(node as unknown as HastNode))];
                                    return (
                                        <div
                                            className="my-6 rounded-2xl px-6 py-5 [&>p]:mb-0 [&>p+p]:mt-2.5"
                                            style={{ background: tone.bg, borderLeft: `2px solid ${tone.bar}` }}
                                        >
                                            {children}
                                        </div>
                                    );
                                },
                                table: (p) => (
                                    <div className="overflow-x-auto my-6 rounded-xl" style={{ background: "var(--kp-slot)" }}>
                                        <table className="w-full text-sm border-collapse" {...omitNode(p)} />
                                    </div>
                                ),
                                th: (p) => <th className="font-semibold px-3.5 py-2.5 text-left whitespace-nowrap" style={{ color: "var(--kp-accent)", borderBottom: "1px solid var(--kp-line)" }} {...omitNode(p)} />,
                                td: (p) => <td className="px-3.5 py-2.5 tabular-nums" style={{ borderBottom: "1px solid var(--kp-line)" }} {...omitNode(p)} />,
                            }}
                        >
                            {text}
                        </ReactMarkdown>
                    </article>
                    {collapsed && (
                        <div
                            className="absolute bottom-0 inset-x-0 h-36"
                            style={{ background: "linear-gradient(to top, var(--kp-card), transparent)" }}
                        />
                    )}
                </div>

                {collapsible && (
                    <div className="text-center mt-7">
                        <button
                            type="button"
                            onClick={() => setOpen((o) => !o)}
                            className="khps-btn khps-btn-sm khps-btn-quiet"
                        >
                            {open ? <>ย่อบทวิเคราะห์ <ChevronUp size={16} /></> : <>อ่านบทวิเคราะห์ฉบับเต็ม <ChevronDown size={16} /></>}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
