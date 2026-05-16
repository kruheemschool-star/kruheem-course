import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";

// ISR: Cache for 5 minutes to reduce Function Invocations
export const revalidate = 300;

// API Route for lazy loading exam questions for search
export async function GET(request: NextRequest) {
    try {
        const q = query(collection(db, "exams"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ exams: [] });
        }

        const examsRaw = snapshot.docs
            .filter(doc => !doc.data().hidden) // Hide exams marked as hidden
            .map(doc => {
            const data = doc.data();

            // Parse questions
            let questions: any[] = [];
            if (data.questions) {
                if (typeof data.questions === 'string') {
                    try {
                        questions = JSON.parse(data.questions);
                    } catch (e) {
                        questions = [];
                    }
                } else if (Array.isArray(data.questions)) {
                    questions = data.questions;
                }
            }

            // Return only searchable fields (minimize payload).
            // Per-question payload is trimmed to { index, question } only —
            // explanation/options/tags were matched-against but never rendered
            // in search results, and were the bulk of an 8 MB response.
            // category/isFree added so the in-search category filter + free
            // badge in ExamListClient work (they were silently broken).
            return {
                id: doc.id,
                title: data.title || "",
                description: data.description || "",
                level: data.level || "",
                themeColor: data.themeColor || "",
                coverImage: data.coverImage || "",
                tags: data.tags || [],
                category: data.category || "General",
                isFree: data.isFree || false,
                order: data.order ?? Number.MAX_SAFE_INTEGER,
                createdAt: data.createdAt?.toDate?.().getTime() || 0,
                questions: questions.map((q: any, idx: number) => ({
                    index: idx + 1,
                    question: q.question || "",
                })),
            };
        });

        examsRaw.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.createdAt - b.createdAt;
        });

        const exams = examsRaw.map(e => {
            const { order, createdAt, ...rest } = e;
            return rest;
        });

        return NextResponse.json({ exams });
    } catch (error) {
        console.error("Error fetching exam search data:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

