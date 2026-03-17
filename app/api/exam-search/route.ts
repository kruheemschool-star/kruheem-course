import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";

// API Route for lazy loading exam questions for search
export async function GET(request: NextRequest) {
    try {
        const q = query(collection(db, "exams"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ exams: [] });
        }

        const examsRaw = snapshot.docs.map(doc => {
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

            // Return only searchable fields (minimize payload)
            return {
                id: doc.id,
                title: data.title || "",
                description: data.description || "",
                level: data.level || "",
                themeColor: data.themeColor || "",
                coverImage: data.coverImage || "",
                tags: data.tags || [],
                order: data.order ?? Number.MAX_SAFE_INTEGER,
                createdAt: data.createdAt?.toDate?.().getTime() || 0,
                questions: questions.map((q: any, idx: number) => ({
                    index: idx + 1,
                    question: q.question || "",
                    options: q.options || [],
                    explanation: q.explanation || "",
                    tags: q.tags || [],
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

        return NextResponse.json({ exams }, {
            headers: {
                // Prevent caching so order changes show up immediately in search
                'Cache-Control': 'no-store, max-age=0',
            }
        });
    } catch (error) {
        console.error("Error fetching exam search data:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

