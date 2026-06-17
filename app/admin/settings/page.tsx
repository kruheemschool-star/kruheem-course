"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Upload, Trash2, Loader2, Check, AlertCircle, ImageIcon, Info } from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { uploadImageToStorage } from "@/lib/upload";
import { useConfirmModal } from '@/hooks/useConfirmModal';

// Menu items configuration
const menuItems = [
    { key: 'enrollments', icon: '💰', title: 'ตรวจสอบชำระเงิน', coverColor: 'from-amber-100 to-orange-100' },
    { key: 'exams', icon: '📝', title: 'คลังข้อสอบ', coverColor: 'from-violet-100 to-purple-100' },
    { key: 'students', icon: '👨‍🎓', title: 'ทะเบียนนักเรียน', coverColor: 'from-sky-100 to-blue-100' },
    { key: 'courses', icon: '📚', title: 'จัดการคอร์สเรียน', coverColor: 'from-emerald-100 to-teal-100' },
    { key: 'summaries', icon: '✨', title: 'สรุปเนื้อหา', coverColor: 'from-cyan-100 to-sky-100' },
    { key: 'posts', icon: '📰', title: 'จัดการบทความ', coverColor: 'from-emerald-100 to-green-100' },
    { key: 'notifications', icon: '📢', title: 'ประกาศข่าวสาร', coverColor: 'from-yellow-100 to-amber-100' },
    { key: 'chat', icon: '💬', title: 'แชทกับลูกค้า', coverColor: 'from-indigo-100 to-violet-100' },
    { key: 'support', icon: '🎫', title: 'แจ้งปัญหา (Ticket)', coverColor: 'from-blue-100 to-indigo-100' },
    { key: 'reviews', icon: '⭐', title: 'จัดการรีวิว', coverColor: 'from-fuchsia-100 to-pink-100' },
    { key: 'coupons', icon: '🎫', title: 'จัดการคูปอง', coverColor: 'from-amber-100 to-yellow-100' },
    { key: 'poll', icon: '📊', title: 'แบบสอบถาม', coverColor: 'from-slate-100 to-gray-100' },
    { key: 'activity', icon: '📈', title: 'Activity Log', coverColor: 'from-teal-100 to-emerald-100' },
];

// Validation constants
const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const RECOMMENDED_WIDTH = 800;
const RECOMMENDED_HEIGHT = 200;

