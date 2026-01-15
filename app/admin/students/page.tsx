"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc, where, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { Search, Edit3, Trash2, Eye, Phone, MessageCircle, ChevronLeft, ChevronRight, GraduationCap, X } from "lucide-react";

// User Avatar Component
const UserAvatar = ({ userId, name }: { userId?: string, name?: string }) => {
    const [avatar, setAvatar] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (!userId) return;
        getDoc(doc(db, "users", userId)).then(snap => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.avatar) {
                    setAvatar(data.avatar);
                    setImageError(false);
                }
            }
        }).catch(err => console.error(err));
    }, [userId]);

    if (avatar && !imageError) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatar}
                alt={name || "User"}
                className="w-8 h-8 rounded-full object-cover"
                onError={() => setImageError(true)}
            />
        );
    }

    return (
        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-medium text-sm">
            {name?.charAt(0).toUpperCase() || "?"}
        </div>
    );
};

const ITEMS_PER_PAGE = 30;

export default function AdminStudentsPage() {
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [filteredEnrollments, setFilteredEnrollments] = useState<any[]>([]);
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [courseFilter, setCourseFilter] = useState("All");
    const [courseList, setCourseList] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [slipModalUrl, setSlipModalUrl] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const qEnroll = query(collection(db, "enrollments"), orderBy("createdAt", "desc"));
            const snapshotEnroll = await getDocs(qEnroll);
            const data = snapshotEnroll.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                formattedDate: doc.data().createdAt?.toDate?.()
                    ? doc.data().createdAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
                    : '-',
                formattedApprovedDate: doc.data().approvedAt?.toDate?.()
                    ? doc.data().approvedAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
                    : null
            }));
            setEnrollments(data);
            setFilteredEnrollments(data);
            const coursesFromEnrollments = Array.from(new Set(data.map((item: any) => item.courseTitle).filter(Boolean)));
            setCourseList(coursesFromEnrollments as string[]);

            const qCourses = query(collection(db, "courses"), orderBy("createdAt", "desc"));
            const snapshotCourses = await getDocs(qCourses);
            setAllCourses(snapshotCourses.docs.map(doc => ({ id: doc.id, title: doc.data().title })));
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        let result = enrollments;
        if (courseFilter !== "All") {
            result = result.filter(item => item.courseTitle === courseFilter);
        }
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(item =>
                (item.userName?.toLowerCase().includes(lowerTerm)) ||
                (item.userEmail?.toLowerCase().includes(lowerTerm)) ||
                (item.userTel?.includes(lowerTerm)) ||
                (item.courseTitle?.toLowerCase().includes(lowerTerm))
            );
        }
        setFilteredEnrollments(result);
        setCurrentPage(1);
    }, [searchTerm, courseFilter, enrollments]);

    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = filteredEnrollments.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredEnrollments.length / ITEMS_PER_PAGE);

    const handleDelete = async (id: string) => {
        if (confirm("ยืนยันการลบข้อมูล?")) {
            await deleteDoc(doc(db, "enrollments", id));
            fetchData();
        }
    };

    const handleEdit = (item: any) => {
        let currentCourseId = item.courseId;
        if (!currentCourseId && item.courseTitle) {
            const foundCourse = allCourses.find(c => c.title === item.courseTitle);
            if (foundCourse) currentCourseId = foundCourse.id;
        }
        setEditingItem({ ...item, courseId: currentCourseId || "", lineId: item.lineId || "", userTel: item.userTel || "" });
        setIsEditOpen(true);
    };

    const saveEdit = async () => {
        if (!editingItem) return;
        try {
            await updateDoc(doc(db, "enrollments", editingItem.id), {
                userName: editingItem.userName,
                userEmail: editingItem.userEmail,
                userTel: editingItem.userTel,
                lineId: editingItem.lineId,
                status: editingItem.status,
                courseId: editingItem.courseId,
                courseTitle: editingItem.courseTitle,
                accessType: editingItem.accessType || "limited",
                expiryDate: editingItem.expiryDate || null
            });
            setIsEditOpen(false);
            fetchData();
        } catch (error) {
            console.error("Error:", error);
        }
    };

    const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCourseId = e.target.value;
        const selectedCourse = allCourses.find(c => c.id === newCourseId);
        if (selectedCourse) {
            setEditingItem({ ...editingItem, courseId: newCourseId, courseTitle: selectedCourse.title });
        }
    };

    const handleMessage = async (item: any) => {
        if (!item.userId) return alert("ไม่พบข้อมูล User ID");
        try {
            await setDoc(doc(db, "chats", item.userId), {
                userId: item.userId,
                userName: item.userName || "Student",
                userEmail: item.userEmail,
                userTel: item.userTel || "",
                lineId: item.lineId || "",
                lastUpdated: serverTimestamp(),
            }, { merge: true });
            window.location.href = `/admin/chat?chatId=${item.userId}`;
        } catch (err) {
            console.error(err);
        }
    };

    const getStatusBadge = (item: any) => {
        if (item.status === 'approved') {
            const expiry = item.expiryDate ? new Date(item.expiryDate.seconds ? item.expiryDate.seconds * 1000 : item.expiryDate) : null;
            const isExpired = expiry && expiry < new Date();
            const isLifetime = item.accessType === 'lifetime';

            return (
                <div className="flex flex-col gap-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded ${isExpired ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {isExpired ? 'หมดอายุ' : 'เรียนได้'}
                    </span>
                    {isLifetime ? (
                        <span className="text-[10px] text-slate-400">ตลอดชีพ</span>
                    ) : expiry && (
                        <span className="text-[10px] text-slate-400">
                            หมด {expiry.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </span>
                    )}
                </div>
            );
        }
        if (item.status === 'pending') return <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-600">รอตรวจสอบ</span>;
        if (item.status === 'suspended') return <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">พักการเรียน</span>;
        return <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-500">ยกเลิก</span>;
    };

    // Auto fix expiry data
    useEffect(() => {
        if (enrollments.length > 0) {
            const needsFix = enrollments.some(item => item.status === 'approved' && (!item.expiryDate || !item.approvedAt));
            if (needsFix) {
                const fixData = async () => {
                    const q = query(collection(db, "enrollments"), where("status", "==", "approved"));
                    const snapshot = await getDocs(q);
                    const updates = [];
                    for (const docSnap of snapshot.docs) {
                        const data = docSnap.data();
                        if (!data.expiryDate || !data.approvedAt) {
                            const upd: any = {};
                            let startDate = data.approvedAt ? data.approvedAt.toDate() : (data.createdAt ? data.createdAt.toDate() : new Date());
                            if (!data.approvedAt) upd.approvedAt = data.createdAt || new Date();
                            if (!data.expiryDate) {
                                const exp = new Date(startDate);
                                exp.setFullYear(exp.getFullYear() + 5);
                                upd.expiryDate = exp;
                                upd.accessType = "limited";
                            }
                            if (Object.keys(upd).length > 0) updates.push(updateDoc(doc(db, "enrollments", docSnap.id), upd));
                        }
                    }
                    if (updates.length > 0) { await Promise.all(updates); fetchData(); }
                };
                fixData();
            }
        }
    }, [enrollments]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-slate-400">กำลังโหลด...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="border-b border-slate-100 bg-white sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin" className="text-slate-400 hover:text-slate-600 transition">
                                <ChevronLeft size={20} />
                            </Link>
                            <div className="flex items-center gap-3">
                                <GraduationCap size={24} className="text-slate-700" />
                                <div>
                                    <h1 className="text-xl font-semibold text-slate-800">ทะเบียนนักเรียน</h1>
                                    <p className="text-xs text-slate-400">{filteredEnrollments.length} รายการ</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="border-b border-slate-100 bg-slate-50/50">
                <div className="max-w-7xl mx-auto px-6 py-3">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ, เบอร์, อีเมล..."
                                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none transition"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none cursor-pointer"
                            value={courseFilter}
                            onChange={(e) => setCourseFilter(e.target.value)}
                        >
                            <option value="All">ทุกคอร์ส</option>
                            {courseList.map((c, i) => <option key={i} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-slate-500 w-12">#</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-500">นักเรียน</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-500">ติดต่อ</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-500">คอร์ส</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-500">วันที่</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-500">สถานะ</th>
                                    <th className="px-4 py-3 text-right font-medium text-slate-500 w-32"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentItems.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                        <td className="px-4 py-3 text-slate-400 text-xs">
                                            {filteredEnrollments.length - ((currentPage - 1) * ITEMS_PER_PAGE + index)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar userId={item.userId} name={item.userName} />
                                                <div>
                                                    <p className="font-medium text-slate-800">{item.userName || "ไม่ระบุ"}</p>
                                                    <p className="text-xs text-slate-400">{item.userEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                {item.userTel && (
                                                    <span className="text-xs text-slate-600 flex items-center gap-1">
                                                        <Phone size={12} /> {item.userTel}
                                                    </span>
                                                )}
                                                {item.lineId && <span className="text-xs text-green-600">Line: {item.lineId}</span>}
                                                {!item.userTel && !item.lineId && <span className="text-xs text-slate-300">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                {item.courseTitle || "-"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-500">{item.formattedDate}</span>
                                                {item.formattedApprovedDate && (
                                                    <span className="text-[10px] text-emerald-500">อนุมัติ: {item.formattedApprovedDate}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{getStatusBadge(item)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {item.slipUrl && (
                                                    <button onClick={() => setSlipModalUrl(item.slipUrl)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition" title="ดูสลิป">
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleMessage(item)} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded transition" title="ส่งข้อความ">
                                                    <MessageCircle size={16} />
                                                </button>
                                                <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded transition" title="แก้ไข">
                                                    <Edit3 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition" title="ลบ">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {currentItems.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-slate-400">ไม่พบข้อมูล</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
                            <span className="text-slate-400">หน้า {currentPage} / {totalPages}</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                                >
                                    ก่อนหน้า
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                                >
                                    ถัดไป
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {isEditOpen && editingItem && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-800">แก้ไขข้อมูล</h3>
                            <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">ชื่อนักเรียน</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-slate-400 outline-none" value={editingItem.userName} onChange={(e) => setEditingItem({ ...editingItem, userName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">เบอร์โทร</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-slate-400 outline-none" value={editingItem.userTel} onChange={(e) => setEditingItem({ ...editingItem, userTel: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">อีเมล</label>
                                <input type="email" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-slate-400 outline-none" value={editingItem.userEmail} onChange={(e) => setEditingItem({ ...editingItem, userEmail: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">LINE ID</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-slate-400 outline-none" value={editingItem.lineId} onChange={(e) => setEditingItem({ ...editingItem, lineId: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">คอร์ส</label>
                                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-slate-400 outline-none cursor-pointer" value={editingItem.courseId} onChange={handleCourseChange}>
                                    <option value="" disabled>-- เลือกคอร์ส --</option>
                                    {allCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">สถานะ</label>
                                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-slate-400 outline-none cursor-pointer" value={editingItem.status} onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}>
                                    <option value="pending">รอตรวจสอบ</option>
                                    <option value="approved">เรียนได้</option>
                                    <option value="suspended">พักการเรียน</option>
                                    <option value="rejected">ยกเลิก</option>
                                </select>
                            </div>
                            <div className="pt-3 border-t border-slate-100">
                                <label className="block text-xs text-slate-500 mb-1">ประเภทสิทธิ์</label>
                                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-slate-400 outline-none cursor-pointer mb-3" value={editingItem.accessType || "limited"} onChange={(e) => setEditingItem({ ...editingItem, accessType: e.target.value })}>
                                    <option value="limited">กำหนดวันหมดอายุ</option>
                                    <option value="lifetime">ตลอดชีพ</option>
                                </select>
                                {editingItem.accessType !== 'lifetime' && (
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">วันหมดอายุ</label>
                                        <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-slate-400 outline-none" value={editingItem.expiryDate ? new Date(editingItem.expiryDate.seconds ? editingItem.expiryDate.seconds * 1000 : editingItem.expiryDate).toISOString().split('T')[0] : ""} onChange={(e) => setEditingItem({ ...editingItem, expiryDate: new Date(e.target.value) })} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 px-5 py-4 border-t border-slate-100">
                            <button onClick={() => setIsEditOpen(false)} className="flex-1 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition">ยกเลิก</button>
                            <button onClick={saveEdit} className="flex-1 py-2 text-sm text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Slip Modal */}
            {slipModalUrl && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSlipModalUrl(null)}>
                    <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-700">สลิปการโอนเงิน</span>
                            <button onClick={() => setSlipModalUrl(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={slipModalUrl} alt="Slip" className="w-full" />
                    </div>
                </div>
            )}
        </div>
    );
}