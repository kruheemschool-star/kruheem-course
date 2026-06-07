"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import type {
    PainPointData,
    SolutionData,
    CurriculumData,
    CurriculumChapter,
    ReviewsData,
    TestimonialData,
    TestimonialStory,
    TrustBadgesData,
    TrustBadgeStat,
    StatsTableData,
    StatsTableRow,
    PriceStackData,
    GuaranteeData,
    ComparisonData,
    ComparisonColumn,
    FAQData,
    CTAData,
    CountdownData,
    VideoPreviewData,
    VideoPreviewItem,
    ArticlesData,
    ArticleItem,
    HowItWorksData,
    HowItWorksStep,
    QuizData,
    QuizQuestion,
    QuizOption,
    QuizResultTier,
    FeaturesData,
    FeatureItem,
} from "@/app/course/[id]/template/types";
import {
    TextField,
    TextareaField,
    NumberField,
    IconField,
    IconPalette,
    SelectField,
    ArrayField,
    ImageUploadField,
    FormTabs,
    FormScroll,
} from "./primitives";

/* ============================================================
   PainPointForm
   ============================================================ */
export function PainPointForm({ value, onChange }: { value: PainPointData; onChange: (v: PainPointData) => void }) {
    const [tab, setTab] = useState("header");
    const update = (patch: Partial<PainPointData>) => onChange({ ...value, ...patch });

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormTabs
                active={tab}
                onChange={setTab}
                tabs={[
                    { id: "header", label: "หัวเรื่อง", icon: "📝" },
                    { id: "problems", label: "ปัญหา", icon: "😰" },
                    { id: "solutions", label: "ทางแก้", icon: "✨" },
                ]}
            />
            <FormScroll>
                {tab === "header" && (
                    <>
                        <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} required />
                        <TextField label="คำอธิบายใต้ชื่อ" value={value.subtitle} onChange={(v) => update({ subtitle: v })} />
                    </>
                )}
                {tab === "problems" && (
                    <>
                        <TextField
                            label="ชื่อกล่องปัญหา"
                            value={value.problemTitle}
                            onChange={(v) => update({ problemTitle: v })}
                            placeholder="ปัญหาที่พบบ่อย"
                        />
                        <IconField
                            label="ไอคอนกล่องปัญหา"
                            value={value.problemIcon}
                            onChange={(v) => update({ problemIcon: v })}
                            helper="ใส่อิโมจิ 1 ตัว"
                        />
                        <ArrayField
                            label="รายการปัญหา"
                            items={value.problems || []}
                            onChange={(items) => update({ problems: items })}
                            newItem={() => ({ icon: "❌", text: "ปัญหาใหม่" })}
                            addLabel="+ เพิ่มปัญหา"
                            itemTitle={(item) => item.text || ""}
                            renderItem={(item, upd) => (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={item.icon}
                                            onChange={(e) => upd({ icon: e.target.value })}
                                            maxLength={4}
                                            className="w-16 px-2 py-2 text-2xl text-center border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={item.text}
                                            onChange={(e) => upd({ text: e.target.value })}
                                            placeholder="ข้อความปัญหา"
                                            className="flex-1 px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                        />
                                    </div>
                                    <IconPalette value={item.icon} onChange={(v) => upd({ icon: v })} />
                                </div>
                            )}
                        />
                    </>
                )}
                {tab === "solutions" && (
                    <>
                        <TextField
                            label="ชื่อกล่องทางแก้"
                            value={value.solutionTitle}
                            onChange={(v) => update({ solutionTitle: v })}
                            placeholder="สิ่งที่จะเปลี่ยนไป"
                        />
                        <IconField
                            label="ไอคอนกล่องทางแก้"
                            value={value.solutionIcon}
                            onChange={(v) => update({ solutionIcon: v })}
                        />
                        <TextareaField
                            label="คำอธิบาย"
                            value={value.solutionDesc}
                            onChange={(v) => update({ solutionDesc: v })}
                        />
                        <ArrayField
                            label="รายการประโยชน์"
                            items={value.solutions || []}
                            onChange={(items) => update({ solutions: items })}
                            newItem={() => ({ icon: "✅", text: "ประโยชน์ใหม่" })}
                            addLabel="+ เพิ่มประโยชน์"
                            itemTitle={(item) => item.text || ""}
                            renderItem={(item, upd) => (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={item.icon}
                                            onChange={(e) => upd({ icon: e.target.value })}
                                            maxLength={4}
                                            className="w-16 px-2 py-2 text-2xl text-center border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={item.text}
                                            onChange={(e) => upd({ text: e.target.value })}
                                            placeholder="ข้อความประโยชน์"
                                            className="flex-1 px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                        />
                                    </div>
                                    <IconPalette value={item.icon} onChange={(v) => upd({ icon: v })} />
                                </div>
                            )}
                        />
                    </>
                )}
            </FormScroll>
        </div>
    );
}

/* ============================================================
   SolutionForm (Solution Cards)
   ============================================================ */
export function SolutionForm({ value, onChange }: { value: SolutionData; onChange: (v: SolutionData) => void }) {
    const update = (patch: Partial<SolutionData>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} required />
                <TextField label="คำอธิบาย" value={value.subtitle} onChange={(v) => update({ subtitle: v })} />
                <ArrayField
                    label="การ์ดสิ่งที่จะได้รับ"
                    items={value.items || []}
                    onChange={(items) => update({ items })}
                    newItem={() => ({ icon: "🎯", title: "หัวข้อ", desc: "คำอธิบาย" })}
                    addLabel="+ เพิ่มการ์ด"
                    itemTitle={(item) => item.title || ""}
                    renderItem={(item, upd) => (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={item.icon}
                                    onChange={(e) => upd({ icon: e.target.value })}
                                    maxLength={4}
                                    className="w-16 px-2 py-2 text-2xl text-center border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                                <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => upd({ title: e.target.value })}
                                    placeholder="หัวข้อ"
                                    className="flex-1 px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                            </div>
                            <IconPalette value={item.icon} onChange={(v) => upd({ icon: v })} />
                            <textarea
                                value={item.desc}
                                onChange={(e) => upd({ desc: e.target.value })}
                                placeholder="คำอธิบาย"
                                rows={2}
                                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none resize-none"
                            />
                        </div>
                    )}
                />
            </FormScroll>
        </div>
    );
}

/* ============================================================
   CurriculumForm
   ============================================================ */
const CHAPTER_PALETTE = [
    { color: "#EEF2FF", iconColor: "#4338CA" },
    { color: "#FEF2F2", iconColor: "#DC2626" },
    { color: "#F0FDF4", iconColor: "#16A34A" },
    { color: "#FFFBEB", iconColor: "#D97706" },
    { color: "#EFF6FF", iconColor: "#2563EB" },
    { color: "#F5F3FF", iconColor: "#7C3AED" },
    { color: "#FDF2F8", iconColor: "#DB2777" },
    { color: "#ECFEFF", iconColor: "#0891B2" },
];

