"use client";

import { ReactNode, useState, type ChangeEvent } from "react";
import { uploadImageToStorage } from "@/lib/upload";

/* ============================================================
   Shared form primitives for sales-page section editors.
   All inputs are controlled. Keep visuals consistent with HeroEditorForm.
   ============================================================ */

export function TextField({
    label,
    value,
    onChange,
    placeholder,
    helper,
    required,
}: {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    placeholder?: string;
    helper?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type="text"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none"
            />
            {helper && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
        </div>
    );
}

export function TextareaField({
    label,
    value,
    onChange,
    placeholder,
    helper,
    rows = 3,
}: {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    placeholder?: string;
    helper?: string;
    rows?: number;
}) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
            <textarea
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none resize-none"
            />
            {helper && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
        </div>
    );
}

export function NumberField({
    label,
    value,
    onChange,
    placeholder,
    helper,
    min,
    max,
}: {
    label: string;
    value: number | undefined;
    onChange: (v: number) => void;
    placeholder?: string;
    helper?: string;
    min?: number;
    max?: number;
}) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
            <input
                type="number"
                value={value ?? ""}
                onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    onChange(isNaN(n) ? 0 : n);
                }}
                placeholder={placeholder}
                min={min}
                max={max}
                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none"
            />
            {helper && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
        </div>
    );
}

// Curated one-click palette: neutrals, warm/brand, pastels, cools, darks.
// Lowercase so it matches the native <input type="color"> value when we
// highlight the active swatch.
const COLOR_PRESETS: string[] = [
    "#ffffff", "#f8fafc", "#e2e8f0", "#fffaf2", "#fef3e0", "#fde68a",
    "#fca5a5", "#fb923c", "#f97316", "#ef4444", "#ec4899", "#f472b6",
    "#99f6e4", "#2dd4bf", "#14b8a6", "#22c55e", "#93c5fd", "#3b82f6",
    "#6366f1", "#8b5cf6", "#64748b", "#334155", "#13132a", "#000000",
];

const HEX6 = /^#[0-9a-fA-F]{6}$/;

