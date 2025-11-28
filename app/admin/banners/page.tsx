"use client";
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import { ArrowLeft, Upload, Image as ImageIcon, Save, Loader2, Trash2, Star, Heart, Flame, Trophy, Sparkles } from "lucide-react";

export default function AdminBanners() {
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [bannerImages, setBannerImages] = useState<{ id: string, url: string }[]>([]);
    const [badgeText, setBadgeText] = useState("คอร์สยอดนิยม");
    const [badgeIcon, setBadgeIcon] = useState("Star");
    const [isSavingBadge, setIsSavingBadge] = useState(false);

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

        try {
            setUploading(true);
            const imageId = `banner_${Date.now()}`;
            const storageRef = ref(storage, `banners/${imageId}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

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
        if (!confirm("ต้องการลบรูปภาพนี้ใช่ไหม?")) return;

        try {
            const updatedImages = bannerImages.filter(img => img.id !== imageId);
            setBannerImages(updatedImages);
            await setDoc(doc(db, "system", "banners"), { bannerImages: updatedImages }, { merge: true });
        } catch (error) {
            console.error("Error deleting image:", error);
            alert("เกิดข้อผิดพลาดในการลบรูปภาพ");
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

    if (loading) return <div className="min-h-screen flex items-center justify-center text-stone-500 bg-orange-50">กำลังโหลด...</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50 font-sans text-stone-700 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-white/20 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center gap-4">
                    <Link href="/admin" className="p-2 rounded-full hover:bg-white/50 transition">
                        <ArrowLeft size={24} className="text-stone-600" />
                    </Link>
                    <h1 className="text-xl font-bold text-stone-800">จัดการโฆษณา (Banners)</h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-6 md:p-10">

                {/* Main Banner Card */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-100">
                    <div className="flex items-center gap-4 mb-6 border-b border-stone-100 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                            <ImageIcon size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-stone-800">โฆษณาหลัก (Main Banner)</h2>
                            <p className="text-stone-400 text-sm">รูปภาพที่จะแสดงในหน้าแรก (สามารถอัปโหลดได้หลายรูปเพื่อทำสไลด์)</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Image Grid */}
                        {bannerImages.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6">
                                {bannerImages.map((img, index) => (
                                    <div key={img.id || index} className="relative group rounded-3xl overflow-hidden border-2 border-stone-100 shadow-sm">
                                        <div className="aspect-[21/9]">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={img.url} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                            <button
                                                onClick={() => handleDeleteImage(img.id)}
                                                className="p-3 bg-white text-rose-500 rounded-full hover:bg-rose-50 hover:scale-110 transition shadow-lg"
                                                title="ลบรูปภาพ"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                        <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                                            รูปที่ {index + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full aspect-[21/9] bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 text-stone-300">
                                    <ImageIcon size={32} />
                                </div>
                                <p className="text-stone-400 font-medium">ยังไม่มีรูปภาพ</p>
                            </div>
                        )}

                        {/* Upload Controls */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-stone-50 p-6 rounded-3xl">
                            <div className="text-center md:text-left">
                                <p className="font-bold text-stone-700 mb-1">อัปโหลดรูปภาพใหม่</p>
                                <p className="text-xs text-stone-400">ขนาดที่แนะนำ: <span className="text-amber-600 font-bold">1200 x 500 px</span> (อัตราส่วน 21:9)</p>
                            </div>

                            <label className={`
                                flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition cursor-pointer
                                ${uploading ? 'bg-stone-300 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:scale-105 hover:shadow-orange-200'}
                            `}>
                                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                                <span>{uploading ? 'กำลังอัปโหลด...' : 'เพิ่มรูปภาพ'}</span>
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
                </div>

                {/* Badge Customization Card */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-100 mt-8">
                    <div className="flex items-center gap-4 mb-6 border-b border-stone-100 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Star size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-stone-800">ป้ายกำกับ (Badge)</h2>
                            <p className="text-stone-400 text-sm">ข้อความและไอคอนที่จะแสดงบนรูปภาพ</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">ข้อความบนป้าย</label>
                            <input
                                type="text"
                                value={badgeText}
                                onChange={(e) => setBadgeText(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                                placeholder="เช่น คอร์สยอดนิยม, โปรโมชั่นพิเศษ"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">เลือกไอคอน</label>
                            <div className="flex gap-3 flex-wrap">
                                {icons.map((item) => (
                                    <button
                                        key={item.name}
                                        onClick={() => setBadgeIcon(item.name)}
                                        className={`p-3 rounded-xl border-2 transition flex items-center justify-center w-14 h-14 ${badgeIcon === item.name ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-stone-100 bg-white text-stone-400 hover:border-indigo-200'}`}
                                    >
                                        {item.icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-stone-100 flex justify-end">
                            <button
                                onClick={handleSaveBadge}
                                disabled={isSavingBadge}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50"
                            >
                                {isSavingBadge ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                <span>บันทึกการเปลี่ยนแปลง</span>
                            </button>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
