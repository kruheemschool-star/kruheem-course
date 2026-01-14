"use client";

import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathRendererProps {
    text: string;
    className?: string;
    inline?: boolean;
}

/**
 * Component สำหรับแปลงข้อความที่มี LaTeX ให้เป็นสมการทางคณิตศาสตร์ที่สวยงาม
 * รองรับรูปแบบ:
 * - \( ... \) หรือ $ ... $ สำหรับ Inline Math
 * - \[ ... \] หรือ $$ ... $$ สำหรับ Block Math
 */

// Error Boundary to catch KaTeX rendering errors
class KatexErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = "", inline = false }) => {
    // 🛡️ Robust Data Handling
    if (text === null || text === undefined) return null;

    // Handle case where text is an Object (e.g. from Tiptap or wrong JSON structure)
    // Handle case where text is an Object (e.g. from Tiptap or wrong JSON structure)
    if (typeof text === 'object') {
        const obj = text as any;

        // 🧩 Smart Format Detection: Structured Explanation (Principle/Steps/Pitfall)
        if (obj.principle || obj.steps || obj.pitfall || obj.transitional_steps) {
            return (
                <div className="space-y-4">
                    {/* 1. Principle (หลักการ) */}
                    {obj.principle && (
                        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                            <h4 className="font-bold text-indigo-700 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                                💡 หลักการที่ใช้ (Key Concept)
                            </h4>
                            <div className="text-indigo-900/80">
                                <MathRenderer text={String(obj.principle)} className={className} />
                            </div>
                        </div>
                    )}

                    {/* 2. Steps (ขั้นตอน) */}
                    {(obj.steps || obj.transitional_steps) && (
                        <div className="space-y-3">
                            <h4 className="font-bold text-stone-700 text-sm uppercase tracking-wider flex items-center gap-2 mt-4 border-b pb-2">
                                👣 ขั้นตอนการทำ (Step-by-Step)
                            </h4>
                            {Array.isArray(obj.steps || obj.transitional_steps) ? (
                                (obj.steps || obj.transitional_steps).map((step: string, i: number) => (
                                    <div key={i} className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 text-stone-500 font-bold text-xs flex items-center justify-center mt-0.5 border border-stone-200">
                                            {i + 1}
                                        </span>
                                        <div className="flex-grow text-stone-600">
                                            <MathRenderer text={String(step)} className={className} />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <MathRenderer text={String(obj.steps || obj.transitional_steps)} className={className} />
                            )}
                        </div>
                    )}

                    {/* 3. Pitfall (ข้อควรระวัง) */}
                    {obj.pitfall && (
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-lg mt-4 flex gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h4 className="font-bold text-rose-700 text-sm mb-1">ข้อควรระวัง (Common Pitfall)</h4>
                                <div className="text-rose-600/90 text-sm">
                                    <MathRenderer text={String(obj.pitfall)} className={className} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Tiptap / Standard Text Fallback
        let processedText = "";
        if (obj.text && typeof obj.text === 'string') {
            processedText = obj.text;
        } else if (obj.content && Array.isArray(obj.content)) {
            // Basic Tiptap/ProseMirror Text Extraction
            processedText = obj.content.map((block: any) =>
                block.content ? block.content.map((n: any) => n.text || '').join('') : ''
            ).join('\n');
        } else {
            // Fallback: Stringify to show structure instead of [object Object]
            processedText = JSON.stringify(text);
        }

        // Pass standard text processing to the rest of the component
        text = processedText;
    } else {
        // Ensure string
        text = String(text);
    }

    const processedText = text; // Re-assign for verifying regex split below

    // Regex สำหรับแยกชิ้นส่วนข้อความกับสมการ
    // ...
    const regex = /(\\\[[\s\S]*?\\\])|(\$\$[\s\S]*?\$\$)|(\\\([\s\S]*?\\\))|(\$[^$\n]+\$)/g;

    const parts = processedText.split(regex);

    // -------------------------------------------------------------
    // 🧠 Smart LaTeX Repair System (Layer 1: Syntax Balancer & Layer 2: Typo Fixer)
    // -------------------------------------------------------------
    const smartRepairLatex = (latex: string): string => {
        let repaired = latex;

        // 1. Fix Common Typos (Layer 2)
        const commonTypos: Record<string, string> = {
            '\\farc': '\\frac',
            '\\frca': '\\frac',
            '\\tims': '\\times',
            '\\itmes': '\\times',
            '\\alpah': '\\alpha',
            '\\thetaa': '\\theta',
            '\\lamda': '\\lambda',
            '\\sigmaa': '\\sigma',
            '\\right)': '\\right)', // Sometimes users type \right) instead of \right)
        };

        Object.keys(commonTypos).forEach(typo => {
            // Escape special regex characters (like parentheses in \right))
            const escapedTypo = typo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedTypo, 'g');
            repaired = repaired.replace(regex, commonTypos[typo]);
        });

        // 2. Syntax Balancer (Layer 1) - Balance Braces { }
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
            repaired += '}'.repeat(openBraces - closeBraces);
        }

        // 3. Environment Balancer - \left without \right
        const leftCount = (repaired.match(/\\left/g) || []).length;
        const rightCount = (repaired.match(/\\right/g) || []).length;
        if (leftCount > rightCount) {
            repaired += '\\right.'.repeat(leftCount - rightCount); // Close with invisible delimiter
        }

        return repaired;
    };

    return (
        <span className={`math-content ${className}`}>
            {parts.map((part, index) => {
                if (!part) return null;

                // Block Math \[ ... \]
                if (part.startsWith('\\[') && part.endsWith('\\]')) {
                    const math = smartRepairLatex(part.slice(2, -2));
                    return (
                        <KatexErrorBoundary key={index} fallback={<span className="text-red-500 break-all text-xs font-mono bg-red-50 p-1 rounded inline-block">{part}</span>}>
                            <div className="my-2 overflow-x-auto overflow-y-hidden"><BlockMath math={math} /></div>
                        </KatexErrorBoundary>
                    );
                }

                // Block Math $$ ... $$
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = smartRepairLatex(part.slice(2, -2));
                    return (
                        <KatexErrorBoundary key={index} fallback={<span className="text-red-500 break-all text-xs font-mono bg-red-50 p-1 rounded inline-block">{part}</span>}>
                            <div className="my-2 overflow-x-auto overflow-y-hidden"><BlockMath math={math} /></div>
                        </KatexErrorBoundary>
                    );
                }

                // Inline Math \( ... \)
                if (part.startsWith('\\(') && part.endsWith('\\)')) {
                    const math = smartRepairLatex(part.slice(2, -2).replace(/,/g, ',\\allowbreak '));
                    return (
                        <KatexErrorBoundary key={index} fallback={<span className="text-red-500 text-xs font-mono bg-red-50 p-0.5 rounded">{part}</span>}>
                            <InlineMath math={math} />
                        </KatexErrorBoundary>
                    );
                }

                // Inline Math $ ... $
                if (part.startsWith('$') && part.endsWith('$')) {
                    const math = smartRepairLatex(part.slice(1, -1).replace(/,/g, ',\\allowbreak '));
                    return (
                        <KatexErrorBoundary key={index} fallback={<span className="text-red-500 text-xs font-mono bg-red-50 p-0.5 rounded">{part}</span>}>
                            <InlineMath math={math} />
                        </KatexErrorBoundary>
                    );
                }

                // Normal Text (with Markdown Support)
                return (
                    <span
                        key={index}
                        dangerouslySetInnerHTML={{
                            __html: part
                                // 1. Escape HTML (Basic prevention) - Optional but good practice
                                // .replace(/</g, "&lt;").replace(/>/g, "&gt;") 
                                // (Skipped to allow intended HTML/BR)

                                // 2. Headers (### Text)
                                .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-indigo-900 mt-4 mb-2">$1</h3>')
                                .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-indigo-900 mt-5 mb-2 border-b border-indigo-100 pb-1">$1</h2>')

                                // 3. Bold (**Text**)
                                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-indigo-900 bg-indigo-50 px-1 rounded">$1</strong>')

                                // 4. Italic (*Text*)
                                .replace(/\*(.*?)\*/g, '<em class="italic text-slate-500">$1</em>')

                                // 5. Lists (- Text or * Text at start of line)
                                .replace(/^[\-\*] (.*$)/gm, '<div class="flex items-start gap-2 my-1 pl-2"><span class="text-indigo-500 font-bold">•</span><span>$1</span></div>')

                                // 6. Horizontal Rule (---)
                                .replace(/^---$/gm, '<hr class="my-6 border-t-2 border-dashed border-slate-200" />')

                                // 7. Line Breaks (Convert remaining newlines to <br>)
                                // Note: We handle headers/lists which need block-like behavior, 
                                // but broadly converting \n to <br> works for general text.
                                .replace(/\n/g, '<br />')
                        }}
                    />
                );
            })}
        </span>
    );
};

export default MathRenderer;
