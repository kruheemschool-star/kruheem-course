"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

import { Download, Database, ShieldCheck, Loader2 } from "lucide-react";

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
        <div className="space-y-6">
            <div className="kh-card" style={{ padding: 28 }}>
                <div className="flex items-start gap-4" style={{ marginBottom: 28 }}>
                    <div
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: "var(--accent-soft)",
                            color: "var(--accent)",
                        }}
                    >
                        <ShieldCheck size={26} strokeWidth={2} />
                    </div>
                    <div>
                        <p className="kh-eyebrow">ความปลอดภัยข้อมูล</p>
                        <h2 className="kh-ink text-xl font-bold" style={{ marginBottom: 8 }}>
                            ระบบสำรองข้อมูลอัตโนมัติ
                        </h2>
                        <p className="kh-ink2 leading-relaxed">
                            กดปุ่มด้านล่างเพื่อดาวน์โหลดข้อมูลทั้งหมดของระบบเก็บไว้ในเครื่องคอมพิวเตอร์ของคุณ
                            ไฟล์ที่ได้จะเป็นนามสกุล <code>.json</code> ซึ่งประกอบด้วย:
                        </p>
                        <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
                            <span className="kh-pill">ข้อมูลคอร์สเรียน และบทเรียนทั้งหมด</span>
                            <span className="kh-pill">รายชื่อนักเรียน และข้อมูลผู้ใช้งาน</span>
                            <span className="kh-pill">ประวัติการลงทะเบียนเรียน (Enrollments)</span>
                            <span className="kh-pill">ประกาศแจ้งเตือนต่างๆ</span>
                        </div>
                    </div>
                </div>

                <div
                    className="flex flex-col items-center justify-center"
                    style={{
                        padding: 32,
                        borderRadius: 16,
                        background: "var(--card-2)",
                        border: "1px dashed var(--line)",
                    }}
                >
                    <div
                        className="flex items-center justify-center"
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: 16,
                            background: "var(--card)",
                            border: "1px solid var(--line)",
                            color: "var(--accent)",
                            marginBottom: 16,
                        }}
                    >
                        <Database size={26} strokeWidth={2} />
                    </div>
                    <button onClick={handleBackup} disabled={loading} className="kh-btn">
                        {loading ? (
                            <>
                                <Loader2 size={20} strokeWidth={2} className="animate-spin" />
                                กำลังดึงข้อมูล...
                            </>
                        ) : (
                            <>
                                <Download size={20} strokeWidth={2} />
                                ดาวน์โหลดไฟล์ Backup
                            </>
                        )}
                    </button>
                    <p className="kh-ink3 text-xs" style={{ marginTop: 16 }}>
                        *ควรทำเป็นประจำทุกสัปดาห์ หรือก่อนทำการแก้ไขข้อมูลสำคัญ
                    </p>
                </div>
            </div>
        </div>
    );
}