export function CurriculumForm({ value, onChange, courseId }: { value: CurriculumData; onChange: (v: CurriculumData) => void; courseId?: string }) {
    const [pulling, setPulling] = useState(false);
    const update = (patch: Partial<CurriculumData>) => onChange({ ...value, ...patch });

    const pullFromLessons = async () => {
        if (!courseId) return;
        const existing = value.chapters?.length ?? 0;
        if (existing > 0 && !confirm(`มีบทอยู่แล้ว ${existing} บท — ดึงใหม่ทับของเดิม?`)) return;
        setPulling(true);
        try {
            const snap = await getDocs(collection(db, "courses", courseId, "lessons"));
            const lessons = snap.docs.map((d) => ({ id: d.id, ...d.data() as { title?: string; type?: string; order?: number; isFree?: boolean; headerId?: string } }));
            const headers = lessons.filter((l) => l.type === "header").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            if (headers.length === 0) { alert("ไม่พบบทเรียน (header) ในคอร์สนี้"); setPulling(false); return; }

            const chapters: CurriculumChapter[] = headers.map((h, i) => {
                const subs = lessons
                    .filter((l) => l.headerId === h.id && l.type !== "header")
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const videos = subs.filter((l) => l.type === "video").length;
                const exercises = subs.filter((l) => l.type === "exercise" || l.type === "quiz").length;
                const descParts: string[] = [];
                if (videos) descParts.push(`${videos} คลิป`);
                if (exercises) descParts.push(`แบบฝึก ${exercises}`);
                const palette = CHAPTER_PALETTE[i % CHAPTER_PALETTE.length];
                return {
                    id: i + 1,
                    title: (h.title || "").replace(/^\[EP\d+\]\s*/, "").trim(),
                    desc: descParts.join(" · ") || undefined,
                    content: subs.map((s) => (s.title || "").replace(/^\[EP\d+\]\s*/, "").trim()).filter(Boolean),
                    color: palette.color,
                    iconColor: palette.iconColor,
                };
            });
            update({ chapters });
            alert(`✅ ดึงมา ${chapters.length} บทแล้ว — อย่าลืมกด "บันทึก"`);
        } catch (e: unknown) {
            alert("ดึงไม่สำเร็จ: " + (e instanceof Error ? e.message : String(e)));
        }
        setPulling(false);
    };

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} required />
                <TextField label="คำอธิบาย" value={value.subtitle} onChange={(v) => update({ subtitle: v })} />

                {courseId && (
                    <button
                        type="button"
                        onClick={pullFromLessons}
                        disabled={pulling}
                        className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-700 font-semibold text-sm hover:bg-indigo-100 transition disabled:opacity-50"
                    >
                        {pulling ? "⏳ กำลังดึง..." : "⬇️ ดึงบทเรียนจริงจากคอร์สนี้อัตโนมัติ"}
                        <span className="block text-xs font-normal opacity-70 mt-0.5">จัดกลุ่มตาม header + นับคลิป/แบบฝึก + ใส่สีอัตโนมัติ</span>
                    </button>
                )}

                <ArrayField
                    label="บทเรียน"
                    items={value.chapters || []}
                    onChange={(items) => update({ chapters: items })}
                    newItem={() => ({ id: Date.now(), title: "บทใหม่", desc: "", content: ["หัวข้อย่อย"] }) as CurriculumChapter}
                    addLabel="+ เพิ่มบท"
                    itemTitle={(item) => item.title || ""}
                    renderItem={(item, upd) => (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={item.title}
                                onChange={(e) => upd({ title: e.target.value })}
                                placeholder="ชื่อบท"
                                className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                            <input
                                type="text"
                                value={item.desc || ""}
                                onChange={(e) => upd({ desc: e.target.value })}
                                placeholder="คำอธิบายบท (ไม่บังคับ)"
                                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                            <div className="grid grid-cols-2 gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-slate-500 mb-1">🎨 สีพื้นหลัง</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={item.color || "#ffffff"}
                                            onChange={(e) => upd({ color: e.target.value })}
                                            className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={item.color || ""}
                                            onChange={(e) => upd({ color: e.target.value })}
                                            placeholder="อัตโนมัติ"
                                            className="flex-1 px-2 py-1 text-xs font-mono border border-slate-200 rounded focus:border-indigo-400 outline-none"
                                        />
                                        {item.color && (
                                            <button type="button" onClick={() => upd({ color: "" })} className="text-xs text-red-500 hover:text-red-700">ลบ</button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-slate-500 mb-1">🎨 สีตัวเลข</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={item.iconColor || "#000000"}
                                            onChange={(e) => upd({ iconColor: e.target.value })}
                                            className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={item.iconColor || ""}
                                            onChange={(e) => upd({ iconColor: e.target.value })}
                                            placeholder="อัตโนมัติ"
                                            className="flex-1 px-2 py-1 text-xs font-mono border border-slate-200 rounded focus:border-indigo-400 outline-none"
                                        />
                                        {item.iconColor && (
                                            <button type="button" onClick={() => upd({ iconColor: "" })} className="text-xs text-red-500 hover:text-red-700">ลบ</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-1">หัวข้อย่อย (1 บรรทัด = 1 หัวข้อ)</p>
                                <textarea
                                    value={(item.content || []).join("\n")}
                                    onChange={(e) => upd({ content: e.target.value.split("\n").filter((s) => s.trim().length > 0) })}
                                    rows={4}
                                    placeholder="หัวข้อย่อย 1\nหัวข้อย่อย 2"
                                    className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none resize-none"
                                />
                            </div>
                        </div>
                    )}
                />
            </FormScroll>
        </div>
    );
}

/* ============================================================
   ReviewsForm (image marquee OR live Firestore reviews)
   ============================================================ */
export function ReviewsForm({ value, onChange }: { value: ReviewsData; onChange: (v: ReviewsData) => void }) {
    const update = (patch: Partial<ReviewsData>) => onChange({ ...value, ...patch });
    const source = value.source || "images";
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} />
                <TextField label="คำอธิบาย" value={value.subtitle} onChange={(v) => update({ subtitle: v })} />

                {/* Source toggle */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">แหล่งที่มาของรีวิว</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => update({ source: "images" })}
                            className={`p-3 rounded-xl border-2 text-sm font-medium transition text-left ${source === "images"
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                        >
                            <div className="font-bold">🖼️ รูปภาพ</div>
                            <div className="text-xs mt-0.5 opacity-80">อัปโหลดรูป screenshot รีวิว</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => update({ source: "live" })}
                            className={`p-3 rounded-xl border-2 text-sm font-medium transition text-left ${source === "live"
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                        >
                            <div className="font-bold">💬 รีวิวจริง (Live)</div>
                            <div className="text-xs mt-0.5 opacity-80">ดึงจากหน้ารีวิวอัตโนมัติ</div>
                        </button>
                    </div>
                </div>

                {/* Live review options */}
                {source === "live" && (
                    <div className="space-y-4 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                        <SelectField
                            label="ขอบเขตรีวิว"
                            value={value.liveScope || "all"}
                            onChange={(v) => update({ liveScope: v as "all" | "course" })}
                            options={[
                                { label: "ทั้งหมดในเว็บ", value: "all" },
                                { label: "เฉพาะคอร์สนี้", value: "course" },
                            ]}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <NumberField
                                label="จำนวนรีวิวสูงสุด"
                                value={value.liveLimit ?? 30}
                                onChange={(v) => update({ liveLimit: Math.max(4, Math.min(100, v)) })}
                            />
                            <NumberField
                                label="คะแนนขั้นต่ำ (1–5)"
                                value={value.liveMinRating ?? 4}
                                onChange={(v) => update({ liveMinRating: Math.max(1, Math.min(5, v)) })}
                            />
                        </div>
                        <p className="text-xs text-indigo-600">
                            💡 ระบบจะเลื่อนรีวิวอัตโนมัติเป็นสไลด์โชว์แนวนอน และ cache ข้อมูล 5 นาที
                        </p>
                    </div>
                )}

                {/* Image list — only show in "images" mode */}
                {source === "images" && (
                    <ArrayField
                        label="URL รูปรีวิว"
                        items={value.images || []}
                        onChange={(items) => update({ images: items as string[] })}
                        newItem={() => ""}
                        addLabel="+ เพิ่มรูป"
                        helper="วาง URL รูปจาก Firebase Storage หรือเว็บอื่น"
                        renderItem={(item, upd) => (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={item as string}
                                    onChange={(e) => upd(e.target.value as any)}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 text-sm font-mono border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                                {item && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item as string} alt="preview" className="w-32 h-auto rounded-lg border border-slate-200" />
                                )}
                            </div>
                        )}
                    />
                )}
            </FormScroll>
        </div>
    );
}

/* ============================================================
   TestimonialForm
   ============================================================ */
export function TestimonialForm({ value, onChange }: { value: TestimonialData; onChange: (v: TestimonialData) => void }) {
    const update = (patch: Partial<TestimonialData>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} />
                <TextField label="คำอธิบาย" value={value.subtitle} onChange={(v) => update({ subtitle: v })} />
                <ArrayField
                    label="เรื่องราวจากนักเรียน"
                    items={value.stories || []}
                    onChange={(items) => update({ stories: items })}
                    newItem={() => ({ name: "ชื่อ", role: "", quote: "คำพูด" }) as TestimonialStory}
                    addLabel="+ เพิ่มเรื่องราว"
                    itemTitle={(item) => item.name || ""}
                    renderItem={(item, upd) => (
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => upd({ name: e.target.value })}
                                    placeholder="ชื่อ"
                                    className="px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                                <input
                                    type="text"
                                    value={item.role || ""}
                                    onChange={(e) => upd({ role: e.target.value })}
                                    placeholder="ตำแหน่ง/ระดับชั้น"
                                    className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                            </div>
                            <input
                                type="text"
                                value={item.imageUrl || ""}
                                onChange={(e) => upd({ imageUrl: e.target.value })}
                                placeholder="URL รูป (ไม่บังคับ)"
                                className="w-full px-3 py-2 text-sm font-mono border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={item.beforeScore || ""}
                                    onChange={(e) => upd({ beforeScore: e.target.value })}
                                    placeholder="คะแนนก่อน (เช่น 45)"
                                    className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                                <input
                                    type="text"
                                    value={item.afterScore || ""}
                                    onChange={(e) => upd({ afterScore: e.target.value })}
                                    placeholder="คะแนนหลัง (เช่น 85)"
                                    className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                            </div>
                            <textarea
                                value={item.quote}
                                onChange={(e) => upd({ quote: e.target.value })}
                                placeholder="คำพูด/ความรู้สึก"
                                rows={3}
                                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none resize-none"
                            />
                        </div>
                    )}
                />
            </FormScroll>
        </div>
    );
}

