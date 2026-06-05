"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { uploadImageToStorage } from "@/lib/upload";
import Link from "next/link";
import { ArrowLeft, Upload, Save, Loader2, Trash2, Eye, EyeOff } from "lucide-react";
import PromotionBanner from "@/components/home/PromotionBanner";

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

    useEffect(() => {
        (async () => {
            try {
                const snap = await getDoc(doc(db, "settings", "homepage_promotion"));
                if (snap.exists()) {
                    const d = snap.data();
                    setEnabled(d.enabled ?? false);
                    setImageUrl(d.imageUrl || "");
                    setTitle(d.title || "");
                    setSubtitle(d.subtitle || "");
                    setCtaText(d.ctaText || "");
                    setCtaLink(d.ctaLink || "");
                }
            } catch (e) {
                console.error("Error loading promotion:", e);
            } finally {
                setLoading(false);
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

    const handleSave = async () => {
        try {
            setSaving(true);
            await setDoc(
                doc(db, "settings", "homepage_promotion"),
                { enabled, imageUrl, title, subtitle, ctaText, ctaLink, updatedAt: serverTimestamp() },
                { merge: true },
            );
            setSavedAt(new Date().toLocaleTimeString("th-TH"));
        } catch (e) {
            console.error("Error saving promotion:", e);
            alert("บันทึกไม่สำเร็จ ❌");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    const draft = { enabled: true, imageUrl, title, subtitle, ctaText, ctaLink };
    const hasPreview = !!(title || subtitle || imageUrl);

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <Link href="/admin" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-6">
                    <ArrowLeft size={18} /> กลับหน้าแอดมิน
                </Link>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-1">🎁 โปรโมชันหน้าแรก</h1>
                <p className="text-slate-500 mb-6">แบนเนอร์โปรโมชันที่แสดงเหนือส่วน Hero บนหน้าแรก — เปิด/ปิด และแก้ไขรูป/ข้อความได้ที่นี่</p>

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

                {/* Content editor */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 mb-5 shadow-sm space-y-5">
                    <h2 className="font-bold text-slate-700">รายละเอียดแบนเนอร์</h2>

                    {/* Image */}
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-2">รูปภาพ <span className="font-normal text-slate-400">(ไม่ใส่ก็ได้)</span></label>
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
                    <p className="text-xs text-slate-400">ปุ่มจะแสดงก็ต่อเมื่อใส่ทั้ง &ldquo;ข้อความปุ่ม&rdquo; และ &ldquo;ลิงก์ปุ่ม&rdquo;</p>
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
                        <span className="text-sm text-slate-400">{savedAt ? `บันทึกล่าสุด ${savedAt} ✓` : "ยังไม่ได้บันทึก"}</span>
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
