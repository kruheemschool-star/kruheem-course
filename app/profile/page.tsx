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
    monster: Array.from({ length: 12 }, (_, i) => `/avatars/monster/monster_${i + 1}.png`),
};

const TABS = [
    { id: 'male', label: '👦 ผู้ชาย' },
    { id: 'female', label: '👧 ผู้หญิง' },
    { id: 'animal', label: '🦁 สัตว์เลี้ยง' },
    { id: 'monster', label: '👾 สัตว์ประหลาด' },
];

export default function ProfilePage() {
    const { user, userProfile, setUserProfile } = useUserAuth();
    const [firstName, setFirstName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'male' | 'female' | 'animal' | 'monster'>('male');
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

            <main className="container mx-auto px-4 py-8 pt-24 max-w-3xl">

                {/* Back Button */}
                <Link href="/my-courses" className="inline-flex items-center text-slate-500 hover:text-indigo-600 mb-6 transition">
                    <ArrowLeft size={20} className="mr-1" />
                    กลับไปหน้าคอร์สเรียน
                </Link>

                <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8 min-h-screen pb-24 font-['Sarabun']">
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
                        <div className="w-full lg:w-80 flex flex-col gap-6 lg:sticky lg:top-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-xl">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="text-2xl">📸</span> รูปโปรไฟล์
                            </h2>

                            {/* Large Preview */}
                            <div className="relative group mx-auto">
                                <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden border-8 border-white dark:border-slate-700 shadow-2xl bg-slate-50 dark:bg-slate-900 transition-transform duration-500 hover:scale-105">
                                    {avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={avatar} alt="Profile Preview" className="w-full h-full object-cover" />
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
                                <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg border-4 border-white dark:border-slate-800">
                                    <Camera size={20} />
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
                                    className="w-full py-4 bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-2xl font-bold border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all flex items-center justify-center gap-2 group"
                                >
                                    <Camera className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    <span>อัปโหลดรูปของคุณเอง</span>
                                </button>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Selection Grid */}
                        <div className="flex-1 w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-xl border border-white/50 dark:border-slate-700/50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="text-2xl">🎭</span> เลือกตัวละคร
                                </h2>

                                {/* Tabs */}
                                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-full overflow-x-auto scrollbar-hide">
                                    {TABS.map((tab) => (
                                        <button
                                            key={tab.id}
                                            /* @ts-ignore */
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm transform scale-105'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {avatarAssets[activeTab].map((src, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setAvatar(src)}
                                        className={`group relative aspect-square rounded-3xl transition-all duration-300 ${avatar === src
                                            ? "bg-indigo-50 dark:bg-indigo-900/30 ring-4 ring-indigo-200 dark:ring-indigo-500 scale-105 shadow-xl z-10"
                                            : "bg-white dark:bg-slate-700 hover:scale-105 hover:shadow-xl hover:z-10 hover:-translate-y-1"
                                            }`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={src}
                                            alt={`Avatar ${index + 1}`}
                                            className="w-full h-full object-contain p-2 drop-shadow-sm group-hover:drop-shadow-lg transition-all"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.style.backgroundColor = '#f1f5f9';
                                            }}
                                        />

                                        {avatar === src && (
                                            <div className="absolute top-2 right-2">
                                                <div className="bg-indigo-600 text-white p-1.5 rounded-full shadow-lg transform scale-100 animate-in zoom-in">
                                                    <Check className="w-3 h-3" />
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
