"use client";

import { useState, useEffect } from "react";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import Image from "next/image";
import { Plus, Edit, Trash2, Eye, ImageIcon, FileText, CheckCircle2, FilePen, Newspaper } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useConfirmModal } from "@/hooks/useConfirmModal";

interface Post {
    id: string;
    title: string;
    slug: string;
    coverImage?: string;
    views?: number;
    createdAt: any;
    status: 'published' | 'draft';
}

export default function AdminPostsPage() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

    const fetchPosts = async () => {
        try {
            const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Post[];
            setPosts(data);
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleDelete = async (id: string) => {
        confirmModal("ยืนยันการลบ", "คุณแน่ใจว่าต้องการลบบทความนี้? การกระทำนี้ไม่สามารถย้อนกลับได้", async () => {
            try {
                await deleteDoc(doc(db, "posts", id));
                setPosts(prev => prev.filter(p => p.id !== id));
            } catch (error) {
                console.error("Error deleting post:", error);
                alert("เกิดข้อผิดพลาดในการลบ");
            }
        }, true);
    };

    const publishedCount = posts.filter(p => p.status === 'published').length;
    const draftCount = posts.filter(p => p.status === 'draft').length;
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);

    const statChips = [
        { label: "บทความ", value: posts.length, icon: FileText, tone: "var(--accent)", soft: "var(--accent-soft)" },
        { label: "เผยแพร่แล้ว", value: publishedCount, icon: CheckCircle2, tone: "var(--good)", soft: "var(--good-soft)" },
        { label: "ฉบับร่าง", value: draftCount, icon: FilePen, tone: "var(--warn)", soft: "var(--warn-soft)" },
        { label: "ยอดอ่านรวม", value: totalViews.toLocaleString('th-TH'), icon: Eye, tone: "var(--accent)", soft: "var(--accent-soft)" },
    ];

    const tabs: { key: 'all' | 'published' | 'draft'; label: string }[] = [
        { key: 'all', label: 'ทั้งหมด' },
        { key: 'published', label: 'เผยแพร่แล้ว' },
        { key: 'draft', label: 'ฉบับร่าง' },
    ];

    const filteredPosts = statusFilter === 'all' ? posts : posts.filter(p => p.status === statusFilter);

    return (
        <AdminGuard>
            <div className="space-y-6">
                {/* Stat chips */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statChips.map((s) => {
                        const Icon = s.icon;
                        return (
                            <div key={s.label} className="kh-card p-4 flex items-center justify-between">
                                <div>
                                    <p className="kh-ink2 text-xs mb-1">{s.label}</p>
                                    <p className="kh-num kh-ink text-2xl leading-none">{s.value}</p>
                                </div>
                                <span
                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: s.soft, color: s.tone }}
                                >
                                    <Icon size={20} />
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Toolbar: filter tabs + actions */}
                <div className="kh-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                className="kh-tab"
                                data-active={statusFilter === t.key}
                                onClick={() => setStatusFilter(t.key)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <Link href="/admin/posts/new" className="kh-btn whitespace-nowrap">
                        <Plus size={18} />
                        เขียนบทความใหม่
                    </Link>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="kh-card p-12 text-center kh-ink3">กำลังโหลดข้อมูล...</div>
                ) : filteredPosts.length === 0 ? (
                    <div className="kh-card p-12 text-center">
                        <span className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                            <Newspaper size={26} />
                        </span>
                        <h3 className="kh-ink text-lg font-bold mb-1">ยังไม่มีบทความ</h3>
                        <p className="kh-ink3 mb-6">เริ่มเขียนบทความแรกเพื่อแบ่งปันความรู้กันเถอะ!</p>
                        <Link href="/admin/posts/new" className="kh-btn inline-flex">
                            <Plus size={18} /> เขียนบทความใหม่
                        </Link>
                    </div>
                ) : (
                    <div className="kh-card !p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="kh-table">
                                <thead>
                                    <tr>
                                        <th>ชื่อบทความ</th>
                                        <th className="w-32">สถานะ</th>
                                        <th className="w-28">ยอดอ่าน</th>
                                        <th className="w-40">วันที่เผยแพร่</th>
                                        <th className="!text-right w-36">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPosts.map((post) => (
                                        <tr key={post.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: "var(--card-2)" }}>
                                                        {post.coverImage ? (
                                                            <Image
                                                                src={post.coverImage}
                                                                alt={post.title}
                                                                fill
                                                                unoptimized={true}
                                                                sizes="48px"
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center kh-ink3">
                                                                <ImageIcon size={20} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <Link href={`/admin/posts/edit/${post.id}`} className="font-medium kh-ink hover:underline line-clamp-2 leading-tight">
                                                            {post.title}
                                                        </Link>
                                                        <p className="text-xs kh-ink3 font-mono mt-0.5 truncate">/{post.slug}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`kh-pill !text-xs ${post.status === 'published' ? 'kh-pill-good' : 'kh-pill-ink'}`}>
                                                    {post.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="kh-num kh-ink2 inline-flex items-center gap-1.5">
                                                    <Eye size={14} className="kh-ink3" />
                                                    {(post.views || 0).toLocaleString('th-TH')}
                                                </span>
                                            </td>
                                            <td className="kh-ink3 text-xs">
                                                {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('th-TH') : 'N/A'}
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link
                                                        href={`/blog/${post.slug}`}
                                                        target="_blank"
                                                        className="kh-btn-ghost !px-2 !py-1.5"
                                                        title="ดูบทความ"
                                                    >
                                                        <Eye size={16} />
                                                    </Link>
                                                    <Link
                                                        href={`/admin/posts/edit/${post.id}`}
                                                        className="kh-btn-ghost !px-2 !py-1.5"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleDelete(post.id);
                                                        }}
                                                        className="kh-btn-ghost !px-2 !py-1.5"
                                                        style={{ color: "var(--danger)" }}
                                                        title="ลบ"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                <ConfirmDialog />
            </div>
        </AdminGuard>
    );
}
