"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { Plus, Trash2, Edit, BookOpen, Clock, FileJson, AlertCircle } from "lucide-react";

export default function ExamManagerPage() {
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching exams:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าจะลบชุดข้อสอบนี้? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;

        try {
            await deleteDoc(doc(db, "exams", id));
            setExams(prev => prev.filter(exam => exam.id !== id));
            alert("ลบสำเร็จ!");
        } catch (error) {
            console.error("Error deleting exam:", error);
            alert("เกิดข้อผิดพลาดในการลบ");
        }
    };

    const handleQuickAdd = async () => {
        // Quick Demo Add Function
        const title = prompt("ชื่อชุดข้อสอบ:");
        if (!title) return;

        try {
            await addDoc(collection(db, "exams"), {
                title,
                description: "รายละเอียดเบื้องต้น...",
                category: "ม.ต้น",
                level: "ม.1",
                questionCount: 0,
                timeLimit: 30,
                difficulty: "Medium",
                createdAt: serverTimestamp(),
                questions: [] // Empty Array initially
            });
            fetchExams();
            alert("เพิ่มชุดข้อสอบใหม่แล้ว!");
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">จัดการคลังข้อสอบ 📚</h1>
                        <p className="text-slate-500">สร้างและแก้ไขชุดข้อสอบสำหรับนักเรียน</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/admin" className="px-4 py-2 bg-white text-slate-600 rounded-lg hover:bg-slate-100 font-bold border border-slate-200">
                            ย้อนกลับ
                        </Link>
                        <button onClick={handleQuickAdd} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-2 shadow-lg shadow-indigo-200">
                            <Plus size={20} />
                            สร้างข้อสอบใหม่
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-400">กำลังโหลดข้อมูล...</div>
                ) : exams.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
                        <div className="text-4xl mb-4 opacity-50">📂</div>
                        <h3 className="text-xl font-bold text-slate-600">ยังไม่มีชุดข้อสอบ</h3>
                        <p className="text-slate-400 mt-2">เริ่มสร้างชุดแรกกันเลย!</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-sm">
                                <tr>
                                    <th className="p-6">ชื่อชุดข้อสอบ</th>
                                    <th className="p-6">หมวดหมู่</th>
                                    <th className="p-6 text-center">ระดับความยาก</th>
                                    <th className="p-6 text-center">จำนวนข้อ</th>
                                    <th className="p-6 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {exams.map((exam) => (
                                    <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-6">
                                            <div className="font-bold text-slate-800 text-lg">{exam.title}</div>
                                            <div className="text-sm text-slate-400 line-clamp-1 max-w-sm">{exam.description || "-"}</div>
                                        </td>
                                        <td className="p-6">
                                            <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100">
                                                {exam.category} / {exam.level}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${exam.difficulty === 'Easy' ? 'text-green-500 bg-green-50' :
                                                exam.difficulty === 'Hard' ? 'text-red-500 bg-red-50' :
                                                    'text-amber-500 bg-amber-50'
                                                }`}>
                                                {exam.difficulty}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center font-mono text-slate-500">
                                            {exam.questions?.length || 0}
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/admin/exams/${exam.id}`}
                                                    className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg tooltip"
                                                    title="แก้ไขเนื้อหา (JSON Editor)"
                                                >
                                                    <FileJson size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(exam.id)}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg tooltip"
                                                    title="ลบชุดข้อสอบ"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
