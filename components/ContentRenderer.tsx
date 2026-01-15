"use client";

import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

// --- Types ---
export type ContentBlock = {
    type: 'header' | 'definition' | 'formula' | 'example' | 'note' | 'image';
    title?: string;
    content: string; // For images, this will contain the URL if 'url' prop is missing, or we can add a url prop
    url?: string;
    caption?: string;
    alt?: string;
};

// --- Emojis Helper ---
export const getEmojiForHeader = (text?: string) => {
    if (!text) return '📌';
    const lower = text.toLowerCase();
    if (lower.includes('สูตร') || lower.includes('formula')) return '📐';
    if (lower.includes('ตัวอย่าง') || lower.includes('example')) return '📝';
    if (lower.includes('นิยาม') || lower.includes('definition')) return '💡';
    if (lower.includes('เทคนิค') || lower.includes('trick')) return '⚡️';
    if (lower.includes('ระวัง') || lower.includes('warning')) return '⚠️';
    if (lower.includes('สรุป') || lower.includes('summary')) return '✨';
    if (lower.includes('โจทย์') || lower.includes('problem')) return '🧩';
    return '📌';
};

// --- Helper: Wrap Thai text in \text{} for KaTeX ---
const wrapThaiTextInMath = (latex: string): string => {
    // Replace Thai character sequences with \text{...}
    // But preserve existing \text{} blocks
    return latex.replace(/([ก-๙\u0E00-\u0E7F][ก-๙\u0E00-\u0E7F\s]*)/g, (match) => {
        return `\\text{${match.trim()}}`;
    });
};

