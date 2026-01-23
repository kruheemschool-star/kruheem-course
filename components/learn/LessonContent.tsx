import React from 'react';
import Link from 'next/link';
import { Lesson } from './types';
import { SmartContentRenderer } from "@/components/ContentRenderer";
import { FlashcardPlayer } from './FlashcardPlayer';
import { ExamRunner } from './ExamRunner';
import { tryParseQuestions } from './utils';
import LessonSummaryRenderer from './LessonSummaryRenderer';

interface LessonContentProps {
    activeLesson: Lesson | null;
    canWatchCurrent: boolean;
    isHeaderMode: boolean;
    isEnrolled: boolean;
    isAdmin: boolean;
    isExpired: boolean;
    currentVideoId: string;
    selectedAnswer: number | null;
    isAnswered: boolean;
    setSelectedAnswer: (index: number | null) => void;
    setIsAnswered: (answered: boolean) => void;
    markAsComplete: (lessonId: string) => void;
    handleNextLesson: () => void;
}

export const LessonContent: React.FC<LessonContentProps> = ({
    activeLesson,
    canWatchCurrent,
    isHeaderMode,
    isEnrolled,
    isAdmin,
    isExpired,
    currentVideoId,
    selectedAnswer,
    isAnswered,
    setSelectedAnswer,
    setIsAnswered,
    markAsComplete,
    handleNextLesson
}) => {
    const [showSummary, setShowSummary] = React.useState(false);

    return (
        <div className="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-slate-950 relative">
            {/* ✅ Summary Modal */}
            {showSummary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#191919]/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#202020] w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-300 ring-1 ring-black/5 dark:ring-white/10">
                        {/* Header */}
                        <div className="p-6 border-b border-[#E9E9E7] dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#202020] z-10 sticky top-0">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-[#37352F] dark:text-gray-200">
                                <span className="text-xl">📝</span> สรุปเนื้อหา
                            </h3>
                            <button
                                onClick={() => setShowSummary(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
                                {activeLesson?.content ? (
                                    (() => {
                                        // 🧠 Smart Content Rendering Logic
                                        try {
                                            // 1. Try Direct Parse
                                            const parsed = JSON.parse(activeLesson.content);
                                            if (parsed && (parsed.documentMetadata || parsed.sections)) {
                                                return <LessonSummaryRenderer data={parsed} />;
                                            }
                                        } catch (e) {
                                            // 2. Try Smart Extraction (Mixed Content)
                                            // Find JSON block starting with { "documentMetadata" ...
                                            const match = activeLesson.content.match(/(\{[\s\S]*"documentMetadata"[\s\S]*"sections"[\s\S]*\})/);
                                            if (match) {
                                                const jsonPart = match[1];
                                                const textPart = activeLesson.content.replace(jsonPart, "");
                                                try {
                                                    const parsed = JSON.parse(jsonPart);
                                                    return (
                                                        <>
                                                            {/* Render Intro Text if any */}
                                                            {textPart && <div dangerouslySetInnerHTML={{ __html: textPart }} className="mb-8 border-b pb-4" />}
                                                            {/* Render Rich Summary */}
                                                            <LessonSummaryRenderer data={parsed} />
                                                        </>
                                                    );
                                                } catch (err) {
                                                    // Extraction failed to parse
                                                }
                                            }
                                        }
                                        // Fallback to Standard HTML
                                        return <div dangerouslySetInnerHTML={{ __html: activeLesson.content }} />;
                                    })()
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 opacity-70">
                                        <div className="text-4xl mb-4">📄</div>
                                        <p>ยังไม่มีสรุปเนื้อหาสำหรับบทเรียนนี้</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Backdrop click to close */}
                    <div className="absolute inset-0 -z-10" onClick={() => setShowSummary(false)}></div>
                </div>
            )}

            {isHeaderMode ? (
                <div className="h-full flex items-center justify-center p-10">
                    {activeLesson?.image ?
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={activeLesson.image} alt="Header" className="max-w-full max-h-full rounded-xl shadow-2xl" />
                        : <div className="text-gray-400">No Cover Image</div>}
                </div>
            ) : canWatchCurrent ? (
                activeLesson?.type === 'quiz' ? (
                    <div className="w-full min-h-full flex flex-col items-center justify-center py-10 px-4 bg-slate-100 dark:bg-slate-950">
                        <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 text-center">
                            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-8">{activeLesson.title}</h2>
                            <div className="space-y-4 text-left">
                                {activeLesson.options?.map((opt: string, index: number) => {
                                    let btnClass = "border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300";
                                    if (isAnswered) {
                                        if (index === activeLesson.correctAnswer) btnClass = "bg-emerald-50 border-emerald-400 text-emerald-700";
                                        else if (selectedAnswer === index) btnClass = "bg-rose-50 border-rose-300 text-rose-600";
                                    } else if (selectedAnswer === index) btnClass = "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md";
                                    return <button key={index} onClick={() => !isAnswered && setSelectedAnswer(index)} className={`w-full p-5 rounded-2xl font-bold text-lg transition-all duration-200 ${btnClass}`}>{opt}</button>;
                                })}
                            </div>
                            {!isAnswered ? (
                                <button
                                    onClick={() => {
                                        setIsAnswered(true);
                                        if (selectedAnswer === activeLesson.correctAnswer) {
                                            markAsComplete(activeLesson.id);
                                            // ✅ Auto Next Lesson
                                            setTimeout(() => handleNextLesson(), 1500);
                                        }
                                    }}
                                    disabled={selectedAnswer === null}
                                    className="mt-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-4 rounded-2xl font-bold text-xl shadow-lg shadow-indigo-200 hover:scale-105 transition disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    ตรวจคำตอบ
                                </button>
                            ) : (
                                <div className={`mt-10 p-6 rounded-2xl font-bold text-lg animate-in fade-in zoom-in duration-300 ${selectedAnswer === activeLesson.correctAnswer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                    {selectedAnswer === activeLesson.correctAnswer ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-5xl mb-2">🎉</span>
                                            <span className="text-2xl">ถูกต้องครับ! เก่งมาก</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-5xl mb-2">😢</span>
                                            <span className="text-2xl">ยังไม่ถูกนะครับ ลองใหม่นะ</span>
                                            <button onClick={() => { setIsAnswered(false); setSelectedAnswer(null); }} className="mt-4 px-6 py-2 bg-white border border-rose-200 rounded-xl text-base hover:bg-rose-50 transition shadow-sm text-rose-600">🔄 ลองทำอีกครั้ง</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeLesson?.type === 'text' ? (
                    <div className="w-full min-h-full flex flex-col items-center justify-center py-8 px-4 bg-slate-50 dark:bg-slate-950 text-wrap-pretty">
                        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 md:p-14 min-h-[60vh] dark:text-slate-300">

                            {/* Title & Reading Time */}
                            <div className="mb-8 border-b border-gray-100 dark:border-slate-800 pb-6">
                                <h1 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white mb-3">{activeLesson.title}</h1>
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium bg-slate-50 dark:bg-slate-800 w-fit px-3 py-1.5 rounded-full">
                                    <span>⏱️</span>
                                    <span>
                                        อ่านจบในประมาณ {Math.max(1, Math.ceil((activeLesson.content?.replace(/<[^>]*>?/gm, '').length || 0) / 500))} นาที
                                    </span>
                                </div>
                            </div>
                            {activeLesson.image && (
                                <div className="rounded-xl overflow-hidden mb-10 shadow-sm">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={activeLesson.image} className="w-full object-cover max-h-[300px]" alt="Cover" />
                                </div>
                            )}
                            <SmartContentRenderer content={activeLesson.content || ""} />
                        </div>
                    </div>
                ) : activeLesson?.type === 'exercise' ? (
                    <div className="w-full min-h-full flex flex-col items-center justify-center py-10 px-4 bg-slate-100 dark:bg-slate-950">
                        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-8">{activeLesson.title}</h2>
                            {activeLesson.docUrl ? (
                                <a href={activeLesson.docUrl} target="_blank" className="inline-flex items-center gap-4 bg-emerald-500 text-white text-xl font-bold px-12 py-5 rounded-2xl shadow-lg shadow-emerald-200 hover:-translate-y-1 hover:shadow-xl transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" /><path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" /></svg>
                                    ดาวน์โหลดแบบฝึกหัด
                                </a>
                            ) : (
                                <div className="text-slate-400 font-medium">ไม่พบไฟล์แบบฝึกหัด</div>
                            )}
                        </div>
                    </div>
                ) : activeLesson?.type === 'html' ? (
                    !isEnrolled && !isAdmin ? (
                        <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-red-500"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" /></svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Locked Content</h2>
                            <p className="text-gray-500 dark:text-gray-400">Please enroll in this course to access this content.</p>
                        </div>
                    ) : (
                        (() => {
                            const examQuestions = tryParseQuestions(activeLesson.content || "");
                            if (examQuestions) {
                                return <ExamRunner questions={examQuestions} onComplete={() => { markAsComplete(activeLesson.id); setTimeout(() => handleNextLesson(), 1500); }} />;
                            }
                            return (
                                <div className="w-full min-h-full bg-white dark:bg-slate-900">
                                    <iframe
                                        srcDoc={activeLesson.htmlCode || ""}
                                        className="w-full h-full min-h-[85vh] border-0"
                                        title="Lesson Content"
                                        sandbox="allow-scripts allow-same-origin"
                                    />
                                </div>
                            );
                        })()
                    )
                ) : activeLesson?.type === 'flashcard' ? (
                    <div className="w-full min-h-full flex flex-col items-center justify-center py-10 px-4 bg-slate-100">
                        <div className="w-full max-w-4xl">
                            <h2 className="text-3xl font-black text-slate-800 mb-8 text-center">{activeLesson.title}</h2>

                            {activeLesson.flashcardData && activeLesson.flashcardData.length > 0 ? (
                                <FlashcardPlayer cards={activeLesson.flashcardData} />
                            ) : (
                                <div className="text-center text-slate-400">ไม่พบข้อมูล Flashcard</div>
                            )}
                        </div>
                    </div>
                ) : (
                    // Video Player with Error Handling Fallback
                    <div className="w-full h-full bg-black flex flex-col items-center justify-center relative group">
                        {currentVideoId ? (
                            <>
                                <div className="w-full aspect-video max-h-full relative">
                                    <iframe
                                        src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=0&rel=0`}
                                        className="w-full h-full absolute inset-0 z-10"
                                        allowFullScreen
                                        title="Video Player"
                                    ></iframe>
                                </div>

                                {/* ✅ Floating Summary Button */}
                                <div className="absolute top-4 right-4 z-20">
                                    <button
                                        onClick={() => setShowSummary(true)}
                                        className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white text-base font-bold px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all backdrop-blur-md border border-white/20"
                                    >
                                        <span className="text-xl">📝</span>
                                        <span>สรุปเนื้อหา</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-10 text-white">
                                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 text-3xl">🎬</div>
                                <h3 className="text-xl font-bold mb-2">ไม่พบวิดีโอ</h3>
                                <p className="text-gray-400 text-sm">ขออภัย ยังไม่มีเนื้อหาวิดีโอสำหรับบทเรียนนี้</p>
                            </div>
                        )}
                    </div>
                )
            ) : (
                // Locked Screen
                <div className="flex flex-col items-center justify-center h-full text-center p-10">
                    <div className="text-6xl mb-4">{isExpired ? '⏳' : '🔒'}</div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{isExpired ? 'คอร์สหมดอายุแล้ว' : 'Lesson Locked'}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">{isExpired ? 'ระยะเวลาการเรียนของคุณสิ้นสุดลงแล้ว กรุณาต่ออายุคอร์สเรียน' : 'กรุณาสมัครเรียนและรอการอนุมัติเพื่อเข้าถึงเนื้อหา'}</p>
                    <Link href="/payment" className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-orange-600 transition">
                        {isExpired ? 'ต่ออายุคอร์สเรียน' : 'แจ้งโอนเงิน / สมัครเรียน'}
                    </Link>
                </div>
            )
            }
        </div>
    );
};
