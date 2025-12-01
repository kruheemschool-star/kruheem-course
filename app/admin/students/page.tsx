"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc, where, getDoc } from "firebase/firestore";
import Link from "next/link";


// --- Icons ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>;
const MagicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" /><path d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>; // Placeholder

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
        // eslint-disable-next-line @next/next/no-img-element
        return (
            <img
                src={avatar}
                alt={name || "User"}
                className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-100 flex-shrink-0"
                onError={() => setImageError(true)}
            />
        );
    }

    return (
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
            {name?.charAt(0).toUpperCase() || "?"}
        </div>
    );
};

const ITEMS_PER_PAGE = 30; // จำนวนรายการต่อหน้า

export default function AdminStudentsPage() {
    // State หลัก
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [filteredEnrollments, setFilteredEnrollments] = useState<any[]>([]);
    const [allCourses, setAllCourses] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [courseFilter, setCourseFilter] = useState("All");
    const [courseList, setCourseList] = useState<string[]>([]);

    // ✅ Pagination State
    const [currentPage, setCurrentPage] = useState(1);

    // State for Modals
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [slipModalUrl, setSlipModalUrl] = useState<string | null>(null);

    // 2. Data Fetching
    const fetchData = async () => {
        try {
            // ดึง Enrollment
            const qEnroll = query(collection(db, "enrollments"), orderBy("createdAt", "desc"));
            const snapshotEnroll = await getDocs(qEnroll);

            const data = snapshotEnroll.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                formattedDate: doc.data().createdAt?.toDate
                    ? doc.data().createdAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : '-',
                formattedApprovedDate: doc.data().approvedAt?.toDate
                    ? doc.data().approvedAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : null
            }));

            setEnrollments(data);
            setFilteredEnrollments(data);

            const coursesFromEnrollments = Array.from(new Set(data.map((item: any) => item.courseTitle).filter(Boolean)));
            setCourseList(coursesFromEnrollments as string[]);

            // ดึง All Courses
            const qCourses = query(collection(db, "courses"), orderBy("createdAt", "desc"));
            const snapshotCourses = await getDocs(qCourses);
            const allCoursesData = snapshotCourses.docs.map(doc => ({
                id: doc.id,
                title: doc.data().title
            }));
            setAllCourses(allCoursesData);

        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 3. Search & Filter Logic
    useEffect(() => {
        let result = enrollments;
        if (courseFilter !== "All") {
            result = result.filter(item => item.courseTitle === courseFilter);
        }
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(item =>
                (item.userName && item.userName.toLowerCase().includes(lowerTerm)) ||
                (item.userEmail && item.userEmail.toLowerCase().includes(lowerTerm)) ||
                (item.userTel && item.userTel.includes(lowerTerm)) ||
                (item.courseTitle && item.courseTitle.toLowerCase().includes(lowerTerm))
            );
        }
        setFilteredEnrollments(result);
        setCurrentPage(1); // Reset หน้าเมื่อค้นหา
    }, [searchTerm, courseFilter, enrollments]);

    // 4. ✅ Pagination Logic (คำนวณตรงนี้ เพื่อให้ currentItems มีค่าเสมอ)
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = filteredEnrollments.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredEnrollments.length / ITEMS_PER_PAGE);

    // Actions
    const handleDelete = async (id: string) => {
        if (confirm("ยืนยันการลบข้อมูล?")) {
            await deleteDoc(doc(db, "enrollments", id));
            fetchData();
        }
    }

    const handleEdit = (item: any) => {
        setEditingItem({
            ...item,
            lineId: item.lineId || "",
            userTel: item.userTel || ""
        });
        setIsEditOpen(true);
    }

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
            alert("✅ บันทึกเรียบร้อย");
        } catch (error) {
            console.error("Error:", error);
            alert("บันทึกไม่สำเร็จ");
        }
    }

    const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCourseId = e.target.value;
        const selectedCourse = allCourses.find(c => c.id === newCourseId);
        if (selectedCourse) {
            setEditingItem({
                ...editingItem,
                courseId: newCourseId,
                courseTitle: selectedCourse.title
            });
        }
    };

    // ✅ Auto Fix Data (Run automatically if needed)
    const fixData = async (silent = false) => {
        if (!silent && !confirm("ระบบจะทำการตรวจสอบและกำหนดวันหมดอายุ (5 ปี) ให้กับนักเรียนที่ยังไม่มีข้อมูลวันหมดอายุ โดยใช้วันที่สมัครเป็นวันเริ่มนับ\n\nยืนยันการทำรายการ?")) return;

        if (!silent) setLoading(true);
        try {
            const q = query(collection(db, "enrollments"), where("status", "==", "approved"));
            const snapshot = await getDocs(q);
            let count = 0;
            const updatesPromise = [];

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();

                // Check if expiryDate is missing OR approvedAt is missing
                if (!data.expiryDate || !data.approvedAt) {
                    const updates: any = {};

                    // 1. Determine Start Date (Use approvedAt if exists, else createdAt, else Now)
                    let startDate = data.approvedAt ? data.approvedAt.toDate() : (data.createdAt ? data.createdAt.toDate() : new Date());

                    // 2. Fix approvedAt if missing
                    if (!data.approvedAt) {
                        updates.approvedAt = data.createdAt || new Date(); // Use createdAt as approvedAt if missing
                        startDate = updates.approvedAt.toDate ? updates.approvedAt.toDate() : updates.approvedAt;
                    }

                    // 3. Fix expiryDate if missing
                    if (!data.expiryDate) {
                        const expiryDate = new Date(startDate);
                        expiryDate.setFullYear(expiryDate.getFullYear() + 5);
                        updates.expiryDate = expiryDate;
                        updates.accessType = "limited";
                    }

                    if (Object.keys(updates).length > 0) {
                        updatesPromise.push(updateDoc(doc(db, "enrollments", docSnap.id), updates));
                        count++;
                    }
                }
            }

            if (updatesPromise.length > 0) {
                await Promise.all(updatesPromise);
                if (!silent) alert(`✅ อัปเดตข้อมูลเรียบร้อย ${count} รายการ`);
                fetchData(); // Reload data
            } else {
                if (!silent) alert("ข้อมูลปกติอยู่แล้ว ไม่มีการเปลี่ยนแปลง");
            }

        } catch (error) {
            console.error(error);
            if (!silent) alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Auto-check on load
    useEffect(() => {
        if (enrollments.length > 0) {
            const needsFix = enrollments.some(item => item.status === 'approved' && (!item.expiryDate || !item.approvedAt));
            if (needsFix) {
                console.log("Found missing data, auto-fixing...");
                fixData(true);
            }
        }
    }, [enrollments]);

    // Pagination Component
    const PaginationControl = () => (
        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-sm text-slate-500">หน้า <span className="font-bold text-indigo-600">{currentPage}</span> / {totalPages || 1}</div>
            <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition">← ก่อนหน้า</button>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition">ถัดไป →</button>
            </div>
        </div>
    );

    return (

        <div className="min-h-screen bg-[#F8F9FD] font-sans text-slate-800 p-8">
            <div className="max-w-[95%] mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <Link href="/admin" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition">← กลับหน้า Dashboard</Link>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                            👨‍🎓 ทะเบียนนักเรียน <span className="text-sm bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full font-bold">{filteredEnrollments.length} รายการ</span>
                        </h1>
                        <p className="text-slate-500 mt-1">รายชื่อแยกตามการลงทะเบียน (1 แถว = 1 คอร์ส)</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
                        <input type="text" placeholder="ค้นหาชื่อ, เบอร์, อีเมล, หรือคอร์ส..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-400 transition font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="w-full md:w-64">
                        <select className="w-full h-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-400 font-bold text-slate-600 cursor-pointer" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                            <option value="All">📚 ดูทุกคอร์สเรียน</option>
                            {courseList.map((c, i) => <option key={i} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="mb-4"><PaginationControl /></div>

                <div className="bg-white rounded-[2rem] shadow-lg border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1200px]">
                            {/* ✅ แก้ไข Hydration Error: ไม่มีช่องว่างใน thead */}
                            <thead className="bg-indigo-50/50 border-b border-indigo-100">
                                <tr>
                                    <th className="p-5 text-left text-sm font-bold text-indigo-900 w-12">#</th>
                                    <th className="p-5 text-left text-sm font-bold text-indigo-900">วันที่แจ้งโอน / อนุมัติ</th>
                                    <th className="p-5 text-left text-sm font-bold text-indigo-900">ชื่อนักเรียน (ผู้เรียน)</th>
                                    <th className="p-5 text-left text-sm font-bold text-indigo-900">เบอร์โทรศัพท์</th>
                                    <th className="p-5 text-left text-sm font-bold text-indigo-900">คอร์สที่ลงเรียน</th>
                                    <th className="p-5 text-left text-sm font-bold text-indigo-900">สลิป</th>
                                    <th className="p-5 text-left text-sm font-bold text-indigo-900">สถานะ</th>
                                    <th className="p-5 text-right text-sm font-bold text-indigo-900">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {/* ✅ ใช้ currentItems (ไม่ Error แล้ว) */}
                                {currentItems.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="p-5 text-sm font-bold text-slate-400">
                                            {filteredEnrollments.length - ((currentPage - 1) * ITEMS_PER_PAGE + index)}
                                        </td>
                                        <td className="p-5 text-sm text-slate-500 font-mono">
                                            <div><span className="text-xs text-slate-400">แจ้ง:</span> {item.formattedDate}</div>
                                            {item.formattedApprovedDate && <div className="text-emerald-600 font-bold"><span className="text-xs text-emerald-400">อนุมัติ:</span> {item.formattedApprovedDate}</div>}
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar userId={item.userId} name={item.userName} />
                                                <div>
                                                    <div className="font-bold text-slate-700 text-base">{item.userName || "ไม่ระบุชื่อ"}</div>
                                                    <div className="text-xs text-slate-400 font-medium">{item.userEmail}</div>
                                                    {item.lineId && <div className="text-xs text-green-500 font-bold mt-0.5">Line: {item.lineId}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            {item.userTel ? <span className="text-slate-600 font-mono text-sm flex items-center gap-1"><PhoneIcon /> {item.userTel}</span> : <span className="text-slate-300 text-xs italic">-</span>}
                                        </td>
                                        <td className="p-5">
                                            <span className="inline-block bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-bold text-sm border border-emerald-100 shadow-sm max-w-[200px] truncate">{item.courseTitle}</span>
                                        </td>
                                        <td className="p-5">
                                            {item.slipUrl ? (
                                                <button onClick={() => setSlipModalUrl(item.slipUrl)} className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs border border-blue-100 hover:bg-blue-100 transition"><EyeIcon /> ดูสลิป</button>
                                            ) : <span className="text-slate-300 text-xs italic">ไม่มีหลักฐาน</span>}
                                        </td>
                                        <td className="p-5">
                                            {item.status === 'approved' ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold bg-green-100 text-green-600 px-3 py-1 rounded-full border border-green-200 w-fit">✅ เรียนได้</span>

                                                    {item.accessType === 'lifetime' ? (
                                                        <span className="text-[10px] text-indigo-500 font-bold">♾️ ตลอดชีพ</span>
                                                    ) : item.expiryDate ? (
                                                        (() => {
                                                            const expiry = new Date(item.expiryDate.seconds ? item.expiryDate.seconds * 1000 : item.expiryDate);
                                                            const now = new Date();
                                                            const diffTime = expiry.getTime() - now.getTime();
                                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                            return (
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                                        หมดอายุ: {expiry.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                                    </span>
                                                                    {diffDays > 0 ? (
                                                                        <span className={`text-[10px] font-bold ${diffDays < 30 ? 'text-orange-500' : 'text-emerald-500'}`}>
                                                                            ⏳ เหลือ {diffDays} วัน
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-rose-500 font-bold">🔒 หมดอายุแล้ว</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300">-</span>
                                                    )}
                                                </div>
                                            ) : item.status === 'pending' ? <span className="text-xs font-bold bg-orange-100 text-orange-600 px-3 py-1 rounded-full border border-orange-200 animate-pulse">⏳ รอตรวจสอบ</span> : item.status === 'suspended' ? <span className="text-xs font-bold bg-slate-200 text-slate-600 px-3 py-1 rounded-full border border-slate-300">⏸ พักการเรียน</span> : <span className="text-xs font-bold bg-rose-100 text-rose-600 px-3 py-1 rounded-full border border-rose-200">❌ ยกเลิก</span>}
                                        </td>
                                        <td className="p-5 text-right flex justify-end gap-2">
                                            <button onClick={() => handleEdit(item)} className="text-amber-400 hover:text-amber-600 transition p-2 hover:bg-amber-50 rounded-full border border-transparent hover:border-amber-100"><EditIcon /></button>
                                            <button onClick={() => handleDelete(item.id)} className="text-rose-300 hover:text-rose-600 transition p-2 hover:bg-rose-50 rounded-full border border-transparent hover:border-rose-100"><TrashIcon /></button>
                                        </td>
                                    </tr>
                                ))}
                                {currentItems.length === 0 && <tr><td colSpan={8} className="text-center py-16 text-slate-300 font-medium italic">ไม่พบข้อมูลนักเรียน</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-4"><PaginationControl /></div>
            </div>

            {/* Modal: Edit */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl animate-in fade-in zoom-in max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><div className="bg-amber-100 p-2 rounded-full text-amber-600"><EditIcon /></div> แก้ไขข้อมูล</h3>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ชื่อ-นามสกุล นักเรียน</label><input type="text" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:border-indigo-400 outline-none" value={editingItem.userName} onChange={(e) => setEditingItem({ ...editingItem, userName: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">เบอร์โทรศัพท์</label><input type="text" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:border-indigo-400 outline-none" value={editingItem.userTel} onChange={(e) => setEditingItem({ ...editingItem, userTel: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">อีเมลผู้ปกครอง</label><input type="email" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:border-indigo-400 outline-none" value={editingItem.userEmail} onChange={(e) => setEditingItem({ ...editingItem, userEmail: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">LINE ID</label><input type="text" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:border-indigo-400 outline-none" value={editingItem.lineId} onChange={(e) => setEditingItem({ ...editingItem, lineId: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">คอร์สที่ลงเรียน</label><select className="w-full p-3 bg-emerald-50 border-2 border-emerald-100 rounded-xl font-bold text-emerald-700 cursor-pointer focus:border-emerald-400 outline-none" value={editingItem.courseId} onChange={handleCourseChange}>{allCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">สถานะการเรียน</label><select className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 cursor-pointer focus:border-indigo-400 outline-none" value={editingItem.status} onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}><option value="pending">⏳ รอตรวจสอบ</option><option value="approved">✅ อนุมัติ/เรียนได้</option><option value="suspended">⏸ พักการเรียน</option><option value="rejected">❌ ยกเลิก</option></select></div>

                            {/* ✅ Edit Duration */}
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ประเภทสิทธิ์การเรียน</label>
                                <select
                                    className="w-full p-3 bg-indigo-50 border-2 border-indigo-100 rounded-xl font-bold text-indigo-700 cursor-pointer focus:border-indigo-400 outline-none mb-3"
                                    value={editingItem.accessType || "limited"}
                                    onChange={(e) => setEditingItem({ ...editingItem, accessType: e.target.value })}
                                >
                                    <option value="limited">📅 กำหนดวันหมดอายุ</option>
                                    <option value="lifetime">♾️ ตลอดชีพ</option>
                                </select>

                                {editingItem.accessType !== 'lifetime' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">วันหมดอายุ</label>
                                        <input
                                            type="date"
                                            className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:border-indigo-400 outline-none"
                                            value={editingItem.expiryDate ? new Date(editingItem.expiryDate.seconds ? editingItem.expiryDate.seconds * 1000 : editingItem.expiryDate).toISOString().split('T')[0] : ""}
                                            onChange={(e) => setEditingItem({ ...editingItem, expiryDate: new Date(e.target.value) })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8"><button onClick={() => setIsEditOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition">ยกเลิก</button><button onClick={saveEdit} className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition shadow-lg shadow-indigo-200">บันทึก</button></div>
                    </div>
                </div>
            )}

            {/* Modal: Slip */}
            {slipModalUrl && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSlipModalUrl(null)}>
                    <div className="bg-white p-2 rounded-2xl shadow-2xl max-w-lg w-full relative animate-in fade-in zoom-in">
                        <button onClick={() => setSlipModalUrl(null)} className="absolute -top-12 right-0 text-white text-xl font-bold hover:text-slate-300">✕ ปิด</button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={slipModalUrl} alt="Slip" className="w-full h-auto rounded-xl" />
                    </div>
                </div>
            )}
        </div>

    );
}