// --- LaTeX Renderer ---
export const renderWithLatex = (text: string) => {
    if (!text) return "";

    // 🧹 Clean up citation artifacts and normalize whitespace
    let cleanText = text.replace(/\[cite:\s*[^\]]+\]/gi, '');

    // 1. First, extract and handle \begin{...}\end{...} environments (cases, align, matrix, etc.)
    const envRegex = /(\\begin\{(?:cases|align|aligned|matrix|bmatrix|pmatrix|array|equation)\}[\s\S]*?\\end\{(?:cases|align|aligned|matrix|bmatrix|pmatrix|array|equation)\})/g;

    // 2. Then split by explicit LaTeX delimiters: $$...$$ or \[...\] or $...$
    const combinedRegex = /(\\begin\{(?:cases|align|aligned|matrix|bmatrix|pmatrix|array|equation)\}[\s\S]*?\\end\{(?:cases|align|aligned|matrix|bmatrix|pmatrix|array|equation)\}|\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\$\n]+?\$)/g;

    const parts = cleanText.split(combinedRegex);

    return parts.map((part, index) => {
        if (!part) return null;

        // Check if this is a LaTeX environment block
        const isEnvBlock = /^\\begin\{(cases|align|aligned|matrix|bmatrix|pmatrix|array|equation)\}/.test(part);
        const isDisplayMath = part.startsWith('$$') || part.startsWith('\\[');
        const isInlineMath = !isDisplayMath && part.startsWith('$') && part.endsWith('$') && !part.startsWith('$$');

        let isMath = isEnvBlock || isDisplayMath || isInlineMath;
        let content = part;
        let isDisplay = isEnvBlock || isDisplayMath;

        if (isMath) {
            // Strip delimiters
            if (isDisplayMath) {
                content = part.replace(/^(\$\$|\\\[)|(\$\$|\\\])$/g, '');
            } else if (isInlineMath) {
                content = part.slice(1, -1);
            }
            // For env blocks, keep as-is

            // Check for Thai text and wrap with \text{}
            const hasThai = /[\u0E00-\u0E7F]/.test(content);
            if (hasThai) {
                content = wrapThaiTextInMath(content);
            }

            // Try to render
            try {
                return isDisplay ? (
                    <BlockMath key={index} math={content} />
                ) : (
                    <InlineMath key={index} math={content} />
                );
            } catch (e) {
                // Fallback: styled code block instead of ugly red text
                return (
                    <code key={index} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm font-mono break-all">
                        {part}
                    </code>
                );
            }
        }

        // TEXT PROCESSING: Look for implicit Latex commands (\times, \div, \frac, ^, etc.)
        // But be more careful to not catch things that aren't LaTeX
        const implicitRegex = /(\\(?:times|div|frac|sqrt|sum|prod|int|pm|mp|cdot|ldots|cdots|infty|alpha|beta|gamma|delta|theta|pi|sigma|omega|leq|geq|neq|approx|equiv|subset|supset|in|notin|cup|cap|forall|exists|nabla|partial|degree)(?:\{(?:[^{}]|\{[^{}]*\})*\})*|[\^_]\{[^{}]+\})/g;
        const subParts = content.split(implicitRegex);

        return (
            <span key={index}>
                {subParts.map((sub, subIdx) => {
                    if (!sub) return null;

                    // Check if it's a LaTeX command
                    if (sub.match(/^(\\(?:times|div|frac|sqrt|sum|prod|int|pm|mp|cdot|ldots|cdots|infty|alpha|beta|gamma|delta|theta|pi|sigma|omega|leq|geq|neq|approx|equiv|subset|supset|in|notin|cup|cap|forall|exists|nabla|partial|degree)|[\^_]\{)/)) {
                        try {
                            return <InlineMath key={`${index}-${subIdx}`} math={sub} />;
                        } catch (e) {
                            return <code key={`${index}-${subIdx}`} className="text-slate-600">{sub}</code>;
                        }
                    }

                    // Markdown (**bold**, ---, > quote)
                    const boldParts = sub.split(/(\*\*[^*]+\*\*)/g);
                    return (
                        <span key={`${index}-${subIdx}`}>
                            {boldParts.map((bPart, bIdx) => {
                                if (bPart.startsWith('**') && bPart.endsWith('**')) {
                                    return <strong key={bIdx} className="text-slate-900 font-bold bg-amber-100/60 dark:bg-amber-900/40 px-1 rounded mx-0.5">{bPart.slice(2, -2)}</strong>;
                                }
                                if (bPart.includes('---')) {
                                    return bPart.split('---').map((s, i, arr) => (
                                        <span key={i}>
                                            {s}
                                            {i < arr.length - 1 && <div className="my-6 h-px bg-slate-200 border-b border-dashed border-slate-300 w-full"></div>}
                                        </span>
                                    ));
                                }
                                return bPart;
                            })}
                        </span>
                    );
                })}
            </span>
        );
    });
};

// --- Text Normalizer (auto line breaks) ---
const normalizeTextForLineBreaks = (text: string): string => {
    if (!text) return "";

    // Already has good newlines? Skip normalization
    const existingLines = text.split('\n').length;
    if (existingLines > 3) {
        return text;
    }

    let result = text;

    // 1. Add line break before numbered items: "1." "2." etc. (but not decimal numbers like "1.5")
    // Pattern: space followed by number, dot, and space then Thai/English/special chars
    result = result.replace(/\s+(\d+)\.\s+(?=[ก-๙a-zA-Z\*\$\\])/g, '\n$1. ');

    // 2. Add line break before Thai choice letters: "ก." "ข." "ค." etc.
    result = result.replace(/\s+([ก-ฮ])\.\s+/g, '\n$1. ');

    // 3. Add line break before bullet points: "* " or "- " 
    result = result.replace(/\s+(\*\s+|\-\s+)(?=[ก-๙a-zA-Z])/g, '\n$1');

    // 4. Add line break before step indicators: "ขั้นที่ 1:", "ขั้นตอนที่ 2:"
    result = result.replace(/\s+(ขั้นที่\s*\d+|ขั้นตอนที่\s*\d+)\s*[:\.]?\s*/g, '\n$1: ');

    // 5. Add line break before bold headers: "**xxx:**" 
    result = result.replace(/\s+(\*\*[^*]+:\*\*)/g, '\n$1');

    // 6. Add line break before important Thai keywords
    result = result.replace(/\s+(ข้อควรระวัง|หมายเหตุ|ตัวอย่าง|วิธีทำ|วิธีคิด|คำตอบ|เฉลย)\s*[:\.]?\s*/g, '\n$1: ');

    // 7. Add line break before "เช่น" when it starts a new clause
    result = result.replace(/([ครับค่ะ\.\!\?\:])(\s+)(เช่น)/g, '$1\n$3');

    // 8. Clean up multiple consecutive newlines
    result = result.replace(/\n{3,}/g, '\n\n');

    // 9. Clean leading newlines
    result = result.replace(/^\n+/, '');

    return result.trim();
};

