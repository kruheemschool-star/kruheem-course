import { Metadata, ResolvingMetadata } from "next";
import { ExamSystem } from "@/components/exam/ExamSystem";
import ExamAccessGuard from "@/components/exam/ExamAccessGuard";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import BookmarkButton from "@/components/exam/BookmarkButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidExamQuestion, getValidQuestionCount } from "@/lib/exam-utils";
import { getExamData, getExamConfig } from "@/lib/examData";

// The route itself stays dynamic (it awaits searchParams), but the exam DATA
// is served from the Next data cache via lib/examData (REST fetch, 1h +
// "exams-feed" tag) — the old client-SDK reads here could never be cached and
// cost 2 full reads of a 250KB–1MiB doc per page view.

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

// โหลดชุดข้อสอบผ่าน lib/examData (cache แล้ว) + mock fallback สำหรับ demo/dev
async function getExamDataWithMock(id: string) {
    const exam = await getExamData(id);
    if (exam) return exam;
    if (MOCK_EXAMS[id]) {
        return { id, ...MOCK_EXAMS[id] };
    }
    return null;
}

// 1. Dynamic Metadata for SEO
export async function generateMetadata(
    props: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const params = await props.params;
    const exam = await getExamDataWithMock(params.id);

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

    const [exam, examConfig] = await Promise.all([getExamDataWithMock(params.id), getExamConfig()]);
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
        "hasPart": (exam.questions || []).filter(isValidExamQuestion).map((q: any) => ({
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
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col transition-colors" suppressHydrationWarning>
            <div className="bg-white border-b border-slate-100 py-4 px-6 fixed top-0 w-full z-10 shadow-sm flex items-center justify-between">
                <Link href="/exam" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors">
                    <ArrowLeft size={20} />
                    <span className="hidden md:inline">ออกจากห้องสอบ</span>
                </Link>
                <div className="font-bold text-slate-800 truncate max-w-xs md:max-w-md">
                    {exam.title}
                </div>
                <div className="flex items-center gap-1">
                    <BookmarkButton examId={exam.id} />
                </div>
            </div>

            <main className="pt-24 pb-12 container mx-auto px-4 flex-grow">
                <ExamAccessGuard isFree={exam.isFree || false}>
                    <ExamSystem
                        examData={exam.questions || []}
                        examTitle={exam.title}
                        examId={exam.id}
                        category={exam.category || ''}
                        level={exam.level || ''}
                        recommendedSecondsPerQuestion={exam.recommendedSecondsPerQuestion}
                        timedMode={exam.timedMode || false}
                        timeLimitMinutes={exam.timeLimit}
                        initialQuestionIndex={initialQuestionIndex}
                        showAnswerChecking={exam.showAnswerChecking || false}
                        enableResultTracking={examConfig.enableResultTracking || false}
                    />
                </ExamAccessGuard>
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
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs">จำนวน {getValidQuestionCount(exam.questions)} ข้อ</span>
                    </div>
                </div>
            </div>

            {/* Inject JSON-LD at the end to prevent hydration mismatch */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
        </div>
    );
}
