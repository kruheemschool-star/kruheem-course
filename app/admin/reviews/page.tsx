"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { uploadImageToStorage } from "@/lib/upload";
import AdminGuard from "@/components/AdminGuard";
import ReviewList from "@/app/reviews/ReviewList";
import Link from "next/link";
import { ArrowLeft, Star, Plus, ChevronDown, ChevronUp, Loader2, ImagePlus, X } from "lucide-react";

// Profile avatar images from user profile system
const PROFILE_AVATARS = {
    kids: Array.from({ length: 8 }, (_, i) => `/avatars/kids/kid_${i + 1}.png`),
    female: Array.from({ length: 8 }, (_, i) => `/avatars/female/girl_${i + 1}.png`),
    animals: Array.from({ length: 8 }, (_, i) => `/avatars/animals/animal_${i + 1}.png`),
    monsters: Array.from({ length: 8 }, (_, i) => `/avatars/monsters/monster_${i + 1}.png`),
};

// Letter avatars A-Z (for fallback when user doesn't set avatar)
const LETTER_AVATARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const EMOJI_AVATARS = [
    "😊", "😎", "🤓", "😇", "🥰", "😃", "🤗", "😄",
    "👦", "👧", "👨", "👩", "🧑", "👶", "🧒", "👱",
    "🐱", "🐶", "🦊", "🐻", "🐼", "🐨", "🦁", "🐯",
    "⭐", "🌟", "💫", "✨", "🎯", "🎓", "📚", "🏆",
];

interface CourseOption {
    id: string;
    title: string;
    category?: string;
}

