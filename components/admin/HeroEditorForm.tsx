"use client";

import { useEffect, useState } from "react";
import type {
    HeroData,
    HeroCardStat,
    HeroChapter,
    HeroTrustChip,
} from "@/app/course/[id]/template/types";
import CourseCard from "@/app/course/[id]/template/sections/CourseCard";
import { db } from "@/lib/firebase";
import { collection, getDocs, getCountFromServer } from "firebase/firestore";
import {
    TextField,
    TextareaField,
    NumberField,
    ColorField,
    SelectField,
    ArrayField,
} from "./forms/primitives";

interface Props {
    value: HeroData;
    onChange: (next: HeroData) => void;
    /** Current course id — enables the "pull real lessons" button. */
    courseId?: string;
    courseTitle?: string;
}

type Tab = "content" | "cta" | "card" | "preview" | "chapters" | "colors";

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "content", label: "ข้อความ", icon: "📝" },
    { id: "cta", label: "ปุ่ม & ราคา", icon: "🎯" },
    { id: "card", label: "หัวการ์ด", icon: "🎴" },
    { id: "preview", label: "คลิป", icon: "🎬" },
    { id: "chapters", label: "ตอน", icon: "📋" },
    { id: "colors", label: "สี", icon: "🎨" },
];

export default function HeroEditorForm({ value, onChange, courseId, courseTitle }: Props) {
    const [tab, setTab] = useState<Tab>("content");
    const [pulling, setPulling] = useState(false);
    // Live total registrations (all courses) so the {students} token previews correctly.
    const [totalStudents, setTotalStudents] = useState<number | undefined>();

    useEffect(() => {
        getCountFromServer(collection(db, "enrollments"))
            .then((s) => setTotalStudents(s.data().count))
            .catch(() => { /* preview falls back to authored value */ });
    }, []);

    const update = (patch: Partial<HeroData>) => onChange({ ...value, ...patch });
    const updatePreview = (patch: Partial<NonNullable<HeroData["preview"]>>) =>
        update({ preview: { ...(value.preview || {}), ...patch } });

    const coverType = value.coverType || "courseCard";
    const isCard = coverType === "card" || coverType === "courseCard";

    // Pull real lessons from this course's Firestore subcollection into the
    // chapter list (video only, sorted by order, strip "[EPxx]", free = isFree).
    const pullChapters = async () => {
        if (!courseId) return;
        const existing = value.chapters?.length ?? 0;
        if (existing > 0 && !confirm(`มีรายการตอนอยู่แล้ว ${existing} ตอน — ดึงใหม่ทับของเดิม?`)) return;
        setPulling(true);
        try {
            const snap = await getDocs(collection(db, "courses", courseId, "lessons"));
            const chapters = snap.docs
                .map((d) => d.data() as { title?: string; type?: string; order?: number; isFree?: boolean })
                .filter((l) => l.type === "video")
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((l) => {
                    const title = (l.title || "").replace(/^\[EP\d+\]\s*/, "").trim();
                    return l.isFree ? { title, free: true } : { title };
                });
            if (chapters.length === 0) {
                alert("ไม่พบตอนวิดีโอในคอร์สนี้");
            } else {
                update({ chapters });
                alert(`✅ ดึงมา ${chapters.length} ตอนแล้ว — อย่าลืมกด "บันทึก"`);
            }
        } catch (e: unknown) {
            alert("ดึงไม่สำเร็จ: " + (e instanceof Error ? e.message : String(e)));
        }
        setPulling(false);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
            {/* ============ FORM SIDE ============ */}
            <div className="flex flex-col flex-1 min-h-0 lg:max-w-[440px]">
                {/* Tabs */}
                <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${tab === t.id ? "bg-white text-indigo-700 shadow" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
                    {/* ---------- TAB: ข้อความ ---------- */}
                    {tab === "content" && (
                        <>
                            <TextField
                                label="ป้ายกำกับด้านบน (Badge)"
                                value={value.badgeText}
                                onChange={(v) => update({ badgeText: v })}
                                placeholder="เช่น 🏆 คอร์สสอบเข้าอันดับ 1 ของครูฮีม"
                                helper="เว้นว่างเพื่อซ่อนป้าย"
                            />
                            <TextareaField
                                label="หัวข้อใหญ่ (Headline) *"
                                value={value.title}
                                onChange={(v) => update({ title: v })}
                                placeholder={'ลูกเก่ง...\nแต่จะ "เก่งพอ" ติด Gifted ไหม?'}
                                rows={3}
                                helper='ขึ้นบรรทัดใหม่ได้ · คำว่า "Gifted" จะถูกไฮไลต์สีส้มอัตโนมัติ'
                            />
                            <TextareaField
                                label="คำโปรยใต้หัวข้อ (Subtitle)"
                                value={value.subtitle}
                                onChange={(v) => update({ subtitle: v })}
                                placeholder="40 บทจากแนวข้อสอบจริงทั่วประเทศ ติวจบในที่เดียว"
                                rows={2}
                            />
                        </>
                    )}

                    {/* ---------- TAB: ปุ่ม & ราคา ---------- */}
                    {tab === "cta" && (
                        <>
                            <TextField
                                label="ข้อความปุ่มหลัก"
                                value={value.ctaText}
                                onChange={(v) => update({ ctaText: v })}
                                placeholder="สมัครเลย ล็อกราคาพิเศษ"
                            />
                            <TextField
                                label="ราคาในปุ่ม"
                                value={value.ctaPriceText}
                                onChange={(v) => update({ ctaPriceText: v })}
                                placeholder="฿2,900"
                                helper="เว้นว่างเพื่อใช้ราคาคอร์สอัตโนมัติ"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <TextField
                                    label="ราคาปกติ (ขีดฆ่า)"
                                    value={value.regularPriceText}
                                    onChange={(v) => update({ regularPriceText: v })}
                                    placeholder="ราคาปกติ ฿3,700"
                                />
                                <TextField
                                    label="ป้ายประหยัด"
                                    value={value.savingsText}
                                    onChange={(v) => update({ savingsText: v })}
                                    placeholder="ประหยัด ฿800"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <TextField
                                    label="ปุ่มรอง"
                                    value={value.secondaryCtaText}
                                    onChange={(v) => update({ secondaryCtaText: v })}
                                    placeholder="ดูเนื้อหาทั้งหมด"
                                />
                                <TextField
                                    label="ข้อความต่อท้ายปุ่มรอง"
                                    value={value.secondaryCtaMeta}
                                    onChange={(v) => update({ secondaryCtaMeta: v })}
                                    placeholder="· 40 บท"
                                />
                            </div>

                            <div className="pt-2 border-t border-slate-200">
                                <ArrayField<HeroTrustChip>
                                    label="ป้ายความน่าเชื่อถือ (Trust chips)"
                                    items={value.trustChips || []}
                                    onChange={(items) => update({ trustChips: items })}
                                    newItem={() => ({ icon: "✓", text: "", tone: "green" })}
                                    itemTitle={(c) => c.text || "ป้ายใหม่"}
                                    helper="ป้ายเล็กๆ ใต้ปุ่ม เช่น ⚡ เฉลี่ยวันละ 1.59 บาท"
                                    renderItem={(item, upd) => (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <TextField label="ไอคอน" value={item.icon} onChange={(v) => upd({ icon: v })} placeholder="⚡" />
                                                <SelectField
                                                    label="สีไอคอน"
                                                    value={item.tone || "amber"}
                                                    onChange={(v) => upd({ tone: v })}
                                                    options={[
                                                        { value: "amber", label: "ส้ม" },
                                                        { value: "green", label: "เขียว" },
                                                    ]}
                                                />
                                            </div>
                                            <TextField label="ข้อความ" value={item.text} onChange={(v) => upd({ text: v })} placeholder="เฉลี่ยวันละ" />
                                            <div className="grid grid-cols-2 gap-2">
                                                <TextField label="ตัวหนา (เด่น)" value={item.boldText} onChange={(v) => upd({ boldText: v })} placeholder="1.59" />
                                                <TextField label="ต่อท้าย" value={item.suffix} onChange={(v) => upd({ suffix: v })} placeholder="บาท" />
                                            </div>
                                        </div>
                                    )}
                                />
                            </div>
                        </>
                    )}

                    {/* ---------- TAB: หัวการ์ด ---------- */}
                    {tab === "card" && (
                        <>
                            {/* Cover type selector */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">รูปแบบปก (ฝั่งขวา)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => update({ coverType: "courseCard" })}
                                        className={`p-3 rounded-xl border-2 text-left transition ${isCard ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
                                    >
                                        <div className="text-2xl mb-1">🎴</div>
                                        <div className="font-bold text-sm text-slate-800">การ์ดคอร์ส</div>
                                        <div className="text-xs text-slate-500">การ์ดสวยพร้อมสารบัญ (แนะนำ)</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => update({ coverType: "image" })}
                                        className={`p-3 rounded-xl border-2 text-left transition ${coverType === "image" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
                                    >
                                        <div className="text-2xl mb-1">🖼️</div>
                                        <div className="font-bold text-sm text-slate-800">รูปภาพ</div>
                                        <div className="text-xs text-slate-500">ใส่ URL รูปปกแทน</div>
                                    </button>
                                </div>
                            </div>

                            {coverType === "image" ? (
                                <TextField
                                    label="URL รูปปก"
                                    value={value.imageUrl}
                                    onChange={(v) => update({ imageUrl: v })}
                                    placeholder="https://... (เว้นว่างเพื่อใช้รูปคอร์ส)"
                                    helper="หากเว้นว่าง จะใช้รูปหลักของคอร์ส"
                                />
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <TextField
                                            label="ชื่อบนการ์ด (ใหญ่)"
                                            value={value.cardMainText}
                                            onChange={(v) => update({ cardMainText: v })}
                                            placeholder="Gifted ม.1"
                                            helper="เว้นว่าง = ชื่อคอร์ส"
                                        />
                                        <TextField
                                            label="ข้อความรอง"
                                            value={value.cardSubText}
                                            onChange={(v) => update({ cardSubText: v })}
                                            placeholder="เช่น เทอม 2"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <TextField
                                            label="ป้ายมุมซ้ายบน"
                                            value={value.cardLiveLabel}
                                            onChange={(v) => update({ cardLiveLabel: v })}
                                            placeholder="LIVE · UPDATED 2026"
                                        />
                                        <TextField
                                            label="ป้ายมุมขวาบน"
                                            value={value.cardVolLabel}
                                            onChange={(v) => update({ cardVolLabel: v })}
                                            placeholder="KRUHEEM · VOL.04"
                                        />
                                    </div>
                                    <ArrayField<string>
                                        label="แท็บมุมขวา"
                                        items={value.cardTags || []}
                                        onChange={(items) => update({ cardTags: items })}
                                        newItem={() => ""}
                                        addLabel="+ เพิ่มแท็บ"
                                        itemTitle={(t) => t || "แท็บใหม่"}
                                        helper="เช่น 40 บท · 5 ปี · HD"
                                        renderItem={(item, upd) => (
                                            <TextField label="" value={item} onChange={(v) => upd(v)} placeholder="40 บท" />
                                        )}
                                    />
                                    <div className="pt-2 border-t border-slate-200">
                                        <p className="text-xs font-bold text-slate-500 mb-2">สีการ์ด</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <ColorField label="สีไล่เฉด 1" value={value.cardColorFrom} onChange={(v) => update({ cardColorFrom: v })} defaultColor="#fb923c" />
                                            <ColorField label="สีไล่เฉด 2" value={value.cardColorTo} onChange={(v) => update({ cardColorTo: v })} defaultColor="#ef4444" />
                                        </div>
                                        <div className="mt-3">
                                            <ColorField label="สีข้อความบนการ์ด" value={value.cardTextColor} onChange={(v) => update({ cardTextColor: v })} defaultColor="#ffffff" />
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* ---------- TAB: คลิปตัวอย่าง ---------- */}
                    {tab === "preview" && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <TextField label="ป้ายซ้าย" value={value.preview?.label} onChange={(v) => updatePreview({ label: v })} placeholder="คลิปตัวอย่างฟรี" />
                                <TextField label="ป้ายขวา (EP)" value={value.preview?.epLabel} onChange={(v) => updatePreview({ epLabel: v })} placeholder="EP.01 · 13:42" />
                            </div>
                            <TextField label="ชื่อบทในคลิป" value={value.preview?.chapterTitle} onChange={(v) => updatePreview({ chapterTitle: v })} placeholder="บทที่ 01 · จำนวนและการดำเนินการ" />
                            <div className="grid grid-cols-2 gap-3">
                                <TextField label="ป้ายตอนยังไม่เล่น" value={value.preview?.freeChipText} onChange={(v) => updatePreview({ freeChipText: v })} placeholder="ดูฟรี · ไม่ต้องสมัคร" />
                                <TextField label="ป้ายตอนกำลังเล่น" value={value.preview?.playingChipText} onChange={(v) => updatePreview({ playingChipText: v })} placeholder="กำลังเล่น" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <TextField label="เวลารวม (แสดง)" value={value.preview?.totalTime} onChange={(v) => updatePreview({ totalTime: v })} placeholder="13:42" />
                                <NumberField label="ความยาว (วินาที)" value={value.preview?.totalSeconds} onChange={(v) => updatePreview({ totalSeconds: v })} placeholder="822" helper="ใช้คำนวณตัวจับเวลา" />
                            </div>
                            <ArrayField<string>
                                label="สมการตกแต่งพื้นหลังคลิป"
                                items={value.preview?.equations || []}
                                onChange={(items) => updatePreview({ equations: items })}
                                newItem={() => ""}
                                addLabel="+ เพิ่มสมการ"
                                itemTitle={(e) => e || "สมการใหม่"}
                                helper="โชว์จางๆ บนพื้นหลังคลิป (สูงสุด 3 อันแรก)"
                                renderItem={(item, upd) => (
                                    <TextField label="" value={item} onChange={(v) => upd(v)} placeholder="x² + 4x − 5 = 0" />
                                )}
                            />
                        </>
                    )}

                    {/* ---------- TAB: รายการตอน ---------- */}
                    {tab === "chapters" && (
                        <>
                            {courseId && (
                                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3">
                                    <button
                                        type="button"
                                        onClick={pullChapters}
                                        disabled={pulling}
                                        className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {pulling ? "⏳ กำลังดึง..." : "⬇️ ดึงตอนจริงจากคอร์สนี้อัตโนมัติ"}
                                    </button>
                                    <p className="text-xs text-emerald-700/80 mt-2 text-center leading-relaxed">
                                        ดึงตอนทั้งหมดจากเนื้อหาคอร์สมาใส่ให้ (ตัด [EP] ออก + ติ๊กฟรีตามจริง)
                                        <br />
                                        เสร็จแล้วอย่าลืมกด &ldquo;บันทึก&rdquo;
                                    </p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <TextField label="หัวข้อสารบัญ" value={value.chaptersTitle} onChange={(v) => update({ chaptersTitle: v })} placeholder="สารบัญทั้งหมด · 40 ตอน" helper="เว้นว่าง = นับจำนวนอัตโนมัติ" />
                                <TextField label="ป้ายเลื่อน" value={value.chaptersScrollLabel} onChange={(v) => update({ chaptersScrollLabel: v })} placeholder="เลื่อนต่อเนื่อง" />
                            </div>
                            <ArrayField<HeroChapter>
                                label="รายการตอน"
                                items={value.chapters || []}
                                onChange={(items) => update({ chapters: items })}
                                newItem={() => ({ title: "ตอนใหม่" })}
                                addLabel="+ เพิ่มตอน"
                                itemTitle={(c) => c.title || "ตอนใหม่"}
                                helper="ลำดับเลขจะรันให้อัตโนมัติตามลำดับนี้"
                                renderItem={(item, upd) => (
                                    <div className="space-y-2">
                                        <TextField label="ชื่อตอน" value={item.title} onChange={(v) => upd({ title: v })} placeholder="ลำดับการคำนวณ" />
                                        <TextField label="คำอธิบาย (ถ้ามี)" value={item.desc} onChange={(v) => upd({ desc: v })} placeholder="เช่น 8 คลิป · แบบฝึก 24" />
                                        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!item.free}
                                                onChange={(e) => upd({ free: e.target.checked })}
                                                className="w-4 h-4 rounded accent-emerald-600"
                                            />
                                            ให้ดูฟรี (ติดป้ายเขียว "ฟรี")
                                        </label>
                                    </div>
                                )}
                            />

                            <div className="pt-2 border-t border-slate-200">
                                <TextField label="ปุ่มท้ายการ์ด" value={value.cardViewAllText} onChange={(v) => update({ cardViewAllText: v })} placeholder="ดูทั้งหมด →" />
                                <div className="mt-3">
                                    <ArrayField<HeroCardStat>
                                        label="สถิติท้ายการ์ด"
                                        items={value.cardStats || []}
                                        onChange={(items) => update({ cardStats: items })}
                                        newItem={() => ({ value: "" })}
                                        addLabel="+ เพิ่มสถิติ"
                                        itemTitle={(s) => s.value || "สถิติใหม่"}
                                        helper="พิมพ์ {students} ในช่องตัวเลข = ดึงจำนวนนักเรียนจริงอัตโนมัติ (เช่น {students}+ → 815+) · เช่น 87% ผ่าน Gifted · 4.9★"
                                        renderItem={(item, upd) => (
                                            <div className="grid grid-cols-2 gap-2">
                                                <TextField label="ตัวเลข" value={item.value} onChange={(v) => upd({ value: v })} placeholder="{students}" />
                                                <TextField label="ความหมาย" value={item.label} onChange={(v) => upd({ label: v })} placeholder="นักเรียน" />
                                            </div>
                                        )}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* ---------- TAB: สี ---------- */}
                    {tab === "colors" && (
                        <>
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-2">สีพื้นหลังหน้า</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <ColorField label="พื้นหลังบน" value={value.bgColorFrom} onChange={(v) => update({ bgColorFrom: v })} defaultColor="#fffaf2" />
                                    <ColorField label="พื้นหลังล่าง" value={value.bgColorTo} onChange={(v) => update({ bgColorTo: v })} defaultColor="#fef3e0" />
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-200">
                                <p className="text-xs font-bold text-slate-500 mb-2">สีข้อความ</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <ColorField label="สีหัวข้อใหญ่" value={value.titleColor} onChange={(v) => update({ titleColor: v })} defaultColor="#13132a" />
                                    <ColorField label="สีคำโปรย" value={value.subtitleColor} onChange={(v) => update({ subtitleColor: v })} defaultColor="#4a4a5e" />
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-200">
                                <p className="text-xs font-bold text-slate-500 mb-2">สีป้ายกำกับ (Badge)</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <ColorField label="พื้นหลัง Badge" value={value.badgeBgColor} onChange={(v) => update({ badgeBgColor: v })} defaultColor="#ffffff" />
                                    <ColorField label="ตัวอักษร Badge" value={value.badgeTextColor} onChange={(v) => update({ badgeTextColor: v })} defaultColor="#1a1a2e" />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ============ LIVE PREVIEW SIDE ============ */}
            <div className="hidden lg:block w-[372px] flex-shrink-0">
                <div className="sticky top-0">
                    <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                        👁️ ตัวอย่างสด
                        <span className="font-normal text-slate-400">(อัปเดตทันทีตามที่แก้)</span>
                    </p>
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 flex justify-center max-h-[70vh] overflow-y-auto">
                        {isCard ? (
                            <CourseCard data={value} courseTitle="คอร์สตัวอย่าง" interactive={false} totalStudents={totalStudents} />
                        ) : value.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={value.imageUrl} alt="preview" className="w-full rounded-2xl self-start" />
                        ) : (
                            <p className="text-sm text-slate-400 italic py-10">ใส่ URL รูปปกเพื่อดูตัวอย่าง</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
