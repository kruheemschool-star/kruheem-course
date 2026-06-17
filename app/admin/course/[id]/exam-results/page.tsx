"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import { db } from "@/lib/firebase";
import { collectionGroup, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { BarChart3 } from "lucide-react";
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
            <div className="space-y-6">
                <div>
                    <span className="kh-eyebrow"><BarChart3 size={14} /> ผลสอบนักเรียน</span>
                    {courseTitle && <p className="kh-ink2 text-sm mt-1 truncate">{courseTitle}</p>}
                </div>
                <ExamResultsView rows={rows} loading={loading} />
            </div>
        </AdminGuard>
    );
}
