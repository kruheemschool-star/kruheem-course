"use client";
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import { ArrowLeft, Upload, Image as ImageIcon, Save, Loader2 } from "lucide-react";

export default function AdminBanners() {
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [mainBannerUrl, setMainBannerUrl] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const docRef = doc(db, "system", "banners");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.mainBannerUrl) {
                    setMainBannerUrl(data.mainBannerUrl);
                    setPreviewUrl(data.mainBannerUrl);
                }
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

        // Preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        try {
            setUploading(true);
            const storageRef = ref(storage, `banners/main_banner_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            // Update state and Firestore
            setMainBannerUrl(url);
            await setDoc(doc(db, "system", "banners"), { mainBannerUrl: url }, { merge: true });

            alert("อัปโหลดรูปภาพเรียบร้อยแล้ว ✅");
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ ❌");
        } finally {
            setUploading(false);
        }
    };

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
                            <p className="text-stone-400 text-sm">รูปภาพที่จะแสดงในหน้าแรก ถัดจากปุ่มเริ่มเรียน</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Image Preview */}
                        <div className="w-full aspect-[21/9] bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center overflow-hidden relative group">
                            {previewUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-6">
                                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
                                        <ImageIcon size={32} />
                                    </div>
                                    <p className="text-stone-400 font-medium">ยังไม่มีรูปภาพ</p>
                                </div>
                            )}

                            {/* Overlay Loading */}
                            {uploading && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 size={32} className="animate-spin text-amber-500" />
                                        <span className="text-amber-600 font-bold text-sm">กำลังอัปโหลด...</span>
                                    </div>
                                </div>
                            )}
                        </div>

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
                                <Upload size={20} />
                                <span>{uploading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}</span>
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

            </main>
        </div>
    );
}