/* ============================================================
   TrustBadgesForm
   ============================================================ */
export function TrustBadgesForm({ value, onChange }: { value: TrustBadgesData; onChange: (v: TrustBadgesData) => void }) {
    const update = (patch: Partial<TrustBadgesData>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} />
                <p className="-mt-1 mb-1 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                    💡 พิมพ์ <code className="font-mono font-bold">{"{students}"}</code> ในช่องตัวเลข = ดึงจำนวนนักเรียนจริงทั้งหมดอัตโนมัติ (เช่น <code className="font-mono">{"{students}+"}</code> → 815+) ใช้ได้ทุกเซลล์เพจ
                </p>
                <ArrayField
                    label="ตัวเลขสถิติ"
                    items={value.stats || []}
                    onChange={(items) => update({ stats: items })}
                    newItem={() => ({ icon: "🏆", number: "100+", label: "ป้ายกำกับ" }) as TrustBadgeStat}
                    addLabel="+ เพิ่มสถิติ"
                    itemTitle={(item) => `${item.number} ${item.label}`}
                    renderItem={(item, upd) => (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={item.icon}
                                    onChange={(e) => upd({ icon: e.target.value })}
                                    maxLength={4}
                                    className="w-16 px-2 py-2 text-2xl text-center border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                                <input
                                    type="text"
                                    value={item.number}
                                    onChange={(e) => upd({ number: e.target.value })}
                                    placeholder="ตัวเลข เช่น {students}+ หรือ 1,500+"
                                    className="flex-1 px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                            </div>
                            <IconPalette value={item.icon} onChange={(v) => upd({ icon: v })} />
                            <input
                                type="text"
                                value={item.label}
                                onChange={(e) => upd({ label: e.target.value })}
                                placeholder="ป้ายกำกับ เช่น นักเรียน"
                                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                        </div>
                    )}
                />
            </FormScroll>
        </div>
    );
}

/* ============================================================
   StatsTableForm — ตาราง 2 คอลัมน์ (ตัวเลข | ความหมาย)
   ============================================================ */
