import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { notFound } from "next/navigation";
import PrintPageClient from "./PrintPageClient";

// ISR: Cache for 1 minute
export const revalidate = 60;

async function getExamData(id: string) {
    if (!id) return null;

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const docRef = doc(db, "exams", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                let questions = [];

                if (data.questions) {
                    if (typeof data.questions === 'string') {
                        try {
                            questions = JSON.parse(data.questions);
                        } catch (e) {
                            questions = [];
                        }
                    } else {
                        questions = data.questions;
                    }
                } else if (data.questionsUrl) {
                    try {
                        const res = await fetch(data.questionsUrl, { signal: AbortSignal.timeout(8000) });
                        if (res.ok) {
                            questions = await res.json();
                        }
                    } catch (fetchErr) {
                        console.error("Error fetching questionsUrl:", fetchErr);
                        questions = [];
                    }
                }

                const normalizedQuestions = Array.isArray(questions) ? questions.map((q: any) => ({
                    ...q,
                    explanation: q.explanation || q.solution || '',
                    correctIndex: q.correctIndex ?? q.answerIndex ?? 0,
                })) : [];

                return {
                    id: docSnap.id,
                    title: data.title || '',
                    category: data.category || '',
                    level: data.level || '',
                    isFree: data.isFree || false,
                    questions: normalizedQuestions,
                };
            }

            break;
        } catch (error) {
            console.error(`Error fetching exam for print (attempt ${attempt + 1}):`, error);
            if (attempt === 0) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
    }

    return null;
}

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ mode?: string }>;
}

export default async function ExamPrintPage(props: Props) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const mode = searchParams.mode === 'answer' ? 'answer' : 'exam';

    const exam = await getExamData(params.id);
    if (!exam) return notFound();

    return <PrintPageClient exam={exam} mode={mode} />;
}
