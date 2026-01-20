"use client";

import { useState, useEffect, useRef } from "react";
import { useUserAuth } from "@/context/AuthContext"; // Confirm path
import { db, storage } from "@/lib/firebase"; // Confirm path matches lib/firebase.js
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowLeft, Camera, Loader2, Save, User } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast'; // Optional: Use default alert if no toast library

// Default Avatar Presets (DiceBear)
const AVATAR_PRESETS = [
    "https://api.dicebear.com/7.x/notionists/svg?seed=Felix",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Zack",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Midnight",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Shadow",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Sky",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Lilac",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Sunset",
];

export default function ProfilePage() {
    const { user, userProfile } = useUserAuth();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load initial data
    useEffect(() => {
        if (userProfile || user) {
            const displayName = userProfile?.displayName || user?.displayName || "";
            // Simple split logic (can be refined)
            const parts = displayName.split(" ");
            if (parts.length > 0) setFirstName(parts[0]);
            if (parts.length > 1) setLastName(parts.slice(1).join(" "));

            setAvatar(userProfile?.photoURL || user?.photoURL || AVATAR_PRESETS[0]);
        }
    }, [user, userProfile]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const fullName = `${firstName.trim()} ${lastName.trim()}`;

            // 1. Update Auth Profile
            await updateProfile(user, {
                displayName: fullName,
                photoURL: avatar
            });

            // 2. Update Firestore User Document
            const userRef = doc(db, "users", user.uid);
            // Merge true to avoid overwriting other fields like role/email
            await setDoc(userRef, {
                displayName: fullName,
                photoURL: avatar,
                updatedAt: new Date()
            }, { merge: true });

            alert("บันทึกข้อมูลสำเร็จ!"); // Simple alert for now
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        try {
            // Create a reference
            const fileRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);

            // Upload
            await uploadBytes(fileRef, file);

            // Get URL
            const url = await getDownloadURL(fileRef);
            setAvatar(url);

        } catch (error) {
            console.error("Upload error:", error);
            alert("อัปโหลดรูปภาพไม่สำเร็จ");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            <Navbar />

            <main className="container mx-auto px-4 py-8 pt-24 max-w-2xl">

                {/* Back Button */}
                <Link href="/my-courses" className="inline-flex items-center text-slate-500 hover:text-indigo-600 mb-6 transition">
                    <ArrowLeft size={20} className="mr-1" />
                    กลับไปหน้าคอร์สเรียน
                </Link>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                    <h1 className="text-2xl font-bold text-slate-800 mb-8 border-b pb-4 border-slate-100">
                        แก้ไขข้อมูลส่วนตัว
                    </h1>

                    {/* Avatar Section */}
                    <div className="mb-10">
                        <label className="block text-sm font-bold text-slate-700 mb-4">รูปโปรไฟล์</label>

                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Current Avatar + Upload */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner relative group">
                                    {avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                            <User size={48} />
                                        </div>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 className="animate-spin text-white" />
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-full transition flex items-center gap-1"
                                >
                                    <Camera size={14} /> อัปโหลดรูปเอง
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                            </div>

                            {/* Presets Grid */}
                            <div className="flex-1">
                                <p className="text-xs text-slate-400 mb-3">เลือกจากรูปที่เตรียมให้</p>
                                <div className="grid grid-cols-4 gap-3">
                                    {AVATAR_PRESETS.map((src, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setAvatar(src)}
                                            className={`aspect-square rounded-xl overflow-hidden border-2 transition hover:scale-105 ${avatar === src ? "border-indigo-600 ring-2 ring-indigo-100" : "border-transparent hover:border-slate-200"
                                                }`}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={src} alt={`Preset ${index}`} className="w-full h-full object-cover bg-slate-50" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Name Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อจริง</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition bg-slate-50 focus:bg-white"
                                placeholder="เช่น สมชาย"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">นามสกุล</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition bg-slate-50 focus:bg-white"
                                placeholder="เช่น รักเรียน"
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-6 border-t border-slate-100">
                        <button
                            onClick={handleSave}
                            disabled={loading || uploading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            บันทึกการเปลี่ยนแปลง
                        </button>
                    </div>

                </div>
            </main>
            <Footer />
        </div>
    );
}
