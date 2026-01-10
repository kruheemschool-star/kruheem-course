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
export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = "", inline = false }) => {
    if (!text) return null;

    // Regex สำหรับแยกชิ้นส่วนข้อความกับสมการ
    // Groups: 
    // 1: Block Math \[ ... \]
    // 2: Block Math $$ ... $$
    // 3: Inline Math \( ... \)
    // 4: Inline Math $ ... $
    const regex = /(\\\[[\s\S]*?\\\])|(\$\$[\s\S]*?\$\$)|(\\\([\s\S]*?\\\))|(\$[^$\n]+\$)/g;

    const parts = text.split(regex);

    return (
        <span className={`math-content ${className}`}>
            {parts.map((part, index) => {
                if (!part) return null;

                // Block Math \[ ... \]
                if (part.startsWith('\\[') && part.endsWith('\\]')) {
                    const math = part.slice(2, -2);
                    return <div key={index} className="my-2 overflow-x-auto overflow-y-hidden"><BlockMath math={math} /></div>;
                }

                // Block Math $$ ... $$
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = part.slice(2, -2);
                    return <div key={index} className="my-2 overflow-x-auto overflow-y-hidden"><BlockMath math={math} /></div>;
                }

                // Inline Math \( ... \)
                if (part.startsWith('\\(') && part.endsWith('\\)')) {
                    const math = part.slice(2, -2).replace(/,/g, ',\\allowbreak ');
                    return <InlineMath key={index} math={math} />;
                }

                // Inline Math $ ... $
                if (part.startsWith('$') && part.endsWith('$')) {
                    const math = part.slice(1, -1).replace(/,/g, ',\\allowbreak ');
                    return <InlineMath key={index} math={math} />;
                }

                // Normal Text (with Markdown Support)
                return (
                    <span
                        key={index}
                        dangerouslySetInnerHTML={{
                            __html: part
                                // 0. Clean up [cite: ...] artifacts
                                .replace(/\[cite:\s*[\d,\s]+\]/gi, '')

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