export default function AdminReviewsPage() {
    // Form states
    const [showForm, setShowForm] = useState(false);
    const [userName, setUserName] = useState("");
    const [avatarType, setAvatarType] = useState<"emoji" | "url" | "upload">("emoji");
    const [avatarSubTab, setAvatarSubTab] = useState<"emoji" | "kids" | "female" | "animals" | "monsters" | "letters">("emoji");
    const [selectedEmoji, setSelectedEmoji] = useState("😊");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    // Editing states
    const [editId, setEditId] = useState<string | null>(null);

    // Fetch courses for selector
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);
                const courseList = snap.docs.map(d => ({
                    id: d.id,
                    title: d.data().title,
                    category: d.data().category,
                }));
                setCourses(courseList);
            } catch (err) {
                console.error("Error fetching courses:", err);
            }
        };
        fetchCourses();
    }, []);

    const showToastMsg = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const resetForm = () => {
        setUserName("");
        setSelectedEmoji("😊");
        setAvatarUrl("");
        setAvatarFile(null);
        setAvatarPreview("");
        setAvatarType("emoji");
        setRating(5);
        setComment("");
        setSelectedCourseId("");
        setEditId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userName.trim()) return showToastMsg("กรุณากรอกชื่อผู้รีวิว", "error");
        if (!comment.trim()) return showToastMsg("กรุณากรอกข้อความรีวิว", "error");
        if (rating === 0) return showToastMsg("กรุณาให้คะแนนดาว", "error");

        setIsSubmitting(true);

        try {
            // Determine avatar value
            let userPhoto = "";
            if (avatarType === "emoji") {
                userPhoto = selectedEmoji;
            } else if (avatarType === "url" && avatarUrl.trim()) {
                userPhoto = avatarUrl.trim();
            } else if (avatarType === "upload" && avatarFile) {
                userPhoto = await uploadImageToStorage(avatarFile, `review-avatars/${Date.now()}_${avatarFile.name}`);
            }

            // Get course name
            const selectedCourse = courses.find(c => c.id === selectedCourseId);

            // Create review document
            await addDoc(collection(db, "reviews"), {
                userName: userName.trim(),
                userPhoto: userPhoto,
                rating: rating,
                comment: comment.trim(),
                createdAt: serverTimestamp(),
                courseId: selectedCourseId || null,
                courseName: selectedCourse?.title || null,
                source: "admin",
                isHidden: false,
            });

            showToastMsg("✅ สร้างรีวิวสำเร็จ!");
            resetForm();
            setShowForm(false);
        } catch (error) {
            console.error("Error creating review:", error);
            showToastMsg("เกิดข้อผิดพลาด กรุณาลองใหม่", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AdminGuard>
            <div className="min-h-screen bg-[#F0F7F4] font-sans pb-20">
                {/* Toast */}
                {toast && (
                    <div className={`fixed top-4 right-4 z-[200] px-5 py-3 rounded-2xl shadow-lg font-bold text-sm animate-in slide-in-from-right fade-in duration-300 ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                        {toast.msg}
                    </div>
                )}

                {/* Header */}
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-white/20 px-6 py-4 shadow-sm">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin" className="p-2 rounded-full hover:bg-slate-100 transition text-slate-500">
                                <ArrowLeft size={24} />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    ⭐ จัดการรีวิว
                                </h1>
                                <p className="text-xs text-slate-500">สร้าง ซ่อน หรือ ลบ รีวิว</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition ${showForm
                                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                : "bg-teal-500 text-white hover:bg-teal-600"
                                }`}
                        >
                            {showForm ? <ChevronUp size={18} /> : <Plus size={18} />}
                            {showForm ? "ปิดฟอร์ม" : "สร้างรีวิวใหม่"}
                        </button>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto p-6 md:p-10">
                    {/* Create Review Form */}
                    {showForm && (
                        <div className="mb-8 bg-white rounded-3xl shadow-sm border border-teal-200 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    ✍️ สร้างรีวิวใหม่
                                </h2>
                                <p className="text-teal-100 text-xs">รีวิวที่สร้างจะแสดงในหน้ารีวิวหน้าบ้านทันที</p>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Row 1: Name + Course */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600">ชื่อผู้รีวิว <span className="text-rose-400">*</span></label>
                                        <input
                                            type="text"
                                            value={userName}
                                            onChange={(e) => setUserName(e.target.value)}
                                            placeholder="เช่น น้องมิน, คุณแม่น้องปลื้ม"
                                            className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-teal-400 focus:bg-white outline-none transition font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600">คอร์สเรียน</label>
                                        <select
                                            value={selectedCourseId}
                                            onChange={(e) => setSelectedCourseId(e.target.value)}
                                            className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-teal-400 focus:bg-white outline-none transition font-medium"
                                        >
                                            <option value="">-- ไม่ระบุคอร์ส --</option>
                                            {courses.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.title} {c.category ? `(${c.category})` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Avatar Selection */}
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-600">รูปอวตาร</label>

                                    {/* Avatar Type Tabs */}
                                    <div className="flex gap-2">
                                        {[
                                            { key: "emoji" as const, label: "😊 อิโมจิ" },
                                            { key: "url" as const, label: "🔗 URL รูปภาพ" },
                                            { key: "upload" as const, label: "📤 อัปโหลด" },
                                        ].map(tab => (
                                            <button
                                                key={tab.key}
                                                type="button"
                                                onClick={() => setAvatarType(tab.key)}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${avatarType === tab.key
                                                    ? "bg-teal-500 text-white shadow-sm"
                                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                    }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Emoji/Avatar Grid */}
                                    {avatarType === "emoji" && (
                                        <div className="space-y-3">
                                            {/* Sub-tabs for emoji categories */}
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() => setAvatarSubTab("emoji")}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${avatarSubTab === "emoji"
                                                        ? "bg-teal-100 text-teal-600"
                                                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                                        }`}
                                                >
                                                    😊 อิโมจิ
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAvatarSubTab("kids")}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${avatarSubTab === "kids"
                                                        ? "bg-teal-100 text-teal-600"
                                                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                                        }`}
                                                >
                                                    👦 ผู้ชาย
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAvatarSubTab("female")}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${avatarSubTab === "female"
                                                        ? "bg-teal-100 text-teal-600"
                                                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                                        }`}
                                                >
                                                    👧 ผู้หญิง
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAvatarSubTab("animals")}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${avatarSubTab === "animals"
                                                        ? "bg-teal-100 text-teal-600"
                                                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                                        }`}
                                                >
                                                    🐱 สัตว์
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAvatarSubTab("monsters")}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${avatarSubTab === "monsters"
                                                        ? "bg-teal-100 text-teal-600"
                                                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                                        }`}
                                                >
                                                    👾 มอนสเตอร์
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAvatarSubTab("letters")}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${avatarSubTab === "letters"
                                                        ? "bg-teal-100 text-teal-600"
                                                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                                        }`}
                                                >
                                                    🔤 A-Z
                                                </button>
                                            </div>

                                            {/* Emoji Grid */}
                                            {avatarSubTab === "emoji" && (
                                                <div className="flex flex-wrap gap-2">
                                                    {EMOJI_AVATARS.map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            type="button"
                                                            onClick={() => setSelectedEmoji(emoji)}
                                                            className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition border-2 ${selectedEmoji === emoji
                                                                ? "border-teal-400 bg-teal-50 scale-110 shadow-sm"
                                                                : "border-slate-100 bg-white hover:border-slate-300"
                                                                }`}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Profile Avatar Grids */}
                                            {(avatarSubTab === "kids" || avatarSubTab === "female" || avatarSubTab === "animals" || avatarSubTab === "monsters") && (
                                                <div className="flex flex-wrap gap-2">
                                                    {PROFILE_AVATARS[avatarSubTab as keyof typeof PROFILE_AVATARS].map((avatarPath: string) => (
                                                        <button
                                                            key={avatarPath}
                                                            type="button"
                                                            onClick={() => setSelectedEmoji(avatarPath)}
                                                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition border-2 overflow-hidden ${selectedEmoji === avatarPath
                                                                ? "border-teal-400 bg-teal-50 scale-110 shadow-sm"
                                                                : "border-slate-100 bg-white hover:border-slate-300"
                                                                }`}
                                                        >
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={avatarPath} alt="" className="w-full h-full object-cover" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Letter Avatars A-Z */}
                                            {avatarSubTab === "letters" && (
                                                <div className="flex flex-wrap gap-2">
                                                    {LETTER_AVATARS.map(letter => (
                                                        <button
                                                            key={letter}
                                                            type="button"
                                                            onClick={() => setSelectedEmoji(letter)}
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition border-2 font-bold text-base ${selectedEmoji === letter
                                                                ? "border-teal-400 bg-gradient-to-br from-teal-400 to-emerald-500 text-white scale-110 shadow-sm"
                                                                : "border-slate-100 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 hover:border-slate-300"
                                                                }`}
                                                        >
                                                            {letter}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* URL Input */}
                                    {avatarType === "url" && (
                                        <div className="flex gap-3 items-center">
                                            <input
                                                type="url"
                                                value={avatarUrl}
                                                onChange={(e) => setAvatarUrl(e.target.value)}
                                                placeholder="https://example.com/avatar.jpg"
                                                className="flex-1 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-teal-400 focus:bg-white outline-none transition font-medium text-sm"
                                            />
                                            {avatarUrl && (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src={avatarUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            )}
                                        </div>
                                    )}

                                    {/* File Upload */}
                                    {avatarType === "upload" && (
                                        <div className="flex gap-3 items-center">
                                            <label className="flex-1 p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 transition flex items-center justify-center gap-2 text-slate-500 font-medium text-sm">
                                                <ImagePlus size={18} />
                                                {avatarFile ? avatarFile.name : "คลิกเพื่อเลือกรูปอวตาร"}
                                                <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
                                            </label>
                                            {avatarPreview && (
                                                <div className="relative">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={avatarPreview} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-slate-200" />
                                                    <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(""); }} className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Rating */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600">คะแนนดาว <span className="text-rose-400">*</span></label>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className="p-1 transition hover:scale-125"
                                            >
                                                <Star
                                                    size={28}
                                                    className={star <= (hoverRating || rating) ? "text-amber-400" : "text-slate-200"}
                                                    fill={star <= (hoverRating || rating) ? "currentColor" : "none"}
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-2 text-sm font-bold text-slate-500 self-center">{rating}/5</span>
                                    </div>
                                </div>

                                {/* Comment */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600">ข้อความรีวิว <span className="text-rose-400">*</span></label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder='เช่น "เรียนแล้วเข้าใจพื้นฐานเลขได้มากขึ้นครับ กลับมาทบทวนได้อีก ครูอธิบายเข้าใจง่ายมาก ผมชอบเรียนกับครูฮีมครับ"'
                                        rows={4}
                                        className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-teal-400 focus:bg-white outline-none transition font-medium resize-none"
                                    />
                                    <p className="text-xs text-slate-400">{comment.length} ตัวอักษร</p>
                                </div>

                                {/* Preview */}
                                {(userName || comment) && (
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                        <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">ตัวอย่างรีวิว</p>
                                        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center shrink-0 bg-gradient-to-br from-teal-400 to-emerald-500">
                                                    {avatarType === "emoji" ? (
                                                        <span className="text-xl">{selectedEmoji}</span>
                                                    ) : (avatarType === "url" && avatarUrl) ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : avatarPreview ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-white font-bold text-sm">{userName?.[0]?.toUpperCase() || "?"}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{userName || "ชื่อผู้รีวิว"}</h4>
                                                    <span className="text-[11px] text-slate-400">เพิ่งรีวิว</span>
                                                </div>
                                            </div>
                                            {selectedCourseId && (
                                                <div className="mb-2 inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                                                    📚 {courses.find(c => c.id === selectedCourseId)?.title}
                                                </div>
                                            )}
                                            <div className="flex gap-0.5 mb-2">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} size={14} className={s <= rating ? "text-amber-400" : "text-slate-200"} fill={s <= rating ? "currentColor" : "none"} />
                                                ))}
                                            </div>
                                            <p className="text-slate-600 text-sm leading-relaxed">&quot;{comment || "ข้อความรีวิว..."}&quot;</p>
                                        </div>
                                    </div>
                                )}

                                {/* Submit */}
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-bold text-base hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 size={18} className="animate-spin" /> กำลังบันทึก...</>
                                        ) : (
                                            <><Plus size={18} /> สร้างรีวิว</>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { resetForm(); setShowForm(false); }}
                                        className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition"
                                    >
                                        ยกเลิก
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="mb-8 p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-700 mb-2">คำแนะนำ</h2>
                        <ul className="list-disc list-inside text-sm text-slate-500 space-y-1">
                            <li>กดปุ่ม <span className="inline-flex items-center gap-1 bg-teal-100 px-2 py-0.5 rounded text-xs font-bold text-teal-600">+ สร้างรีวิวใหม่</span> เพื่อสร้างรีวิวจากระบบ Admin</li>
                            <li>กดที่ปุ่ม <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-600">👁️ ซ่อน</span> เพื่อซ่อนรีวิวไม่ให้ผู้ใช้อื่นเห็น (แต่ยังเก็บไว้ในระบบ)</li>
                            <li>กดที่ปุ่ม <span className="inline-flex items-center gap-1 bg-rose-100 px-2 py-0.5 rounded text-xs font-bold text-rose-600">🗑️ ลบ</span> เพื่อลบรีวิวถาวร (กู้คืนไม่ได้)</li>
                            <li>รีวิวที่ถูกซ่อน จะมีป้ายกำกับ &quot;ซ่อนอยู่&quot; แสดงให้แอดมินเห็น</li>
                        </ul>
                    </div>

                    <ReviewList adminView={true} />
                </main>
            </div>
        </AdminGuard>
    );
}