export function StatsTableForm({ value, onChange }: { value: StatsTableData; onChange: (v: StatsTableData) => void }) {
    const update = (patch: Partial<StatsTableData>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ (ไม่ใส่ก็ได้)" value={value.title} onChange={(v) => update({ title: v })} />
                <div className="grid grid-cols-2 gap-3">
                    <TextField label="หัวคอลัมน์ซ้าย" value={value.leftHeader} onChange={(v) => update({ leftHeader: v })} placeholder="เช่น ตัวเลข" />
                    <TextField label="หัวคอลัมน์ขวา" value={value.rightHeader} onChange={(v) => update({ rightHeader: v })} placeholder="เช่น ความหมาย" />
                </div>
                <ArrayField
                    label="แถวข้อมูล"
                    items={value.rows || []}
                    onChange={(items) => update({ rows: items })}
                    newItem={() => ({ left: "", right: "" }) as StatsTableRow}
                    addLabel="+ เพิ่มแถว"
                    itemTitle={(item) => `${item.left || "—"}  |  ${item.right || "—"}`}
                    renderItem={(item, upd) => (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={item.left}
                                onChange={(e) => upd({ left: e.target.value })}
                                placeholder="ตัวเลข เช่น 3,087+"
                                className="w-2/5 px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                            <input
                                type="text"
                                value={item.right}
                                onChange={(e) => upd({ right: e.target.value })}
                                placeholder="ความหมาย เช่น โจทย์ในระบบ"
                                className="flex-1 px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                        </div>
                    )}
                />
            </FormScroll>
        </div>
    );
}

/* ============================================================
   PriceStackForm
   ============================================================ */
export function PriceStackForm({ value, onChange }: { value: PriceStackData; onChange: (v: PriceStackData) => void }) {
    const update = (patch: Partial<PriceStackData>) => onChange({ ...value, ...patch });
    const [tab, setTab] = useState("header");

    const totalValue = (value.items || []).reduce((sum, i) => sum + (i.value || 0), 0);

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormTabs
                active={tab}
                onChange={setTab}
                tabs={[
                    { id: "header", label: "หัวเรื่อง", icon: "📝" },
                    { id: "items", label: "รายการมูลค่า", icon: "📦" },
                    { id: "price", label: "ราคา", icon: "💰" },
                ]}
            />
            <FormScroll>
                {tab === "header" && (
                    <>
                        <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} />
                        <TextField label="คำอธิบาย" value={value.subtitle} onChange={(v) => update({ subtitle: v })} />
                        <TextField label="ข้อความปุ่ม" value={value.ctaText} onChange={(v) => update({ ctaText: v })} placeholder="สมัครเลย" />
                    </>
                )}
                {tab === "items" && (
                    <>
                        <p className="text-xs text-slate-500 bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                            💡 มูลค่ารวม: <b>฿{totalValue.toLocaleString()}</b> (คำนวณอัตโนมัติ)
                        </p>
                        <ArrayField
                            label="รายการสิ่งที่ได้รับ + มูลค่า"
                            items={value.items || []}
                            onChange={(items) => update({ items })}
                            newItem={() => ({ name: "รายการใหม่", value: 0 })}
                            addLabel="+ เพิ่มรายการ"
                            itemTitle={(item) => `${item.name} (฿${item.value?.toLocaleString() || 0})`}
                            renderItem={(item, upd) => (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => upd({ name: e.target.value })}
                                        placeholder="ชื่อรายการ"
                                        className="flex-1 px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                    />
                                    <input
                                        type="number"
                                        value={item.value}
                                        onChange={(e) => upd({ value: parseFloat(e.target.value) || 0 })}
                                        placeholder="มูลค่า (บาท)"
                                        className="w-32 px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                    />
                                </div>
                            )}
                        />
                    </>
                )}
                {tab === "price" && (
                    <>
                        <NumberField
                            label="ราคาเต็ม (บาท)"
                            value={value.regularPrice}
                            onChange={(v) => update({ regularPrice: v })}
                            placeholder="4900"
                        />
                        <NumberField
                            label="ราคาพิเศษ (บาท)"
                            value={value.finalPrice}
                            onChange={(v) => update({ finalPrice: v })}
                            placeholder="2900"
                        />
                        <TextField
                            label="ข้อความส่วนลด"
                            value={value.discountNote}
                            onChange={(v) => update({ discountNote: v })}
                            placeholder="ลด 40% เฉพาะวันนี้"
                        />
                    </>
                )}
            </FormScroll>
        </div>
    );
}

/* ============================================================
   GuaranteeForm
   ============================================================ */
export function GuaranteeForm({ value, onChange }: { value: GuaranteeData; onChange: (v: GuaranteeData) => void }) {
    const update = (patch: Partial<GuaranteeData>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField
                    label="ป้ายกำกับ"
                    value={value.badgeText}
                    onChange={(v) => update({ badgeText: v })}
                    placeholder="รับประกัน"
                />
                <TextField
                    label="ชื่อหัวข้อ"
                    value={value.title}
                    onChange={(v) => update({ title: v })}
                    placeholder="คืนเงิน 100% ภายใน 7 วัน"
                    required
                />
                <TextareaField
                    label="คำอธิบาย"
                    value={value.desc}
                    onChange={(v) => update({ desc: v })}
                    placeholder="ไม่พอใจคืนเงินเต็มจำนวน"
                />
                <div>
                    <p className="text-sm font-bold text-slate-700 mb-1.5">เงื่อนไข/คุณสมบัติ (1 บรรทัด = 1 ข้อ)</p>
                    <textarea
                        value={(value.features || []).join("\n")}
                        onChange={(e) => update({ features: e.target.value.split("\n").filter((s) => s.trim().length > 0) })}
                        rows={5}
                        placeholder="ไม่มีคำถามยุ่งยาก\nคืนเงินภายใน 24 ชั่วโมง"
                        className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none resize-none"
                    />
                </div>
            </FormScroll>
        </div>
    );
}

/* ============================================================
   ComparisonForm
   ============================================================ */