export default function AdminSettingsPage() {
    const [covers, setCovers] = useState<Record<string, string | null>>({});
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();

    // Fetch current covers
    useEffect(() => {
        const fetchCovers = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'settings', 'admin_menu'));
                if (docSnap.exists()) {
                    setCovers(docSnap.data()?.covers || {});
                }
            } catch (error) {
                console.error('Error fetching covers:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCovers();
    }, []);

    // Show message temporarily
    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // Handle file upload
    const handleUpload = async (key: string, file: File) => {
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            showMessage('error', 'รองรับเฉพาะไฟล์ JPG, PNG, WebP เท่านั้น');
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            showMessage('error', 'ขนาดไฟล์ต้องไม่เกิน 500KB');
            return;
        }

        setUploading(key);

        try {
            // Upload to Firebase Storage
            const filename = `${key}_${Date.now()}.${file.name.split('.').pop()}`;
            const url = await uploadImageToStorage(file, `admin/menu-covers/${filename}`);

            // Delete old image if exists
            if (covers[key]) {
                try {
                    const oldRef = ref(storage, covers[key]!);
                    await deleteObject(oldRef);
                } catch {
                    // Old file might not exist, ignore
                }
            }

            // Save to Firestore
            const newCovers = { ...covers, [key]: url };
            await setDoc(doc(db, 'settings', 'admin_menu'), {
                covers: newCovers,
                updatedAt: serverTimestamp()
            }, { merge: true });

            setCovers(newCovers);
            showMessage('success', 'อัปโหลดสำเร็จ!');
        } catch (error) {
            console.error('Upload error:', error);
            showMessage('error', 'เกิดข้อผิดพลาดในการอัปโหลด');
        } finally {
            setUploading(null);
        }
    };

    // Handle delete cover
    const handleDelete = async (key: string) => {
        if (!covers[key]) return;
        confirmModal("ยืนยันการลบ", "ต้องการลบรูป Cover นี้ใช่ไหม?", async () => {
            setDeleting(key);

            try {
                // Delete from Storage
                try {
                    const storageRef = ref(storage, covers[key]!);
                    await deleteObject(storageRef);
                } catch {
                    // File might not exist
                }

                // Remove from Firestore
                const newCovers = { ...covers };
                delete newCovers[key];
                await setDoc(doc(db, 'settings', 'admin_menu'), {
                    covers: newCovers,
                    updatedAt: serverTimestamp()
                }, { merge: true });

                setCovers(newCovers);
                showMessage('success', 'ลบสำเร็จ!');
            } catch (error) {
                console.error('Delete error:', error);
                showMessage('error', 'เกิดข้อผิดพลาดในการลบ');
            } finally {
                setDeleting(null);
            }
        }, true);
    };

    if (loading) {
        return (
            <AdminGuard>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="animate-spin kh-ink3" size={32} />
                </div>
            </AdminGuard>
        );
    }

    return (
        <AdminGuard>
            <div className="space-y-6">
                {/* Message Toast */}
                {message && (
                    <div
                        className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl animate-in slide-in-from-right kh-pill no-dot"
                        style={{
                            fontSize: '13.5px',
                            boxShadow: 'var(--shadow)',
                            background: message.type === 'success' ? 'var(--good-soft)' : 'var(--danger-soft)',
                            color: message.type === 'success' ? 'var(--good)' : 'var(--danger)',
                            border: `1px solid ${message.type === 'success' ? 'var(--good)' : 'var(--danger)'}`,
                        }}
                    >
                        {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                        {message.text}
                    </div>
                )}

                {/* Toolbar */}
                <div className="kh-card flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                        <div className="kh-eyebrow mb-1">
                            <ImageIcon size={14} strokeWidth={2} />
                            รูป Cover เมนู
                        </div>
                        <p className="kh-ink2 text-[13px]">จัดการรูป Cover สำหรับการ์ดเมนูในหน้าแดชบอร์ด</p>
                    </div>
                    <span className="kh-pill kh-pill-accent no-dot">{menuItems.length} เมนู</span>
                </div>

                {/* Info Box */}
                <div className="kh-card p-5" style={{ background: 'var(--accent-soft)', borderColor: 'color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                    <h3 className="flex items-center gap-2 font-semibold mb-3" style={{ color: 'var(--accent-ink)' }}>
                        <Info size={16} strokeWidth={2} />
                        ข้อแนะนำสำหรับรูปภาพ
                    </h3>
                    <ul className="text-[13px] kh-ink2 space-y-1.5">
                        <li>ขนาดแนะนำ: <strong className="kh-ink">{RECOMMENDED_WIDTH} x {RECOMMENDED_HEIGHT} px</strong> (อัตราส่วน 4:1)</li>
                        <li>ขนาดไฟล์สูงสุด: <strong className="kh-ink">500 KB</strong></li>
                        <li>รูปแบบที่รองรับ: <strong className="kh-ink">JPG, PNG, WebP</strong></li>
                    </ul>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menuItems.map((item) => {
                        const coverUrl = covers[item.key];
                        const isUploading = uploading === item.key;
                        const isDeleting = deleting === item.key;

                        return (
                            <div key={item.key} className="kh-card kh-card-h overflow-hidden">
                                {/* Cover Preview */}
                                <div className="h-24 relative" style={{ background: 'var(--card-2)' }}>
                                    {coverUrl ? (
                                        <Image
                                            src={coverUrl}
                                            alt={item.title}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className={`h-full bg-gradient-to-br ${item.coverColor}`} />
                                    )}

                                    {/* Loading Overlay */}
                                    {(isUploading || isDeleting) && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 className="animate-spin text-white" size={24} />
                                        </div>
                                    )}

                                    {/* Icon Badge */}
                                    <div className="absolute -bottom-4 left-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                            style={{ background: 'var(--card)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}
                                        >
                                            {item.icon}
                                        </div>
                                    </div>

                                    {/* Has Cover Badge */}
                                    {coverUrl && (
                                        <div className="absolute top-2 right-2 kh-pill kh-pill-good no-dot">
                                            มีรูป
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="pt-6 pb-4 px-4">
                                    <h3 className="font-medium kh-ink mb-3">{item.title}</h3>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {/* Upload Button */}
                                        <label className="kh-btn-ghost flex-1 cursor-pointer">
                                            <Upload size={16} />
                                            {coverUrl ? 'เปลี่ยน' : 'อัปโหลด'}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".jpg,.jpeg,.png,.webp"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleUpload(item.key, file);
                                                    e.target.value = '';
                                                }}
                                                disabled={isUploading || isDeleting}
                                            />
                                        </label>

                                        {/* Delete Button */}
                                        {coverUrl && (
                                            <button
                                                onClick={() => handleDelete(item.key)}
                                                disabled={isUploading || isDeleting}
                                                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                                                style={{ color: 'var(--danger)' }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <ConfirmDialog />
            </div>
        </AdminGuard>
    );
}