// --- Notion Style Renderer ---
export const renderNotionStyleContent = (text: string, fontSizeClass: string = "text-xl") => {
    if (!text) return "";

    // Normalize text first (add line breaks where needed)
    const normalizedText = normalizeTextForLineBreaks(text);
    const lines = normalizedText.split('\n');
    let nodes: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let inList = false;

    lines.forEach((line, i) => {
        const trimmed = line.trim();

        // 1. List Items (- or *)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (!inList) { inList = true; currentList = []; }
            currentList.push(
                <li key={i} className={`text-slate-700 ml-4 pl-2 mb-1 leading-loose marker:text-slate-400 ${fontSizeClass}`}>
                    {renderWithLatex(trimmed.substring(2))}
                </li>
            );
            return;
        }

        // Flush list if we encounter non-list line
        if (inList) {
            nodes.push(<ul key={`ul-${i}`} className="list-disc list-outside mb-4 space-y-1 ml-4">{currentList}</ul>);
            currentList = [];
            inList = false;
        }

        if (!trimmed) {
            nodes.push(<div key={i} className="h-4"></div>);
            return;
        }

        // Quotes / Callouts (> text)
        if (trimmed.startsWith('> ') || trimmed.startsWith('| ')) {
            nodes.push(
                <div key={i} className={`border-l-[3px] border-slate-300 pl-4 py-1 my-2 text-slate-700 italic bg-slate-50 rounded-r-lg ${fontSizeClass}`}>
                    {renderWithLatex(trimmed.substring(2))}
                </div>
            );
            return;
        }

        // Normal Text
        nodes.push(
            <div key={i} className={`text-slate-800 leading-relaxed font-medium mb-3 min-h-[1.5em] break-words ${fontSizeClass}`}>
                {renderWithLatex(line)}
            </div>
        );
    });

    if (inList) {
        nodes.push(<ul key="last-ul" className="list-disc list-outside mb-4 space-y-1 ml-4">{currentList}</ul>);
    }

    return <div className="notion-content overflow-x-hidden">{nodes}</div>;
};

