"use client";
import { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { uploadImageToStorage } from "@/lib/upload";
import { PROMO_STATS_DOC } from "@/lib/promoTracking";
import { Megaphone, Upload, Save, Loader2, Trash2, Eye, EyeOff, MousePointerClick, Clock, CalendarClock } from "lucide-react";
import PromotionBanner, { PROMO_THEME_LIST, DEFAULT_PROMO_THEME } from "@/components/home/PromotionBanner";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AdminPromotions() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);

    const [enabled, setEnabled] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [ctaText, setCtaText] = useState("");
    const [ctaLink, setCtaLink] = useState("");
    const [theme, setTheme] = useState(DEFAULT_PROMO_THEME);
    const [badgeText, setBadgeText] = useState("โปรโมชันพิเศษ");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showCountdown, setShowCountdown] = useState(true);
    const [bgStyle, setBgStyle] = useState<"solid" | "glass">("solid");
    const [clickStats, setClickStats] = useState<{ total: number; today: number }>({ total: 0, today: 0 });
    const [loaded, setLoaded] = useState(false);
    const snapshot = useRef("");        // JSON of last-saved values (for the dirty check)
    const originalImageUrl = useRef(""); // last-saved image (to delete when replaced)

    useEffect(() => {
        (async () => {
            try {
                const snap = await getDoc(doc(db, "settings", "homepage_promotion"));
                const d = snap.exists() ? snap.data() : {};
                const vals = {
                    enabled: d.enabled ?? false,
                    imageUrl: d.imageUrl || "",
                    title: d.title || "",
                    subtitle: d.subtitle || "",
                    ctaText: d.ctaText || "",
                    ctaLink: d.ctaLink || "",
                    theme: d.theme || DEFAULT_PROMO_THEME,
                    badgeText: d.badgeText !== undefined ? d.badgeText : "โปรโมชันพิเศษ",
                    startDate: d.startDate || "",
                    endDate: d.endDate || "",
                    showCountdown: d.showCountdown !== undefined ? d.showCountdown : true,
                    bgStyle: (d.bgStyle === "glass" ? "glass" : "solid") as "solid" | "glass",
                };
                setEnabled(vals.enabled);
                setImageUrl(vals.imageUrl);
                setTitle(vals.title);
                setSubtitle(vals.subtitle);
                setCtaText(vals.ctaText);
                setCtaLink(vals.ctaLink);
                setTheme(vals.theme);
                setBadgeText(vals.badgeText);
                setStartDate(vals.startDate);
                setEndDate(vals.endDate);
                setShowCountdown(vals.showCountdown);
                setBgStyle(vals.bgStyle);
                originalImageUrl.current = vals.imageUrl;
                snapshot.current = JSON.stringify(vals);

                const statsSnap = await getDoc(doc(db, "stats", PROMO_STATS_DOC));
                if (statsSnap.exists()) {
                    const s = statsSnap.data();
                    const today = new Date().toISOString().split("T")[0];
                    setClickStats({ total: s.total_clicks || 0, today: s[`${today}_clicks`] || 0 });
                }
            } catch (e) {
                console.error("Error loading promotion:", e);
            } finally {
                setLoading(false);
                setLoaded(true);
            }
        })();
    }, []);

    const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) { alert("ไฟล์ใหญ่เกิน 5MB ❌"); return; }
        if (!ALLOWED_TYPES.includes(file.type)) { alert("รองรับเฉพาะ JPG, PNG, WebP ❌"); return; }
        try {
            setUploading(true);
            const url = await uploadImageToStorage(file, `promotions/promo_${Date.now()}`);
            setImageUrl(url);
        } catch (err) {
            console.error("Error uploading image:", err);
            alert("อัปโหลดรูปไม่สำเร็จ ❌");
        } finally {
            setUploading(false);
        }
    };

    const deleteImageByUrl = async (url: string) => {
        try {
            const m = url.match(/\/o\/([^?]+)/);
            if (!m) return;
            await deleteObject(ref(storage, decodeURIComponent(m[1])));
        } catch (e) {
            console.warn("Could not delete old promo image:", e);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await setDoc(
                doc(db, "settings", "homepage_promotion"),
                { enabled, imageUrl, title, subtitle, ctaText, ctaLink, theme, bgStyle, badgeText, startDate, endDate, showCountdown, updatedAt: serverTimestamp() },
                { merge: true },
            );
            // Clean up the previously-saved image if it was replaced or removed.
            if (originalImageUrl.current && originalImageUrl.current !== imageUrl) {
                deleteImageByUrl(originalImageUrl.current);
            }
            originalImageUrl.current = imageUrl;
            snapshot.current = JSON.stringify({ enabled, imageUrl, title, subtitle, ctaText, ctaLink, theme, bgStyle, badgeText, startDate, endDate, showCountdown });
            setSavedAt(new Date().toLocaleTimeString("th-TH"));
        } catch (e) {
            console.error("Error saving promotion:", e);
            alert("บันทึกไม่สำเร็จ ❌");
        } finally {
            setSaving(false);
        }
    };

    const currentJson = JSON.stringify({ enabled, imageUrl, title, subtitle, ctaText, ctaLink, theme, bgStyle, badgeText, startDate, endDate, showCountdown });
    const dirty = loaded && currentJson !== snapshot.current;

    // Warn before leaving the page with unsaved changes.
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [dirty]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
            </div>
        );
    }

    const draft = { enabled: true, imageUrl, title, subtitle, ctaText, ctaLink, theme, bgStyle, badgeText, endDate, showCountdown };
    const hasPreview = !!(title || subtitle || imageUrl);

    // Presentation-only status derived from existing state.
    const today = new Date().toISOString().split("T")[0];
    const scheduledFuture = !!startDate && startDate > today;
    const ended = !!endDate && endDate < today;
    let statusPill: { cls: string; label: string };
    if (!enabled) statusPill = { cls: "kh-pill-ink", label: "ปิดอยู่" };
    else if (ended) statusPill = { cls: "kh-pill-ink", label: "สิ้นสุด" };
    else if (scheduledFuture) statusPill = { cls: "kh-pill-warn", label: "ตั้งเวลา" };
    else statusPill = { cls: "kh-pill-good", label: "กำลังแสดง" };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="kh-eyebrow"><Megaphone size={15} strokeWidth={1.9} /> โปรโมชันหน้าแรก</div>
                    <span className={`kh-pill ${statusPill.cls}`}>{statusPill.label}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs kh-ink3">
                        {dirty ? "● มีการแก้ไขที่ยังไม่บันทึก" : savedAt ? `บันทึกล่าสุด ${savedAt} ✓` : "ยังไม่ได้บันทึก"}
                    </span>
                    <button type="button" onClick={handleSave} disabled={saving} className="kh-btn">
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} strokeWidth={1.9} />} บันทึก
                    </button>
                </div>
            </div>

            <p className="text-sm kh-ink3 -mt-2">
                แบนเนอร์โปรโมชันที่แสดงเหนือส่วน Hero บนหน้าแรก — เปิด/ปิด และแก้ไขรูป/ข้อความได้ที่นี่
                <span className="inline-flex items-center gap-1 ml-2 kh-pill kh-pill-warn no-dot align-middle">
                    <Clock size={12} strokeWidth={2} /> หลังบันทึก แสดงบนหน้าเว็บภายในประมาณ 1 นาที
                </span>
            </p>

            {/* Show/Hide toggle + click stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="kh-card p-5 flex items-center justify-between gap-4">
                    <div>
                        <div className="font-semibold kh-ink flex items-center gap-2">
                            {enabled
                                ? <Eye size={18} style={{ color: "var(--good)" }} />
                                : <EyeOff size={18} className="kh-ink3" />}
                            แสดงแบนเนอร์บนหน้าแรก
                        </div>
                        <p className="text-sm kh-ink3 mt-0.5">
                            {enabled ? "กำลังแสดง — โปรโมชันจะอยู่เหนือ Hero" : "ปิดอยู่ — หน้าแรกจะขึ้น Hero ตามปกติ"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setEnabled((v) => !v)}
                        className="relative w-14 h-8 rounded-full transition-colors flex-shrink-0"
                        style={{ background: enabled ? "var(--good)" : "var(--line-2)" }}
                        aria-label="สลับการแสดงแบนเนอร์"
                    >
                        <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-6" : ""}`}></span>
                    </button>
                </div>

                <div className="kh-card p-5 flex items-center gap-8">
                    <MousePointerClick className="shrink-0" size={28} style={{ color: "var(--accent)" }} />
                    <div>
                        <div className="text-xs kh-ink3 font-medium">คลิกปุ่มทั้งหมด</div>
                        <div className="text-2xl font-semibold kh-ink kh-num">{clickStats.total.toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-xs kh-ink3 font-medium">คลิกวันนี้</div>
                        <div className="text-2xl font-semibold kh-num" style={{ color: "var(--accent)" }}>{clickStats.today.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Content editor */}
            <div className="kh-card p-5 md:p-6 space-y-5">
                <div className="kh-eyebrow">รายละเอียดแบนเนอร์</div>

                {/* Background theme (gradient) */}
                <div>
                    <label className="block text-xs font-medium kh-ink2 mb-2">สีพื้นหลัง (ไล่เฉด)</label>
                    <div className="flex flex-wrap gap-2">
                        {PROMO_THEME_LIST.map((th) => (
                            <button
                                key={th.key}
                                type="button"
                                onClick={() => setTheme(th.key)}
                                className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border transition-all"
                                style={theme === th.key
                                    ? { borderColor: "var(--accent)", background: "var(--accent-soft)" }
                                    : { borderColor: "var(--line)" }}
                            >
                                <span className={`w-6 h-6 rounded-full ring-1 ring-black/10 ${th.swatch}`}></span>
                                <span className="text-sm font-medium kh-ink2">{th.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Card background style */}
                <div>
                    <label className="block text-xs font-medium kh-ink2 mb-2">สไตล์พื้นหลังการ์ด</label>
                    <div className="flex gap-2">
                        {([["solid", "ไล่เฉดทึบ"], ["glass", "กระจกฝ้า"]] as const).map(([val, lbl]) => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => setBgStyle(val)}
                                className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all"
                                style={bgStyle === val
                                    ? { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent-ink)" }
                                    : { borderColor: "var(--line)", color: "var(--ink-3)" }}
                            >
                                {lbl}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Image */}
                <div>
                    <label className="block text-xs font-medium kh-ink2 mb-1">รูปภาพ <span className="font-normal kh-ink3">(ไม่ใส่ก็ได้)</span></label>
                    <p className="text-xs kh-ink3 mb-2">แนะนำขนาด ~1200 × 750 px (อัตราส่วน 16:10) เพื่อให้คมชัด · JPG/PNG/WebP · สูงสุด 5MB</p>
                    {imageUrl ? (
                        <div className="relative inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imageUrl} alt="ตัวอย่างรูปโปรโมชัน" className="w-full max-w-sm rounded-xl object-cover" style={{ border: "1px solid var(--line)" }} />
                            <button
                                type="button"
                                onClick={() => setImageUrl("")}
                                className="absolute top-2 right-2 bg-white/90 rounded-full p-2 shadow"
                                style={{ color: "var(--danger)" }}
                                aria-label="ลบรูป"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <label
                            className="flex flex-col items-center justify-center gap-2 rounded-xl p-8 cursor-pointer transition-colors kh-ink3"
                            style={{ border: "2px dashed var(--line-2)", background: "var(--card-2)" }}
                        >
                            {uploading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
                            <span className="text-sm font-medium">{uploading ? "กำลังอัปโหลด..." : "คลิกเพื่ออัปโหลดรูป"}</span>
                            <span className="text-xs">JPG, PNG, WebP · สูงสุด 5MB</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImage} disabled={uploading} />
                        </label>
                    )}
                </div>

                {/* Title */}
                <div>
                    <label className="block text-xs font-medium kh-ink2 mb-2">หัวข้อ</label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="เช่น เปิดรับสมัครรุ่นใหม่ ลดพิเศษ 50%!"
                        className="kh-input"
                    />
                </div>

                {/* Subtitle */}
                <div>
                    <label className="block text-xs font-medium kh-ink2 mb-2">คำอธิบาย</label>
                    <textarea
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        rows={3}
                        placeholder="เช่น สมัครภายในเดือนนี้ รับฟรีคอร์สติวเข้ม + เฉลยข้อสอบจริงทุกชุด"
                        className="kh-textarea resize-none"
                    />
                </div>

                {/* Badge text */}
                <div>
                    <label className="block text-xs font-medium kh-ink2 mb-2">ข้อความป้าย <span className="font-normal kh-ink3">(เว้นว่าง = ไม่แสดงป้าย)</span></label>
                    <input
                        value={badgeText}
                        onChange={(e) => setBadgeText(e.target.value)}
                        placeholder="เช่น โปรโมชันพิเศษ / ด่วน! / ลดสูงสุด 50%"
                        className="kh-input"
                    />
                </div>

                {/* CTA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium kh-ink2 mb-2">ข้อความปุ่ม <span className="font-normal kh-ink3">(ไม่ใส่ก็ได้)</span></label>
                        <input
                            value={ctaText}
                            onChange={(e) => setCtaText(e.target.value)}
                            placeholder="เช่น สมัครเลย"
                            className="kh-input"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium kh-ink2 mb-2">ลิงก์ปุ่ม</label>
                        <input
                            value={ctaLink}
                            onChange={(e) => setCtaLink(e.target.value)}
                            placeholder="เช่น /payment หรือ /course/xxxx"
                            className="kh-input"
                        />
                    </div>
                </div>
                <p className="text-xs kh-ink3">ปุ่มจะแสดงก็ต่อเมื่อใส่ทั้ง &ldquo;ข้อความปุ่ม&rdquo; และ &ldquo;ลิงก์ปุ่ม&rdquo; · ลิงก์ที่ขึ้นต้น http จะเปิดในแท็บใหม่</p>

                {/* Schedule */}
                <div>
                    <label className="text-xs font-medium kh-ink2 mb-2 flex items-center gap-1.5"><CalendarClock size={14} strokeWidth={1.9} /> ช่วงเวลาแสดง <span className="font-normal kh-ink3">(เว้นว่าง = ไม่จำกัด)</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs kh-ink3">เริ่มแสดง</span>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="kh-input mt-1" />
                        </div>
                        <div>
                            <span className="text-xs kh-ink3">หยุดแสดง (ถึงสิ้นวัน)</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="kh-input mt-1" />
                        </div>
                    </div>
                    <p className="text-xs kh-ink3 mt-1.5">ตั้งวันแล้วระบบเปิด/ปิดแบนเนอร์ให้อัตโนมัติตามช่วง (ต้องเปิดสวิตช์ด้านบนด้วย)</p>
                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                        <input type="checkbox" checked={showCountdown} onChange={(e) => setShowCountdown(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: "var(--accent)" }} />
                        <span className="text-sm font-medium kh-ink2">แสดงนาฬิกานับถอยหลังถึงวันหมด</span>
                    </label>
                </div>
            </div>

            {/* Live preview */}
            <div className="kh-card p-5 md:p-6">
                <div className="kh-eyebrow mb-3"><Eye size={15} strokeWidth={1.9} /> ตัวอย่างแบนเนอร์ที่กำลังแสดง</div>
                {hasPreview ? (
                    <PromotionBanner promo={draft} />
                ) : (
                    <div
                        className="text-center kh-ink3 rounded-2xl p-10"
                        style={{ border: "2px dashed var(--line-2)", background: "var(--card-2)" }}
                    >
                        ใส่หัวข้อ / คำอธิบาย / รูป เพื่อดูตัวอย่าง
                    </div>
                )}
            </div>
        </div>
    );
}
