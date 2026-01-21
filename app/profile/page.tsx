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
import { User, Camera, Save, Loader2, Check, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Reliable Twemoji CDN for Animals
// Local Avatar Assets
const avatarAssets = {
    male: Array.from({ length: 20 }, (_, i) => `/avatars/male/boy_${i + 1}.png`),
    female: Array.from({ length: 20 }, (_, i) => `/avatars/female/girl_${i + 1}.png`),
    animal: Array.from({ length: 20 }, (_, i) => `/avatars/animals/animal_${i + 1}.svg`),
};

const TABS = [
    { id: 'male', label: '👦 ผู้ชาย' },
    { id: 'female', label: '👧 ผู้หญิง' },
    { id: 'animal', label: '🦁 สัตว์เลี้ยง' },
];

export default function ProfilePage() {
    const { user, userProfile, setUserProfile } = useUserAuth();
    const [firstName, setFirstName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'male' | 'female' | 'animal'>('male');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load initial data
    useEffect(() => {
        if (userProfile || user) {
            const displayName = userProfile?.displayName || user?.displayName || "";
            if (displayName) setFirstName(displayName);

            // Set default avatar if none exists
            setAvatar(userProfile?.avatar || user?.photoURL || avatarAssets.male[0]);
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
                avatar: avatar,
                photoURL: avatar,
                updatedAt: new Date()
            };

            await setDoc(userRef, userUpdateData, { merge: true });

            // 3. IMMEDIATE UPDATE: Force global context to update for Navbar/Header
            setUserProfile({
                ...userProfile,
                displayName: fullName,
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

                <div className="mx-auto p-4 sm:p-6 space-y-8 min-h-screen pb-24 font-['Sarabun']">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        แก้ไขข้อมูลส่วนตัว
                    </h1>

                    {/* Top Section: Name Input & Save Button */}
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-xl border border-white/50 dark:border-slate-700/50">
                        <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    ชื่อแสดงผล (Display Name)
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-lg"
                                    placeholder="กรอกชื่อของคุณ"
                                />
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed h-[52px] flex items-center justify-center whitespace-nowrap"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />
                                        บันทึกการเปลี่ยนแปลง
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area: 2-Column Layout */}
                    <div className="flex flex-col lg:flex-row gap-8 items-start">

                        {/* LEFT COLUMN: Preview & Upload (Sticky on Desktop) */}
                        <div className="w-full lg:w-80 flex flex-col gap-6 lg:sticky lg:top-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-xl text-center">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center justify-center gap-2">
                                <span className="text-2xl">📸</span> รูปโปรไฟล์
                            </h2>

                            {/* Center Preview */}
                            <div className="relative group mx-auto">
                                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-xl bg-slate-50 dark:bg-slate-900 transition-transform duration-500 hover:scale-105">
                                    {avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={avatar} alt="Profile Preview" className="w-full h-full object-contain p-2 bg-white dark:bg-slate-800" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
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
                                <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-slate-800 hover:bg-indigo-700 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
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
                                    className="mx-auto px-6 py-3 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-600"
                                >
                                    <Camera className="w-4 h-4" />
                                    <span>อัปโหลดรูปเอง</span>
                                </button>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Selection Grid */}
                        <div className="flex-1 w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-xl border border-white/50 dark:border-slate-700/50">
                            <div className="flex flex-col items-center gap-6 mb-8">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="text-2xl">🎭</span> เลือกรูปประจำตัว
                                </h2>

                                {/* Tabs - Pill Style */}
                                <div className="flex flex-wrap justify-center gap-3">
                                    {TABS.map((tab) => (
                                        <button
                                            key={tab.id}
                                            /* @ts-ignore */
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`px-6 py-3 rounded-full font-bold text-base transition-all shadow-sm hover:scale-105 active:scale-95 ${activeTab === tab.id
                                                ? 'bg-indigo-600 text-white shadow-indigo-200'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
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
                                        className={`group relative p-2 rounded-2xl transition-all duration-300 border-2 ${avatar === src
                                            ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-md scale-105"
                                            : "bg-white dark:bg-slate-700 border-transparent hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1"
                                            }`}
                                    >
                                        <div className="aspect-square w-full flex items-center justify-center min-w-[80px]">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={src}
                                                alt={`Avatar ${index + 1}`}
                                                className="w-full h-full object-contain filter drop-shadow-sm group-hover:drop-shadow-md transition-all"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        </div>

                                        {avatar === src && (
                                            <div className="absolute top-2 right-2">
                                                <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg animate-in zoom-in">
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
