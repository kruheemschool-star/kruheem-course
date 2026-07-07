"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { BookOpenText, ChevronDown, ChevronUp } from "lucide-react";

// Walk a hast node and collect its plain text — used to pick a callout tone
// from the emoji the blockquote starts with.
type HastNode = { type?: string; value?: string; children?: HastNode[] };
const hastText = (n?: HastNode): string =>
    !n ? "" : n.type === "text" ? n.value || "" : (n.children || []).map(hastText).join("");

// react-markdown passes its hast `node` alongside the HTML props; strip it so
// it never reaches the DOM element.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const omitNode = <T extends { node?: unknown }>({ node, ...rest }: T) => rest;

// Blockquotes become branded callout cards, coloured by their leading emoji:
// ⚠️/📌 warnings → amber, 💡/✨/🔑 insights → yellow, everything else → teal.
const CALLOUT_TONES: Record<string, string> = {
    warn: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
    idea: "border-yellow-200 bg-yellow-50 text-yellow-950 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100",
    tip: "border-teal-200 bg-teal-50/70 text-teal-950 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-50",
};
function calloutTone(text: string): string {
    const t = text.trim();
    if (/^[⚠📌❗🚨]/u.test(t)) return "warn";
    if (/^[💡✨🔑⭐]/u.test(t)) return "idea";
    return "tip";
}

// "บทวิเคราะห์ฉบับเต็ม" — the long-form write-up ครูฮีม uploads as Markdown in
// the admin. Rendered as a styled article under the chapter-frequency chart.
// Long articles start collapsed behind a fade + "อ่านฉบับเต็ม" button so the
// sales page keeps its shape.
export default function ExamAnalysisArticle({ article }: { article?: string }) {
    const [open, setOpen] = useState(false);
    const text = (article || "").trim();
    if (!text) return null;

    const collapsible = text.length > 1500;
    const collapsed = collapsible && !open;

    return (
        <section className="mt-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-10">
            <div className="text-center mb-7">
                <div className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-teal-600 dark:text-teal-400">
                    <BookOpenText size={15} />
                    บทวิเคราะห์จากครูฮีม
                </div>
            </div>

            <div className={collapsed ? "relative max-h-[34rem] overflow-hidden" : undefined}>
                <article className="max-w-3xl mx-auto text-slate-700 dark:text-slate-300 text-[15.5px] md:text-base leading-[1.9]">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            h1: (p) => <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white text-center leading-tight mb-4" {...omitNode(p)} />,
                            h2: (p) => <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-10 mb-4 border-l-4 border-teal-500 pl-3 leading-snug" {...omitNode(p)} />,
                            h3: (p) => <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-8 mb-3" {...omitNode(p)} />,
                            p: (p) => <p className="mb-4 last:mb-0" {...omitNode(p)} />,
                            strong: (p) => <strong className="font-bold text-slate-900 dark:text-white" {...omitNode(p)} />,
                            em: (p) => <em className="text-slate-500 dark:text-slate-400" {...omitNode(p)} />,
                            ul: (p) => <ul className="list-disc pl-6 space-y-1.5 mb-4" {...omitNode(p)} />,
                            ol: (p) => <ol className="list-decimal pl-6 space-y-1.5 mb-4" {...omitNode(p)} />,
                            li: (p) => <li className="pl-1 [&>p]:mb-0" {...omitNode(p)} />,
                            hr: (p) => <hr className="my-8 border-slate-200 dark:border-slate-700" {...omitNode(p)} />,
                            a: (p) => <a className="text-teal-600 dark:text-teal-400 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...omitNode(p)} />,
                            code: (p) => <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[0.9em]" {...omitNode(p)} />,
                            blockquote: ({ node, children }) => {
                                const tone = calloutTone(hastText(node as unknown as HastNode));
                                return (
                                    <div className={`my-5 rounded-2xl border px-5 py-4 [&>p]:mb-0 [&>p+p]:mt-2 ${CALLOUT_TONES[tone]}`}>
                                        {children}
                                    </div>
                                );
                            },
                            table: (p) => (
                                <div className="overflow-x-auto my-5 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-sm border-collapse" {...omitNode(p)} />
                                </div>
                            ),
                            th: (p) => <th className="bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-100 font-bold px-3 py-2 text-left border-b border-slate-200 dark:border-slate-700 whitespace-nowrap" {...omitNode(p)} />,
                            td: (p) => <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 tabular-nums" {...omitNode(p)} />,
                        }}
                    >
                        {text}
                    </ReactMarkdown>
                </article>
                {collapsed && (
                    <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
                )}
            </div>

            {collapsible && (
                <div className="text-center mt-5">
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/50 px-5 py-2.5 text-sm font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 transition"
                    >
                        {open ? <>ย่อบทวิเคราะห์ <ChevronUp size={16} /></> : <>อ่านบทวิเคราะห์ฉบับเต็ม <ChevronDown size={16} /></>}
                    </button>
                </div>
            )}
        </section>
    );
}
