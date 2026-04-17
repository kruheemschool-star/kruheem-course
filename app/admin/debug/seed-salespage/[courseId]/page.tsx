"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useUserAuth } from "@/context/AuthContext";
import Link from "next/link";
import { buildSampleSalesPage } from "./sampleData";

export default function SeedSalesPagePage() {
    const { courseId } = useParams();
    const router = useRouter();
    const { isAdmin } = useUserAuth();
    const [status, setStatus] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [courseTitle, setCourseTitle] = useState<string>("");

    const cid = typeof courseId === "string" ? courseId : "";

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center text-slate-600">
                Admin only
            </div>
        );
    }

    const handleCheck = async () => {
        setLoading(true);
        setStatus("");
        try {
            const snap = await getDoc(doc(db, "courses", cid));
            if (!snap.exists()) {
                setStatus("❌ ไม่พบ course นี้");
            } else {
                const data = snap.data();
                setCourseTitle(data.title || "(ไม่มีชื่อ)");
                const hasSalesPage = !!data.salesPage;
                setStatus(
                    `✅ พบ course: "${data.title}"\n` +
                        `salesPage: ${hasSalesPage ? "มีแล้ว (" + (data.salesPage.sections?.length || 0) + " sections)" : "ยังไม่มี"}`
                );
            }
        } catch (e: any) {
            setStatus("❌ Error: " + e.message);
        }
        setLoading(false);
    };

    const handleSeed = async () => {
        setLoading(true);
        setStatus("กำลังบันทึก...");
        try {
            const courseRef = doc(db, "courses", cid);
            const snap = await getDoc(courseRef);
            if (!snap.exists()) {
                setStatus("❌ ไม่พบ course นี้");
                setLoading(false);
                return;
            }
            const data = snap.data();
            const sample = buildSampleSalesPage({
                title: data.title || "คอร์สตัวอย่าง",
                price: data.price || 2900,
                fullPrice: data.fullPrice || 4900,
            });
            await updateDoc(courseRef, { salesPage: sample });
            setStatus(
                `✅ เพิ่ม salesPage ตัวอย่าง ${sample.sections.length} sections สำเร็จ!\n` +
                    `ไปดูได้ที่: /course/${cid}`
            );
        } catch (e: any) {
            setStatus("❌ Error: " + e.message);
        }
        setLoading(false);
    };

    const handleDisable = async () => {
        setLoading(true);
        setStatus("กำลังปิดใช้งาน...");
        try {
            const courseRef = doc(db, "courses", cid);
            await updateDoc(courseRef, { "salesPage.enabled": false });
            setStatus("✅ ปิดใช้งาน template แล้ว (คอร์สจะกลับไปใช้ page เดิม)");
        } catch (e: any) {
            setStatus("❌ Error: " + e.message);
        }
        setLoading(false);
    };

    const handleRemove = async () => {
        if (!confirm("ลบ salesPage ออกจาก course นี้ถาวร?")) return;
        setLoading(true);
        setStatus("กำลังลบ...");
        try {
            const courseRef = doc(db, "courses", cid);
            await updateDoc(courseRef, { salesPage: null });
            setStatus("✅ ลบ salesPage แล้ว");
        } catch (e: any) {
            setStatus("❌ Error: " + e.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 py-20 px-6">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">🧪 Seed Sample SalesPage</h1>
                <p className="text-slate-500 mb-6 text-sm">
                    เครื่องมือ dev: เพิ่ม/แก้ <code className="bg-slate-100 px-2 py-0.5 rounded">course.salesPage</code> เพื่อทดสอบ template
                </p>

                <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Course ID</p>
                    <p className="font-mono text-slate-800">{cid}</p>
                    {courseTitle && <p className="text-sm text-slate-600 mt-1">{courseTitle}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                        onClick={handleCheck}
                        disabled={loading}
                        className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition disabled:opacity-50"
                    >
                        🔍 เช็คสถานะ
                    </button>
                    <button
                        onClick={handleSeed}
                        disabled={loading}
                        className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                        ✨ Seed ตัวอย่าง
                    </button>
                    <button
                        onClick={handleDisable}
                        disabled={loading}
                        className="px-4 py-3 rounded-xl bg-amber-100 text-amber-700 font-bold hover:bg-amber-200 transition disabled:opacity-50"
                    >
                        ⏸️ ปิดใช้งาน
                    </button>
                    <button
                        onClick={handleRemove}
                        disabled={loading}
                        className="px-4 py-3 rounded-xl bg-red-100 text-red-700 font-bold hover:bg-red-200 transition disabled:opacity-50"
                    >
                        🗑️ ลบออก
                    </button>
                </div>

                {status && (
                    <pre className="p-4 bg-slate-900 text-green-300 rounded-xl text-sm whitespace-pre-wrap font-mono mb-4">
                        {status}
                    </pre>
                )}

                <div className="flex items-center gap-3 text-sm">
                    <Link
                        href={`/course/${cid}`}
                        target="_blank"
                        className="text-indigo-600 hover:underline font-bold"
                    >
                        → เปิดหน้า sales page
                    </Link>
                    <span className="text-slate-300">|</span>
                    <button onClick={() => router.back()} className="text-slate-500 hover:underline">
                        กลับ
                    </button>
                </div>
            </div>
        </div>
    );
}
