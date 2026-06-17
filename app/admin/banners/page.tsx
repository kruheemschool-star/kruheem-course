"use client";
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { uploadImageToStorage } from "@/lib/upload";
import { Upload, Image as ImageIcon, Save, Loader2, Trash2, Star, Heart, Flame, Trophy, Sparkles, FileText, Link as LinkIcon, DollarSign } from "lucide-react";
import { useConfirmModal } from "@/hooks/useConfirmModal";

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AdminBanners() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [bannerImages, setBannerImages] = useState<{ id: string, url: string }[]>([]);
    const [badgeText, setBadgeText] = useState("คอร์สยอดนิยม");
    const [badgeIcon, setBadgeIcon] = useState("Star");
    const [isSavingBadge, setIsSavingBadge] = useState(false);

    // New fields for Banner Content
    const [bannerTitle, setBannerTitle] = useState("");
    const [bannerDescription, setBannerDescription] = useState("");
    const [bannerPrice, setBannerPrice] = useState("");
    const [bannerFullPrice, setBannerFullPrice] = useState("");
    const [bannerLinkUrl, setBannerLinkUrl] = useState("/course/1");
    const [isSavingDetails, setIsSavingDetails] = useState(false);

    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const docRef = doc(db, "system", "banners");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.bannerImages && Array.isArray(data.bannerImages)) {
                    setBannerImages(data.bannerImages);
                } else if (data.mainBannerUrl) {
                    // Migration for legacy single image
                    setBannerImages([{ id: 'legacy', url: data.mainBannerUrl }]);
                }
                if (data.badgeText) setBadgeText(data.badgeText);
                if (data.badgeIcon) setBadgeIcon(data.badgeIcon);

                // Fetch banner content
                if (data.bannerTitle) setBannerTitle(data.bannerTitle);
                if (data.bannerDescription) setBannerDescription(data.bannerDescription);
                if (data.bannerPrice) setBannerPrice(data.bannerPrice);
                if (data.bannerFullPrice) setBannerFullPrice(data.bannerFullPrice);
                if (data.bannerLinkUrl) setBannerLinkUrl(data.bannerLinkUrl);
            }
        } catch (error) {
            console.error("Error fetching banners:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            alert(`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${MAX_FILE_SIZE / 1024 / 1024}MB) ❌`);
            return;
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            alert("รองรับเฉพาะไฟล์ JPG, PNG, และ WebP เท่านั้น ❌");
            return;
        }

        try {
            setUploading(true);
            const imageId = `banner_${Date.now()}`;
            const url = await uploadImageToStorage(file, `banners/${imageId}`);

            const newImage = { id: imageId, url };
            const updatedImages = [...bannerImages, newImage];

            // Update state and Firestore
            setBannerImages(updatedImages);
            await setDoc(doc(db, "system", "banners"), { bannerImages: updatedImages }, { merge: true });

            alert("อัปโหลดรูปภาพเรียบร้อยแล้ว ✅");
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ ❌");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteImage = async (imageId: string) => {
        confirmModal("ยืนยันการลบ", "ต้องการลบรูปภาพนี้ใช่ไหม?", async () => {
            setDeletingId(imageId);
            try {
                // Delete from Firebase Storage (skip legacy images)
                if (imageId !== 'legacy') {
                    const storageRef = ref(storage, `banners/${imageId}`);
                    try {
                        await deleteObject(storageRef);
                    } catch (storageError) {
                        console.warn("Could not delete from storage:", storageError);
                        // Continue with Firestore deletion even if storage deletion fails
                    }
                }

                const updatedImages = bannerImages.filter(img => img.id !== imageId);
                setBannerImages(updatedImages);
                await setDoc(doc(db, "system", "banners"), { bannerImages: updatedImages }, { merge: true });
                alert("ลบรูปภาพเรียบร้อยแล้ว ✅");
            } catch (error) {
                console.error("Error deleting image:", error);
                alert("เกิดข้อผิดพลาดในการลบรูปภาพ ❌");
            } finally {
                setDeletingId(null);
            }
        }, true);
    };

    const handleSaveDetails = async () => {
        try {
            setIsSavingDetails(true);
            await setDoc(doc(db, "system", "banners"), {
                bannerTitle,
                bannerDescription,
                bannerPrice,
                bannerFullPrice,
                bannerLinkUrl
            }, { merge: true });
            alert("บันทึกข้อมูลรายละเอียดเรียบร้อยแล้ว ✅");
        } catch (error) {
            console.error("Error saving details:", error);
            alert("บันทึกข้อมูลไม่สำเร็จ ❌");
        } finally {
            setIsSavingDetails(false);
        }
    };

    const handleSaveBadge = async () => {
        try {
            setIsSavingBadge(true);
            await setDoc(doc(db, "system", "banners"), { badgeText, badgeIcon }, { merge: true });
            alert("บันทึกข้อมูลป้ายกำกับเรียบร้อยแล้ว ✅");
        } catch (error) {
            console.error("Error saving badge:", error);
            alert("บันทึกข้อมูลไม่สำเร็จ ❌");
        } finally {
            setIsSavingBadge(false);
        }
    };

    const icons = [
        { name: "Star", icon: <Star size={20} fill="currentColor" /> },
        { name: "Heart", icon: <Heart size={20} fill="currentColor" /> },
        { name: "Flame", icon: <Flame size={20} fill="currentColor" /> },
        { name: "Trophy", icon: <Trophy size={20} fill="currentColor" /> },
        { name: "Sparkles", icon: <Sparkles size={20} fill="currentColor" /> },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="kh-eyebrow"><ImageIcon size={15} strokeWidth={1.9} /> โฆษณาหน้าแรก</div>
                    <span className="kh-pill kh-pill-accent no-dot">{bannerImages.length} รูป</span>
                </div>
                <label className={`kh-btn ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} strokeWidth={1.9} />}
                    <span>{uploading ? "กำลังอัปโหลด..." : "เพิ่มรูปภาพ"}</span>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                        disabled={uploading}
                    />
                </label>
            </div>

            {/* Main Banner Card */}
            <div className="kh-card p-5 md:p-6 space-y-5">
                <div>
                    <div className="kh-eyebrow"><ImageIcon size={15} strokeWidth={1.9} /> โฆษณาหลัก</div>
                    <p className="text-sm kh-ink3 mt-1">รูปภาพที่จะแสดงในหน้าแรก (อัปโหลดได้หลายรูปเพื่อทำสไลด์)</p>
                </div>

                {/* Image Grid */}
                {bannerImages.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {bannerImages.map((img, index) => (
                            <div
                                key={img.id || index}
                                className="kh-card kh-card-h relative group overflow-hidden p-0"
                            >
                                <div className="aspect-[4/5]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img.url} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" style={{ background: "rgba(15, 30, 27, .55)" }}>
                                    <button
                                        onClick={() => handleDeleteImage(img.id)}
                                        disabled={deletingId === img.id}
                                        className={`kh-btn-ghost ${deletingId === img.id ? "opacity-50 cursor-not-allowed" : ""}`}
                                        title="ลบรูปภาพ"
                                    >
                                        {deletingId === img.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.9} />}
                                        <span>ลบ</span>
                                    </button>
                                </div>
                                <span className="absolute top-3 left-3 kh-pill kh-pill-ink no-dot">รูปที่ {index + 1}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div
                        className="w-full aspect-[16/9] rounded-xl flex flex-col items-center justify-center gap-3"
                        style={{ background: "var(--card-2)", border: "1px dashed var(--line-2)" }}
                    >
                        <ImageIcon size={32} className="kh-ink3" />
                        <p className="text-sm font-medium kh-ink3">ยังไม่มีรูปภาพ</p>
                    </div>
                )}

                {/* Upload hint */}
                <div className="rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>
                    <div>
                        <p className="text-sm font-medium kh-ink2">อัปโหลดรูปภาพใหม่</p>
                        <p className="text-xs kh-ink3 mt-0.5">ขนาดที่แนะนำ <span className="font-semibold" style={{ color: "var(--accent)" }}>800 × 950 px</span> (อัตราส่วน 800:950) · JPG/PNG/WebP · สูงสุด 5MB</p>
                    </div>
                    <label className={`kh-btn-ghost ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                        {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} strokeWidth={1.9} />}
                        <span>{uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์"}</span>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                            disabled={uploading}
                        />
                    </label>
                </div>
            </div>

            {/* Banner Content Details Card */}
            <div className="kh-card p-5 md:p-6 space-y-5">
                <div>
                    <div className="kh-eyebrow"><FileText size={15} strokeWidth={1.9} /> รายละเอียดโฆษณา</div>
                    <p className="text-sm kh-ink3 mt-1">ข้อมูลที่จะแสดงบนการ์ดโฆษณา</p>
                </div>

                <div>
                    <label className="block text-xs font-medium kh-ink2 mb-1">หัวข้อ</label>
                    <input
                        type="text"
                        value={bannerTitle}
                        onChange={(e) => setBannerTitle(e.target.value)}
                        className="kh-input"
                        placeholder="เช่น ติวเข้มสอบเข้า Gifted ม.1"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium kh-ink2 mb-1">รายละเอียด</label>
                    <textarea
                        value={bannerDescription}
                        onChange={(e) => setBannerDescription(e.target.value)}
                        rows={3}
                        className="kh-textarea resize-none"
                        placeholder="คำอธิบายสั้นๆ เกี่ยวกับคอร์สหรือโปรโมชั่น..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium kh-ink2 mb-1 flex items-center gap-1.5">
                            <DollarSign size={14} strokeWidth={1.9} /> ราคา <span className="font-normal kh-ink3">(ปล่อยว่างได้)</span>
                        </label>
                        <input
                            type="text"
                            value={bannerPrice}
                            onChange={(e) => setBannerPrice(e.target.value)}
                            className="kh-input"
                            placeholder="เช่น 1,900"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium kh-ink2 mb-1 flex items-center gap-1.5">
                            <DollarSign size={14} strokeWidth={1.9} /> ราคาเต็ม <span className="font-normal kh-ink3">(ขีดฆ่า)</span>
                        </label>
                        <input
                            type="text"
                            value={bannerFullPrice}
                            onChange={(e) => setBannerFullPrice(e.target.value)}
                            className="kh-input"
                            placeholder="เช่น 2,900"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium kh-ink2 mb-1 flex items-center gap-1.5">
                        <LinkIcon size={14} strokeWidth={1.9} /> ลิงก์ปลายทาง
                    </label>
                    <input
                        type="text"
                        value={bannerLinkUrl}
                        onChange={(e) => setBannerLinkUrl(e.target.value)}
                        className="kh-input"
                        placeholder="เช่น /payment หรือ /course/abc"
                    />
                </div>

                <div className="pt-4 flex justify-end" style={{ borderTop: "1px solid var(--line)" }}>
                    <button
                        onClick={handleSaveDetails}
                        disabled={isSavingDetails}
                        className="kh-btn"
                    >
                        {isSavingDetails ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} strokeWidth={1.9} />}
                        <span>บันทึกรายละเอียด</span>
                    </button>
                </div>
            </div>

            {/* Badge Customization Card */}
            <div className="kh-card p-5 md:p-6 space-y-5">
                <div>
                    <div className="kh-eyebrow"><Star size={15} strokeWidth={1.9} /> ป้ายกำกับ</div>
                    <p className="text-sm kh-ink3 mt-1">ข้อความและไอคอนที่จะแสดงบนรูปภาพ</p>
                </div>

                <div>
                    <label className="block text-xs font-medium kh-ink2 mb-1">ข้อความบนป้าย</label>
                    <input
                        type="text"
                        value={badgeText}
                        onChange={(e) => setBadgeText(e.target.value)}
                        className="kh-input"
                        placeholder="เช่น คอร์สยอดนิยม, โปรโมชั่นพิเศษ"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium kh-ink2 mb-2">เลือกไอคอน</label>
                    <div className="flex gap-3 flex-wrap">
                        {icons.map((item) => {
                            const active = badgeIcon === item.name;
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => setBadgeIcon(item.name)}
                                    className="flex items-center justify-center w-14 h-14 rounded-xl transition"
                                    style={{
                                        border: active ? "2px solid var(--accent)" : "1px solid var(--line)",
                                        background: active ? "var(--accent-soft)" : "var(--card)",
                                        color: active ? "var(--accent-ink)" : "var(--ink-3)",
                                    }}
                                >
                                    {item.icon}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="pt-4 flex justify-end" style={{ borderTop: "1px solid var(--line)" }}>
                    <button
                        onClick={handleSaveBadge}
                        disabled={isSavingBadge}
                        className="kh-btn"
                    >
                        {isSavingBadge ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} strokeWidth={1.9} />}
                        <span>บันทึกการเปลี่ยนแปลง</span>
                    </button>
                </div>
            </div>

            <ConfirmDialog />
        </div>
    );
}
