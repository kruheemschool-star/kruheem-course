"use client";
import { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { uploadImageToStorage } from "@/lib/upload";
import { PROMO_STATS_DOC } from "@/lib/promoTracking";
import Link from "next/link";
import { ArrowLeft, Upload, Save, Loader2, Trash2, Eye, EyeOff, MousePointerClick } from "lucide-react";
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
                { enabled, imageUrl, title, subtitle, ctaText, ctaLink, theme, badgeText, startDate, endDate, showCountdown, updatedAt: serverTimestamp() },
                { merge: true },
            );
            // Clean up the previously-saved image if it was replaced or removed.
            if (originalImageUrl.current && originalImageUrl.current !== imageUrl) {
                deleteImageByUrl(originalImageUrl.current);
            }
            originalImageUrl.current = imageUrl;
            snapshot.current = JSON.stringify({ enabled, imageUrl, title, subtitle, ctaText, ctaLink, theme, badgeText, startDate, endDate, showCountdown });
            setSavedAt(new Date().toLocaleTimeString("th-TH"));
        } catch (e) {
            console.error("Error saving promotion:", e);
            alert("บันทึกไม่สำเร็จ ❌");
        } finally {
            setSaving(false);
        }
    };

    const currentJson = JSON.stringify({ enabled, imageUrl, title, subtitle, ctaText, ctaLink, theme, badgeText, startDate, endDate, showCountdown });
    const dirty = loaded && currentJson !== snapshot.current;

    // Warn before leaving the page with unsaved changes.
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [dirty]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    const draft = { enabled: true, imageUrl, title, subtitle, ctaText, ctaLink, theme, badgeText, endDate, showCountdown };
    const hasPreview = !!(title || subtitle || imageUrl);

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <Link href="/admin" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-6">
                    <ArrowLeft size={18} /> กลับหน้าแอดมิน
                </Link>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-1">🎁 โปรโมชันหน้าแรก</h1>
                <p className="text-slate-500 mb-2">แบนเนอร์โปรโมชันที่แสดงเหนือส่วน Hero บนหน้าแรก — เปิด/ปิด และแก้ไขรูป/ข้อความได้ที่นี่</p>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-6 inline-block">⏱️ หลังบันทึก การเปลี่ยนแปลงจะแสดงบนหน้าเว็บภายในประมาณ 1 นาที</p>

                {/* Show/Hide toggle */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5 flex items-center justify-between gap-4 shadow-sm">
                    <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                            {enabled ? <Eye size={18} className="text-emerald-500" /> : <EyeOff size={18} className="text-slate-400" />}
                            แสดงแบนเนอร์บนหน้าแรก
                        </div>
                        <p className="text-sm text-slate-400 mt-0.5">
                            {enabled ? "กำลังแสดง — โปรโมชันจะอยู่เหนือ Hero" : "ปิดอยู่ — หน้าแรกจะขึ้น Hero ตามปกติ"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setEnabled((v) => !v)}
                        className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ${enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                        aria-label="สลับการแสดงแบนเนอร์"
                    >
                        <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-6" : ""}`}></span>
                    </button>
                </div>

                {/* Click stats */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5 shadow-sm flex items-center gap-8">
                    <MousePointerClick className="text-amber-500 shrink-0" size={28} />
                    <div>
                        <div className="text-xs text-slate-400 font-bold">คลิกปุ่มทั้งหมด</div>
                        <div className="text-2xl font-black text-slate-800">{clickStats.total.toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 font-bold">คลิกวันนี้</div>
                        <div className="text-2xl font-black text-amber-600">{clickStats.today.toLocaleString()}</div>
                    </div>
                </div>

                {/* Content editor */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 mb-5 shadow-sm space-y-5">
                    <h2 className="font-bold text-slate-700">รายละเอียดแบนเนอร์</h2>

                    {/* Background theme (gradient) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-2">สีพื้นหลัง (ไล่เฉด)</label>
                        <div className="flex flex-wrap gap-2">
                            {PROMO_THEME_LIST.map((th) => (
                                <button
                                    key={th.key}
                                    type="button"
                                    onClick={() => setTheme(th.key)}
                                    className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border-2 transition-all ${theme === th.key ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300"}`}
                                >
                                    <span className={`w-6 h-6 rounded-full ring-1 ring-black/10 ${th.swatch}`}></span>
                                    <span className="text-sm font-bold text-slate-600">{th.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Image */}
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">รูปภาพ <span className="font-normal text-slate-400">(ไม่ใส่ก็ได้)</span></label>
                        <p className="text-xs text-slate-400 mb-2">แนะนำขนาด ~1200 × 750 px (อัตราส่วน 16:10) เพื่อให้คมชัด · JPG/PNG/WebP · สูงสุด 5MB</p>
                        {imageUrl ? (
                            <div className="relative inline-block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imageUrl} alt="ตัวอย่างรูปโปรโมชัน" className="w-full max-w-sm rounded-xl border border-slate-200 object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setImageUrl("")}
                                    className="absolute top-2 right-2 bg-white/90 hover:bg-rose-50 text-rose-600 rounded-full p-2 shadow"
                                    aria-label="ลบรูป"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-8 cursor-pointer hover:border-amber-300 transition-colors text-slate-400">
                                {uploading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
                                <span className="text-sm font-bold">{uploading ? "กำลังอัปโหลด..." : "คลิกเพื่ออัปโหลดรูป"}</span>
                                <span className="text-xs">JPG, PNG, WebP · สูงสุด 5MB</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImage} disabled={uploading} />
                            </label>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-2">หัวข้อ</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="เช่น เปิดรับสมัครรุ่นใหม่ ลดพิเศษ 50%!"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400"
                        />
                    </div>

                    {/* Subtitle */}
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-2">คำอธิบาย</label>
                        <textarea
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                            rows={3}
                            placeholder="เช่น สมัครภายในเดือนนี้ รับฟรีคอร์สติวเข้ม + เฉลยข้อสอบจริงทุกชุด"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400 resize-none"
                        />
                    </div>

                    {/* Badge text */}
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-2">ข้อความป้าย <span className="font-normal text-slate-400">(เว้นว่าง = ไม่แสดงป้าย)</span></label>
                        <input
                            value={badgeText}
                            onChange={(e) => setBadgeText(e.target.value)}
                            placeholder="เช่น โปรโมชันพิเศษ / ด่วน! / ลดสูงสุด 50%"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400"
                        />
                    </div>

                    {/* CTA */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-2">ข้อความปุ่ม <span className="font-normal text-slate-400">(ไม่ใส่ก็ได้)</span></label>
                            <input
                                value={ctaText}
                                onChange={(e) => setCtaText(e.target.value)}
                                placeholder="เช่น สมัครเลย"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-2">ลิงก์ปุ่ม</label>
                            <input
                                value={ctaLink}
                                onChange={(e) => setCtaLink(e.target.value)}
                                placeholder="เช่น /payment หรือ /course/xxxx"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-slate-400">ปุ่มจะแสดงก็ต่อเมื่อใส่ทั้ง &ldquo;ข้อความปุ่ม&rdquo; และ &ldquo;ลิงก์ปุ่ม&rdquo; · ลิงก์ที่ขึ้นต้น http จะเปิดในแท็บใหม่</p>

                    {/* Schedule */}
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-2">ช่วงเวลาแสดง <span className="font-normal text-slate-400">(เว้นว่าง = ไม่จำกัด)</span></label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-slate-400">เริ่มแสดง</span>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400" />
                            </div>
                            <div>
                                <span className="text-xs text-slate-400">หยุดแสดง (ถึงสิ้นวัน)</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">ตั้งวันแล้วระบบเปิด/ปิดแบนเนอร์ให้อัตโนมัติตามช่วง (ต้องเปิดสวิตช์ด้านบนด้วย)</p>
                        <label className="flex items-center gap-2 mt-3 cursor-pointer">
                            <input type="checkbox" checked={showCountdown} onChange={(e) => setShowCountdown(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400" />
                            <span className="text-sm font-bold text-slate-600">แสดงนาฬิกานับถอยหลังถึงวันหมด</span>
                        </label>
                    </div>
                </div>

                {/* Live preview */}
                <div className="mb-28">
                    <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Eye size={16} /> ตัวอย่างที่จะแสดงจริง</h2>
                    {hasPreview ? (
                        <PromotionBanner promo={draft} />
                    ) : (
                        <div className="text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl p-10">
                            ใส่หัวข้อ / คำอธิบาย / รูป เพื่อดูตัวอย่าง
                        </div>
                    )}
                </div>

                {/* Sticky save bar */}
                <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200 p-4 z-30">
                    <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-400">{dirty ? "● มีการแก้ไขที่ยังไม่บันทึก" : savedAt ? `บันทึกล่าสุด ${savedAt} ✓` : "ยังไม่ได้บันทึก"}</span>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 shadow-lg shadow-amber-200 transition-colors"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} บันทึก
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
