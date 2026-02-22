"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Wand2, FileJson, AlertTriangle, CheckCircle2, FileText, Copy, Info, ChevronDown, ChevronUp } from "lucide-react";

interface SmartJsonEditorProps {
    content: string;
    onChange: (content: string) => void;
}

interface ValidationResult {
    isValid: boolean;
    message: string;
    line?: number;
    column?: number;
    suggestion?: string;
}

// --- Smart Character Fixes ---
function smartFixCharacters(text: string): string {
    let fixed = text;

    // 1. Fix smart/curly quotes → straight quotes
    fixed = fixed.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');  // double quotes
    fixed = fixed.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'"); // single quotes

    // 2. Fix Thai quotation marks
    fixed = fixed.replace(/[«»]/g, '"');

    // 3. Fix em/en dashes in keys/values context (not inside strings)
    // Only fix dashes that appear outside quoted strings as hyphens
    fixed = fixed.replace(/[\u2013\u2014]/g, '-');

    // 4. Fix zero-width characters
    fixed = fixed.replace(/[\u200B\u200C\u200D\uFEFF\u00A0]/g, '');

    // 5. Fix fullwidth characters (common in Thai/CJK input)
    fixed = fixed.replace(/\uFF1A/g, ':');  // fullwidth colon
    fixed = fixed.replace(/\uFF0C/g, ',');  // fullwidth comma
    fixed = fixed.replace(/\uFF5B/g, '{');  // fullwidth {
    fixed = fixed.replace(/\uFF5D/g, '}');  // fullwidth }
    fixed = fixed.replace(/\uFF3B/g, '[');  // fullwidth [
    fixed = fixed.replace(/\uFF3D/g, ']');  // fullwidth ]

    // 6. Fix escaped newlines that are literal text
    fixed = fixed.replace(/\\n/g, '\\n'); // keep escaped newlines as-is

    return fixed;
}

