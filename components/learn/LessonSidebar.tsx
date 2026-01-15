import React from 'react';
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
                <Link href="/my-courses" className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-3 rounded-2xl font-bold transition-all mb-4 shadow-sm group transform hover:-translate-y-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"><path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" /></svg>
                    <span>กลับหน้ารวมคอร์ส</span>
                </Link>

                {/* ✅ Search Bar */}
                <div className="w-full relative mb-4 group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="ค้นหาบทเรียน..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl leading-5 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-300 sm:text-sm transition-all shadow-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </button>
                    )}
                </div>

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

                    {/* ✅ SPECIAL EXAM SECTION (Pastel Theme) */}
                    <div className="mt-6 w-full animate-in slide-in-from-left-4 fade-in duration-500">
                        <div className="bg-gradient-to-br from-violet-100 via-indigo-100 to-cyan-100 rounded-2xl p-5 shadow-lg shadow-indigo-100 border border-indigo-50 text-indigo-900 relative overflow-hidden group">

                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/40 rounded-full -mr-6 -mt-6 blur-xl"></div>
                            <div className="absolute bottom-0 left-0 w-20 h-20 bg-fuchsia-200/20 rounded-full -ml-6 -mb-6 blur-xl"></div>

                            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 relative z-10 text-indigo-800 border-b border-indigo-200/60 pb-2">
                                <span className="text-xl drop-shadow-sm">⚡️</span> <span className="tracking-wide">ตะลุยโจทย์ (Exams)</span>
                            </h3>

                            <div className="space-y-2 relative z-10 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
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
                                                className={`w-full text-left text-xs font-bold py-3 px-3.5 rounded-xl transition-all flex items-center justify-between group/btn border
                                                ${isActive
                                                        ? 'bg-white text-indigo-700 shadow-md border-indigo-100 ring-2 ring-indigo-50'
                                                        : 'bg-white/40 hover:bg-white text-slate-600 hover:text-indigo-600 border-indigo-50/50 hover:shadow-sm'}
                                                ${!isUnlocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                                            `}
                                            >
                                                <span className="truncate flex-1">{exam.title}</span>
                                                {isActive && <span className="text-indigo-500 animate-pulse text-[10px]">●</span>}
                                                {!isUnlocked && <span className="text-[10px]">🔒</span>}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-6 bg-white/30 rounded-xl border border-white/50 border-dashed backdrop-blur-sm">
                                        <p className="text-xs text-indigo-400 font-medium">✨ ยังไม่มีชุดข้อสอบ</p>
                                        <p className="text-[10px] text-indigo-300 mt-1">(รอติดตามเร็วๆ นี้)</p>
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
