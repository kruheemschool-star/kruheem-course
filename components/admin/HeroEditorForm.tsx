"use client";

import { useState } from "react";
import type { HeroData } from "@/app/course/[id]/template/types";

interface Props {
    value: HeroData;
    onChange: (next: HeroData) => void;
}

type Tab = "content" | "cta" | "colors" | "cover";

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "content", label: "เนื้อหา", icon: "📝" },
    { id: "cta", label: "ปุ่ม & ราคา", icon: "🎯" },
    { id: "colors", label: "สีพื้นหลัง", icon: "🎨" },
    { id: "cover", label: "ปก", icon: "🖼️" },
];

/** Small styled text input */
function Field({ label, value, onChange, placeholder, multiline = false, helper }: {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    placeholder?: string;
    multiline?: boolean;
    helper?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
            {multiline ? (
                <textarea
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none resize-none"
                />
            ) : (
                <input
                    type="text"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none"
                />
            )}
            {helper && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
        </div>
    );
}

/** Color picker with hex input + visual swatch */
function ColorField({ label, value, onChange, defaultColor }: {
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

export default function HeroEditorForm({ value, onChange }: Props) {
    const [tab, setTab] = useState<Tab>("content");
    const update = (patch: Partial<HeroData>) => onChange({ ...value, ...patch });

    const coverType = value.coverType || "image";

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-xl">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition ${tab === t.id ? "bg-white text-indigo-700 shadow" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {tab === "content" && (
                    <>
                        <Field
                            label="ป้ายกำกับ (Badge)"
                            value={value.badgeText}
                            onChange={(v) => update({ badgeText: v })}
                            placeholder="เช่น คอร์สยอดนิยม"
                        />
                        <Field
                            label="ชื่อคอร์ส (Title) *"
                            value={value.title}
                            onChange={(v) => update({ title: v })}
                            placeholder="เช่น ม.4 เทอม 2 (เพิ่มเติม)"
                        />
                        <Field
                            label="คำอธิบายใต้ชื่อ (Subtitle)"
                            value={value.subtitle}
                            onChange={(v) => update({ subtitle: v })}
                            placeholder="เปลี่ยนการเรียนคณิตศาสตร์ให้สนุก..."
                            multiline
                        />
                    </>
                )}

                {tab === "cta" && (
                    <>
                        <Field
                            label="ข้อความปุ่มหลัก"
                            value={value.ctaText}
                            onChange={(v) => update({ ctaText: v })}
                            placeholder="สมัครเรียนทันที"
                        />
                        <Field
                            label="ราคาในปุ่ม"
                            value={value.ctaPriceText}
                            onChange={(v) => update({ ctaPriceText: v })}
                            placeholder="฿1,900"
                        />
                        <Field
                            label="ข้อความปุ่มรอง (ทดลองเรียน)"
                            value={value.secondaryCtaText}
                            onChange={(v) => update({ secondaryCtaText: v })}
                            placeholder="ทดลองเรียน"
                            helper="เว้นว่างเพื่อซ่อนปุ่ม"
                        />
                        <Field
                            label="ข้อความราคาเฉลี่ย"
                            value={value.pricePerDayText}
                            onChange={(v) => update({ pricePerDayText: v })}
                            placeholder="เฉลี่ยวันละ 5.21 บาทเท่านั้น"
                        />
                    </>
                )}

                {tab === "colors" && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <ColorField
                                label="สีพื้นหลังบน"
                                value={value.bgColorFrom}
                                onChange={(v) => update({ bgColorFrom: v })}
                                defaultColor="#F8F9FD"
                            />
                            <ColorField
                                label="สีพื้นหลังล่าง"
                                value={value.bgColorTo}
                                onChange={(v) => update({ bgColorTo: v })}
                                defaultColor="#F8F9FD"
                            />
                        </div>
                        <ColorField
                            label="สีชื่อคอร์ส"
                            value={value.titleColor}
                            onChange={(v) => update({ titleColor: v })}
                            defaultColor="#1E293B"
                        />
                        <ColorField
                            label="สีคำอธิบาย"
                            value={value.subtitleColor}
                            onChange={(v) => update({ subtitleColor: v })}
                            defaultColor="#475569"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <ColorField
                                label="สีพื้นหลัง Badge"
                                value={value.badgeBgColor}
                                onChange={(v) => update({ badgeBgColor: v })}
                                defaultColor="#FFFFFF"
                            />
                            <ColorField
                                label="สีตัวอักษร Badge"
                                value={value.badgeTextColor}
                                onChange={(v) => update({ badgeTextColor: v })}
                                defaultColor="#475569"
                            />
                        </div>
                        <div className="pt-2 border-t border-slate-200">
                            <p className="text-xs font-bold text-slate-500 mb-2">สีวงกลมตกแต่งพื้นหลัง (Blur blobs)</p>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorField
                                    label="วงกลม 1"
                                    value={value.blob1Color}
                                    onChange={(v) => update({ blob1Color: v })}
                                    defaultColor="#C7D2FE"
                                />
                                <ColorField
                                    label="วงกลม 2"
                                    value={value.blob2Color}
                                    onChange={(v) => update({ blob2Color: v })}
                                    defaultColor="#FECDD3"
                                />
                            </div>
                        </div>
                    </>
                )}

                {tab === "cover" && (
                    <>
                        {/* Cover type selector */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">รูปแบบปก</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => update({ coverType: "image" })}
                                    className={`p-4 rounded-xl border-2 text-left transition ${coverType === "image" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
                                >
                                    <div className="text-2xl mb-1">🖼️</div>
                                    <div className="font-bold text-sm text-slate-800">รูปภาพ</div>
                                    <div className="text-xs text-slate-500">อัพโหลด/ใส่ URL รูป</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => update({ coverType: "card" })}
                                    className={`p-4 rounded-xl border-2 text-left transition ${coverType === "card" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
                                >
                                    <div className="text-2xl mb-1">🎴</div>
                                    <div className="font-bold text-sm text-slate-800">การ์ดสีพร้อมข้อความ</div>
                                    <div className="text-xs text-slate-500">ออกแบบจาก gradient + text</div>
                                </button>
                            </div>
                        </div>

                        {coverType === "image" && (
                            <>
                                <Field
                                    label="URL รูปปก"
                                    value={value.imageUrl}
                                    onChange={(v) => update({ imageUrl: v })}
                                    placeholder="https://... (เว้นว่างเพื่อใช้รูปคอร์ส)"
                                    helper="หากเว้นว่าง จะใช้รูปหลักของคอร์สที่ตั้งไว้"
                                />
                                {(value.imageUrl) && (
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-3">
                                        <p className="text-xs font-bold text-slate-500 mb-2">ตัวอย่าง:</p>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={value.imageUrl} alt="preview" className="w-full rounded-lg" />
                                    </div>
                                )}
                            </>
                        )}

                        {coverType === "card" && (
                            <>
                                <Field
                                    label="ข้อความหลัก (ใหญ่)"
                                    value={value.cardMainText}
                                    onChange={(v) => update({ cardMainText: v })}
                                    placeholder="เช่น ม.4"
                                />
                                <Field
                                    label="ข้อความรอง"
                                    value={value.cardSubText}
                                    onChange={(v) => update({ cardSubText: v })}
                                    placeholder="เช่น เทอม 2"
                                />
                                <Field
                                    label="ป้ายกำกับในการ์ด"
                                    value={value.cardBadgeText}
                                    onChange={(v) => update({ cardBadgeText: v })}
                                    placeholder="เช่น คณิตศาสตร์เพิ่มเติม"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <ColorField
                                        label="สีไล่เฉด 1"
                                        value={value.cardColorFrom}
                                        onChange={(v) => update({ cardColorFrom: v })}
                                        defaultColor="#FB7185"
                                    />
                                    <ColorField
                                        label="สีไล่เฉด 2"
                                        value={value.cardColorTo}
                                        onChange={(v) => update({ cardColorTo: v })}
                                        defaultColor="#F97316"
                                    />
                                </div>
                                <ColorField
                                    label="สีข้อความในการ์ด"
                                    value={value.cardTextColor}
                                    onChange={(v) => update({ cardTextColor: v })}
                                    defaultColor="#FFFFFF"
                                />
                                {/* Live card preview */}
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-2">ตัวอย่าง:</p>
                                    <div
                                        className="relative rounded-3xl aspect-[4/3] flex flex-col items-center justify-center p-6 shadow-xl overflow-hidden"
                                        style={{
                                            background: `linear-gradient(135deg, ${value.cardColorFrom || "#FB7185"} 0%, ${value.cardColorTo || "#F97316"} 100%)`,
                                            color: value.cardTextColor || "#FFFFFF",
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                                        <div className="relative z-10 text-center">
                                            {value.cardMainText && <div className="text-5xl font-black">{value.cardMainText}</div>}
                                            {value.cardSubText && <div className="text-3xl font-black mt-1">{value.cardSubText}</div>}
                                            {value.cardBadgeText && (
                                                <div className="mt-3 inline-block px-3 py-1 rounded-full bg-black/20 text-xs font-bold">
                                                    {value.cardBadgeText}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
