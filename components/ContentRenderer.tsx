"use client";

import React, { useState } from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

// --- ImageWithLoading Component ---
const ImageWithLoading = ({
    src,
    alt,
    className = "",
    caption
}: {
    src: string;
    alt: string;
    className?: string;
    caption?: string;
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    return (
        <div className="relative w-full">
            {/* Skeleton Loader */}
            {isLoading && !hasError && (
                <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-xl animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"
                        style={{
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite'
                        }}
                    />
                    {/* Image icon placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                            className="w-12 h-12 text-slate-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                </div>
            )}

            {/* Error State */}
            {hasError && (
                <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700">
                    <svg
                        className="w-10 h-10 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    <span className="text-sm">ไม่สามารถโหลดรูปภาพได้</span>
                </div>
            )}

            {/* Actual Image */}
            {!hasError && (
                <img
                    src={src}
                    alt={alt}
                    className={`${className} transition-all duration-500 ease-out ${isLoading
                        ? 'opacity-0 scale-[0.98]'
                        : 'opacity-100 scale-100'
                        }`}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                    loading="lazy"
                />
            )}

            {/* Caption */}
            {caption && !hasError && (
                <div className={`mt-3 text-center text-sm text-slate-500 font-medium transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'
                    }`}>
                    {caption}
                </div>
            )}

            {/* Shimmer Animation Style */}
            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </div>
    );
};

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
                    <code key={index} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-sm font-mono break-all">
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
                            return <code key={`${index}-${subIdx}`} className="text-slate-600 dark:text-slate-400">{sub}</code>;
                        }
                    }

                    // Markdown (**bold**, ---, > quote)
                    const boldParts = sub.split(/(\*\*[^*]+\*\*)/g);
                    return (
                        <span key={`${index}-${subIdx}`}>
                            {boldParts.map((bPart, bIdx) => {
                                if (bPart.startsWith('**') && bPart.endsWith('**')) {
                                    return <strong key={bIdx} className="text-slate-900 dark:text-slate-100 font-bold bg-amber-100/60 dark:bg-amber-900/40 px-1 rounded mx-0.5">{bPart.slice(2, -2)}</strong>;
                                }
                                if (bPart.includes('---')) {
                                    return bPart.split('---').map((s, i, arr) => (
                                        <span key={i}>
                                            {s}
                                            {i < arr.length - 1 && <div className="my-6 h-px bg-slate-200 dark:bg-slate-700 border-b border-dashed border-slate-300 dark:border-slate-600 w-full"></div>}
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
export const renderNotionStyleContent = (text: string, fontSizeClass: string = "text-2xl") => {
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
                <li key={i} className={`text-slate-700 dark:text-slate-300 ml-4 pl-2 mb-1 leading-loose marker:text-slate-400 dark:marker:text-slate-500 ${fontSizeClass}`}>
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
                <div key={i} className={`border-l-[3px] border-slate-300 dark:border-slate-600 pl-4 py-1 my-2 text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/50 rounded-r-lg ${fontSizeClass}`}>
                    {renderWithLatex(trimmed.substring(2))}
                </div>
            );
            return;
        }

        // Normal Text
        nodes.push(
            <div key={i} className={`text-slate-800 dark:text-slate-200 leading-relaxed font-medium mb-3 min-h-[1.5em] break-words ${fontSizeClass}`}>
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
                        {/* Header Block - MAIN HEADING */}
                        {block.type === 'header' && (
                            <div className="mt-14 mb-8">
                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 border-l-4 border-slate-800 dark:border-slate-400 pl-5 py-2">
                                    <span className="text-3xl">{getEmojiForHeader(block.content)}</span>
                                    {block.content}
                                </h2>
                            </div>
                        )}

                        {/* Definition Block - SUB SECTION */}
                        {block.type === 'definition' && (
                            <div className="my-6 group bg-slate-50/50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div className="flex gap-3 items-start">
                                    <div className="text-2xl select-none shrink-0 mt-0.5">
                                        {block.title && getEmojiForHeader(block.title) ? getEmojiForHeader(block.title) : '💡'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {block.title && <div className="font-semibold text-slate-700 dark:text-slate-200 text-xl md:text-2xl mb-3">{block.title}</div>}
                                        <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                            {renderNotionStyleContent(block.content, "text-lg")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Formula Block - SUB SECTION */}
                        {block.type === 'formula' && (
                            <div className="my-6 py-6 px-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                                {block.title && (
                                    <div className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center justify-center gap-2">
                                        <span className="text-2xl">{getEmojiForHeader(block.title) || '📐'}</span>
                                        <span>{block.title}</span>
                                    </div>
                                )}
                                <div className="text-lg md:text-xl text-slate-700 dark:text-slate-200 leading-loose">
                                    {renderWithLatex(block.content)}
                                </div>
                            </div>
                        )}

                        {/* Example Block - SUB SECTION */}
                        {block.type === 'example' && (
                            <div className="my-6 pl-4 border-l-2 border-slate-200 dark:border-slate-600 py-1">
                                {block.title && <div className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2"><span className="text-xl">📝</span> {block.title}</div>}
                                <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {renderNotionStyleContent(block.content, "text-lg")}
                                </div>
                            </div>
                        )}

                        {/* Note/Warning Block - SUB SECTION */}
                        {block.type === 'note' && (
                            <div className="my-6 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex gap-3 text-slate-700 dark:text-slate-200">
                                <div className="text-2xl select-none shrink-0">⚠️</div>
                                <div className="flex-1">
                                    <div className="font-semibold text-slate-700 dark:text-slate-200 text-xl mb-2">ข้อควรระวัง</div>
                                    <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {renderNotionStyleContent(block.content, "text-lg")}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Image Block */}
                        {block.type === 'image' && (
                            <div className="my-8">
                                <ImageWithLoading
                                    src={block.url || block.content}
                                    alt={block.alt || block.caption || "Summary Image"}
                                    className="w-full h-auto rounded-xl border border-slate-100 shadow-sm"
                                    caption={block.caption}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // 3. Fallback to Normal Text Rendering
    return (
        <div className="prose prose-2xl dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed font-medium notion-content">
            {renderNotionStyleContent(content)}
        </div>
    );
};
