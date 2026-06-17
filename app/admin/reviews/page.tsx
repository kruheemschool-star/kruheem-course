"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { uploadImageToStorage } from "@/lib/upload";
import { STATIC_AVATARS } from "@/lib/staticAssets";
import ReviewList from "@/app/reviews/ReviewList";
import { Star, Plus, ChevronUp, Loader2, ImagePlus, X, MessageSquareQuote, BookOpen, ShieldCheck, Info } from "lucide-react";

// Profile avatar images served from Firebase Storage (see lib/staticAssets.ts)
const PROFILE_AVATARS = {
    kids: STATIC_AVATARS.kids,
    female: STATIC_AVATARS.female,
    animals: STATIC_AVATARS.animals,
    monsters: STATIC_AVATARS.monsters,
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
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div
                    className="fixed top-4 right-4 z-[200] px-5 py-3 rounded-2xl shadow-lg font-bold text-sm animate-in slide-in-from-right fade-in duration-300 text-white"
                    style={{ background: toast.type === "success" ? "var(--good)" : "var(--danger)" }}
                >
                    {toast.msg}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="kh-eyebrow"><MessageSquareQuote size={15} strokeWidth={1.9} /> จัดการรีวิว</div>
                <button
                    onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
                    className={showForm ? "kh-btn-ghost" : "kh-btn"}
                >
                    {showForm ? <ChevronUp size={15} strokeWidth={2.1} /> : <Plus size={15} strokeWidth={2.1} />}
                    {showForm ? "ปิดฟอร์ม" : "สร้างรีวิวใหม่"}
                </button>
            </div>

            {/* Stats Cards (derived from data available on this page) */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <div className="kh-card p-4 flex items-center justify-between gap-3">
                    <div>
                        <div className="kh-num text-[26px] font-semibold leading-none" style={{ color: "var(--accent)" }}>{courses.length}</div>
                        <div className="text-xs font-medium kh-ink3 mt-1.5">คอร์สที่ผูกรีวิวได้</div>
                    </div>
                    <BookOpen size={20} strokeWidth={1.7} style={{ color: "var(--accent)" }} />
                </div>
                <div className="kh-card p-4 flex items-center justify-between gap-3">
                    <div>
                        <div className="text-[26px] font-semibold leading-none kh-ink">Admin</div>
                        <div className="text-xs font-medium kh-ink3 mt-1.5">ช่องทางสร้างรีวิว</div>
                    </div>
                    <ShieldCheck size={20} strokeWidth={1.7} style={{ color: "var(--good)" }} />
                </div>
            </div>

            {/* Create Review Form */}
            {showForm && (
                        <div className="kh-card overflow-hidden animate-in slide-in-from-top-2 duration-300" style={{ borderColor: "var(--accent)" }}>
                            <div className="px-6 py-4" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-ink))" }}>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Plus size={18} strokeWidth={2.1} /> สร้างรีวิวใหม่
                                </h2>
                                <p className="text-white/80 text-xs">รีวิวที่สร้างจะแสดงในหน้ารีวิวหน้าบ้านทันที</p>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Row 1: Name + Course */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold kh-ink2">ชื่อผู้รีวิว <span style={{ color: "var(--danger)" }}>*</span></label>
                                        <input
                                            type="text"
                                            value={userName}
                                            onChange={(e) => setUserName(e.target.value)}
                                            placeholder="เช่น น้องมิน, คุณแม่น้องปลื้ม"
                                            className="kh-input"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold kh-ink2">คอร์สเรียน</label>
                                        <select
                                            value={selectedCourseId}
                                            onChange={(e) => setSelectedCourseId(e.target.value)}
                                            className="kh-select"
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
                                    <label className="text-sm font-bold kh-ink2">รูปอวตาร</label>

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
                                                className="kh-tab"
                                                data-active={avatarType === tab.key}
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
                                                    className="kh-tab"
                                                    data-active={avatarSubTab === "emoji"}
                                                >
                                                    😊 อิโมจิ
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAvatarSubTab("kids")}
                                                    className="kh-tab"
                                                    data-active={avatarSubTab === "kids"}
                                                >
                                                    👦 ผู้ชาย
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAvatarSubTab("female")}
                                                    className="kh-tab"
                                                    data-active={avatarSubTab === "female"}
                                                >
                                                    👧 ผู้หญิง
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAvatarSubTab("animals")}
                                                    className="kh-tab"
                                                    data-active={avatarSubTab === "animals"}
                                                >
                                                    🐱 สัตว์
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAvatarSubTab("monsters")}
                                                    className="kh-tab"
                                                    data-active={avatarSubTab === "monsters"}
                                                >
                                                    👾 มอนสเตอร์
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAvatarSubTab("letters")}
                                                    className="kh-tab"
                                                    data-active={avatarSubTab === "letters"}
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
                                                            className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition border-2 ${selectedEmoji === emoji ? "scale-110 shadow-sm" : ""}`}
                                                            style={{
                                                                borderColor: selectedEmoji === emoji ? "var(--accent-2)" : "var(--line)",
                                                                background: selectedEmoji === emoji ? "var(--accent-soft)" : "var(--card)",
                                                            }}
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
                                                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition border-2 overflow-hidden ${selectedEmoji === avatarPath ? "scale-110 shadow-sm" : ""}`}
                                                            style={{
                                                                borderColor: selectedEmoji === avatarPath ? "var(--accent-2)" : "var(--line)",
                                                                background: selectedEmoji === avatarPath ? "var(--accent-soft)" : "var(--card)",
                                                            }}
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
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition border-2 font-bold text-base ${selectedEmoji === letter ? "kh-avatar scale-110 shadow-sm" : "kh-ink2"}`}
                                                            style={{
                                                                borderColor: selectedEmoji === letter ? "var(--accent-2)" : "var(--line)",
                                                                background: selectedEmoji === letter ? undefined : "var(--card-2)",
                                                            }}
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
                                                className="kh-input flex-1"
                                            />
                                            {avatarUrl && (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src={avatarUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2" style={{ borderColor: "var(--line)" }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            )}
                                        </div>
                                    )}

                                    {/* File Upload */}
                                    {avatarType === "upload" && (
                                        <div className="flex gap-3 items-center">
                                            <label className="flex-1 p-3 border-2 border-dashed rounded-xl cursor-pointer transition flex items-center justify-center gap-2 kh-ink3 font-medium text-sm" style={{ background: "var(--card-2)", borderColor: "var(--line-2)" }}>
                                                <ImagePlus size={18} />
                                                {avatarFile ? avatarFile.name : "คลิกเพื่อเลือกรูปอวตาร"}
                                                <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
                                            </label>
                                            {avatarPreview && (
                                                <div className="relative">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={avatarPreview} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2" style={{ borderColor: "var(--line)" }} />
                                                    <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(""); }} className="absolute -top-1 -right-1 text-white rounded-full p-0.5" style={{ background: "var(--danger)" }}>
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Rating */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold kh-ink2">คะแนนดาว <span style={{ color: "var(--danger)" }}>*</span></label>
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
                                                    className={star <= (hoverRating || rating) ? "" : "kh-ink3"}
                                                    style={star <= (hoverRating || rating) ? { color: "#FBBF24" } : undefined}
                                                    fill={star <= (hoverRating || rating) ? "currentColor" : "none"}
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-2 text-sm font-bold kh-ink3 self-center kh-num">{rating}/5</span>
                                    </div>
                                </div>

                                {/* Comment */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold kh-ink2">ข้อความรีวิว <span style={{ color: "var(--danger)" }}>*</span></label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder='เช่น "เรียนแล้วเข้าใจพื้นฐานเลขได้มากขึ้นครับ กลับมาทบทวนได้อีก ครูอธิบายเข้าใจง่ายมาก ผมชอบเรียนกับครูฮีมครับ"'
                                        rows={4}
                                        className="kh-textarea resize-none"
                                    />
                                    <p className="text-xs kh-ink3 kh-num">{comment.length} ตัวอักษร</p>
                                </div>

                                {/* Preview */}
                                {(userName || comment) && (
                                    <div className="rounded-2xl p-4" style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>
                                        <p className="kh-eyebrow mb-3">ตัวอย่างรีวิว</p>
                                        <div className="kh-card p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="kh-avatar w-10 h-10 overflow-hidden shrink-0">
                                                    {avatarType === "emoji" ? (
                                                        <span className="text-xl">{selectedEmoji}</span>
                                                    ) : (avatarType === "url" && avatarUrl) ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : avatarPreview ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-bold text-sm">{userName?.[0]?.toUpperCase() || "?"}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold kh-ink text-sm">{userName || "ชื่อผู้รีวิว"}</h4>
                                                    <span className="text-[11px] kh-ink3">เพิ่งรีวิว</span>
                                                </div>
                                            </div>
                                            {selectedCourseId && (
                                                <div className="mb-2 kh-pill kh-pill-accent no-dot">
                                                    <BookOpen size={11} /> {courses.find(c => c.id === selectedCourseId)?.title}
                                                </div>
                                            )}
                                            <div className="flex gap-0.5 mb-2">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} size={14} className={s <= rating ? "" : "kh-ink3"} style={s <= rating ? { color: "#FBBF24" } : undefined} fill={s <= rating ? "currentColor" : "none"} />
                                                ))}
                                            </div>
                                            <p className="kh-ink2 text-sm leading-relaxed">&quot;{comment || "ข้อความรีวิว..."}&quot;</p>
                                        </div>
                                    </div>
                                )}

                                {/* Submit */}
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="kh-btn flex-1 py-3"
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
                                        className="kh-btn-ghost px-6 py-3"
                                    >
                                        ยกเลิก
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="kh-card p-5">
                        <h2 className="text-base font-bold kh-ink mb-3 flex items-center gap-2"><Info size={16} strokeWidth={1.9} style={{ color: "var(--accent)" }} /> คำแนะนำ</h2>
                        <ul className="list-disc list-inside text-sm kh-ink2 space-y-1.5">
                            <li>กดปุ่ม <span className="kh-pill kh-pill-accent no-dot">+ สร้างรีวิวใหม่</span> เพื่อสร้างรีวิวจากระบบ Admin</li>
                            <li>กดที่ปุ่ม <span className="kh-pill kh-pill-ink no-dot">👁️ ซ่อน</span> เพื่อซ่อนรีวิวไม่ให้ผู้ใช้อื่นเห็น (แต่ยังเก็บไว้ในระบบ)</li>
                            <li>กดที่ปุ่ม <span className="kh-pill kh-pill-danger no-dot">🗑️ ลบ</span> เพื่อลบรีวิวถาวร (กู้คืนไม่ได้)</li>
                            <li>รีวิวที่ถูกซ่อน จะมีป้ายกำกับ &quot;ซ่อนอยู่&quot; แสดงให้แอดมินเห็น</li>
                        </ul>
                    </div>

                    <ReviewList adminView={true} />
        </div>
    );
}