export function ComparisonForm({ value, onChange }: { value: ComparisonData; onChange: (v: ComparisonData) => void }) {
    const update = (patch: Partial<ComparisonData>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} />
                <TextField label="คำอธิบาย" value={value.subtitle} onChange={(v) => update({ subtitle: v })} />
                <ArrayField
                    label="คอลัมน์เปรียบเทียบ"
                    items={value.columns || []}
                    onChange={(items) => update({ columns: items })}
                    newItem={() => ({ title: "คอลัมน์ใหม่", features: [{ text: "คุณสมบัติ", included: true }] }) as ComparisonColumn}
                    addLabel="+ เพิ่มคอลัมน์"
                    itemTitle={(item) => `${item.title}${item.highlight ? " ⭐" : ""}`}
                    renderItem={(item, upd) => (
                        <div className="space-y-2">
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => upd({ title: e.target.value })}
                                    placeholder="ชื่อคอลัมน์"
                                    className="flex-1 px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                                <label className="flex items-center gap-1 text-xs font-bold text-slate-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!!item.highlight}
                                        onChange={(e) => upd({ highlight: e.target.checked })}
                                    />
                                    ⭐ เน้น
                                </label>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-1">คุณสมบัติในคอลัมน์</p>
                                <div className="space-y-1">
                                    {(item.features || []).map((f, fi) => (
                                        <div key={fi} className="flex gap-2 items-center">
                                            <input
                                                type="checkbox"
                                                checked={f.included}
                                                onChange={(e) => {
                                                    const features = [...item.features];
                                                    features[fi] = { ...f, included: e.target.checked };
                                                    upd({ features });
                                                }}
                                                title="มี/ไม่มี"
                                            />
                                            <input
                                                type="text"
                                                value={f.text}
                                                onChange={(e) => {
                                                    const features = [...item.features];
                                                    features[fi] = { ...f, text: e.target.value };
                                                    upd({ features });
                                                }}
                                                placeholder="ข้อความคุณสมบัติ"
                                                className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:border-indigo-400 outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const features = item.features.filter((_, i) => i !== fi);
                                                    upd({ features });
                                                }}
                                                className="px-2 text-xs text-red-500 hover:text-red-700"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => upd({ features: [...(item.features || []), { text: "", included: true }] })}
                                    className="w-full mt-1 py-1 text-xs font-bold text-indigo-600 border border-dashed border-indigo-300 rounded hover:bg-indigo-50"
                                >
                                    + เพิ่มคุณสมบัติ
                                </button>
                            </div>
                        </div>
                    )}
                />
            </FormScroll>
        </div>
    );
}

/* ============================================================
   FAQForm
   ============================================================ */
export function FAQForm({ value, onChange }: { value: FAQData; onChange: (v: FAQData) => void }) {
    const update = (patch: Partial<FAQData>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} />
                <TextField label="คำอธิบาย" value={value.subtitle} onChange={(v) => update({ subtitle: v })} />
                <ArrayField
                    label="คำถาม-คำตอบ"
                    items={value.faqs || []}
                    onChange={(items) => update({ faqs: items })}
                    newItem={() => ({ q: "คำถามใหม่?", a: "คำตอบ" })}
                    addLabel="+ เพิ่มคำถาม"
                    itemTitle={(item) => item.q || ""}
                    renderItem={(item, upd) => (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={item.q}
                                onChange={(e) => upd({ q: e.target.value })}
                                placeholder="คำถาม"
                                className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                            <textarea
                                value={item.a}
                                onChange={(e) => upd({ a: e.target.value })}
                                placeholder="คำตอบ"
                                rows={3}
                                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none resize-none"
                            />
                        </div>
                    )}
                />
            </FormScroll>
        </div>
    );
}

/* ============================================================
   CTAForm (Final CTA)
   ============================================================ */
export function CTAForm({ value, onChange }: { value: CTAData; onChange: (v: CTAData) => void }) {
    const update = (patch: Partial<CTAData>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField
                    label="ข้อความเร่งด่วน (urgency)"
                    value={value.urgencyText}
                    onChange={(v) => update({ urgencyText: v })}
                    placeholder="🔥 เวลาจำกัด"
                />
                <TextField
                    label="หัวข้อ"
                    value={value.title}
                    onChange={(v) => update({ title: v })}
                    placeholder="พร้อมเริ่มเรียนแล้วหรือยัง?"
                    required
                />
                <TextField
                    label="คำอธิบาย"
                    value={value.subtitle}
                    onChange={(v) => update({ subtitle: v })}
                    placeholder="สมัครวันนี้ เริ่มเรียนทันที"
                />
                <TextField
                    label="ข้อความปุ่ม CTA"
                    value={value.ctaText}
                    onChange={(v) => update({ ctaText: v })}
                    placeholder="สมัครเรียนเลย"
                    required
                />
                <TextField
                    label="ราคาในปุ่ม"
                    value={value.priceText}
                    onChange={(v) => update({ priceText: v })}
                    placeholder="฿2,900"
                />
            </FormScroll>
        </div>
    );
}

/* ============================================================
   CountdownForm
   ============================================================ */
export function CountdownForm({ value, onChange }: { value: CountdownData; onChange: (v: CountdownData) => void }) {
    const update = (patch: Partial<CountdownData>) => onChange({ ...value, ...patch });

    // Convert ISO → datetime-local
    const toLocal = (iso: string) => {
        try {
            const d = new Date(iso);
            const pad = (n: number) => n.toString().padStart(2, "0");
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
            return "";
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} placeholder="🔥 โปรโมชั่นพิเศษ!" />
                <TextField label="คำอธิบาย" value={value.subtitle} onChange={(v) => update({ subtitle: v })} placeholder="ราคานี้เหลือเวลาอีกเพียง..." />
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">วันเวลาสิ้นสุด *</label>
                    <input
                        type="datetime-local"
                        value={value.endDate ? toLocal(value.endDate) : ""}
                        onChange={(e) => {
                            const d = new Date(e.target.value);
                            if (!isNaN(d.getTime())) update({ endDate: d.toISOString() });
                        }}
                        className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none"
                    />
                </div>
                <SelectField
                    label="รูปแบบการแสดง"
                    value={value.style || "inline"}
                    onChange={(v) => update({ style: v })}
                    options={[
                        { value: "inline", label: "การ์ดกึ่งกลาง (Inline)" },
                        { value: "banner", label: "แบนเนอร์เต็มจอ (Banner)" },
                    ]}
                />
                <TextareaField
                    label="ข้อความเมื่อหมดเวลา"
                    value={value.expiredMessage}
                    onChange={(v) => update({ expiredMessage: v })}
                    placeholder="โปรโมชั่นหมดแล้ว — ติดต่อสอบถามราคาปกติ"
                />
            </FormScroll>
        </div>
    );
}

/* ============================================================
   VideoPreviewForm
   ============================================================ */
