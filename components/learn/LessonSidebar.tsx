import React, { useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { Lesson } from './types';
import { QuestionIcon, TextIcon, CheckIcon, ExerciseIcon, HtmlIcon, FlashcardIcon, PlayIcon } from './Icons';

interface LessonSidebarProps {
    isSidebarCollapsed: boolean;
    isMobileMenuOpen: boolean;
    course: any;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeLesson: Lesson | null;
    progressPercent: number;
    examLessons: Lesson[];
    groupedLessons: { header: Lesson; items: Lesson[] }[];
    openSections: string[];
    toggleSection: (id: string) => void;
    changeLesson: (lesson: Lesson) => void;
    completedLessons: string[];
    setIsMobileMenuOpen: (open: boolean) => void;
    isLessonUnlocked: (lesson: Lesson) => boolean;
    isEnrolled: boolean;
    isAdmin: boolean;
    user: any;
}

export const LessonSidebar: React.FC<LessonSidebarProps> = ({
    isSidebarCollapsed,
    isMobileMenuOpen,
    course,
    searchQuery,
    setSearchQuery,
    activeLesson,
    progressPercent,
    examLessons,
    groupedLessons,
    openSections,
    toggleSection,
    changeLesson,
    completedLessons,
    setIsMobileMenuOpen,
    isLessonUnlocked,
    isEnrolled,
    isAdmin,
    user
}) => {
    // ✅ Local State for Exams Accordion (Default Collapsed)
    const [isExamsOpen, setIsExamsOpen] = useState(false);

    return (
        <aside className={`
            ${isSidebarCollapsed ? 'w-0 border-r-0' : 'w-80 border-r'} 
            bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 flex-shrink-0 h-full
            fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden
            md:relative md:z-20 
            transition-all duration-300 ease-in-out shadow-xl md:shadow-sm
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
            <div className="p-5 pb-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 flex flex-col items-center flex-shrink-0 shadow-sm relative">

                {/* ปุ่มการ์ดย้อนกลับ */}


                {/* ✅ Minimalist Back Button (Refined & Balanced) */}
                <Link href="/my-courses" className="w-full flex items-center justify-center gap-3 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white py-4 px-6 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-700/50 rounded-xl transition-all group mb-6 shadow-sm hover:shadow-md">
                    <div className="flex-shrink-0 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:-translate-x-1 transition-transform opacity-60 group-hover:opacity-100"><path d="m15 18-6-6 6-6" /></svg>
                    </div>
                    <span className="font-bold text-lg tracking-normal">กลับหน้ารวมคอร์ส</span>
                </Link>

                <div className="w-4/5 aspect-video rounded-xl overflow-hidden shadow-lg bg-gray-100 dark:bg-slate-800 mb-3 border border-gray-100 dark:border-slate-800">
                    {course.image ?
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={course.image} alt="Cover" className="w-full h-full object-cover" /> :
                        <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>}
                </div>
                <h2 className="font-bold text-gray-800 dark:text-slate-200 text-center px-2 text-sm leading-snug line-clamp-2">{course?.title}</h2>
            </div>

            {/* SCROLLABLE BODY START */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                <div className="px-5 pt-4 pb-2 space-y-5">
                    {user && (
                        <div className="mt-3 w-full px-2">
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 text-right mt-1 font-bold">{progressPercent}% COMPLETED</p>
                        </div>
                    )}

                    {/* ✅ Google Drive Link Button */}
                    {course?.docUrl && (isEnrolled || isAdmin) && (
                        <a
                            href={course.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 w-[90%] flex items-center justify-center gap-2 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 group-hover:scale-110 transition-transform">
                                <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
                                <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                            </svg>
                            เอกสารประกอบการเรียน
                        </a>
                    )}

                    {/* ✅ SPECIAL EXAM SECTION (Notion Style) */}
                    <div className="mt-6 w-full animate-in slide-in-from-left-4 fade-in duration-500 px-2">
                        <button
                            onClick={() => setIsExamsOpen(!isExamsOpen)}
                            className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors group text-slate-600 dark:text-slate-300 mb-1"
                        >
                            <span className={`transform transition-transform duration-200 ${isExamsOpen ? 'rotate-90' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:opacity-100"><path d="m9 18 6-6-6-6" /></svg>
                            </span>
                            <span className="font-semibold text-sm flex items-center gap-2">
                                ⚡️ ตะลุยโจทย์ (Exams)
                            </span>
                            <span className="ml-auto text-xs text-slate-400 font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                                {examLessons.length} ชุด
                            </span>
                        </button>

                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExamsOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="pl-4 space-y-0.5 border-l border-gray-100 dark:border-slate-800 ml-3.5 my-1">
                                {examLessons.length > 0 ? (
                                    examLessons.map((exam: Lesson) => {
                                        const isActive = activeLesson?.id === exam.id;
                                        const isUnlocked = isLessonUnlocked(exam);
                                        return (
                                            <button
                                                key={exam.id}
                                                onClick={() => {
                                                    if (isUnlocked) {
                                                        changeLesson(exam);
                                                        setIsMobileMenuOpen(false);
                                                    }
                                                }}
                                                disabled={!isUnlocked}
                                                className={`w-full text-left text-sm py-1.5 px-3 rounded-md transition-all flex items-center gap-2
                                                ${isActive
                                                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                                                        : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}
                                                ${!isUnlocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                                            `}
                                            >
                                                <span className="truncate flex-1">{exam.title}</span>
                                                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                                                {!isUnlocked && <span className="text-[10px]">🔒</span>}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="py-2 pl-3 text-xs text-slate-400 italic">
                                        ยังไม่มีชุดข้อสอบ
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lesson Lists inside Scrollable Area */}
                <div className="pb-20 lg:pb-0 border-t border-gray-100 dark:border-slate-800 mt-6 pt-2">
                    {groupedLessons.map((group: any) => {
                        const isOpen = openSections.includes(group.header.id);
                        return (
                            <div key={group.header.id} className="border-b border-gray-50 dark:border-slate-800/50">
                                <div className={`w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition border-b border-gray-50 dark:border-slate-800/50 ${activeLesson?.id === group.header.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                                    <button
                                        onClick={() => {
                                            changeLesson(group.header);
                                            if (!isOpen) toggleSection(group.header.id);
                                        }}
                                        className={`text-base md:text-lg font-black tracking-tight truncate pr-2 flex-1 text-left ${activeLesson?.id === group.header.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}
                                    >
                                        {group.header.title}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSection(group.header.id);
                                        }}
                                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                                    >
                                        <span className={`block transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                                    </button>
                                </div>

                                <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                    <div className="overflow-hidden">
                                        <div className="bg-gray-50/50 dark:bg-slate-800/20">
                                            {group.items.map((lesson: Lesson) => {
                                                const isUnlocked = isLessonUnlocked(lesson);
                                                const isActive = activeLesson?.id === lesson.id;
                                                const isCompleted = completedLessons.includes(lesson.id);
                                                return (
                                                    <button
                                                        key={lesson.id}
                                                        onClick={() => {
                                                            if (isUnlocked) {
                                                                changeLesson(lesson);
                                                                setIsMobileMenuOpen(false); // Close menu on selection
                                                            }
                                                        }}
                                                        disabled={!isUnlocked}
                                                        className={`w-full flex items-center gap-3 py-3 px-6 text-left border-l-4 transition hover:bg-gray-100 dark:hover:bg-slate-800
                                                ${isActive ? 'border-green-500 bg-white dark:bg-slate-800 shadow-sm' : 'border-transparent'}
                                                ${!isUnlocked ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                                    >
                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700'} ${lesson.type === 'exercise' ? 'rounded-none' : ''}`}>
                                                            {isCompleted && <CheckIcon />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-sm truncate ${isActive ? 'text-gray-800 dark:text-white font-bold' : 'text-gray-600 dark:text-slate-400'}`}>
                                                                {lesson.title}
                                                                {lesson.isHidden && <span className="text-[10px] text-gray-400 ml-2 font-normal">(Hidden)</span>}
                                                            </p>
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                                                {lesson.type === 'quiz' ? <QuestionIcon /> : lesson.type === 'text' ? <TextIcon /> : lesson.type === 'exercise' ? <ExerciseIcon /> : lesson.type === 'html' ? <HtmlIcon /> : lesson.type === 'flashcard' ? <FlashcardIcon /> : <PlayIcon />}
                                                                <span>{lesson.type === 'video' ? 'Video' : lesson.type === 'quiz' ? 'Quiz' : lesson.type === 'exercise' ? 'Exercise' : lesson.type === 'html' ? 'ตะลุยโจทย์ (Exam)' : lesson.type === 'flashcard' ? 'Flashcard' : 'Reading'}</span>
                                                            </div>
                                                        </div>
                                                        {(!isUnlocked || (lesson.type === 'html' && !isEnrolled && !isAdmin)) && <span className="ml-auto text-xs">🔒</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
};
