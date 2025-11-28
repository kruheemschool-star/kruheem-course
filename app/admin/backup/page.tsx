"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

import Link from "next/link";

export default function BackupPage() {
    const [loading, setLoading] = useState(false);

    const handleBackup = async () => {
        setLoading(true);
        try {
            const backupData: any = {};

            // 1. Courses & Lessons
            const coursesSnap = await getDocs(collection(db, "courses"));
            backupData.courses = [];
            for (const doc of coursesSnap.docs) {
                const courseData = { id: doc.id, ...doc.data() } as any;
                // Fetch lessons
                const lessonsSnap = await getDocs(collection(db, "courses", doc.id, "lessons"));
                courseData.lessons = lessonsSnap.docs.map(l => ({ id: l.id, ...l.data() }));
                backupData.courses.push(courseData);
            }

            // 2. Users
            const usersSnap = await getDocs(collection(db, "users"));
            backupData.users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 3. Enrollments
            const enrollmentsSnap = await getDocs(collection(db, "enrollments"));
            backupData.enrollments = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 4. Notifications
            const notificationsSnap = await getDocs(collection(db, "notifications"));
            backupData.notifications = notificationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Create JSON file
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `kruheem-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert("✅ Backup Complete! File downloaded.");
        } catch (error: any) {
            console.error(error);
            alert("Error backing up: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (

        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <div className="max-w-4xl mx-auto py-12 px-6">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition">
                        ⬅️
                    </Link>
                    <h1 className="text-3xl font-bold">💾 สำรองข้อมูล (Backup)</h1>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-start gap-4 mb-8">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                            🛡️
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">ระบบสำรองข้อมูลอัตโนมัติ</h2>
                            <p className="text-slate-600 leading-relaxed">
                                กดปุ่มด้านล่างเพื่อดาวน์โหลดข้อมูลทั้งหมดของระบบเก็บไว้ในเครื่องคอมพิวเตอร์ของคุณ
                                ไฟล์ที่ได้จะเป็นนามสกุล <code>.json</code> ซึ่งประกอบด้วย:
                            </p>
                            <ul className="list-disc list-inside mt-2 text-slate-500 space-y-1 ml-2">
                                <li>ข้อมูลคอร์สเรียน และบทเรียนทั้งหมด</li>
                                <li>รายชื่อนักเรียน และข้อมูลผู้ใช้งาน</li>
                                <li>ประวัติการลงทะเบียนเรียน (Enrollments)</li>
                                <li>ประกาศแจ้งเตือนต่างๆ</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <button
                            onClick={handleBackup}
                            disabled={loading}
                            className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-3 disabled:opacity-50 shadow-lg hover:shadow-indigo-200 transform hover:-translate-y-1"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    กำลังดึงข้อมูล...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                    ดาวน์โหลดไฟล์ Backup
                                </>
                            )}
                        </button>
                        <p className="mt-4 text-xs text-slate-400">
                            *ควรทำเป็นประจำทุกสัปดาห์ หรือก่อนทำการแก้ไขข้อมูลสำคัญ
                        </p>
                    </div>
                </div>
            </div>
        </div>

    );
}