export function VideoPreviewForm({ value, onChange }: { value: VideoPreviewData; onChange: (v: VideoPreviewData) => void }) {
    const update = (patch: Partial<VideoPreviewData>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} placeholder="ตัวอย่างคอร์สเรียน" />
                <TextField label="คำอธิบาย" value={value.subtitle} onChange={(v) => update({ subtitle: v })} placeholder="ลองชมบรรยากาศการสอนจริง" />
                <ArrayField
                    label="วิดีโอตัวอย่าง"
                    items={value.videos || []}
                    onChange={(items) => update({ videos: items })}
                    newItem={() => ({ title: "วิดีโอใหม่", youtubeUrl: "", description: "" }) as VideoPreviewItem}
                    addLabel="+ เพิ่มวิดีโอ"
                    itemTitle={(item) => item.title || "ไม่มีชื่อ"}
                    renderItem={(item, upd) => (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={item.title}
                                onChange={(e) => upd({ title: e.target.value })}
                                placeholder="ชื่อวิดีโอ เช่น บทเรียนตัวอย่าง"
                                className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                            <input
                                type="text"
                                value={item.youtubeUrl || ""}
                                onChange={(e) => upd({ youtubeUrl: e.target.value })}
                                placeholder="YouTube URL เช่น https://youtu.be/xxxxx"
                                className="w-full px-3 py-2 text-sm font-mono border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                            <textarea
                                value={item.description || ""}
                                onChange={(e) => upd({ description: e.target.value })}
                                placeholder="คำอธิบาย (ไม่บังคับ)"
                                rows={2}
                                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none resize-none"
                            />
                        </div>
                    )}
                />
                <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    🎬 วิดีโอจะแสดงในกรอบแท็บเล็ตสวยงาม รองรับ URL จาก YouTube ทุกรูปแบบ
                </p>
            </FormScroll>
        </div>
    );
}

/* ============================================================
   ArticlesForm — link cards to blog posts or any external URL.
   "เลือกจาก blog" pulls title/cover/excerpt/link automatically;
   "เพิ่มบทความ" lets the admin paste a custom link by hand.
   ============================================================ */
interface BlogPostLite {
    id: string;
    title?: string;
    slug?: string;
    coverImage?: string;
    excerpt?: string;
    status?: string;
    views?: number;
    createdAt?: { toMillis?: () => number };
}

