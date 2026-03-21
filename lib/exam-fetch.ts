import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";

export interface ExamMeta {
    id: string;
    title: string;
    description: string;
    level: string;
    category: string;
    examType: string;
    difficulty: string;
    themeColor: string;
    coverImage: string;
    tags: string[];
    isFree: boolean;
    questionCount: number;
    order: number;
    createdAt: string | null;
}

export async function fetchAllExams(): Promise<ExamMeta[]> {
    try {
        const q = query(collection(db, "exams"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return [];

        const examList = snapshot.docs
            .filter(doc => !doc.data().hidden)
            .map(doc => {
                const data = doc.data();

                let questionCount = 0;
                if (data.questions) {
                    if (typeof data.questions === 'string') {
                        try {
                            const parsed = JSON.parse(data.questions);
                            questionCount = Array.isArray(parsed) ? parsed.length : 0;
                        } catch {
                            questionCount = 0;
                        }
                    } else if (Array.isArray(data.questions)) {
                        questionCount = data.questions.length;
                    }
                }

                return {
                    id: doc.id,
                    title: data.title || "",
                    description: data.description || "",
                    level: data.level || "",
                    category: data.category || "General",
                    examType: data.examType || "practice",
                    difficulty: data.difficulty || "Medium",
                    themeColor: data.themeColor || "Blue",
                    coverImage: data.coverImage || "",
                    tags: data.tags || [],
                    isFree: data.isFree || false,
                    questionCount,
                    order: data.order ?? Number.MAX_SAFE_INTEGER,
                    createdAt: data.createdAt?.toDate?.().toISOString() || null,
                };
            });

        examList.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeA - timeB;
        });

        return examList;
    } catch (error) {
        console.error("Error fetching exams:", error);
        return [];
    }
}

export async function fetchExamsByType(examType: string): Promise<ExamMeta[]> {
    const all = await fetchAllExams();
    if (examType === "free") {
        return all.filter(e => e.examType === "free" || e.isFree);
    }
    return all.filter(e => e.examType === examType);
}

export function countExamsByType(exams: ExamMeta[]): Record<string, number> {
    const counts: Record<string, number> = { entrance: 0, practice: 0, chapter: 0, free: 0 };
    exams.forEach(e => {
        const type = e.examType || "practice";
        if (counts[type] !== undefined) counts[type]++;
        if (e.isFree && type !== "free") counts.free++;
    });
    return counts;
}
