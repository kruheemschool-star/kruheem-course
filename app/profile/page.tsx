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
import { ArrowLeft, Camera, Loader2, Save, User } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

// Reliable Twemoji CDN for Animals
const ANIMAL_URLS = [
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f436.svg", // Dog
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f431.svg", // Cat
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f430.svg", // Rabbit
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f439.svg", // Hamster
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f424.svg", // Chick
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f438.svg", // Frog
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f414.svg", // Chicken
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f986.svg", // Duck
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f985.svg", // Eagle
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f989.svg", // Owl
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f984.svg", // Unicorn
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f41d.svg", // Bee
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f41b.svg", // Bug
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f98b.svg", // Butterfly
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f40c.svg", // Snail
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f41e.svg", // Ladybug
];

const AVATAR_COLLECTIONS = {
    boys: [
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&top=shortHair&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Ryan&top=shortHairTheCaesar&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Jake&top=shortHairShortCurly&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Mason&top=shortHairShortFlat&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Liam&top=shortHairShortRound&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Noah&top=shortHairShortWaved&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&top=shortHairSides&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&top=shortHairTheCaesarSidePart&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=James&top=shortHairDreads01&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&top=shortHairFrizzle&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Henry&top=shortHairShaggyMullet&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&top=shortHair&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Seb&top=shortHairTheCaesar&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Jacky&top=shortHairShortCurly&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Owen&top=shortHairShortFlat&facialHairProbability=0",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Theo&top=shortHairShortRound&facialHairProbability=0",
    ],
    girls: [
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Sophia",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Amelia",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Isabella",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Mia",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Charlotte",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Ava",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Harper",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Evelyn",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Abigail",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Emily",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Ella",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Elizabeth",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Camila",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Luna",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Sofia",
        "https://api.dicebear.com/9.x/avataaars/svg?seed=Avery",
    ],
    animals: ANIMAL_URLS,
    monsters: [
        "https://robohash.org/monst1?set=set2",
        "https://robohash.org/monst2?set=set2",
        "https://robohash.org/monst3?set=set2",
        "https://robohash.org/monst4?set=set2",
        "https://robohash.org/monst5?set=set2",
        "https://robohash.org/monst6?set=set2",
        "https://robohash.org/monst7?set=set2",
        "https://robohash.org/monst8?set=set2",
        "https://robohash.org/monst9?set=set2",
        "https://robohash.org/monst10?set=set2",
        "https://robohash.org/monst11?set=set2",
        "https://robohash.org/monst12?set=set2",
        "https://robohash.org/monst13?set=set2",
        "https://robohash.org/monst14?set=set2",
        "https://robohash.org/monst15?set=set2",
        "https://robohash.org/monst16?set=set2",
    ]
};

const TABS = [
    { id: 'boys', label: '👦 ผู้ชาย' },
    { id: 'girls', label: '👧 ผู้หญิง' },
    { id: 'animals', label: '🐱 สัตว์เลี้ยง' },
    { id: 'monsters', label: '👾 สัตว์ประหลาด' },
];

export default function ProfilePage() {
    const { user, userProfile } = useUserAuth();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'boys' | 'girls' | 'animals' | 'monsters'>('boys');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load initial data
    useEffect(() => {
        if (userProfile || user) {
            const displayName = userProfile?.displayName || user?.displayName || "";
            // Simple split logic (can be refined)
            const parts = displayName.split(" ");
            if (parts.length > 0) setFirstName(parts[0]);
            if (parts.length > 1) setLastName(parts.slice(1).join(" "));

            // Set default avatar if none exists
            setAvatar(userProfile?.photoURL || user?.photoURL || AVATAR_COLLECTIONS.boys[0]);
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
            await setDoc(userRef, {
                displayName: fullName,
                avatar: avatar, // FIX: Navbar checks 'avatar', not 'photoURL' from Firestore
                photoURL: avatar, // Keep for compatibility
                updatedAt: new Date()
            }, { merge: true });

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

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                    <h1 className="text-2xl font-bold text-slate-800 mb-8 border-b pb-4 border-slate-100">
                        แก้ไขข้อมูลส่วนตัว
                    </h1>

                    {/* Avatar Section */}
                    <div className="mb-10">
                        <label className="block text-sm font-bold text-slate-700 mb-4">รูปโปรไฟล์</label>

                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            {/* Current Avatar + Upload */}
                            <div className="flex flex-col items-center gap-3 shrink-0 mx-auto lg:mx-0">
                                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner relative group bg-slate-50">
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
                                    className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-full transition flex items-center gap-2 border border-indigo-100"
                                >
                                    <Camera size={16} /> อัปโหลดรูปเอง
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                            </div>

                            {/* Avatar Selector */}
                            <div className="flex-1 w-full">
                                <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-100 pb-2">
                                    {TABS.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeTab === tab.id
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                                : 'bg-white text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
                                    {AVATAR_COLLECTIONS[activeTab].map((src, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setAvatar(src)}
                                            className={`aspect-square rounded-2xl overflow-hidden border-4 transition bg-slate-50 hover:-translate-y-1 ${avatar === src ? "border-indigo-600 ring-2 ring-indigo-200" : "border-transparent hover:border-slate-200"
                                                }`}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={src} alt="Avatar Preset" className="w-full h-full object-cover" />
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
