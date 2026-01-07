import { Metadata, ResolvingMetadata } from "next";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ExamSystem } from "@/components/exam/ExamSystem";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

// Mock Data Fallback (For Demo/Dev)
const MOCK_EXAMS: Record<string, any> = {
    "math-m1-algebra": {
        title: "แบบทดสอบพีชคณิตพื้นฐาน ม.1",
        description: "ทดสอบความเข้าใจเรื่องสมการ ตัวแปร และการแก้โจทย์ปัญหาเบื้องต้น เหมาะสำหรับนักเรียนชั้นมัธยมศึกษาปีที่ 1",
        questions: [
            {
                id: 1,
                question: "จงหาค่าของ \\( x \\) จากสมการ \\( 3x - 7 = 14 \\)",
                options: ["\\( x = 5 \\)", "\\( x = 7 \\)", "\\( x = 21 \\)", "\\( x = -7 \\)"],
                correctIndex: 1,
                explanation: "ย้ายข้างสมการ:\n$$ 3x = 14 + 7 $$\n$$ 3x = 21 $$\n$$ x = 7 $$"
            },
            {
                id: 2,
                question: "ถ้า \\( a = 2, b = -3 \\) ค่าของ \\( a^2 - 2ab + b^2 \\) คือเท่าใด",
                options: ["25", "1", "-5", "13"],
                correctIndex: 0,
                explanation: "สูตรกำลังสองสมบูรณ์ \\( (a-b)^2 \\)\nแทนค่า: \\( (2 - (-3))^2 = (2+3)^2 = 5^2 = 25 \\)"
            }
        ]
    }
};

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ q?: string }>;
}

async function getExamData(id: string) {
    try {
        if (!id) return null;
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
                const res = await fetch(data.questionsUrl);
                questions = await res.json();
            }

            return {
                id: docSnap.id,
                ...data,
                questions
            };
        }

        // Fallback
        if (MOCK_EXAMS[id]) {
            return {
                id,
                ...MOCK_EXAMS[id]
            };
        }

        return null;
    } catch (error) {
        console.error("Error fetching exam:", error);
        return null;
    }
}

// 1. Dynamic Metadata for SEO
export async function generateMetadata(
    props: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const params = await props.params;
    const exam = await getExamData(params.id);

    if (!exam) {
        return {
            title: "ไม่พบข้อสอบ | Kruheem Math",
        };
    }

    const title = `${exam.title} - แบบทดสอบออนไลน์ | Kruheem Math`;
    const description = exam.description || `ฝึกทำโจทย์ ${exam.title} พร้อมเฉลยละเอียดและวิเคราะห์คะแนน`;
    const images = exam.coverImage ? [exam.coverImage] : [];

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images,
        }
    };
}

export default async function ExamRoomPage(props: Props) {
    const params = await props.params;
    const searchParams = await props.searchParams;

    const exam = await getExamData(params.id);
    const initialQuestionIndex = searchParams.q ? parseInt(searchParams.q, 10) : 0;

    if (!exam) {
        return notFound();
    }

    // 2. Structured Data (JSON-LD) for Google
    // Using Quiz Schema
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Quiz",
        "name": exam.title,
        "description": exam.description || `แบบทดสอบเรื่อง ${exam.title}`,
        "educationLevel": exam.level || "General",
        "about": {
            "@type": "Thing",
            "name": exam.category || "Mathematics"
        },
        "hasPart": exam.questions?.map((q: any) => ({
            "@type": "Question",
            "name": q.question ? q.question.substring(0, 150) : "Question",
            "suggestedAnswer": {
                "@type": "Answer",
                "text": q.options?.[q.correctIndex] || "Correct Answer"
            },
            "acceptedAnswer": {
                "@type": "Answer",
                "text": q.options?.[q.correctIndex] || "Correct Answer",
                "answerExplanation": q.explanation
            }
        }))
    };

    return (
        <div className="min-h-screen bg-[#FDFCF8] flex flex-col">
            {/* Inject JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <div className="bg-white border-b border-slate-100 py-4 px-6 fixed top-0 w-full z-10 shadow-sm flex items-center justify-between">
                <Link href="/exam" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors">
                    <ArrowLeft size={20} />
                    <span className="hidden md:inline">ออกจากห้องสอบ</span>
                </Link>
                <div className="font-bold text-slate-800 truncate max-w-xs md:max-w-md">
                    {exam.title}
                </div>
                <div className="w-8"></div> {/* Spacer */}
            </div>

            <main className="pt-24 pb-12 container mx-auto px-4 flex-grow">
                <ExamSystem
                    examData={exam.questions || []}
                    examTitle={exam.title}
                    initialQuestionIndex={initialQuestionIndex}
                />
            </main>

            {/* SEO Text Content (Visible but unobtrusive) - Helps search engines understand context better */}
            <div className="container mx-auto px-6 pb-8 text-slate-400 text-sm">
                <div className="border-t border-slate-100 pt-6 mt-6">
                    <h2 className="font-bold text-slate-500 flex items-center gap-2 mb-2">
                        <ArrowUpRight size={16} />
                        เกี่ยวกับแบบทดสอบนี้
                    </h2>
                    <p className="mb-2">{exam.description || `ฝึกฝนและทดสอบความรู้ในหัวข้อ ${exam.title}`}</p>
                    <div className="flex flex-wrap gap-2">
                        {exam.category && (
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs">{exam.category}</span>
                        )}
                        {exam.level && (
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs">{exam.level}</span>
                        )}
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs">จำนวน {exam.questions?.length || 0} ข้อ</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