export function ColorField({
    label,
    value,
    onChange,
    defaultColor,
}: {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    defaultColor: string;
}) {
    // The swatch / native picker always need a valid 6-digit hex, even while
    // the user is mid-typing a partial code in the text box.
    const raw = value || defaultColor;
    const current = (HEX6.test(raw) ? raw : defaultColor).toLowerCase();

    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-700">{label}</label>
                {value ? (
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        className="text-xs text-slate-400 hover:text-indigo-600 transition-colors"
                        title="คืนค่าสีเริ่มต้น"
                    >
                        ↺ ค่าเริ่มต้น
                    </button>
                ) : (
                    <span className="text-xs text-slate-300">ค่าเริ่มต้น</span>
                )}
            </div>

            {/* Big swatch — click anywhere on it to open the colour picker — + hex box */}
            <div className="flex items-center gap-2">
                <label
                    className="relative w-14 h-11 rounded-xl border-2 border-slate-200 shadow-sm cursor-pointer shrink-0 overflow-hidden hover:border-indigo-400 transition-colors"
                    style={{ backgroundColor: current }}
                    title="คลิกเพื่อเลือกสีเอง"
                >
                    <input
                        type="color"
                        value={current}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                        aria-label={`เลือกสี: ${label}`}
                    />
                </label>
                <input
                    type="text"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={defaultColor}
                    spellCheck={false}
                    className="flex-1 min-w-0 px-3 py-2.5 text-sm font-mono uppercase border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none"
                />
            </div>

            {/* One-click presets — pick a colour without knowing any hex code */}
            <div className="flex flex-wrap gap-1.5 mt-2">
                {COLOR_PRESETS.map((c) => {
                    const active = current === c;
                    return (
                        <button
                            key={c}
                            type="button"
                            onClick={() => onChange(c)}
                            title={c}
                            aria-label={c}
                            className={`h-6 w-6 rounded-lg transition-transform hover:scale-110 ${active ? "ring-2 ring-indigo-500 ring-offset-1" : "border border-slate-200"}`}
                            style={{ backgroundColor: c }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// Shared curated emoji set for every icon field (pain / education /
// positive / general). Manual typing in the box still allows anything.
export const ICON_CHOICES: string[] = [
    "😰", "😣", "😵", "😓", "😱", "🤯", "😢", "💸", "⏰", "❌", "📉", "🚫", "⚠️", "❓",
    "📚", "📝", "✏️", "📖", "🎓", "👨‍🎓", "👩‍🎓", "🧠", "💡", "🎯",
    "✅", "✨", "⭐", "🌟", "🏆", "🥇", "💯", "🔥", "🚀", "📈", "📊", "👍", "❤️", "🎉", "🔒", "🛡️", "⏳", "🗓️", "💪", "⚡", "🙌",
];

export function IconPalette({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-1 mt-1.5">
            {ICON_CHOICES.map((emo) => (
                <button
                    key={emo}
                    type="button"
                    onClick={() => onChange(emo)}
                    title={emo}
                    className={`w-8 h-8 flex items-center justify-center text-lg rounded-lg border transition-colors ${value === emo ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                >
                    {emo}
                </button>
            ))}
        </div>
    );
}

export function IconField({
    label,
    value,
    onChange,
    helper,
}: {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    helper?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
            <input
                type="text"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder="📚"
                maxLength={4}
                className="w-20 px-3 py-2 text-2xl text-center border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none"
            />
            <IconPalette value={value} onChange={onChange} />
            {helper && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
        </div>
    );
}

export function SelectField<T extends string>({
    label,
    value,
    onChange,
    options,
    helper,
}: {
    label: string;
    value: T | undefined;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
    helper?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
            <select
                value={value || ""}
                onChange={(e) => onChange(e.target.value as T)}
                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none bg-white"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {helper && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
        </div>
    );
}

/* ============================================================
   ImageUploadField — pick a file → upload to Storage → set URL.
   Still allows pasting a URL directly for flexibility.
   ============================================================ */
export function ImageUploadField({
    label,
    value,
    onChange,
    helper,
    pathPrefix = "salespage",
}: {
    label: string;
    value: string | undefined;
    onChange: (url: string) => void;
    helper?: string;
    pathPrefix?: string;
}) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setError(null);
        try {
            const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const url = await uploadImageToStorage(file, `${pathPrefix}/${Date.now()}_${safe}`);
            onChange(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
        } finally {
            setUploading(false);
            e.target.value = ""; // allow re-selecting the same file
        }
    };

    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
            <div className="flex items-center gap-3">
                {/* Preview */}
                <div className="relative w-24 h-16 rounded-xl border-2 border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0">
                    {value ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={value} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xl">🖼️</div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <label className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold cursor-pointer transition ${uploading ? "bg-slate-100 text-slate-400 cursor-wait" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}>
                        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
                        {uploading ? "⏳ กำลังอัปโหลด..." : value ? "🔄 เปลี่ยนรูป" : "⬆️ อัปโหลดรูป"}
                    </label>
                    {value && !uploading && (
                        <button
                            type="button"
                            onClick={() => onChange("")}
                            className="ml-2 text-xs text-slate-400 hover:text-red-500"
                        >
                            ลบรูป
                        </button>
                    )}
                </div>
            </div>
            {/* URL fallback */}
            <input
                type="text"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder="หรือวางลิงก์รูป (URL)"
                spellCheck={false}
                className="w-full mt-2 px-3 py-2 text-sm font-mono border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
            />
            {error && <p className="text-xs text-red-500 mt-1">❌ {error}</p>}
            {helper && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
        </div>
    );
}

/* ============================================================
   ArrayField — generic list editor with add/remove/reorder
   ============================================================ */
export function ArrayField<T>({
    label,
    items,
    onChange,
    renderItem,
    newItem,
    addLabel = "+ เพิ่มรายการ",
    itemTitle,
    helper,
}: {
    label: string;
    items: T[];
    onChange: (items: T[]) => void;
    renderItem: (item: T, update: (patch: Partial<T> | T) => void, idx: number) => ReactNode;
    newItem: () => T;
    addLabel?: string;
    itemTitle?: (item: T, idx: number) => string;
    helper?: string;
}) {
    const update = (idx: number, patch: Partial<T> | T) => {
        const next = [...items];
        const old = next[idx];
        // Merge for objects, replace for primitives
        if (typeof old === "object" && old !== null && typeof patch === "object" && patch !== null) {
            next[idx] = { ...(old as any), ...(patch as any) } as T;
        } else {
            next[idx] = patch as T;
        }
        onChange(next);
    };
    const remove = (idx: number) => {
        if (!confirm("ลบรายการนี้?")) return;
        onChange(items.filter((_, i) => i !== idx));
    };
    const move = (idx: number, dir: -1 | 1) => {
        const target = idx + dir;
        if (target < 0 || target >= items.length) return;
        const next = [...items];
        [next[idx], next[target]] = [next[target], next[idx]];
        onChange(next);
    };
    const add = () => onChange([...items, newItem()]);

    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
            {helper && <p className="text-xs text-slate-400 mb-2">{helper}</p>}

            <div className="space-y-2">
                {items.length === 0 && (
                    <p className="text-sm text-slate-400 italic p-3 bg-slate-50 rounded-xl text-center">
                        ยังไม่มีรายการ
                    </p>
                )}
                {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2 gap-2">
                            <p className="text-xs font-bold text-slate-500">
                                #{idx + 1} {itemTitle ? itemTitle(item, idx) : ""}
                            </p>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => move(idx, -1)}
                                    disabled={idx === 0}
                                    className="px-2 py-0.5 text-xs rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                                >
                                    ▲
                                </button>
                                <button
                                    type="button"
                                    onClick={() => move(idx, 1)}
                                    disabled={idx === items.length - 1}
                                    className="px-2 py-0.5 text-xs rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                                >
                                    ▼
                                </button>
                                <button
                                    type="button"
                                    onClick={() => remove(idx)}
                                    className="px-2 py-0.5 text-xs rounded bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                        {renderItem(item, (patch) => update(idx, patch), idx)}
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={add}
                className="w-full mt-2 py-2.5 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 font-bold text-sm hover:bg-indigo-50 hover:border-indigo-400"
            >
                {addLabel}
            </button>
        </div>
    );
}

/* ============================================================
   Tabs wrapper for forms
   ============================================================ */
export function FormTabs({
    tabs,
    active,
    onChange,
}: {
    tabs: { id: string; label: string; icon?: string }[];
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {tabs.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange(t.id)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition ${active === t.id ? "bg-white text-indigo-700 shadow" : "text-slate-500 hover:text-slate-700"}`}
                >
                    {t.icon} {t.label}
                </button>
            ))}
        </div>
    );
}

/* ============================================================
   Standard form scroll container
   ============================================================ */
export function FormScroll({ children }: { children: ReactNode }) {
    return (
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
            {children}
        </div>
    );
}