// --- Advanced Auto-Fix JSON ---
function autoFixJson(raw: string): { result: string; fixes: string[] } {
    const fixes: string[] = [];
    let text = raw.trim();

    if (!text) return { result: text, fixes: [] };

    // 1. Remove Markdown code blocks
    if (text.startsWith('```')) {
        text = text.replace(/^```(?:json|JSON)?\s*\n?/i, '').replace(/\n?\s*```\s*$/, '');
        fixes.push("ลบ Markdown code block wrapper");
    }

    // 2. Remove AI citation artifacts
    const beforeArtifacts = text;
    text = text
        .replace(/\[cite(_start|_end)?(:.*?)?\]/gi, '')
        .replace(/^Based on the provided[\s\S]*?\[/, "[")
        .replace(/^Here['']s the[\s\S]*?\[/, "[");
    if (text !== beforeArtifacts) fixes.push("ลบ AI artifacts/citations");

    // 3. Smart character fixes
    const beforeChars = text;
    text = smartFixCharacters(text);
    if (text !== beforeChars) fixes.push("แก้ไขอักขระพิเศษ (smart quotes, fullwidth chars)");

    // 4. Fix unquoted keys: { key: "value" } → { "key": "value" }
    const beforeKeys = text;
    text = text.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
    if (text !== beforeKeys) fixes.push("ใส่ quotes ให้ keys ที่ขาด");

    // 5. Fix single-quoted strings → double quotes (careful with content)
    // Only fix single quotes used as JSON string delimiters
    const beforeSingleQuotes = text;
    text = text.replace(/:\s*'([^']*)'/g, ': "$1"');
    if (text !== beforeSingleQuotes) fixes.push("เปลี่ยน single quotes เป็น double quotes");

    // 6. Fix trailing commas
    const beforeTrailing = text;
    text = text.replace(/,(\s*[}\]])/g, '$1');
    if (text !== beforeTrailing) fixes.push("ลบ trailing commas");

    // 7. Fix missing commas between objects/arrays
    const beforeMissing = text;
    text = text.replace(/\}(\s*)\{/g, '},$1{');
    text = text.replace(/\](\s*)\[/g, '],$1[');
    text = text.replace(/"(\s*)\{/g, '",$1{');
    if (text !== beforeMissing) fixes.push("เพิ่ม commas ที่ขาดหายไป");

    // 8. Try to parse
    try {
        const parsed = JSON.parse(text);
        const formatted = JSON.stringify(parsed, null, 2);
        fixes.push("จัดรูปแบบ JSON ให้สวยงาม");
        return { result: formatted, fixes };
    } catch (e) {
        // Try with JSON5 relaxed parsing (manual)
        try {
            // Last resort: try to fix common remaining issues
            // Remove comments
            text = text.replace(/\/\/.*$/gm, '');
            text = text.replace(/\/\*[\s\S]*?\*\//g, '');

            const parsed = JSON.parse(text);
            const formatted = JSON.stringify(parsed, null, 2);
            fixes.push("ลบ comments และจัดรูปแบบ");
            return { result: formatted, fixes };
        } catch {
            return { result: text, fixes: [...fixes, "⚠️ ยังมีข้อผิดพลาดที่แก้ไขอัตโนมัติไม่ได้"] };
        }
    }
}

// --- Real-time Validation ---
function validateJson(text: string): ValidationResult {
    if (!text.trim()) {
        return { isValid: true, message: "ว่างเปล่า - พร้อมใส่ข้อมูล" };
    }

    try {
        const parsed = JSON.parse(text);

        // Validate structure for blog content
        if (Array.isArray(parsed)) {
            const invalidItems = parsed.filter((item: any, i: number) => {
                if (!item.type) return true;
                return false;
            });
            if (invalidItems.length > 0) {
                return {
                    isValid: true,
                    message: `⚠️ JSON ถูกต้อง แต่บาง item ไม่มี "type" field (${invalidItems.length} items)`,
                    suggestion: 'ทุก item ควรมี "type" เช่น "header", "paragraph", "image", "definition"'
                };
            }
            return { isValid: true, message: `✅ JSON ถูกต้อง (${parsed.length} blocks)` };
        } else if (typeof parsed === 'object') {
            return { isValid: true, message: "✅ JSON Object ถูกต้อง" };
        }

        return { isValid: true, message: "✅ JSON ถูกต้อง" };
    } catch (e) {
        const error = e as SyntaxError;
        const match = error.message.match(/position (\d+)/i) || error.message.match(/at column (\d+)/i);

        let line: number | undefined;
        let column: number | undefined;

        if (match) {
            const pos = parseInt(match[1]);
            const lines = text.substring(0, pos).split('\n');
            line = lines.length;
            column = lines[lines.length - 1].length + 1;
        }

        // Generate helpful suggestions
        let suggestion = "";
        const msg = error.message.toLowerCase();
        if (msg.includes("unexpected token")) {
            suggestion = "ตรวจสอบ comma, bracket หรืออักขระพิเศษที่ผิดตำแหน่ง";
        } else if (msg.includes("unterminated string")) {
            suggestion = 'ตรวจสอบว่าทุก string มีปิด "';
        } else if (msg.includes("expected")) {
            suggestion = "ตรวจสอบโครงสร้าง JSON ว่าครบถ้วน (brackets, commas)";
        }

        return {
            isValid: false,
            message: error.message,
            line,
            column,
            suggestion: suggestion || 'ลองกด "Auto Fix" เพื่อแก้ไขอัตโนมัติ'
        };
    }
}

// --- Plain Text to JSON Converter ---
function plainTextToJson(text: string): string {
    const lines = text.split('\n').filter(l => l.trim());
    const blocks: any[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Detect headers (lines starting with # or all caps or very short bold-like text)
        if (trimmed.startsWith('# ')) {
            blocks.push({ type: "header", content: trimmed.replace(/^#+\s*/, '') });
        } else if (trimmed.startsWith('## ')) {
            blocks.push({ type: "subheader", content: trimmed.replace(/^#+\s*/, '') });
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            // Check if previous block is a list, append to it
            const lastBlock = blocks[blocks.length - 1];
            const item = trimmed.replace(/^[-•]\s*/, '');
            if (lastBlock && lastBlock.type === 'list') {
                lastBlock.items.push(item);
            } else {
                blocks.push({ type: "list", items: [item] });
            }
        } else if (trimmed.startsWith('> ')) {
            blocks.push({ type: "callout", content: trimmed.replace(/^>\s*/, ''), style: "info" });
        } else if (trimmed.match(/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|svg)/i)) {
            blocks.push({ type: "image", url: trimmed, alt: "รูปภาพ" });
        } else if (trimmed.length < 60 && trimmed.endsWith(':')) {
            // Short lines ending with colon → likely a section title
            blocks.push({ type: "header", content: trimmed.replace(/:$/, '') });
        } else {
            blocks.push({ type: "paragraph", content: trimmed });
        }
    }

    return JSON.stringify(blocks, null, 2);
}

export default function SmartJsonEditor({ content, onChange }: SmartJsonEditorProps) {
    const [validation, setValidation] = useState<ValidationResult>({ isValid: true, message: "" });
    const [showConverter, setShowConverter] = useState(false);
    const [plainText, setPlainText] = useState("");
    const [lastFixes, setLastFixes] = useState<string[]>([]);
    const [showFixes, setShowFixes] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Real-time validation with debounce
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setValidation(validateJson(content));
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [content]);

    const handleAutoFix = useCallback(() => {
        const { result, fixes } = autoFixJson(content);
        onChange(result);
        setLastFixes(fixes);
        setShowFixes(true);

        // Validate after fix
        const newValidation = validateJson(result);
        if (newValidation.isValid) {
            setValidation(newValidation);
        }
    }, [content, onChange]);

    const handleConvertPlainText = useCallback(() => {
        if (!plainText.trim()) return;
        const json = plainTextToJson(plainText);
        onChange(json);
        setPlainText("");
        setShowConverter(false);
    }, [plainText, onChange]);

    const handleCopyJson = useCallback(() => {
        navigator.clipboard.writeText(content);
        alert("คัดลอก JSON แล้ว!");
    }, [content]);

    // Calculate line numbers
    const lineCount = content.split('\n').length;

    return (
        <div className="relative h-[600px] flex flex-col">
            {/* Status Bar */}
            <div className={`flex items-center justify-between px-4 py-2 rounded-t-3xl text-sm font-medium ${
                !content.trim() 
                    ? 'bg-slate-100 text-slate-500' 
                    : validation.isValid 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
                <div className="flex items-center gap-2">
                    {!content.trim() ? (
                        <FileJson size={16} />
                    ) : validation.isValid ? (
                        <CheckCircle2 size={16} />
                    ) : (
                        <AlertTriangle size={16} />
                    )}
                    <span className="truncate max-w-[400px]">{validation.message || "JSON Editor"}</span>
                    {validation.line && (
                        <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full">
                            บรรทัด {validation.line}{validation.column ? `, คอลัมน์ ${validation.column}` : ''}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span>{lineCount} บรรทัด</span>
                    <span>•</span>
                    <span>{content.length.toLocaleString()} ตัวอักษร</span>
                </div>
            </div>

            {/* Suggestion Banner */}
            {validation.suggestion && !validation.isValid && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-x border-amber-200 text-xs text-amber-700">
                    <Info size={14} />
                    <span>{validation.suggestion}</span>
                </div>
            )}

            {/* Fix Results */}
            {showFixes && lastFixes.length > 0 && (
                <div className="px-4 py-2 bg-indigo-50 border-x border-indigo-200 text-xs">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-700">
                            🪄 แก้ไขแล้ว {lastFixes.length} รายการ
                        </span>
                        <button onClick={() => setShowFixes(false)} className="text-indigo-400 hover:text-indigo-600">
                            ✕
                        </button>
                    </div>
                    <ul className="mt-1 space-y-0.5 text-indigo-600">
                        {lastFixes.map((fix, i) => (
                            <li key={i}>• {fix}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Main Editor */}
            <div className="flex-1 relative">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full h-full p-6 pl-16 text-sm font-mono bg-slate-900 text-slate-200 focus:outline-none focus:ring-2 resize-none leading-relaxed ${
                        showConverter ? 'rounded-none' : 'rounded-b-3xl'
                    } ${validation.isValid ? 'focus:ring-emerald-400' : 'focus:ring-rose-400'}`}
                    placeholder={`[\n  {\n    "type": "header",\n    "content": "บทนำ"\n  },\n  {\n    "type": "paragraph",\n    "content": "เนื้อหาบทความ..."\n  },\n  {\n    "type": "image",\n    "url": "https://...",\n    "alt": "คำอธิบายรูป"\n  }\n]`}
                    spellCheck={false}
                />

                {/* Line Numbers Overlay */}
                <div className="absolute top-0 left-0 w-12 h-full overflow-hidden pointer-events-none pt-6 pl-3 font-mono text-sm leading-relaxed text-slate-600 select-none">
                    {Array.from({ length: Math.max(lineCount, 20) }, (_, i) => (
                        <div key={i} className={`${validation.line === i + 1 ? 'text-rose-400 font-bold' : ''}`}>
                            {i + 1}
                        </div>
                    ))}
                </div>

                {/* Floating Toolbar */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCopyJson}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-2 rounded-xl text-sm shadow-lg transition"
                        title="คัดลอก JSON"
                    >
                        <Copy size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowConverter(!showConverter)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm shadow-lg transition ${
                            showConverter 
                                ? 'bg-indigo-500 hover:bg-indigo-600 text-white' 
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                        title="แปลงข้อความธรรมดาเป็น JSON"
                    >
                        <FileText size={16} />
                        <span className="hidden sm:inline">แปลงข้อความ</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleAutoFix}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition"
                    >
                        <Wand2 size={16} /> Auto Fix
                    </button>
                </div>
            </div>

            {/* Plain Text Converter Panel */}
            {showConverter && (
                <div className="border-t-2 border-indigo-400 bg-indigo-950 rounded-b-3xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                            <FileText size={16} />
                            แปลงข้อความธรรมดา → JSON
                        </h4>
                        <button
                            type="button"
                            onClick={() => setShowConverter(false)}
                            className="text-indigo-400 hover:text-indigo-200 text-sm"
                        >
                            ปิด ✕
                        </button>
                    </div>
                    <p className="text-xs text-indigo-400 mb-2">
                        วางข้อความธรรมดา แล้วกดแปลง - รองรับ: # หัวข้อ, - รายการ, &gt; callout, URL รูปภาพ, ย่อหน้าทั่วไป
                    </p>
                    <textarea
                        value={plainText}
                        onChange={(e) => setPlainText(e.target.value)}
                        className="w-full h-32 p-3 text-sm font-mono bg-indigo-900/50 text-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none border border-indigo-800 placeholder:text-indigo-600"
                        placeholder={"# หัวข้อบทความ\nเนื้อหาย่อหน้าแรก\n\n- รายการที่ 1\n- รายการที่ 2\n\n> ข้อความสำคัญ\n\nhttps://example.com/image.jpg"}
                    />
                    <div className="flex justify-end mt-2 gap-2">
                        <button
                            type="button"
                            onClick={handleConvertPlainText}
                            disabled={!plainText.trim()}
                            className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition"
                        >
                            <Wand2 size={16} />
                            แปลงเป็น JSON
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