export function ArticlesForm({ value, onChange }: { value: ArticlesData; onChange: (v: ArticlesData) => void }) {
    const update = (patch: Partial<ArticlesData>) => onChange({ ...value, ...patch });
    const items = value.items || [];

    const [pickerOpen, setPickerOpen] = useState(false);
    const [posts, setPosts] = useState<BlogPostLite[] | null>(null);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [postsError, setPostsError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const openPicker = async () => {
        setPickerOpen(true);
        if (posts) return; // load once, then reuse
        setLoadingPosts(true);
        setPostsError(null);
        try {
            const snap = await getDocs(collection(db, "posts"));
            const list: BlogPostLite[] = snap.docs.map((d) => ({ ...(d.data() as Omit<BlogPostLite, "id">), id: d.id }));
            // Most-viewed first so standout articles are easy to spot; newest breaks ties.
            list.sort((a, b) => {
                const dv = (b.views ?? 0) - (a.views ?? 0);
                if (dv !== 0) return dv;
                return (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);
            });
            setPosts(list);
        } catch (e) {
            setPostsError(e instanceof Error ? e.message : "โหลดบทความไม่สำเร็จ");
        } finally {
            setLoadingPosts(false);
        }
    };

    const addFromPost = (p: BlogPostLite) => {
        const newItem: ArticleItem = {
            title: p.title || "บทความ",
            url: `/blog/${p.slug}`,
            excerpt: p.excerpt || "",
            imageUrl: p.coverImage || "",
            postId: p.id,
        };
        update({ items: [...items, newItem] });
    };

    const isAdded = (slug?: string) => !!slug && items.some((it) => it.url === `/blog/${slug}`);

    const withSlug = (posts || []).filter((p) => p.slug);
    const filtered = withSlug.filter(
        (p) => !search || (p.title || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ section" value={value.title} onChange={(v) => update({ title: v })} placeholder="บทความน่าอ่าน" />
                <TextField label="คำอธิบายใต้หัวข้อ" value={value.subtitle} onChange={(v) => update({ subtitle: v })} placeholder="เจาะลึกเทคนิคและแนวข้อสอบ" />

                {/* Pick from existing blog posts */}
                <button
                    type="button"
                    onClick={openPicker}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-50 hover:border-emerald-400 transition flex items-center justify-center gap-2"
                >
                    📰 เลือกจากบทความใน blog
                </button>

                <ArrayField
                    label="รายการบทความ"
                    helper="แต่ละการ์ดต้องมี 'ชื่อบทความ' + 'ลิงก์' — ลิงก์ใส่ของ blog (/blog/...) หรือเว็บภายนอก (https://...) ก็ได้"
                    items={items}
                    onChange={(next) => update({ items: next })}
                    newItem={() => ({ title: "", url: "", excerpt: "", imageUrl: "" }) as ArticleItem}
                    addLabel="+ เพิ่มบทความ (วางลิงก์เอง)"
                    itemTitle={(item) => item.title || "บทความใหม่"}
                    renderItem={(item, upd) => (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={item.title}
                                onChange={(e) => upd({ title: e.target.value })}
                                placeholder="ชื่อบทความ เช่น เทคนิคพิชิตโจทย์ปริซึม"
                                className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                            <input
                                type="text"
                                value={item.url}
                                onChange={(e) => upd({ url: e.target.value })}
                                placeholder="ลิงก์ เช่น /blog/prism-tips หรือ https://..."
                                className="w-full px-3 py-2 text-sm font-mono border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                            <textarea
                                value={item.excerpt || ""}
                                onChange={(e) => upd({ excerpt: e.target.value })}
                                placeholder="เกริ่นนำสั้นๆ (ไม่บังคับ)"
                                rows={2}
                                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none resize-none"
                            />
                            <ImageUploadField
                                label="รูปปก (ไม่บังคับ)"
                                value={item.imageUrl}
                                onChange={(url) => upd({ imageUrl: url })}
                                pathPrefix="salespage/articles"
                                helper="เว้นว่างได้ — จะใช้พื้นหลังไล่สีสวยๆ ให้แทน"
                            />
                        </div>
                    )}
                />

                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    💡 กด <b>“เลือกจากบทความใน blog”</b> เพื่อดึงชื่อ/รูปปก/ลิงก์อัตโนมัติ — หรือกด <b>“เพิ่มบทความ”</b> เพื่อวางลิงก์เอง (รองรับลิงก์ภายนอกด้วย)
                </p>
            </FormScroll>

            {/* Blog picker modal */}
            {pickerOpen && (
                <div
                    className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setPickerOpen(false)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-lg text-slate-800">📰 เลือกบทความจาก blog</h3>
                            <button
                                onClick={() => setPickerOpen(false)}
                                className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ค้นหาชื่อบทความ..."
                            className="w-full px-3 py-2 mb-2 text-sm border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none"
                        />
                        <p className="text-[11px] text-slate-400 mb-3 px-1">
                            🔥 เรียงตามยอดเข้าชม — บทความที่คนดูเยอะ (โดดเด่น) อยู่บนสุด
                        </p>

                        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
                            {loadingPosts && <p className="text-center text-slate-400 py-10 text-sm">กำลังโหลดบทความ...</p>}
                            {postsError && <p className="text-center text-red-500 py-10 text-sm">❌ {postsError}</p>}
                            {!loadingPosts && !postsError && filtered.length === 0 && (
                                <p className="text-center text-slate-400 py-10 text-sm">
                                    {withSlug.length === 0 ? "ยังไม่มีบทความใน blog" : "ไม่พบบทความที่ค้นหา"}
                                </p>
                            )}
                            {filtered.map((p) => {
                                const added = isAdded(p.slug);
                                const draft = p.status && p.status !== "published";
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => addFromPost(p)}
                                        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-left transition"
                                    >
                                        <div className="w-16 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                                            {p.coverImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={p.coverImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg">📄</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-slate-800 truncate">{p.title || "(ไม่มีชื่อ)"}</p>
                                            <p className="text-xs text-slate-400 truncate">
                                                <span className="font-mono">/blog/{p.slug}</span>
                                                <span className="mx-1.5 text-slate-300">·</span>
                                                👁 {(p.views ?? 0).toLocaleString()}
                                            </p>
                                        </div>
                                        {draft && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex-shrink-0">ฉบับร่าง</span>
                                        )}
                                        {added ? (
                                            <span className="text-[11px] font-bold text-emerald-600 flex-shrink-0">✓ เพิ่มแล้ว</span>
                                        ) : (
                                            <span className="text-indigo-500 text-xl leading-none flex-shrink-0">＋</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setPickerOpen(false)}
                            className="mt-3 w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200"
                        >
                            เสร็จสิ้น
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ============================================================
   HowItWorksForm — numbered "how the course works" steps.
   ============================================================ */
export function HowItWorksForm({ value, onChange }: { value: HowItWorksData; onChange: (v: HowItWorksData) => void }) {
    const update = (patch: Partial<HowItWorksData>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} placeholder="เรียนยังไง? ง่ายแค่ 3 ขั้นตอน" />
                <TextField label="คำอธิบายใต้หัวข้อ" value={value.subtitle} onChange={(v) => update({ subtitle: v })} placeholder="สมัครแล้วเริ่มเรียนได้ทันที ไม่ยุ่งยาก" />
                <ArrayField
                    label="ขั้นตอน"
                    helper="แนะนำ 3–4 ขั้นตอน เรียงตามลำดับการเรียนจริง (ตัวเลขลำดับจะขึ้นให้อัตโนมัติ)"
                    items={value.steps || []}
                    onChange={(steps) => update({ steps })}
                    newItem={() => ({ icon: "⭐", title: "ขั้นตอนใหม่", desc: "" }) as HowItWorksStep}
                    addLabel="+ เพิ่มขั้นตอน"
                    itemTitle={(item) => item.title || "ขั้นตอน"}
                    renderItem={(item, upd) => (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={item.icon}
                                    onChange={(e) => upd({ icon: e.target.value })}
                                    maxLength={4}
                                    placeholder="📝"
                                    className="w-16 px-2 py-2 text-2xl text-center border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                                <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => upd({ title: e.target.value })}
                                    placeholder="ชื่อขั้นตอน เช่น สมัครเรียน"
                                    className="flex-1 px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                            </div>
                            <IconPalette value={item.icon} onChange={(v) => upd({ icon: v })} />
                            <textarea
                                value={item.desc || ""}
                                onChange={(e) => upd({ desc: e.target.value })}
                                placeholder="อธิบายขั้นตอนสั้นๆ (ไม่บังคับ)"
                                rows={2}
                                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none resize-none"
                            />
                        </div>
                    )}
                />
                <TextField
                    label="ปุ่มท้าย section (ไม่บังคับ)"
                    value={value.ctaText}
                    onChange={(v) => update({ ctaText: v })}
                    placeholder="เช่น พร้อมแล้ว สมัครเลย"
                    helper="ถ้าใส่ข้อความ จะมีปุ่มสมัคร (ไปหน้าชำระเงิน) อยู่ท้าย section — เว้นว่าง = ไม่มีปุ่ม"
                />
            </FormScroll>
        </div>
    );
}

/* ============================================================
   QuizForm — interactive readiness quiz.
   Questions → scored options; total score maps to a result tier.
   ============================================================ */
export function QuizForm({ value, onChange }: { value: QuizData; onChange: (v: QuizData) => void }) {
    const update = (patch: Partial<QuizData>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} placeholder="ลูกพร้อมสอบเข้าแค่ไหน?" />
                <TextField label="คำอธิบายใต้หัวข้อ" value={value.subtitle} onChange={(v) => update({ subtitle: v })} placeholder="ตอบ 5 ข้อสั้นๆ รู้ผลทันที" />

                {/* Questions (each with scored options) */}
                <ArrayField
                    label="คำถาม"
                    helper="แต่ละข้อมีหลายตัวเลือก ใส่ 'คะแนน' ให้แต่ละตัวเลือก (ตอบดี = คะแนนมาก)"
                    items={value.questions || []}
                    onChange={(qs) => update({ questions: qs })}
                    newItem={() => ({ question: "คำถามใหม่?", options: [{ text: "ตัวเลือก 1", score: 2 }, { text: "ตัวเลือก 2", score: 0 }] }) as QuizQuestion}
                    addLabel="+ เพิ่มคำถาม"
                    itemTitle={(q, i) => q.question || `ข้อ ${i + 1}`}
                    renderItem={(q, updQ) => (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={q.question}
                                onChange={(e) => updQ({ question: e.target.value })}
                                placeholder="พิมพ์คำถาม"
                                className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                            <ArrayField
                                label="ตัวเลือก"
                                items={q.options || []}
                                onChange={(ops) => updQ({ options: ops })}
                                newItem={() => ({ text: "ตัวเลือกใหม่", score: 0 }) as QuizOption}
                                addLabel="+ เพิ่มตัวเลือก"
                                itemTitle={(o) => o.text || ""}
                                renderItem={(o, updO) => (
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            value={o.text}
                                            onChange={(e) => updO({ text: e.target.value })}
                                            placeholder="ข้อความตัวเลือก"
                                            className="flex-1 px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                        />
                                        <span className="text-xs text-slate-400 whitespace-nowrap">คะแนน</span>
                                        <input
                                            type="number"
                                            value={o.score}
                                            onChange={(e) => updO({ score: parseInt(e.target.value, 10) || 0 })}
                                            className="w-16 px-2 py-2 text-sm text-center border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                        />
                                    </div>
                                )}
                            />
                        </div>
                    )}
                />

                {/* Result tiers (by total score) */}
                <ArrayField
                    label="ผลลัพธ์ (ตามช่วงคะแนนรวม)"
                    helper="ระบบรวมคะแนนทุกข้อ แล้วโชว์ผลของช่วงที่ตรง — ใส่ 'คะแนนขั้นต่ำ' ของแต่ละระดับ (เช่น 0 / 4 / 7)"
                    items={value.results || []}
                    onChange={(rs) => update({ results: rs })}
                    newItem={() => ({ minScore: 0, emoji: "🟢", title: "ผลลัพธ์ใหม่", desc: "", ctaText: "", ctaUrl: "" }) as QuizResultTier}
                    addLabel="+ เพิ่มระดับผลลัพธ์"
                    itemTitle={(r) => `${r.emoji || ""} ${r.title || ""} (≥${r.minScore ?? 0})`}
                    renderItem={(r, updR) => (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={r.emoji || ""}
                                    onChange={(e) => updR({ emoji: e.target.value })}
                                    maxLength={4}
                                    placeholder="🟢"
                                    className="w-14 px-2 py-2 text-xl text-center border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                                <input
                                    type="text"
                                    value={r.title}
                                    onChange={(e) => updR({ title: e.target.value })}
                                    placeholder="หัวข้อผลลัพธ์"
                                    className="flex-1 px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 whitespace-nowrap">แสดงเมื่อคะแนนรวม ≥</span>
                                <input
                                    type="number"
                                    value={r.minScore ?? 0}
                                    onChange={(e) => updR({ minScore: parseInt(e.target.value, 10) || 0 })}
                                    className="w-20 px-2 py-2 text-sm text-center border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                            </div>
                            <textarea
                                value={r.desc || ""}
                                onChange={(e) => updR({ desc: e.target.value })}
                                placeholder="ข้อความผลลัพธ์ / คำแนะนำ"
                                rows={2}
                                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none resize-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={r.ctaText || ""}
                                    onChange={(e) => updR({ ctaText: e.target.value })}
                                    placeholder="ข้อความปุ่ม (ไม่บังคับ)"
                                    className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                                <input
                                    type="text"
                                    value={r.ctaUrl || ""}
                                    onChange={(e) => updR({ ctaUrl: e.target.value })}
                                    placeholder="ลิงก์ปุ่ม เช่น LINE (เว้นว่าง=ไปสมัคร)"
                                    className="px-3 py-2 text-sm font-mono border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                            </div>
                        </div>
                    )}
                />

                <div className="grid grid-cols-2 gap-3">
                    <TextField label="ปุ่มเริ่มทำ" value={value.startButtonText} onChange={(v) => update({ startButtonText: v })} placeholder="เริ่มทำแบบทดสอบ" />
                    <TextField label="ปุ่มทำใหม่" value={value.retakeButtonText} onChange={(v) => update({ retakeButtonText: v })} placeholder="ทำใหม่อีกครั้ง" />
                </div>

                <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    🧭 ค่าเริ่มต้นตั้งคะแนนไว้ 0–10 (5 ข้อ × 2 คะแนน) ถ้าแก้จำนวนข้อหรือคะแนน อย่าลืมปรับ &ldquo;คะแนนขั้นต่ำ&rdquo; ของผลลัพธ์ให้สอดคล้องกัน
                </p>
            </FormScroll>
        </div>
    );
}

/* ============================================================
   FeaturesForm — course feature / highlight cards.
   Each card: icon + title + detail, plus optional screenshot & badge.
   ============================================================ */
export function FeaturesForm({ value, onChange }: { value: FeaturesData; onChange: (v: FeaturesData) => void }) {
    const update = (patch: Partial<FeaturesData>) => onChange({ ...value, ...patch });
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <FormScroll>
                <TextField label="ชื่อหัวข้อ" value={value.title} onChange={(v) => update({ title: v })} placeholder="ในคอร์สมีอะไรบ้าง?" />
                <TextField label="คำอธิบายใต้หัวข้อ" value={value.subtitle} onChange={(v) => update({ subtitle: v })} placeholder="เครื่องมือครบ ช่วยให้เข้าใจ ฝึกจริง จำได้นาน" />
                <ArrayField
                    label="การ์ดฟีเจอร์"
                    helper="เพิ่ม-ลดได้ตามต้องการ — ใส่รูปประกอบ (เช่น ภาพ mindmap / flashcard จริง) เพื่อให้น่าสนใจยิ่งขึ้น"
                    items={value.items || []}
                    onChange={(items) => update({ items })}
                    newItem={() => ({ icon: "✨", title: "ฟีเจอร์ใหม่", desc: "", imageUrl: "", badgeText: "" }) as FeatureItem}
                    addLabel="+ เพิ่มฟีเจอร์"
                    itemTitle={(item) => item.title || "ฟีเจอร์"}
                    renderItem={(item, upd) => (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={item.icon}
                                    onChange={(e) => upd({ icon: e.target.value })}
                                    maxLength={4}
                                    placeholder="📝"
                                    className="w-16 px-2 py-2 text-2xl text-center border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                                <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => upd({ title: e.target.value })}
                                    placeholder="ชื่อฟีเจอร์ เช่น ข้อสอบฝึกทำ + เฉลยละเอียด"
                                    className="flex-1 px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                                />
                            </div>
                            <IconPalette value={item.icon} onChange={(v) => upd({ icon: v })} />
                            <textarea
                                value={item.desc || ""}
                                onChange={(e) => upd({ desc: e.target.value })}
                                placeholder="รายละเอียดสั้นๆ ของฟีเจอร์"
                                rows={2}
                                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none resize-none"
                            />
                            <input
                                type="text"
                                value={item.badgeText || ""}
                                onChange={(e) => upd({ badgeText: e.target.value })}
                                placeholder="ป้ายเด่น (ไม่บังคับ) เช่น ยอดนิยม / ใหม่"
                                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-400 outline-none"
                            />
                            <ImageUploadField
                                label="รูปประกอบ (ไม่บังคับ)"
                                value={item.imageUrl}
                                onChange={(url) => upd({ imageUrl: url })}
                                pathPrefix="salespage/features"
                                helper="เว้นว่างได้ — จะโชว์ไอคอนสวยๆ ให้แทน"
                            />
                        </div>
                    )}
                />
                <TextField
                    label="ปุ่มท้าย section (ไม่บังคับ)"
                    value={value.ctaText}
                    onChange={(v) => update({ ctaText: v })}
                    placeholder="เช่น สมัครเรียนเลย"
                    helper="ถ้าใส่ข้อความ จะมีปุ่มสมัคร (ไปหน้าชำระเงิน) อยู่ท้าย section — เว้นว่าง = ไม่มีปุ่ม"
                />
            </FormScroll>
        </div>
    );
}
