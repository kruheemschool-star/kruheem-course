"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { db } from "@/lib/firebase";
import { collectionGroup, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { ExamResultsView, ExamResultRow } from "@/components/admin/ExamResultsView";

export default function AdminExamResultsPage() {
    const { id } = useParams();
    const courseId = typeof id === "string" ? id : "";
    const [rows, setRows] = useState<ExamResultRow[]>([]);
    const [courseTitle, setCourseTitle] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!courseId) return;
        (async () => {
            try {
                try {
                    const c = await getDoc(doc(db, "courses", courseId));
                    if (c.exists()) setCourseTitle((c.data() as { title?: string }).title || "");
                } catch { /* title is non-critical */ }

                // Lesson-exam results for THIS course. Prefer the indexed
                // collection-group query (filters server-side instead of pulling
                // every student's results). If the composite index isn't built yet,
                // fall back to a full scan so the page keeps working regardless of
                // deploy order — the JS filter below keeps both paths correct.
                let docs;
                try {
                    docs = (await getDocs(query(
                        collectionGroup(db, "lessonExamResults"),
                        where("courseId", "==", courseId)
                    ))).docs;
                } catch (indexErr) {
                    console.warn("[exam-results] indexed query unavailable, full scan fallback:", indexErr);
                    docs = (await getDocs(collectionGroup(db, "lessonExamResults"))).docs;
                }
                const out: ExamResultRow[] = [];
                docs.forEach((d) => {
                    const data = d.data() as { courseId?: string; studentName?: string; studentEmail?: string; lessonTitle?: string; bestPercent?: number; attempts?: number };
                    if ((data.courseId || "") !== courseId) return;
                    const uid = d.ref.parent.parent?.id || "?";
                    const name = (data.studentName && data.studentName.trim())
                        || (data.studentEmail && data.studentEmail.trim())
                        || ("นักเรียน " + uid.slice(0, 6));
                    out.push({
                        uid,
                        name,
                        lessonTitle: data.lessonTitle || "(ไม่มีชื่อชุด)",
                        bestPercent: typeof data.bestPercent === "number" ? data.bestPercent : 0,
                        attempts: data.attempts || 1,
                    });
                });
                setRows(out);
            } catch (e) {
                console.warn("[exam-results] load failed:", e);
            } finally {
                setLoading(false);
            }
        })();
    }, [courseId]);

    return (
        <AdminGuard>
            <div className="min-h-screen bg-[#F0F7F4] dark:bg-slate-900 font-sans pb-20">
                <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-white/20 dark:border-slate-800 px-6 py-4 shadow-sm">
                    <div className="max-w-5xl mx-auto flex items-center gap-4">
                        <Link href={`/admin/course/${courseId}`} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-500">
                            <ArrowLeft size={24} />
                        </Link>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">📊 ผลสอบนักเรียน</h1>
                            <p className="text-xs text-slate-500 truncate">{courseTitle}</p>
                        </div>
                    </div>
                </header>
                <main className="max-w-5xl mx-auto p-6 md:p-8">
                    <ExamResultsView rows={rows} loading={loading} />
                </main>
            </div>
        </AdminGuard>
    );
}
