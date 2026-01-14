import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

// API Route for lazy loading exam questions for search
export async function GET(request: NextRequest) {
    try {
        const q = query(collection(db, "exams"), orderBy("createdAt", "asc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ exams: [] });
        }

        const exams = snapshot.docs.map(doc => {
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
                questions: questions.map((q: any, idx: number) => ({
                    index: idx + 1,
                    question: q.question || "",
                    options: q.options || [],
                    explanation: q.explanation || "",
                    tags: q.tags || [],
                })),
            };
        });

        return NextResponse.json({ exams }, {
            headers: {
                // Cache for 5 minutes on CDN
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            }
        });
    } catch (error) {
        console.error("Error fetching exam search data:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
