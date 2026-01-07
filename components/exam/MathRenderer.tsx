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

                // Normal Text
                // แปลง Newline เป็น <br />
                return (
                    <span key={index} dangerouslySetInnerHTML={{ __html: part.replace(/\n/g, '<br />') }} />
                );
            })}
        </span>
    );
};

export default MathRenderer;
