"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useUserAuth } from "@/context/AuthContext";
import type { Section, SectionType, SalesPageConfig, BoostersConfig } from "@/app/course/[id]/template/types";
import { SECTION_META, createDefaultSection } from "@/app/course/[id]/template/defaults";
import { buildSampleSalesPage } from "@/app/admin/debug/seed-salespage/[courseId]/sampleData";

export default function SalesPageAdmin() {
    const { id } = useParams();
    const courseId = typeof id === "string" ? id : "";
    const router = useRouter();
    const { isAdmin } = useUserAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [course, setCourse] = useState<any>(null);
    const [config, setConfig] = useState<SalesPageConfig>({ enabled: false, sections: [] });
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const [editJson, setEditJson] = useState("");
    const [editError, setEditError] = useState<string | null>(null);
    const [showAddPicker, setShowAddPicker] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [editingBooster, setEditingBooster] = useState<keyof BoostersConfig | null>(null);
    const [boosterJson, setBoosterJson] = useState("");
    const [boosterError, setBoosterError] = useState<string | null>(null);

    useEffect(() => {
        if (!courseId) return;
        (async () => {
            const snap = await getDoc(doc(db, "courses", courseId));
            if (snap.exists()) {
                const data = snap.data();
                setCourse(data);
                if (data.salesPage) {
                    setConfig(data.salesPage);
                } else {
                    setConfig({ enabled: false, sections: [] });
                }
            }
            setLoading(false);
        })();
    }, [courseId]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
    };

    const saveConfig = async (next: SalesPageConfig, successMsg = "✅ บันทึกแล้ว") => {
        setSaving(true);
        try {
            await updateDoc(doc(db, "courses", courseId), { salesPage: next });
            setConfig(next);
            showToast(successMsg);
        } catch (e: any) {
            showToast("❌ " + e.message);
        }
        setSaving(false);
    };

    const toggleEnabled = () => saveConfig({ ...config, enabled: !config.enabled });

    const toggleSection = (idx: number) => {
        const sections = [...config.sections];
        sections[idx] = { ...sections[idx], enabled: !sections[idx].enabled } as Section;
        saveConfig({ ...config, sections });
    };

    const moveSection = (idx: number, dir: -1 | 1) => {
        const sections = [...config.sections].sort((a, b) => a.order - b.order);
        const target = idx + dir;
        if (target < 0 || target >= sections.length) return;
        [sections[idx], sections[target]] = [sections[target], sections[idx]];
        const reordered = sections.map((s, i) => ({ ...s, order: i + 1 })) as Section[];
        saveConfig({ ...config, sections: reordered }, "↕️ เปลี่ยนลำดับแล้ว");
    };

    const deleteSection = (idx: number) => {
        if (!confirm("ลบ section นี้?")) return;
        const sections = config.sections.filter((_, i) => i !== idx);
        saveConfig({ ...config, sections }, "🗑️ ลบแล้ว");
    };

    const addSection = (type: SectionType) => {
        const maxOrder = config.sections.reduce((m, s) => Math.max(m, s.order), 0);
        const newSection = createDefaultSection(type, maxOrder + 1);
        saveConfig({ ...config, sections: [...config.sections, newSection] }, `➕ เพิ่ม ${SECTION_META[type].label} แล้ว`);
        setShowAddPicker(false);
    };

    const updateBoosters = (boosters: BoostersConfig) => {
        saveConfig({ ...config, boosters }, "✅ อัปเดต Boosters");
    };

    const toggleBooster = (key: keyof BoostersConfig) => {
        const current = config.boosters || {};
        const existing = current[key];
        let next: BoostersConfig;
        if (existing) {
            next = { ...current, [key]: { ...existing, enabled: !existing.enabled } };
        } else {
            // Initialize with defaults
            if (key === "stickyCTA") {
                next = { ...current, stickyCTA: { enabled: true, ctaText: "สมัครเรียน", priceText: "", showAfterScrollPx: 600 } };
            } else if (key === "socialProof") {
                next = {
                    ...current,
                    socialProof: {
                        enabled: true,
                        intervalSeconds: 15,
                        displaySeconds: 5,
                        messages: [
                            { name: "คุณสมชาย", location: "กรุงเทพฯ", action: "เพิ่งสมัครคอร์ส", timeAgo: "3 นาทีที่แล้ว" },
                            { name: "คุณสมหญิง", location: "เชียงใหม่", action: "เพิ่งสมัครคอร์ส", timeAgo: "8 นาทีที่แล้ว" },
                            { name: "น้องเอ", location: "ภูเก็ต", action: "เพิ่งสมัครคอร์ส", timeAgo: "15 นาทีที่แล้ว" },
                        ],
                    },
                };
            } else if (key === "exitIntent") {
                next = {
                    ...current,
                    exitIntent: {
                        enabled: true,
                        title: "เดี๋ยวก่อน!",
                        desc: "รับส่วนลดพิเศษก่อนไปนะครับ",
                        ctaText: "สนใจเลย!",
                        discountText: "ลดเพิ่ม 500 บาท",
                    },
                };
            } else {
                next = current;
            }
        }
        updateBoosters(next);
    };

    const openEditor = (section: Section) => {
        setEditingSection(section);
        setEditJson(JSON.stringify(section.data, null, 2));
        setEditError(null);
    };

    const openBoosterEditor = (key: keyof BoostersConfig) => {
        const existing = config.boosters?.[key] || {};
        setEditingBooster(key);
        setBoosterJson(JSON.stringify(existing, null, 2));
        setBoosterError(null);
    };

    const saveBoosterEditor = () => {
        if (!editingBooster) return;
        try {
            const parsed = JSON.parse(boosterJson);
            const next: BoostersConfig = { ...(config.boosters || {}), [editingBooster]: parsed };
            saveConfig({ ...config, boosters: next }, "✅ แก้ไข Booster แล้ว");
            setEditingBooster(null);
        } catch (e: any) {
            setBoosterError("JSON ไม่ถูกต้อง: " + e.message);
        }
    };

    const saveEditor = () => {
        if (!editingSection) return;
        try {
            const parsed = JSON.parse(editJson);
            const sections = config.sections.map((s) =>
                s.id === editingSection.id ? ({ ...s, data: parsed } as Section) : s
            );
            saveConfig({ ...config, sections }, "✅ แก้ไขแล้ว");
            setEditingSection(null);
        } catch (e: any) {
            setEditError("JSON ไม่ถูกต้อง: " + e.message);
        }
    };

    const seedSample = async () => {
        if (!course) return;
        if (config.sections.length > 0 && !confirm("คอร์สนี้มี sections อยู่แล้ว แทนที่ด้วยตัวอย่าง?")) return;
        const sample = buildSampleSalesPage({
            title: course.title || "คอร์สตัวอย่าง",
            price: course.price || 2900,
            fullPrice: course.fullPrice || 4900,
        });
        saveConfig(sample, `✨ Seed ตัวอย่าง ${sample.sections.length} sections`);
    };

    if (!isAdmin) return <div className="min-h-screen flex items-center justify-center text-slate-500">Admin only</div>;
    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">กำลังโหลด...</div>;
    if (!course) return <div className="min-h-screen flex items-center justify-center text-slate-500">ไม่พบคอร์ส</div>;

    const sortedSections = [...config.sections].sort((a, b) => a.order - b.order);

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
                    <div>
                        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:underline mb-2">
                            ← กลับ
                        </button>
                        <h1 className="text-2xl font-bold text-slate-800">🎨 Sales Page Editor</h1>
                        <p className="text-slate-500 text-sm">{course.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/course/${courseId}`}
                            target="_blank"
                            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100"
                        >
                            👁️ ดูหน้าจริง
                        </Link>
                    </div>
                </div>

                {/* Master toggle */}
                <div className={`p-5 rounded-2xl border-2 mb-6 flex items-center justify-between flex-wrap gap-3 ${config.enabled ? "bg-emerald-50 border-emerald-200" : "bg-slate-100 border-slate-200"}`}>
                    <div>
                        <p className="font-bold text-slate-800 text-lg">
                            {config.enabled ? "✅ Template เปิดใช้งานอยู่" : "⏸️ Template ปิดอยู่"}
                        </p>
                        <p className="text-sm text-slate-500">
                            {config.enabled
                                ? "คอร์สนี้กำลังใช้ sales page ใหม่"
                                : "คอร์สยังใช้ sales page แบบเดิม (ต้องมี sections ≥ 1 ก่อนเปิด)"}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {config.sections.length === 0 && (
                            <button
                                onClick={seedSample}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
                            >
                                ✨ Seed ตัวอย่าง 12 sections
                            </button>
                        )}
                        <button
                            onClick={toggleEnabled}
                            disabled={saving || (config.sections.length === 0 && !config.enabled)}
                            className={`px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-50 ${config.enabled ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                        >
                            {config.enabled ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                        </button>
                    </div>
                </div>

                {/* Sections list */}
                <div className="space-y-3 mb-6">
                    {sortedSections.length === 0 ? (
                        <div className="p-10 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
                            <p className="text-4xl mb-3">📭</p>
                            <p className="text-slate-500">ยังไม่มี sections — กด "เพิ่ม Section" หรือ "Seed ตัวอย่าง"</p>
                        </div>
                    ) : (
                        sortedSections.map((section, idx) => {
                            const meta = SECTION_META[section.type];
                            return (
                                <div
                                    key={section.id}
                                    className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3 transition ${section.enabled ? "border-slate-200" : "border-slate-100 opacity-60"}`}
                                >
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => moveSection(idx, -1)}
                                            disabled={idx === 0 || saving}
                                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            onClick={() => moveSection(idx, 1)}
                                            disabled={idx === sortedSections.length - 1 || saving}
                                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                        >
                                            ▼
                                        </button>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm flex-shrink-0">
                                        #{section.order}
                                    </div>
                                    <div className="text-2xl flex-shrink-0">{meta.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800">{meta.label}</p>
                                        <p className="text-xs text-slate-500 truncate">{meta.desc}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleSection(idx)}
                                        disabled={saving}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${section.enabled ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                    >
                                        {section.enabled ? "เปิด" : "ปิด"}
                                    </button>
                                    <button
                                        onClick={() => openEditor(section)}
                                        disabled={saving}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                    >
                                        ✏️ แก้ไข
                                    </button>
                                    <button
                                        onClick={() => deleteSection(idx)}
                                        disabled={saving}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Add section button */}
                <button
                    onClick={() => setShowAddPicker(true)}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-300 bg-white text-indigo-600 font-bold hover:bg-indigo-50 hover:border-indigo-400 transition mb-8"
                >
                    ➕ เพิ่ม Section
                </button>

                {/* Boosters Panel */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">⚡ Conversion Boosters</h2>
                            <p className="text-sm text-slate-500">ตัวช่วยเพิ่มยอดขาย — เปิดใช้งานเฉพาะที่ต้องการ</p>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3">
                        {/* Sticky CTA */}
                        {(() => {
                            const b = config.boosters?.stickyCTA;
                            const enabled = !!b?.enabled;
                            return (
                                <div className={`p-4 rounded-xl border-2 transition ${enabled ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="text-2xl">📌</span>
                                        <button
                                            onClick={() => toggleBooster("stickyCTA")}
                                            disabled={saving}
                                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${enabled ? "bg-emerald-600 text-white" : "bg-slate-300 text-white"}`}
                                        >
                                            {enabled ? "ON" : "OFF"}
                                        </button>
                                    </div>
                                    <p className="font-bold text-slate-800 text-sm">Sticky CTA</p>
                                    <p className="text-xs text-slate-500 mb-2">ปุ่มสมัครลอยด้านล่างเมื่อ scroll</p>
                                    <button
                                        onClick={() => openBoosterEditor("stickyCTA")}
                                        className="text-xs text-indigo-600 hover:underline font-bold"
                                    >
                                        ✏️ แก้ไข
                                    </button>
                                </div>
                            );
                        })()}

                        {/* Social Proof */}
                        {(() => {
                            const b = config.boosters?.socialProof;
                            const enabled = !!b?.enabled;
                            return (
                                <div className={`p-4 rounded-xl border-2 transition ${enabled ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="text-2xl">💬</span>
                                        <button
                                            onClick={() => toggleBooster("socialProof")}
                                            disabled={saving}
                                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${enabled ? "bg-emerald-600 text-white" : "bg-slate-300 text-white"}`}
                                        >
                                            {enabled ? "ON" : "OFF"}
                                        </button>
                                    </div>
                                    <p className="font-bold text-slate-800 text-sm">Social Proof Toast</p>
                                    <p className="text-xs text-slate-500 mb-2">popup &ldquo;คนเพิ่งสมัคร&rdquo;</p>
                                    <button
                                        onClick={() => openBoosterEditor("socialProof")}
                                        className="text-xs text-indigo-600 hover:underline font-bold"
                                    >
                                        ✏️ แก้ไข
                                    </button>
                                </div>
                            );
                        })()}

                        {/* Exit Intent */}
                        {(() => {
                            const b = config.boosters?.exitIntent;
                            const enabled = !!b?.enabled;
                            return (
                                <div className={`p-4 rounded-xl border-2 transition ${enabled ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="text-2xl">✋</span>
                                        <button
                                            onClick={() => toggleBooster("exitIntent")}
                                            disabled={saving}
                                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${enabled ? "bg-emerald-600 text-white" : "bg-slate-300 text-white"}`}
                                        >
                                            {enabled ? "ON" : "OFF"}
                                        </button>
                                    </div>
                                    <p className="font-bold text-slate-800 text-sm">Exit Intent Popup</p>
                                    <p className="text-xs text-slate-500 mb-2">popup เมื่อจะออกจากหน้า</p>
                                    <button
                                        onClick={() => openBoosterEditor("exitIntent")}
                                        className="text-xs text-indigo-600 hover:underline font-bold"
                                    >
                                        ✏️ แก้ไข
                                    </button>
                                </div>
                            );
                        })()}
                    </div>

                    <p className="text-xs text-slate-400 mt-4">
                        💡 Tip: เพิ่ม <code className="bg-slate-100 px-1.5 py-0.5 rounded">Countdown Timer</code> section เพื่อเพิ่มความเร่งด่วน
                    </p>
                </div>
            </div>

            {/* Add section modal */}
            {showAddPicker && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setShowAddPicker(false)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-bold text-xl text-slate-800 mb-4">เลือกประเภท Section</h3>
                        <div className="grid sm:grid-cols-2 gap-2">
                            {(Object.keys(SECTION_META) as SectionType[]).map((type) => {
                                const meta = SECTION_META[type];
                                return (
                                    <button
                                        key={type}
                                        onClick={() => addSection(type)}
                                        className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-left transition flex items-start gap-3"
                                    >
                                        <span className="text-2xl flex-shrink-0">{meta.icon}</span>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{meta.label}</p>
                                            <p className="text-xs text-slate-500">{meta.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setShowAddPicker(false)}
                            className="mt-4 w-full py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200"
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            )}

            {/* Edit section modal */}
            {editingSection && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-xl text-slate-800">
                                ✏️ แก้ไข: {SECTION_META[editingSection.type].label}
                            </h3>
                            <button
                                onClick={() => setEditingSection(null)}
                                className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                            แก้ JSON ตรงนี้ได้เลย (Phase 2 — Phase 3 จะทำฟอร์มให้สวยๆ)
                        </p>
                        <textarea
                            value={editJson}
                            onChange={(e) => {
                                setEditJson(e.target.value);
                                setEditError(null);
                            }}
                            className={`flex-1 min-h-[400px] p-4 font-mono text-sm border-2 rounded-xl outline-none resize-none ${editError ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-indigo-400"}`}
                            spellCheck={false}
                        />
                        {editError && <p className="text-red-600 text-sm mt-2">{editError}</p>}
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={saveEditor}
                                disabled={saving}
                                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
                            >
                                💾 บันทึก
                            </button>
                            <button
                                onClick={() => setEditingSection(null)}
                                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Booster Edit Modal */}
            {editingBooster && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-xl text-slate-800">
                                ⚡ แก้ไข Booster: {editingBooster}
                            </h3>
                            <button
                                onClick={() => setEditingBooster(null)}
                                className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                            แก้ JSON config ของ booster
                        </p>
                        <textarea
                            value={boosterJson}
                            onChange={(e) => {
                                setBoosterJson(e.target.value);
                                setBoosterError(null);
                            }}
                            className={`flex-1 min-h-[400px] p-4 font-mono text-sm border-2 rounded-xl outline-none resize-none ${boosterError ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-indigo-400"}`}
                            spellCheck={false}
                        />
                        {boosterError && <p className="text-red-600 text-sm mt-2">{boosterError}</p>}
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={saveBoosterEditor}
                                disabled={saving}
                                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
                            >
                                💾 บันทึก
                            </button>
                            <button
                                onClick={() => setEditingBooster(null)}
                                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900 text-white rounded-full shadow-xl z-[100] font-bold text-sm">
                    {toast}
                </div>
            )}
        </div>
    );
}
