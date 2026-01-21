"use client";

import { useState, useEffect, useRef } from "react";
import { useUserAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { User, Camera, Save, Loader2, Check, ArrowLeft, Lightbulb } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Reliable Twemoji CDN for Animals
// Local Avatar Assets
const avatarAssets = {
    kids: Array.from({ length: 8 }, (_, i) => `/avatars/kids/kid_${i + 1}.png`),
    female: Array.from({ length: 8 }, (_, i) => `/avatars/female/girl_${i + 1}.png`),
    animal: Array.from({ length: 8 }, (_, i) => `/avatars/animals/animal_${i + 1}.png`),
    monsters: Array.from({ length: 8 }, (_, i) => `/avatars/monsters/monster_${i + 1}.png`),
};

const TABS = [
    { id: 'kids', label: '👦 ผู้ชาย' },
    { id: 'female', label: '👧 ผู้หญิง' },
    { id: 'animal', label: '🦁 สัตว์น่ารัก' },
    { id: 'monsters', label: '👾 สัตว์ประหลาด' },
];

const QUOTES = {
    healing: [
        "เหนื่อยก็พัก ไม่ต้องรักดีตลอดก็ได้",
        "ไม่ต้องเก่งที่สุด แค่ดีที่สุดในแบบเรา",
        "ผิดพลาด = การเรียนรู้ (ไม่ใช่ล้มเหลว)",
        "วันนี้ทำได้แค่นี้ ก็เก่งมากแล้ว",
        "อนุญาตให้ตัวเองพักบ้างนะ",
        "ช้าหน่อยไม่เป็นไร ขอแค่ไม่หยุดเดิน",
        "อย่ากดดันตัวเองจนลืมมีความสุข",
        "ทุกคนมีเวลาของตัวเอง ดอกไม้บานไม่พร้อมกัน",
        "เก่งมากแล้วนะ ที่ผ่านวันนี้มาได้",
        "ล้มได้ก็ลุกได้ ร้องไห้แล้วไปต่อ"
    ],
    passion: [
        "ยาก... ไม่ได้แปลว่าทำไม่ได้",
        "อุปสรรคมีไว้ให้ข้าม ไม่ใช่ให้กลัว",
        "ความพยายามไม่เคยทรยศใคร",
        "อนาคตเปลี่ยนได้ ด้วยมือเราตอนนี้",
        "ฝันให้ไกล ไปให้ถึง (แม้จะคลานไปก็ตาม)",
        "ยิ่งโจทย์ยาก ยิ่งทำให้เราเก่งขึ้น",
        "คู่แข่งที่น่ากลัวที่สุด คือตัวเราในเมื่อวาน",
        "ไม่มีคำว่าสาย สำหรับการเริ่มต้น",
        "อย่าเพิ่งบอกว่าทำไม่ได้ ถ้ายังไม่ได้ลอง",
        "เป้าหมายมีไว้พุ่งชน (ไม่ใช่มีไว้พุ่งหนี)"
    ],
    growth: [
        "วินัย คือสะพานเชื่อมความฝัน",
        "ทุกก้าวเล็กๆ คือส่วนหนึ่งของความสำเร็จ",
        "เก่งขึ้นวันละ 1% ครบปีก็เทพแล้ว",
        "โฟกัสที่ \"ความก้าวหน้า\" ไม่ใช่ \"ความสมบูรณ์แบบ\"",
        "ความรู้คือสมบัติที่ใครก็ขโมยไม่ได้",
        "เปลี่ยน \"ทำไม่ได้\" เป็น \"ทำยังไงถึงจะได้\"",
        "โอกาสมักมาในคราบของงานยากเสมอ",
        "เชื่อในตัวเองหน่อย เธอทำได้!",
        "การเรียนรู้ไม่มีวันสิ้นสุด",
        "จงภูมิใจในความพยายามของตัวเอง"
    ]
};

export default function ProfilePage() {
    const { user, userProfile, setUserProfile } = useUserAuth();
    const [firstName, setFirstName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'kids' | 'female' | 'animal' | 'monsters'>('kids');
    const [caption, setCaption] = useState("");
    const [showQuoteDrawer, setShowQuoteDrawer] = useState(false);
    const [quoteCategory, setQuoteCategory] = useState<'healing' | 'passion' | 'growth'>('healing');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load initial data
    useEffect(() => {
        if (userProfile || user) {
            const displayName = userProfile?.displayName || user?.displayName || "";
            if (displayName) setFirstName(displayName);
            if (userProfile?.caption) setCaption(userProfile.caption);

            // Set default avatar if none exists
            setAvatar(userProfile?.avatar || user?.photoURL || avatarAssets.kids[0]);
        }
    }, [user, userProfile]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const fullName = firstName.trim();
            if (!fullName) {
                toast.error("กรุณากรอกชื่อ");
                setLoading(false);
                return;
            }

            // 1. Update Auth Profile
            await updateProfile(user, {
                displayName: fullName,
                photoURL: avatar
            });

            // 2. Update Firestore User Document
            const userRef = doc(db, "users", user.uid);
            const userUpdateData = {
                displayName: fullName,
                caption: caption.trim(),
                avatar: avatar,
                photoURL: avatar,
                updatedAt: new Date()
            };

            await setDoc(userRef, userUpdateData, { merge: true });

            // 3. IMMEDIATE UPDATE: Force global context to update for Navbar/Header
            setUserProfile({
                ...userProfile,
                displayName: fullName,
                caption: caption.trim(),
                avatar: avatar
            });

            toast.success("บันทึกข้อมูลสำเร็จ!");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        try {
            const fileRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            setAvatar(url);
            toast.success("อัปโหลดรูปภาพสำเร็จ!");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("อัปโหลดรูปภาพไม่สำเร็จ");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            <Navbar />
            <Toaster />

            <main className="container mx-auto px-4 py-8 pt-24 max-w-6xl">

                {/* Back Button */}
                <Link href="/my-courses" className="inline-flex items-center text-slate-500 hover:text-indigo-600 mb-6 transition">
                    <ArrowLeft size={20} className="mr-1" />
                    กลับไปหน้าคอร์สเรียน
                </Link>

                <div className="mx-auto p-4 sm:p-6 space-y-6 min-h-screen pb-24 font-['Sarabun']">
                    <h1 className="text-3xl font-bold text-slate-800 leading-relaxed">
                        แก้ไขข้อมูลส่วนตัว
                    </h1>

                    {/* Top Section: Name Input & Save Button */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                    ชื่อแสดงผล (Display Name)
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full h-12 px-4 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all font-medium text-slate-800 placeholder-slate-400"
                                    placeholder="กรอกชื่อของคุณ"
                                />
                            </div>
                            <div className="flex-1 w-full relative">
                                <label className="block text-sm font-medium text-slate-600 mb-1.5 flex justify-between">
                                    <span>แคปชั่นประจำตัว (Personal Caption)</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        className="w-full h-12 px-4 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all font-medium text-slate-800 placeholder-slate-400"
                                        placeholder="เขียนแคปชั่นเท่ๆ หรือเลือกคำคม..."
                                    />
                                    <button
                                        onClick={() => setShowQuoteDrawer(!showQuoteDrawer)}
                                        className={`h-12 w-12 flex items-center justify-center rounded-lg border border-slate-200 transition-all ${showQuoteDrawer ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white text-slate-400 hover:text-indigo-500 hover:border-indigo-200'}`}
                                        title="เลือกคำคม"
                                    >
                                        <Lightbulb size={20} />
                                    </button>
                                </div>

                                {/* Hidden Quote Drawer */}
                                <div className={`absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden transition-all duration-300 origin-top ${showQuoteDrawer ? 'opacity-100 scale-y-100 max-h-[400px]' : 'opacity-0 scale-y-95 max-h-0 pointer-events-none'}`}>
                                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-2 overflow-x-auto no-scrollbar">
                                        <button onClick={() => setQuoteCategory('healing')} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${quoteCategory === 'healing' ? 'bg-rose-100 text-rose-600' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>❤️ ฮีลใจ</button>
                                        <button onClick={() => setQuoteCategory('passion')} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${quoteCategory === 'passion' ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>🔥 ปลุกไฟ</button>
                                        <button onClick={() => setQuoteCategory('growth')} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${quoteCategory === 'growth' ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>🌟 Growth Mindset</button>
                                    </div>
                                    <div className="p-2 max-h-[250px] overflow-y-auto">
                                        {QUOTES[quoteCategory].map((q, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setCaption(q);
                                                    setShowQuoteDrawer(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-lg text-slate-700 text-sm font-medium transition-colors border-b border-slate-50 last:border-0"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full sm:w-auto px-8 h-12 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 active:bg-slate-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap shadow-sm"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />
                                        บันทึก
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area: 2-Column Layout */}
                    <div className="flex flex-col lg:flex-row gap-6 items-start">

                        {/* LEFT COLUMN: Preview & Upload (Sticky on Desktop) */}
                        <div className="w-full lg:w-80 flex flex-col gap-6 lg:sticky lg:top-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
                                <span className="text-xl">📸</span> รูปโปรไฟล์
                            </h2>

                            {/* Center Preview */}
                            <div className="relative group mx-auto">
                                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border border-slate-200 shadow-sm bg-slate-50 transition-transform duration-500 hover:scale-105">
                                    {avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={avatar} alt="Profile Preview" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <User size={64} />
                                        </div>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                                            <Loader2 className="w-10 h-10 animate-spin text-white" />
                                        </div>
                                    )}
                                </div>
                                {/* Edit Badge overlay */}
                                <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-slate-800 text-white p-2 rounded-full shadow-md hover:bg-black transition cursor-pointer border border-white" onClick={() => fileInputRef.current?.click()}>
                                    <Camera size={16} />
                                </div>
                            </div>

                            {/* Upload Button */}
                            <div className="relative">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="mx-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                                >
                                    <Camera className="w-4 h-4" />
                                    <span>อัปโหลด</span>
                                </button>
                            </div>

                            {/* Parent Dashboard Link */}
                            {user && (
                                <Link
                                    href={`/parent-dashboard/${user.uid}`}
                                    className="mt-4 w-full px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-indigo-100 hover:border-indigo-200"
                                >
                                    <span className="text-lg">📊</span>
                                    <span>ติดตามผลการเรียน (สำหรับผู้ปกครอง)</span>
                                </Link>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Selection Grid */}
                        <div className="flex-1 w-full bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-slate-200">
                            <div className="flex flex-col items-center gap-6 mb-8">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <span className="text-xl">🎭</span> เลือกรูปประจำตัว
                                </h2>

                                {/* Tabs - Pill Style (Notion-like) */}
                                <div className="flex flex-wrap justify-center gap-2">
                                    {TABS.map((tab) => (
                                        <button
                                            key={tab.id}
                                            /* @ts-ignore */
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id
                                                ? 'bg-slate-800 text-white shadow-sm'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Grid - Sticker Shop Style */}
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                {avatarAssets[activeTab].map((src, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setAvatar(src)}
                                        className={`group relative p-2 rounded-xl transition-all duration-200 border ${avatar === src
                                            ? "bg-slate-50 border-slate-400 ring-1 ring-slate-400"
                                            : "bg-white border-transparent hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm"
                                            }`}
                                    >
                                        <div className="aspect-square w-full flex items-center justify-center min-w-[80px]">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={src}
                                                alt={`Avatar ${index + 1}`}
                                                className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        </div>

                                        {avatar === src && (
                                            <div className="absolute top-2 right-2">
                                                <div className="bg-slate-800 text-white p-1 rounded-full shadow-sm animate-in zoom-in">
                                                    <Check className="w-2.5 h-2.5" />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
