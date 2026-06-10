"use client";

import { useState, useEffect, useRef } from "react";
import { useUserAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { uploadImageToStorage } from "@/lib/upload";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { User, Camera, Save, Loader2, Check, ArrowLeft, Lightbulb, Quote, Upload, BarChart3 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface AvatarCategoryMeta {
    id: string;
    label: string;
    emoji: string;
    order: number;
}

interface AvatarRow {
    url: string;
    category: string;
    order: number;
    createdAt: number;
}

const DEFAULT_AVATAR_CATEGORIES: AvatarCategoryMeta[] = [
    { id: "kids", label: "เด็ก", emoji: "🧒", order: 0 },
    { id: "male", label: "ผู้ชาย", emoji: "👦", order: 1 },
    { id: "female", label: "ผู้หญิง", emoji: "👧", order: 2 },
    { id: "animals", label: "สัตว์น่ารัก", emoji: "🦁", order: 3 },
    { id: "monsters", label: "สัตว์ประหลาด", emoji: "👾", order: 4 },
];

// Highlighter colours per avatar category (spec §2). Unknown/dynamic categories
// fall back to the brand green so the UI always has a coherent accent.
const CATEGORY_COLORS: Record<string, string> = {
    kids: "#F59E0B",
    male: "#2E90D9",
    female: "#E5547F",
    animals: "#2FA86B",
    monsters: "#8B5CF6",
};
const catColor = (id: string): string => CATEGORY_COLORS[id] || "#2FA86B";

// NOTE: We intentionally do NOT merge any auto-generated SVG fallback avatars
// into the library. The profile grid shows only admin-uploaded avatars from
// the Firestore `avatars` collection. If a category is empty the UI renders
// the existing empty-state message instead of synthetic emoji placeholders.

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
    const [activeTab, setActiveTab] = useState<string>(DEFAULT_AVATAR_CATEGORIES[0].id);
    const [avatarCategories, setAvatarCategories] = useState<AvatarCategoryMeta[]>(DEFAULT_AVATAR_CATEGORIES);
    const [caption, setCaption] = useState("");
    const [showQuoteDrawer, setShowQuoteDrawer] = useState(false);
    const [quoteCategory, setQuoteCategory] = useState<'healing' | 'passion' | 'growth'>('healing');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dynamic avatar library loaded from Firestore (admin-managed only).
    // Starts empty and is populated once after fetch — never mixes with synthetic fallbacks.
    const [avatarLib, setAvatarLib] = useState<Record<string, string[]>>({});
    const [libLoading, setLibLoading] = useState(true);

    // Fetch avatar categories + library fresh on mount so profile reflects new admin uploads immediately.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [avatarSnapshot, categorySnapshot] = await Promise.all([
                    getDocs(collection(db, "avatars")),
                    getDocs(collection(db, "avatarCategories")),
                ]);

                const avatarsFromDb = avatarSnapshot.docs.map((d) => {
                    const data = d.data() as {
                        url?: unknown;
                        category?: unknown;
                        order?: unknown;
                        createdAt?: { toMillis?: () => number } | null;
                    };
                    return {
                        url: typeof data.url === "string" ? data.url : "",
                        category: typeof data.category === "string" ? data.category : "",
                        order: typeof data.order === "number" ? data.order : 9999,
                        createdAt: data.createdAt?.toMillis?.() ?? 0,
                    } satisfies AvatarRow;
                });

                const categoriesFromDb = categorySnapshot.docs.map((d) => {
                    const data = d.data() as { label?: unknown; emoji?: unknown; order?: unknown };
                    return {
                        id: d.id,
                        label: typeof data.label === "string" && data.label.trim() ? data.label : d.id,
                        emoji: typeof data.emoji === "string" && data.emoji.trim() ? data.emoji : "📁",
                        order: typeof data.order === "number" ? data.order : 9999,
                    } satisfies AvatarCategoryMeta;
                });

                if (cancelled || !Array.isArray(avatarsFromDb)) return;

                const grouped: Record<string, { url: string; order: number; createdAt: number }[]> = {};
                avatarsFromDb.forEach((a) => {
                    if (!a?.category || !a?.url) return;
                    if (!grouped[a.category]) grouped[a.category] = [];
                    grouped[a.category].push({ url: a.url, order: a.order, createdAt: a.createdAt });
                });

                const categoryMap = new Map<string, AvatarCategoryMeta>();
                if (Array.isArray(categoriesFromDb) && categoriesFromDb.length > 0) {
                    categoriesFromDb.forEach((c) => {
                        categoryMap.set(c.id, c);
                    });
                } else {
                    DEFAULT_AVATAR_CATEGORIES.forEach((c) => {
                        categoryMap.set(c.id, c);
                    });
                }

                Object.keys(grouped).forEach((categoryId) => {
                    if (!categoryMap.has(categoryId)) {
                        categoryMap.set(categoryId, {
                            id: categoryId,
                            label: categoryId,
                            emoji: "📁",
                            order: 9999,
                        });
                    }
                });

                const sortedCategories = Array.from(categoryMap.values()).sort((a, b) => {
                    if (a.order !== b.order) return a.order - b.order;
                    return a.label.localeCompare(b.label, "th");
                });

                const nextLib: Record<string, string[]> = {};
                sortedCategories.forEach((c) => {
                    const dynamic = (grouped[c.id] || []).sort((x, y) => (x.order - y.order) || (x.createdAt - y.createdAt));
                    // ONLY admin-uploaded avatars — no synthetic fallbacks.
                    nextLib[c.id] = dynamic.map((x) => x.url);
                });

                if (!cancelled) {
                    setAvatarCategories(sortedCategories);
                    setAvatarLib(nextLib);
                    const firstNonEmptyCategory = sortedCategories.find((category) => (nextLib[category.id] || []).length > 0)?.id;
                    setActiveTab((prev) => {
                        if ((nextLib[prev] || []).length > 0) return prev;
                        return firstNonEmptyCategory || sortedCategories[0]?.id || "kids";
                    });
                }
            } catch (e) {
                console.warn("avatar library fetch failed:", e);
            } finally {
                if (!cancelled) setLibLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Load initial data
    useEffect(() => {
        if (userProfile || user) {
            const displayName = userProfile?.displayName || user?.displayName || "";
            if (displayName) setFirstName(displayName);
            if (userProfile?.caption) setCaption(userProfile.caption);

            // Default to existing profile photo; leave empty if user has no avatar yet
            // (the grid will prompt them to pick one — no synthetic placeholder).
            const firstAvailableAvatar = Object.values(avatarLib).find((list) => list.length > 0)?.[0];
            setAvatar(userProfile?.avatar || user?.photoURL || firstAvailableAvatar || "");
        }
    }, [user, userProfile, avatarLib]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const fullName = firstName.trim();
            if (!fullName) {
                toast.error("กรุณากรอกชื่อก่อนนะ");
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
            const url = await uploadImageToStorage(file, `avatars/${user.uid}/${Date.now()}_${file.name}`);
            setAvatar(url);
            toast.success("อัปโหลดรูปภาพสำเร็จ!");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("อัปโหลดรูปภาพไม่สำเร็จ");
        } finally {
            setUploading(false);
        }
    };

    const activeColor = catColor(activeTab);

    return (
        <div className="pf-root min-h-screen flex flex-col">
            <Navbar />
            <Toaster position="top-center" />

            {/* Graph-paper background (static) */}
            <div className="pf-bg" aria-hidden="true" />

            <main className="pf-wrap">
                <Link href="/my-courses" className="pf-back">
                    <ArrowLeft size={16} />
                    กลับไปหน้าคอร์สเรียน
                </Link>

                <header className="pf-pagehead">
                    <span className="pf-eyebrow">บัญชีของฉัน</span>
                    <h1 className="pf-h1">แก้ไขข้อมูลส่วนตัว</h1>
                    <p className="pf-sub">ปรับชื่อ แคปชั่น และรูปประจำตัวของน้องได้เลย ✨</p>
                </header>

                {/* Hidden file input (shared by Hero camera + grid upload tile) */}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

                {/* Identity Hero — live preview */}
                <section className="pf-card pf-hero pf-rise">
                    <div className="pf-cover" aria-hidden="true" />
                    <div className="pf-hero-body">
                        <div className="pf-ava-wrap">
                            <div className="pf-ava">
                                {avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={avatar}
                                        alt="รูปประจำตัว"
                                        className="pf-ava-img"
                                        onError={() => setAvatar("")}
                                    />
                                ) : (
                                    <div className="pf-ava-empty"><User size={52} /></div>
                                )}
                                {uploading && (
                                    <div className="pf-ava-loading"><Loader2 className="animate-spin" size={34} /></div>
                                )}
                            </div>
                            <button type="button" className="pf-ava-cam" onClick={() => fileInputRef.current?.click()} title="เปลี่ยนรูป" disabled={uploading}>
                                <Camera size={16} />
                            </button>
                        </div>
                        <div className="pf-hero-meta">
                            <h2 className="pf-name">{firstName.trim() || "ใส่ชื่อของน้อง"}</h2>
                            <div className={`pf-cap ${caption.trim() ? "" : "pf-cap-empty"}`}>
                                <Quote size={14} />
                                <span>{caption.trim() || "ยังไม่มีแคปชั่น — เลือกคำคมเท่ ๆ ได้เลย"}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="pf-cols">
                    {/* LEFT: personal info + parent CTA */}
                    <div className="pf-left">
                        <div className="pf-card pf-pad pf-accent pf-rise">
                            <h3 className="pf-sec">✏️ ข้อมูลส่วนตัว</h3>
                            <p className="pf-sec-desc">ชื่อและแคปชั่นนี้จะแสดงในโปรไฟล์ของน้อง</p>

                            <label className="pf-label">ชื่อแสดงผล</label>
                            <input
                                type="text"
                                value={firstName}
                                maxLength={40}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="pf-input"
                                placeholder="กรอกชื่อของน้อง"
                            />

                            <div className="pf-label-row">
                                <label className="pf-label" style={{ margin: 0 }}>แคปชั่นประจำตัว</label>
                                <span className="pf-count">{caption.length}/60</span>
                            </div>
                            <div className="pf-cap-row">
                                <input
                                    type="text"
                                    value={caption}
                                    maxLength={60}
                                    onChange={(e) => setCaption(e.target.value)}
                                    className="pf-input"
                                    placeholder="เขียนแคปชั่นเท่ ๆ หรือเลือกคำคม..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowQuoteDrawer(!showQuoteDrawer)}
                                    className={`pf-quote-btn ${showQuoteDrawer ? "is-open" : ""}`}
                                    title="เลือกคำคม"
                                >
                                    <Lightbulb size={18} />
                                </button>
                            </div>

                            {/* Quote drawer */}
                            <div className={`pf-drawer ${showQuoteDrawer ? "is-open" : ""}`}>
                                <div className="pf-drawer-tabs">
                                    <button type="button" onClick={() => setQuoteCategory('healing')} className={`pf-qtab qt-healing ${quoteCategory === 'healing' ? "is-active" : ""}`}>❤️ ฮีลใจ</button>
                                    <button type="button" onClick={() => setQuoteCategory('passion')} className={`pf-qtab qt-passion ${quoteCategory === 'passion' ? "is-active" : ""}`}>🔥 ปลุกไฟ</button>
                                    <button type="button" onClick={() => setQuoteCategory('growth')} className={`pf-qtab qt-growth ${quoteCategory === 'growth' ? "is-active" : ""}`}>🌟 Growth</button>
                                </div>
                                <div className="pf-drawer-list">
                                    {QUOTES[quoteCategory].map((q, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                setCaption(q);
                                                setShowQuoteDrawer(false);
                                                toast.success("ใส่แคปชั่นแล้ว!");
                                            }}
                                            className="pf-quote-item"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleSave} disabled={loading} className="pf-save">
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <><Save size={18} /> บันทึกข้อมูล</>
                                )}
                            </button>
                        </div>

                        {/* Parent CTA */}
                        {user && (
                            <Link href={`/parent-dashboard/${user.uid}`} prefetch={false} className="pf-parent pf-rise">
                                <span className="pf-parent-ic"><BarChart3 size={20} /></span>
                                <span className="pf-parent-txt">
                                    <strong>ติดตามผลการเรียน</strong>
                                    <small>สำหรับผู้ปกครอง</small>
                                </span>
                                <span className="pf-parent-arrow">→</span>
                            </Link>
                        )}
                    </div>

                    {/* RIGHT: avatar picker */}
                    <div
                        className="pf-card pf-pad pf-picker pf-rise"
                        style={{ ["--cat" as string]: activeColor }}
                    >
                        <h3 className="pf-sec">🎭 เลือกรูปประจำตัว</h3>
                        <p className="pf-sec-desc">เลือกจากคลังของครู หรืออัปโหลดรูปของน้องเองก็ได้</p>

                        <div className="pf-tabs">
                            {avatarCategories.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`pf-tab ${activeTab === tab.id ? "is-active" : ""}`}
                                    style={{ ["--tc" as string]: catColor(tab.id) }}
                                >
                                    {tab.emoji} {tab.label}
                                </button>
                            ))}
                        </div>

                        {libLoading ? (
                            <div className="pf-empty">
                                <Loader2 className="animate-spin" size={24} />
                                <span>กำลังโหลดรูปประจำตัว...</span>
                            </div>
                        ) : (
                            <div className="pf-grid">
                                {/* Upload tile (always first) */}
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="pf-tile pf-tile-upload" disabled={uploading} title="อัปโหลดรูปของน้อง">
                                    {uploading ? <Loader2 className="animate-spin" size={22} /> : <Upload size={22} />}
                                    <span>อัปโหลด</span>
                                </button>

                                {(avatarLib[activeTab] || []).length === 0 ? (
                                    <div className="pf-empty pf-empty-inline">
                                        <p className="pf-empty-title">ยังไม่มีรูปในหมวดนี้</p>
                                        <p className="pf-empty-hint">กดปุ่ม “อัปโหลด” เพื่อใช้รูปของน้องเองได้เลย</p>
                                    </div>
                                ) : (
                                    (avatarLib[activeTab] || []).map((src: string, index: number) => (
                                        <button
                                            key={src}
                                            type="button"
                                            onClick={() => setAvatar(src)}
                                            className={`pf-tile ${avatar === src ? "is-selected" : ""}`}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={src}
                                                alt={`รูปประจำตัว ${index + 1}`}
                                                loading="lazy"
                                                className="pf-tile-img"
                                                onError={(e) => {
                                                    const card = e.currentTarget.closest("button");
                                                    if (card) (card as HTMLElement).style.display = "none";
                                                }}
                                            />
                                            {avatar === src && (
                                                <span className="pf-tile-check"><Check size={13} strokeWidth={3} /></span>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />

            <style>{`
                .pf-root {
                    --paper:#F4F8F3; --card:#FFFFFF; --card-2:#F6FAF6; --ink:#16241C; --ink-2:#5C7065;
                    --ink-3:#8AA096; --line:#E3EDE4; --line-2:#D2E0D4; --brand:#2FA86B; --brand-deep:#1E7E4F;
                    --brand-soft:#E3F4EA; --yellow:#F5B915;
                    background: var(--paper); color: var(--ink);
                    font-family: var(--font-sarabun), 'Sarabun', sans-serif;
                }
                .dark .pf-root {
                    --paper:#0B1220; --card:#131D2E; --card-2:#182438; --ink:#E9F1EC; --ink-2:#9FB2A8;
                    --ink-3:#74897e; --line:#25324A; --line-2:#2c3a52; --brand:#45CB8C; --brand-deep:#2FA86B;
                    --brand-soft:#13314a; --yellow:#FBC02D;
                }
                .pf-root h1, .pf-root h2, .pf-root h3, .pf-save, .pf-tab, .pf-back, .pf-eyebrow,
                .pf-name, .pf-parent strong { font-family: var(--font-mitr), 'Mitr', sans-serif; }

                /* Graph-paper bg */
                .pf-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none;
                    background-image:
                        linear-gradient(to right, color-mix(in srgb, var(--brand) 14%, transparent) 1px, transparent 1px),
                        linear-gradient(to bottom, color-mix(in srgb, var(--brand) 14%, transparent) 1px, transparent 1px);
                    background-size: 28px 28px;
                    -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 80%);
                    mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 80%);
                    opacity: .5; }

                .pf-wrap { position: relative; z-index: 1; width: 100%; max-width: 1120px; margin: 0 auto;
                    padding: 96px 18px 80px; flex: 1; }

                .pf-back { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500;
                    color: var(--ink-2); margin-bottom: 18px; transition: color .2s; }
                .pf-back:hover { color: var(--brand-deep); }

                .pf-pagehead { margin-bottom: 22px; }
                .pf-eyebrow { display: inline-block; font-size: 13px; font-weight: 600; color: var(--brand-deep);
                    background: var(--brand-soft); padding: 4px 12px; border-radius: 9999px; margin-bottom: 10px; }
                .dark .pf-eyebrow { color: var(--brand); }
                .pf-h1 { font-size: 30px; font-weight: 600; line-height: 1.5; color: var(--ink); }
                .pf-sub { color: var(--ink-2); margin-top: 4px; font-size: 15px; }

                /* Card base */
                .pf-card { position: relative; background: var(--card); border: 1px solid var(--line);
                    border-radius: 24px; box-shadow: 0 8px 26px rgba(16,40,28,.05); overflow: hidden; }
                .dark .pf-card { box-shadow: 0 8px 26px rgba(0,0,0,.28); }
                .pf-pad { padding: 22px; }

                /* Top accent bar (green → yellow) */
                .pf-accent::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px;
                    background: linear-gradient(90deg, var(--brand), var(--yellow)); }

                /* ===== Identity Hero ===== */
                .pf-hero { margin-bottom: 22px; }
                .pf-cover { position: relative; height: 158px; overflow: hidden;
                    background: linear-gradient(120deg, #2FA86B, #5fd0a0 45%, #F5B915 110%); }
                .dark .pf-cover { background: linear-gradient(120deg, #1E7E4F, #2FA86B 45%, #b88a12 120%); }
                .pf-cover::before { content: ""; position: absolute; inset: -20%;
                    background:
                        radial-gradient(40% 50% at 20% 30%, rgba(255,255,255,.55), transparent 60%),
                        radial-gradient(45% 55% at 80% 25%, rgba(245,185,21,.55), transparent 60%),
                        radial-gradient(50% 60% at 60% 80%, rgba(47,168,107,.6), transparent 60%),
                        radial-gradient(40% 50% at 30% 75%, rgba(95,208,160,.55), transparent 60%);
                    filter: blur(10px); animation: pfAurora 20s ease-in-out infinite alternate; }
                .pf-cover::after { content: ""; position: absolute; inset: 0;
                    background-image:
                        linear-gradient(to right, rgba(255,255,255,.5) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,.5) 1px, transparent 1px);
                    background-size: 26px 26px; opacity: .055;
                    -webkit-mask-image: linear-gradient(to bottom, #000, transparent);
                    mask-image: linear-gradient(to bottom, #000, transparent); }
                @keyframes pfAurora { from { transform: translate3d(-4%, -2%, 0) scale(1.05); }
                    to { transform: translate3d(4%, 3%, 0) scale(1.12); } }

                .pf-hero-body { position: relative; display: flex; align-items: center; gap: 18px;
                    min-height: 70px; padding: 16px 26px 22px 168px; }
                .pf-ava-wrap { position: absolute; left: 26px; top: -60px; flex-shrink: 0; }
                .pf-ava { width: 124px; height: 124px; border-radius: 9999px; overflow: hidden;
                    background: var(--card-2); border: 4px solid var(--card);
                    box-shadow: 0 0 0 3px var(--brand), 0 10px 24px rgba(16,40,28,.18); position: relative; }
                .pf-ava-img { width: 100%; height: 100%; object-fit: cover; }
                .pf-ava-empty { width: 100%; height: 100%; display: grid; place-items: center; color: var(--ink-3); }
                .pf-ava-loading { position: absolute; inset: 0; background: rgba(0,0,0,.5); display: grid;
                    place-items: center; color: #fff; }
                .pf-ava-cam { position: absolute; right: 4px; bottom: 6px; width: 36px; height: 36px;
                    border-radius: 9999px; background: var(--brand); color: #fff; display: grid; place-items: center;
                    border: 3px solid var(--card); box-shadow: 0 4px 10px rgba(16,40,28,.25); transition: background .2s, transform .15s; }
                .pf-ava-cam:hover { background: var(--brand-deep); transform: translateY(-1px); }
                .pf-ava-cam:disabled { opacity: .6; cursor: not-allowed; }
                .pf-hero-meta { min-width: 0; }
                .pf-name { font-size: 26px; font-weight: 600; line-height: 1.5; color: var(--ink); word-break: break-word; }
                .pf-cap { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; max-width: 100%;
                    padding: 6px 14px; border-radius: 9999px; font-size: 14px; font-weight: 600;
                    background: color-mix(in srgb, var(--yellow) 22%, var(--card)); color: #7a5a08;
                    border: 1px solid color-mix(in srgb, var(--yellow) 45%, transparent); }
                .dark .pf-cap { color: var(--yellow); }
                .pf-cap span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .pf-cap-empty { background: var(--card-2); color: var(--ink-3); border-color: var(--line);
                    font-weight: 500; }

                /* ===== Columns ===== */
                .pf-cols { display: grid; grid-template-columns: 360px 1fr; gap: 22px; align-items: start; }
                .pf-left { display: flex; flex-direction: column; gap: 22px; position: sticky; top: 90px; }

                .pf-sec { font-size: 18px; font-weight: 600; color: var(--ink); line-height: 1.5; }
                .pf-sec-desc { font-size: 13px; color: var(--ink-2); margin: 2px 0 16px; }
                .pf-label { display: block; font-size: 13px; font-weight: 600; color: var(--ink-2); margin: 0 0 6px; }
                .pf-label-row { display: flex; align-items: center; justify-content: space-between; margin: 16px 0 6px; }
                .pf-count { font-size: 12px; color: var(--ink-3); }
                .pf-input { width: 100%; height: 46px; padding: 0 14px; font-size: 15px; color: var(--ink);
                    background: var(--card-2); border: 1px solid var(--line-2); border-radius: 12px;
                    transition: border-color .2s, box-shadow .2s; font-family: var(--font-sarabun), sans-serif; }
                .pf-input::placeholder { color: var(--ink-3); }
                .pf-input:focus { outline: none; border-color: var(--brand);
                    box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent); }
                .pf-cap-row { display: flex; gap: 8px; }
                .pf-quote-btn { flex-shrink: 0; width: 46px; height: 46px; border-radius: 12px; display: grid;
                    place-items: center; background: var(--card-2); border: 1px solid var(--line-2); color: var(--ink-3);
                    transition: all .2s; }
                .pf-quote-btn:hover { color: var(--brand); border-color: var(--brand); }
                .pf-quote-btn.is-open { background: var(--brand-soft); border-color: var(--brand); color: var(--brand-deep); }
                .dark .pf-quote-btn.is-open { color: var(--brand); }

                /* Quote drawer */
                .pf-drawer { max-height: 0; opacity: 0; overflow: hidden; transition: max-height .3s ease, opacity .3s ease, margin .3s ease; }
                .pf-drawer.is-open { max-height: 360px; opacity: 1; margin-top: 12px; }
                .pf-drawer-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 10px; }
                .pf-qtab { flex-shrink: 0; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600;
                    background: var(--card-2); color: var(--ink-2); border: 1px solid var(--line-2); white-space: nowrap;
                    cursor: pointer; transition: all .15s; }
                .pf-qtab.qt-healing.is-active { background: #FBE1EA; color: #c43564; border-color: transparent; }
                .pf-qtab.qt-passion.is-active { background: #FDF0D5; color: #b9760a; border-color: transparent; }
                .pf-qtab.qt-growth.is-active  { background: #DDF2E6; color: #1E7E4F; border-color: transparent; }
                .dark .pf-qtab.qt-healing.is-active { background: rgba(229,84,127,.2); color: #f2a9c0; }
                .dark .pf-qtab.qt-passion.is-active { background: rgba(245,158,11,.2); color: #fbcd7a; }
                .dark .pf-qtab.qt-growth.is-active  { background: rgba(47,168,107,.22); color: #7fe0b3; }
                .pf-drawer-list { max-height: 250px; overflow-y: auto; margin-top: 8px; display: flex; flex-direction: column; }
                .pf-quote-item { text-align: left; padding: 11px 14px; border-radius: 10px; font-size: 14px; font-weight: 500;
                    color: var(--ink); background: transparent; border: none; cursor: pointer; transition: background .15s; }
                .pf-quote-item:hover { background: var(--card-2); }

                .pf-save { margin-top: 20px; width: 100%; height: 50px; display: flex; align-items: center;
                    justify-content: center; gap: 8px; font-size: 16px; font-weight: 600; color: #fff;
                    background: var(--brand); border: none; border-radius: 12px; cursor: pointer;
                    box-shadow: 0 8px 18px color-mix(in srgb, var(--brand) 30%, transparent); transition: background .2s, transform .15s; }
                .pf-save:hover:not(:disabled) { background: var(--brand-deep); transform: translateY(-1px); }
                .pf-save:disabled { opacity: .65; cursor: not-allowed; }

                /* Parent CTA */
                .pf-parent { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-radius: 20px;
                    background: linear-gradient(120deg, #EEF2FF, #F5ECFE); border: 1px solid #E0E3F5;
                    color: #4f46e5; transition: transform .2s, box-shadow .2s; }
                .dark .pf-parent { background: linear-gradient(120deg, rgba(99,102,241,.16), rgba(139,92,246,.16));
                    border-color: rgba(129,140,248,.3); color: #c7d2fe; }
                .pf-parent:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(79,70,229,.16); }
                .pf-parent-ic { width: 40px; height: 40px; flex-shrink: 0; border-radius: 12px; display: grid;
                    place-items: center; background: rgba(99,102,241,.14); color: #6366f1; }
                .dark .pf-parent-ic { background: rgba(129,140,248,.2); color: #a5b4fc; }
                .pf-parent-txt { display: flex; flex-direction: column; line-height: 1.4; flex: 1; }
                .pf-parent-txt strong { font-size: 15px; font-weight: 600; }
                .pf-parent-txt small { font-size: 12px; opacity: .8; }
                .pf-parent-arrow { font-size: 20px; transition: transform .2s; }
                .pf-parent:hover .pf-parent-arrow { transform: translateX(3px); }

                /* ===== Avatar picker ===== */
                .pf-picker::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px;
                    background: var(--cat); transition: background .3s; }
                .pf-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
                .pf-tab { padding: 8px 16px; border-radius: 9999px; font-size: 14px; font-weight: 500;
                    background: var(--card-2); color: var(--ink-2); border: 1px solid var(--line-2); cursor: pointer;
                    transition: all .18s; min-height: 40px; }
                .pf-tab:hover { border-color: var(--tc); color: var(--tc); }
                .pf-tab.is-active { background: var(--tc); color: #fff; border-color: var(--tc);
                    box-shadow: 0 6px 14px color-mix(in srgb, var(--tc) 32%, transparent); }

                .pf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(86px, 1fr)); gap: 12px; }
                .pf-tile { position: relative; aspect-ratio: 1; border-radius: 18px; background: var(--card-2);
                    border: 1px solid var(--line); cursor: pointer; display: grid; place-items: center; padding: 8px;
                    transition: transform .18s, box-shadow .18s, border-color .18s; }
                .pf-tile:hover { transform: translateY(-3px); box-shadow: 0 8px 18px rgba(16,40,28,.1); border-color: var(--cat); }
                .pf-tile-img { width: 100%; height: 100%; object-fit: contain; transition: transform .25s; }
                .pf-tile:hover .pf-tile-img { transform: scale(1.1); }
                .pf-tile.is-selected { border-color: var(--cat); box-shadow: 0 0 0 2px var(--cat); background: color-mix(in srgb, var(--cat) 10%, var(--card)); }
                .pf-tile-check { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 9999px;
                    background: var(--cat); color: #fff; display: grid; place-items: center; box-shadow: 0 2px 6px rgba(0,0,0,.2); }
                .pf-tile-upload { flex-direction: column; gap: 4px; border: 2px dashed var(--line-2); background: transparent;
                    color: var(--ink-2); font-size: 12px; font-weight: 600; }
                .pf-tile-upload:hover { border-color: var(--brand); color: var(--brand); }
                .pf-tile-upload:disabled { opacity: .6; cursor: not-allowed; }

                .pf-empty { grid-column: 1 / -1; border: 1px dashed var(--line-2); border-radius: 18px;
                    background: var(--card-2); padding: 40px 18px; text-align: center; color: var(--ink-2);
                    display: flex; flex-direction: column; align-items: center; gap: 8px; }
                .pf-empty-inline { padding: 30px 18px; }
                .pf-empty-title { font-weight: 600; color: var(--ink); }
                .pf-empty-hint { font-size: 12px; color: var(--ink-3); }

                /* Entrance (subtle, no opacity flash) */
                .pf-rise { animation: pfRise .5s cubic-bezier(.2,.7,.3,1) both; }
                .pf-rise:nth-child(2) { animation-delay: .04s; }
                @keyframes pfRise { from { transform: translateY(10px); } to { transform: translateY(0); } }

                /* ===== Responsive ===== */
                @media (max-width: 900px) {
                    .pf-cols { grid-template-columns: 1fr; }
                    .pf-left { position: static; }
                }
                @media (max-width: 560px) {
                    .pf-wrap { padding: 88px 14px 64px; }
                    .pf-hero-body { flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 0 18px 22px; min-height: 0; }
                    .pf-ava-wrap { position: relative; top: auto; left: auto; margin-top: -62px; }
                    .pf-grid { grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); }
                    .pf-h1 { font-size: 26px; }
                }

                @media (prefers-reduced-motion: reduce) {
                    .pf-cover::before { animation: none; }
                    .pf-rise { animation: none; }
                    .pf-root *, .pf-root *::before { transition: none !important; }
                }
            `}</style>
        </div>
    );
}
