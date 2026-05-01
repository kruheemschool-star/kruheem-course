"use client";

import { ReactNode } from "react";

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
    const current = value || defaultColor;
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={current}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-12 h-10 rounded-lg border-2 border-slate-200 cursor-pointer"
                />
                <input
                    type="text"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={defaultColor}
                    className="flex-1 px-3 py-2 text-sm font-mono border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none"
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        className="px-2 py-1 text-xs text-slate-500 hover:text-red-600"
                        title="ใช้ค่าเริ่มต้น"
                    >
                        ล้าง
                    </button>
                )}
            </div>
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