// --- Main Smart Content Component ---
export const SmartContentRenderer = ({ content }: { content: string }) => {
    // 1. Check if it's JSON Smart Content
    let blocks: ContentBlock[] = [];
    let isSmart = false;

    if (content && (content.trim().startsWith('[') || content.trim().startsWith('{'))) {
        try {
            const parsed = JSON.parse(content);

            if (Array.isArray(parsed)) {
                // Filter out metadata objects, keep only content blocks with valid types
                blocks = parsed.filter((item: ContentBlock) =>
                    item && item.type && ['header', 'definition', 'formula', 'example', 'note', 'image'].includes(item.type)
                );
                isSmart = blocks.length > 0;
            } else if (parsed && typeof parsed === 'object') {
                // Handle wrapped structure: { metadata: {...}, content: [...] }
                if (parsed.content && Array.isArray(parsed.content)) {
                    blocks = parsed.content.filter((item: ContentBlock) =>
                        item && item.type && ['header', 'definition', 'formula', 'example', 'note', 'image'].includes(item.type)
                    );
                    isSmart = blocks.length > 0;
                }
            }
        } catch (e) {
            // Not JSON, fall back to normal text
            isSmart = false;
        }
    }

    // 2. Render Smart Blocks (Notion-like)
    if (isSmart) {
        return (
            <div className="w-full">
                {blocks.map((block, idx) => (
                    <div key={idx} className="mb-8">
                        {/* Header Block */}
                        {block.type === 'header' && (
                            <div className="mt-12 mb-6">
                                <h3 className="text-3xl md:text-4xl font-extrabold text-slate-800 flex items-center gap-3 border-l-4 border-slate-400 pl-4 py-1">
                                    <span className="text-3xl">{getEmojiForHeader(block.content)}</span>
                                    {block.content}
                                </h3>
                            </div>
                        )}

                        {/* Definition Block - Minimal Style */}
                        {block.type === 'definition' && (
                            <div className="my-6 group bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                                <div className="flex gap-3 items-start">
                                    <div className="text-2xl select-none shrink-0 mt-0.5">
                                        {block.title && getEmojiForHeader(block.title) ? getEmojiForHeader(block.title) : '💡'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {block.title && <div className="font-bold text-slate-800 text-2xl mb-3">{block.title}</div>}
                                        <div className="text-slate-600 leading-relaxed">
                                            {renderNotionStyleContent(block.content, "text-lg")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Formula Block - Minimal Style */}
                        {block.type === 'formula' && (
                            <div className="my-6 py-6 px-5 bg-white rounded-xl border border-slate-100 text-center">
                                {block.title && (
                                    <div className="text-2xl font-bold text-slate-700 mb-4 flex items-center justify-center gap-2">
                                        <span className="text-3xl">{getEmojiForHeader(block.title) || '📐'}</span>
                                        <span>{block.title}</span>
                                    </div>
                                )}
                                <div className="text-xl md:text-2xl text-slate-700 leading-loose">
                                    {renderWithLatex(block.content)}
                                </div>
                            </div>
                        )}

                        {/* Example Block - Minimal Style */}
                        {block.type === 'example' && (
                            <div className="my-6 pl-4 border-l-2 border-slate-200 py-1">
                                {block.title && <div className="text-2xl font-bold text-slate-700 mb-3 flex items-center gap-2"><span className="text-2xl">📝</span> {block.title}</div>}
                                <div className="text-slate-600 leading-relaxed">
                                    {renderNotionStyleContent(block.content, "text-lg")}
                                </div>
                            </div>
                        )}

                        {/* Note/Warning Block - Minimal Style */}
                        {block.type === 'note' && (
                            <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex gap-3 text-slate-700">
                                <div className="text-2xl select-none shrink-0">⚠️</div>
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800 text-2xl mb-2">ข้อควรระวัง</div>
                                    <div className="text-slate-600 leading-relaxed">
                                        {renderNotionStyleContent(block.content, "text-lg")}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Image Block */}
                        {block.type === 'image' && (
                            <div className="my-10 flex flex-col items-center">
                                <div className="relative overflow-hidden">
                                    {/* Handle both explicit url property or content property as fallback */}
                                    <img
                                        src={block.url || block.content}
                                        alt={block.alt || block.caption || "Summary Image"}
                                        className="max-w-full md:max-w-[600px] h-auto object-contain rounded-2xl shadow-lg"
                                        loading="lazy"
                                    />
                                </div>
                                {block.caption && (
                                    <div className="mt-4 text-center text-sm text-slate-500 italic">
                                        📷 {block.caption}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // 3. Fallback to Normal Text Rendering
    return (
        <div className="prose prose-xl max-w-none text-slate-700 leading-relaxed font-medium notion-content">
            {renderNotionStyleContent(content)}
        </div>
    );
};
