"use client";
import React, { useState, useEffect, useCallback } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, getDoc, query, orderBy, writeBatch, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";
import { Plus, Trash2, FileJson, Blocks, AlertCircle, Image as ImageIcon, Copy, Edit2 } from 'lucide-react';
import JSON5 from 'json5';

// Drag and Drop imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableLessonItem } from '@/components/admin/SortableLessonItem';

// 🎨 Global CSS for consistent KaTeX styling
const katexGlobalStyles = `
  .katex { font-size: 1.1em !important; font-family: 'KaTeX_Main', 'Times New Roman', serif; }
  .katex .mord.text { font-family: inherit; }
`;

// --- Icons (Updated for Clarity) ---
const HeaderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM12.75 12a.75.75 0 00-1.5 0V15H8.25a.75.75 0 000 1.5H11.25v3a.75.75 0 001.5 0V16.5h3a.75.75 0 000-1.5H12.75V12z" clipRule="evenodd" /><path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" /></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" /></svg>;
const TextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 4.5A2.25 2.25 0 015.25 2.25h13.5A2.25 2.25 0 0121 4.5v15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 19.5V4.5zM5.25 3.75a.75.75 0 00-.75.75v15c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75V4.5a.75.75 0 00-.75-.75H5.25zM6 7.5a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 7.5zm.75 3.75a.75.75 0 000 1.5h10.5a.75.75 0 000-1.5H6.75zM6 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5H6.75A.75.75 0 016 15z" clipRule="evenodd" /></svg>;

// ✅ New Minimal Quiz Icon (ชัดเจนขึ้น)
const QuizIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 9.75a3.75 3.75 0 117.5 0 .75.75 0 01-1.5 0 2.25 2.25 0 10-2.25 2.25v1.5a.75.75 0 01-1.5 0v-1.5a3.75 3.75 0 013.75-3.75zM9.75 17.25a.75.75 0 101.5 0 .75.75 0 00-1.5 0z" clipRule="evenodd" /></svg>;

// ✅ New Exercise Icon (แบบฝึกหัด)
const ExerciseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" /><path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" /></svg>;

// ✅ New HTML Icon (HTML Code)
const HtmlIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M14.447 3.027a.75.75 0 01.527.92l-4.5 16.5a.75.75 0 01-1.448-.394l4.5-16.5a.75.75 0 01.921-.526zM16.72 6.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 010-1.06zm-9.44 0a.75.75 0 010 1.06L2.56 12l4.72 4.72a.75.75 0 01-1.06 1.06L.97 12.53a.75.75 0 010-1.06l5.25-5.25a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>;

// ✅ New Flashcard Icon
const FlashcardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19.5 22.5a3 3 0 003-3v-9a3 3 0 00-3-3h-9a3 3 0 00-3 3v9a3 3 0 003 3h9z" /><path d="M4.5 19.5a3 3 0 003-3v-9a3 3 0 00-3-3h-9a3 3 0 00-3 3v9a3 3 0 003 3h9z" transform="rotate(180 12 12) translate(12 12)" opacity="0.5" /></svg>;

// 👁️ Visibility Icons
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12 3.75s9.189 3.226 10.677 7.697a.75.75 0 010 .506C21.189 16.424 16.972 19.65 12 19.65s-9.189-3.226-10.677-7.697a.75.75 0 010-.506zM12 17.25a5.25 5.25 0 100-10.5 5.25 5.25 0 000 10.5z" clipRule="evenodd" /></svg>;
const EyeSlashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.103.308.103.65 0 .958zM13.531 13.531a1.5 1.5 0 00-2.122-2.122l2.122 2.122z" /><path d="M5.755 8.123L3.329 5.697a11.218 11.218 0 00-2.006 5.75c0 .308 0 .65.103.958 1.49 4.467 5.705 7.69 10.675 7.69 1.766 0 3.45-.406 4.96-1.142L14.52 16.417a5.25 5.25 0 01-8.765-8.294z" /></svg>;

// ⬆️⬇️ Arrow Icons
const ArrowUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06l-6.22-6.22V21a.75.75 0 01-1.5 0V4.81l-6.22 6.22a.75.75 0 11-1.06-1.06l7.5-7.5z" clipRule="evenodd" /></svg>;
const ArrowDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v16.19l6.22-6.22a.75.75 0 111.06 1.06l-7.5 7.5a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 111.06-1.06l6.22 6.22V3a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>;

// ✅ Enhanced Helper to render LaTeX mixed with text & Markdown
const renderWithLatex = (text: string): React.ReactNode => {
    if (!text) return "";

    // 🧹 Clean up citation artifacts (e.g. [cite: 7, 8])
    const cleanText = text.replace(/\[cite:\s*[^\]]+\]/gi, '');

    // 1. Split by explicit LaTeX: $...$ or $$...$$ or \[...\]
    const parts = cleanText.split(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[\s\S]+?\$|\\begin\{equation\}[\s\S]+?\\end\{equation\})/g);

    return parts.map((part, index) => {
        let isDisplay = part.startsWith('$$') || part.startsWith('\\[');
        let isMath = isDisplay || (part.startsWith('$') && part.endsWith('$'));
        let content = part;

        if (isMath) {
            // Strip delimiters
            const inner = part.replace(/^(\$\$|\\\[|\$)|(\$\$|\\\]|\$)$/g, '');

            const hasThai = /[\u0E00-\u0E7F]/.test(inner);
            const hasNewlines = inner.includes('\n');

            // Unwrap if Thai (almost always text) OR (Inline math AND Newlines)
            if (hasThai || (!isDisplay && hasNewlines)) {
                if (!inner.match(/^\\begin\{/)) {
                    isMath = false;
                    content = inner;
                } else { content = inner; }
            } else {
                content = inner;
            }
        }

        if (isMath) {
            try {
                // Use BlockMath for display math, InlineMath for inline
                if (isDisplay || content.includes('\\begin')) {
                    return <div key={index} className="overflow-x-auto my-2"><BlockMath math={content} /></div>;
                }
                return <InlineMath key={index} math={content} />;
            }
            catch (e) { return <span key={index} className="text-red-500">{part}</span>; }
        }

        // TEXT PROCESSING: Look for implicit Latex commands (\\times, \\div, \\frac, ^)
        const implicitRegex = /(\\[a-zA-Z]+(?:\{(?:[^{}]|\{[^{}]*\})*\})*|[\^_]\{?[a-zA-Z0-9\+\-\.\\]+\}?)/g;

        const subParts = content.split(implicitRegex);

        return (
            <span key={index}>
                {subParts.map((sub, subIdx) => {
                    if (!sub) return null;
                    // Check if it matches our implicit math pattern
                    if (sub.match(/^(\\|\^|_)/)) {
                        try { return <InlineMath key={`${index}-${subIdx}`} math={sub} />; }
                        catch (e) { return sub; }
                    }

                    // Otherwise, Handle Markdown (**bold**, ---)
                    const boldParts = sub.split(/(\*\*[^*]+\*\*)/g);
                    return (
                        <span key={`${index}-${subIdx}`}>
                            {boldParts.map((bPart, bIdx) => {
                                if (bPart.startsWith('**') && bPart.endsWith('**')) {
                                    return <strong key={bIdx} className="text-indigo-600 font-bold">{bPart.slice(2, -2)}</strong>;
                                }
                                if (bPart.includes('---')) {
                                    return bPart.split('---').map((s, i, arr) => (
                                        <span key={i}>
                                            {s}
                                            {i < arr.length - 1 && <div className="my-6 h-px bg-slate-200 border-b border-dashed border-slate-300 w-full"></div>}
                                        </span>
                                    ));
                                }
                                return bPart;
                            })}
                        </span>
                    );
                })}
            </span>
        );
    });
};


// ✅ Helper to validate JSON string
const tryParseJson = (str: string) => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
};

// ✨ Component แสดงกลุ่มบทเรียน
const LessonGroup = ({ group, handleEdit, handleDelete, handleToggleVisibility, handleMoveLesson, onDragEnd }: { group: any, handleEdit: any, handleDelete: any, handleToggleVisibility: any, handleMoveLesson: any, onDragEnd: (event: DragEndEvent, groupItems: any[]) => void }) => {
    const [isOpen, setIsOpen] = useState(true);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    return (
        <div className={`rounded-[1.5rem] border-2 shadow-sm overflow-hidden mb-4 transition-colors ${!group.header ? 'bg-amber-50 border-amber-200 border-dashed' : 'bg-white border-indigo-50'}`}>
            <div onClick={() => setIsOpen(!isOpen)} className={`p-4 flex items-center justify-between cursor-pointer hover:bg-opacity-80 transition ${!group.header ? 'bg-amber-100/50' : (!isOpen ? 'bg-white' : 'bg-indigo-50/30')}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${group.header ? 'bg-orange-500 text-white' : 'bg-amber-300 text-amber-700'}`}>
                        {group.header ? <HeaderIcon /> : <span className="text-2xl">📂</span>}
                    </div>
                    <div>
                        <h3 className={`font-bold text-lg ${!group.header ? 'text-amber-700' : 'text-indigo-900'}`}>
                            {group.header ? group.header.title : "Uncategorized (รอจัดหมวด)"}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">{group.items.length} บทเรียนย่อย</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {group.header && (
                        <div className="flex gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleEdit(group.header)} className="p-2 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">✏️</button>
                            <button onClick={() => handleDelete(group.header.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">🗑</button>
                        </div>
                    )}
                    <button className={`transform transition-transform duration-300 text-indigo-300 ${isOpen ? 'rotate-180' : ''}`}>▼</button>
                </div>
            </div>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[50000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-slate-50/50 p-2 space-y-2">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => onDragEnd(event, group.items)}>
                        <SortableContext items={group.items.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                            {group.items.map((lesson: any, index: number) => (
                                <SortableLessonItem key={lesson.id} id={lesson.id}>
                                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition group ml-4 md:ml-10">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {/* ✅ Color logic สำหรับ Exercise (สีเขียว) */}
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm 
                                        ${lesson.type === 'quiz' ? 'bg-purple-100 text-purple-600'
                                                    : lesson.type === 'text' ? 'bg-pink-100 text-pink-600'
                                                        : lesson.type === 'exercise' ? 'bg-emerald-100 text-emerald-600'
                                                            : lesson.type === 'html' ? 'bg-cyan-100 text-cyan-600'
                                                                : lesson.type === 'flashcard' ? 'bg-yellow-100 text-yellow-600'
                                                                    : 'bg-blue-100 text-blue-600'}`}>
                                                {lesson.type === 'quiz' ? <QuizIcon /> : lesson.type === 'text' ? <TextIcon /> : lesson.type === 'exercise' ? <ExerciseIcon /> : lesson.type === 'html' ? <HtmlIcon /> : lesson.type === 'flashcard' ? <FlashcardIcon /> : <VideoIcon />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-700 truncate text-sm md:text-base">{lesson.title}</p>
                                                <div className="flex gap-2">
                                                    {lesson.type === 'exercise' && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">PDF</span>}
                                                    {lesson.isFree && <span className="text-[10px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded border border-teal-100">FREE</span>}
                                                    {lesson.image && <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100">IMG</span>}
                                                    {!lesson.headerId && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">รอจัดหมวด</span>}
                                                    {lesson.isHidden && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-1"><EyeSlashIcon /> ซ่อนอยู่</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleToggleVisibility(lesson)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${lesson.isHidden ? 'bg-gray-100 text-gray-400 hover:bg-gray-200' : 'bg-indigo-50 text-indigo-400 hover:bg-indigo-100'}`} title={lesson.isHidden ? "แสดงเนื้อหา" : "ซ่อนเนื้อหา"}>
                                                    {lesson.isHidden ? <EyeSlashIcon /> : <EyeIcon />}
                                                </button>
                                                <button onClick={() => handleEdit(lesson)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100">✏️</button>
                                                <button onClick={() => handleDelete(lesson.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100">🗑</button>
                                            </div>
                                        </div>
                                    </div>
                                </SortableLessonItem>
                            ))}
                        </SortableContext>
                    </DndContext>
                    {group.items.length === 0 && <p className="text-center text-slate-300 text-sm py-4 italic">ยังไม่มีเนื้อหาในบทนี้</p>}
                </div>
            </div>
        </div>
    );
}

export default function ManageLessonsPage() {
    const { id } = useParams();
    const courseId = typeof id === 'string' ? id : "";
    const [courseTitle, setCourseTitle] = useState("กำลังโหลด...");
    const [lessons, setLessons] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'lessons' | 'students'>('lessons');
    const [students, setStudents] = useState<any[]>([]);
    const [expandedStudentIds, setExpandedStudentIds] = useState<string[]>([]);

    // ✏️ Inline Edit State
    const [editingQIndex, setEditingQIndex] = useState<number | null>(null);
    const [tempEditQuestion, setTempEditQuestion] = useState<any>(null);

    const handleSaveEditQuestion = () => {
        if (editingQIndex === null || !tempEditQuestion) return;
        const updated = [...examQuestions];
        updated[editingQIndex] = tempEditQuestion;
        updateExamContent(updated);
        setEditingQIndex(null);
        setTempEditQuestion(null);
    };

    const toggleStudentExpand = (id: string) => {
        setExpandedStudentIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const fetchStudents = useCallback(async () => {
        if (!courseId) return;
        try {
            const q = query(
                collection(db, "enrollments"),
                where("courseId", "==", courseId),
                where("status", "==", "approved")
            );
            const snapshot = await getDocs(q);

            // Calculate total learnable lessons (exclude headers)
            const learnableLessons = lessons.filter(l => l.type !== 'header');
            const totalLessons = learnableLessons.length;

            const studentsWithProgress = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
                const studentData = docSnapshot.data();
                const studentId = studentData.userId;

                let completedLessons: string[] = [];
                let progressPercent = 0;

                if (studentId) {
                    try {
                        const progressRef = doc(db, "users", studentId, "progress", courseId);
                        const progressSnap = await getDoc(progressRef);
                        if (progressSnap.exists()) {
                            completedLessons = progressSnap.data().completed || [];
                        }
                    } catch (err) {
                        console.error("Error fetching progress for user", studentId, err);
                    }
                }

                // Calculate percentage based on VALID lessons only
                if (totalLessons > 0) {
                    const validCompleted = completedLessons.filter(id => learnableLessons.some(l => l.id === id));
                    progressPercent = Math.round((validCompleted.length / totalLessons) * 100);
                }

                return {
                    id: docSnapshot.id,
                    ...studentData,
                    completedLessons,
                    progressPercent
                };
            }));

            setStudents(studentsWithProgress);
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    }, [courseId, lessons]);

    useEffect(() => {
        if (activeTab === 'students') {
            fetchStudents();
        }
    }, [activeTab, fetchStudents]);

    // ✅ เพิ่ม Type 'exercise', 'html', 'flashcard'
    const [addType, setAddType] = useState<'header' | 'video' | 'text' | 'quiz' | 'exercise' | 'html' | 'flashcard'>('header');

    // Form State
    const [lessonTitle, setLessonTitle] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [lessonContent, setLessonContent] = useState("");
    const [isFree, setIsFree] = useState(false);
    const [selectedHeaderId, setSelectedHeaderId] = useState("");

    // ✅ PDF Link State
    const [pdfUrl, setPdfUrl] = useState("");

    // ✅ HTML Code State
    // ✅ HTML Code State
    const [htmlCode, setHtmlCode] = useState("");
    const [smartExamBlocks, setSmartExamBlocks] = useState<string[]>([]);

    // Auto-Sync Smart Blocks to JSON String (htmlCode)
    const updateSmartBlock = (index: number, val: string) => {
        const newBlocks = [...smartExamBlocks];
        newBlocks[index] = val;
        setSmartExamBlocks(newBlocks);
        setHtmlCode(`[\n${newBlocks.join(',\n')}\n]`);
    };

    const addSmartQuestion = () => {
        const template = {
            question: "",
            options: ["", "", "", ""],
            correctAnswer: 0,
            explanation: ""
        };
        const newBlocks = [...smartExamBlocks, JSON.stringify(template, null, 2)];
        setSmartExamBlocks(newBlocks);
        setHtmlCode(`[\n${newBlocks.join(',\n')}\n]`);
    };

    const deleteSmartQuestion = (index: number) => {
        if (!confirm("ลบข้อนี้?")) return;
        const newBlocks = [...smartExamBlocks];
        newBlocks.splice(index, 1);
        setSmartExamBlocks(newBlocks);
        setHtmlCode(`[\n${newBlocks.join(',\n')}\n]`);
    };



    // ✅ Flashcard State
    const [flashcardData, setFlashcardData] = useState<any[]>([]);
    const [pasteMode, setPasteMode] = useState(false);

    // ⚡️ Exam System State
    const [examQuestions, setExamQuestions] = useState<any[]>([]);
    const [isRawMode, setIsRawMode] = useState(false);
    const [newQuestionJson, setNewQuestionJson] = useState("");
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);

    // Sync LessonContent -> ExamQuestions (On Load / Mode Switch)
    useEffect(() => {
        if (addType === 'html' && lessonContent) {
            try {
                // Prevent Infinite Loop: Check if content matches current state
                const currentStr = JSON.stringify(examQuestions, null, 2);
                if (currentStr === lessonContent) return;

                const parsed = JSON.parse(lessonContent);
                if (Array.isArray(parsed)) {
                    setExamQuestions(parsed);
                }
            } catch (e) {
                // If invalid JSON, maybe force Raw Mode or just keep empty
                if (lessonContent.trim()) setIsRawMode(true);
            }
        } else if (addType === 'html' && !lessonContent) {
            if (examQuestions.length > 0) setExamQuestions([]);
        }
    }, [addType, lessonContent, examQuestions]);

    // Sync ExamQuestions -> LessonContent (When ExamQuestions change)
    const updateExamContent = (newQuestions: any[]) => {
        setExamQuestions(newQuestions);
        setLessonContent(JSON.stringify(newQuestions, null, 2));
    };

    const handleAddSingleQuestion = () => {
        try {
            let rawJson = newQuestionJson.trim();
            if (!rawJson) return;

            // ========== Phase 1: Pre-Clean Artifacts ==========
            let cleanJson = rawJson
                // Remove AI citation markers [cite_start], [cite_end], [cite:...]
                .replace(/\[cite(_start|_end)?(:.*?)?\]/gi, '')
                // Remove markdown code block markers
                .replace(/```json\s*/gi, '')
                .replace(/```typescript\s*/gi, '')
                .replace(/```javascript\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();

            // ========== Phase 2: Smart Auto-Fix ==========
            const autoFix = (json: string): string => {
                let fixed = json;

                // 2.1 Fix trailing commas before } or ]
                fixed = fixed.replace(/,\s*}/g, '}');
                fixed = fixed.replace(/,\s*]/g, ']');

                // 2.2 Fix unquoted keys: {key: value} -> {"key": value}
                fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');

                // 2.3 Fix single quotes to double quotes (careful with apostrophes inside strings)
                // Simple heuristic: replace 'value' patterns
                fixed = fixed.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"');

                // 2.4 Fix missing commas between objects/arrays: }{ -> },{  or ][ -> ],[
                fixed = fixed.replace(/}\s*{/g, '},{');
                fixed = fixed.replace(/]\s*\[/g, '],[');

                // 2.5 Balance brackets (add missing ones at end)
                const openBraces = (fixed.match(/{/g) || []).length;
                const closeBraces = (fixed.match(/}/g) || []).length;
                const openBrackets = (fixed.match(/\[/g) || []).length;
                const closeBrackets = (fixed.match(/]/g) || []).length;

                // Add missing closing braces/brackets
                if (openBraces > closeBraces) {
                    fixed += '}'.repeat(openBraces - closeBraces);
                }
                if (openBrackets > closeBrackets) {
                    fixed += ']'.repeat(openBrackets - closeBrackets);
                }

                return fixed;
            };

            // ========== Phase 3: Multi-Strategy Parse ==========
            let parsed: any = null;
            let parseError: Error | null = null;
            const strategies = [
                { name: 'JSON5 (original)', fn: () => JSON5.parse(cleanJson) },
                { name: 'JSON5 (auto-fixed)', fn: () => JSON5.parse(autoFix(cleanJson)) },
                { name: 'Standard JSON (auto-fixed)', fn: () => JSON.parse(autoFix(cleanJson)) },
            ];

            for (const strategy of strategies) {
                try {
                    parsed = strategy.fn();
                    break; // Success!
                } catch (e) {
                    parseError = e as Error;
                }
            }

            // ========== Phase 4: Better Error Reporting ==========
            if (!parsed) {
                // Find the approximate error location
                let errorLine = 1;
                let errorColumn = 1;
                let errorHint = '';

                const errMsg = parseError?.message || '';

                // Extract position from error message (JSON5 and JSON both report position)
                const posMatch = errMsg.match(/position\s+(\d+)/i) || errMsg.match(/at\s+(\d+)/i);
                if (posMatch) {
                    const pos = parseInt(posMatch[1]);
                    const lines = cleanJson.substring(0, pos).split('\n');
                    errorLine = lines.length;
                    errorColumn = lines[lines.length - 1].length + 1;
                }

                // Common error hints
                if (errMsg.includes('Unexpected token')) {
                    errorHint = 'อาจมีอักขระที่ไม่ถูกต้อง หรือขาด comma (,) ระหว่าง properties';
                } else if (errMsg.includes('Expected')) {
                    errorHint = 'อาจขาดวงเล็บ {} หรือ [] หรือเครื่องหมาย " รอบ string';
                } else if (errMsg.includes('Unexpected end')) {
                    errorHint = 'JSON ไม่สมบูรณ์ - ขาด } หรือ ] ปิดท้าย';
                }

                const detailedError = `
❌ ไม่สามารถ parse JSON ได้

📍 ตำแหน่งที่ผิดพลาด: บรรทัด ${errorLine}, ตัวอักษรที่ ${errorColumn}

💡 คำแนะนำ: ${errorHint || 'ตรวจสอบ syntax ของ JSON'}

🔧 ลองกดปุ่ม "AI Clean" เพื่อแก้ไขอัตโนมัติ

📝 Error: ${errMsg.substring(0, 100)}
                `.trim();

                showToast(detailedError, "error");
                return;
            }

            // ========== Phase 5: Process and Save ==========
            const newItems = Array.isArray(parsed) ? parsed : [parsed];

            // Validate basic structure
            const validItems = newItems.filter(item => {
                if (!item.question && !item.options) {
                    return false;
                }
                return true;
            });

            if (validItems.length === 0) {
                showToast("❌ ไม่พบข้อสอบที่ถูกต้อง\nต้องมี field: question และ options", "error");
                return;
            }

            // Auto-assign ID if missing (max + 1)
            let maxId = examQuestions.reduce((max, q) => Math.max(max, q.id || 0), 0);

            const processedItems = validItems.map(item => {
                if (!item.id) {
                    maxId++;
                    return { ...item, id: maxId };
                }
                return item;
            });

            const updated = [...examQuestions, ...processedItems];
            updateExamContent(updated);
            setNewQuestionJson("");
            setIsAddingQuestion(false);

            const skipped = newItems.length - validItems.length;
            let message = `✅ เพิ่ม ${processedItems.length} ข้อเรียบร้อย!`;
            if (skipped > 0) {
                message += ` (ข้าม ${skipped} ข้อที่ไม่ถูกต้อง)`;
            }
            showToast(message);
        } catch (e) {
            showToast("❌ เกิดข้อผิดพลาด: " + (e as Error).message, "error");
        }
    };


    const handleDeleteQuestion = (index: number) => {
        if (!confirm("ลบข้อนี้?")) return;
        const updated = examQuestions.filter((_, i) => i !== index);
        updateExamContent(updated);
    };

    const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === examQuestions.length - 1)) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const updated = [...examQuestions];
        [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
        updateExamContent(updated);
    }; // Toggle between File and Paste

    // Image Upload State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState("");
    const [currentImageUrl, setCurrentImageUrl] = useState("");

    const [quizOptions, setQuizOptions] = useState<string[]>(["", "", "", ""]);
    const [correctAnswer, setCorrectAnswer] = useState(0);

    const [editId, setEditId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const router = useRouter();

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const extractVideoId = (url: string) => {
        if (!url) return "";
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : url;
    };

    const fetchCourseInfo = useCallback(async () => {
        if (!courseId) return;
        try {
            const courseDoc = await getDoc(doc(db, "courses", courseId));
            if (courseDoc.exists()) setCourseTitle(courseDoc.data().title);
            // Fetch lessons ordered by 'order' first, then 'createdAt'
            // Note: Firestore requires an index for multiple orderBy fields if they are different.
            // For simplicity and robustness without manual index creation, we'll fetch all and sort in JS.
            const q = query(collection(db, "courses", courseId, "lessons"));
            const querySnapshot = await getDocs(q);
            const fetchedLessons = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort in memory
            fetchedLessons.sort((a: any, b: any) => {
                // Headers first? No, headers are separate in the grouping logic.
                // Just sort by order if available, else createdAt
                const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
                const orderB = b.order ?? Number.MAX_SAFE_INTEGER;

                if (orderA !== orderB) return orderA - orderB;

                // Fallback to createdAt
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeA - timeB;
            });

            setLessons(fetchedLessons);
        } catch (error) { console.error("Error:", error); }
        finally { setLoading(false); }
    }, [courseId]);

    useEffect(() => {
        fetchCourseInfo();
    }, [fetchCourseInfo]);

    // Parse JSON to Blocks when entering Edit Mode/Init (Moved here to access editId)
    useEffect(() => {
        if (addType === 'html') {
            try {
                const trimmed = htmlCode.trim();
                // Basic check if it looks like JSON array
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        setSmartExamBlocks(parsed.map(q => JSON.stringify(q, null, 2)));
                        return;
                    }
                }
            } catch (e) {
                // Not valid JSON or Empty -> Don't overwrite smartBlocks if just switching tabs empty
                // If text is present but invalid JSON, we might want to default to empty blocks or handle legacy
            }
            if (!htmlCode.trim()) setSmartExamBlocks([]);
        }
    }, [addType, editId, htmlCode]); // Added htmlCode to deps for correctness, though mainly triggered by editId/addType switch


    const availableHeaders = lessons.filter(l => l.type === 'header');

    // ✅ Separate Exams from Standard Content
    const examLessons = lessons.filter(l => l.type === 'html');

    const groupedLessons = (() => {
        const groups: any[] = availableHeaders.map(header => ({ header: header, items: [] }));
        const uncategorizedItems: any[] = [];
        lessons.forEach(lesson => {
            if (lesson.type === 'header' || lesson.type === 'html') return; // Skip Headers & Exams
            if (lesson.headerId) {
                const groupIndex = groups.findIndex(g => g.header.id === lesson.headerId);
                if (groupIndex !== -1) groups[groupIndex].items.push(lesson);
                else uncategorizedItems.push(lesson);
            } else uncategorizedItems.push(lesson);
        });
        if (uncategorizedItems.length > 0) groups.push({ header: null, items: uncategorizedItems });
        return groups;
    })();

    const handleMoveLesson = async (lesson: any, direction: 'up' | 'down', groupItems: any[]) => {
        const currentIndex = groupItems.findIndex(l => l.id === lesson.id);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= groupItems.length) return;

        // Create a new array with swapped items
        const newItems = [...groupItems];
        [newItems[currentIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[currentIndex]];

        // Update local state immediately for UI responsiveness
        // We need to update the 'lessons' state to reflect the swap within the specific group
        // This is a bit complex because 'lessons' is a flat list.
        // Easier approach: update Firestore and refetch.
        // Better approach: Optimistic update.

        try {
            const batch = writeBatch(db);

            // Re-assign orders for the whole group to ensure consistency
            // We use the current timestamp or a base index to ensure they stay ordered relative to others?
            // Actually, we just need to update the 'order' field of the two swapped items, 
            // OR better: update 'order' for ALL items in this group to be 0, 1, 2, 3...

            newItems.forEach((item, index) => {
                const ref = doc(db, "courses", courseId, "lessons", item.id);
                batch.update(ref, { order: index });
            });

            await batch.commit();
            showToast("สลับตำแหน่งเรียบร้อย");
            fetchCourseInfo();
        } catch (error: any) {
            showToast("Error moving lesson: " + error.message, "error");
        }
    };

    const handleToggleVisibility = async (lesson: any) => {
        try {
            const newStatus = !lesson.isHidden;
            await updateDoc(doc(db, "courses", courseId, "lessons", lesson.id), {
                isHidden: newStatus
            });
            showToast(newStatus ? "👁️‍🗨️ ซ่อนเนื้อหาแล้ว" : "👁️ แสดงเนื้อหาแล้ว");
            fetchCourseInfo();
        } catch (error: any) {
            showToast("Error: " + error.message, "error");
        }
    };

    // Drag-and-Drop Handler
    const handleDragEnd = async (event: DragEndEvent, groupItems: any[]) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = groupItems.findIndex((l: any) => l.id === active.id);
        const newIndex = groupItems.findIndex((l: any) => l.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const newItems = arrayMove([...groupItems], oldIndex, newIndex);

        try {
            const batch = writeBatch(db);
            newItems.forEach((item, index) => {
                const lessonRef = doc(db, "courses", courseId, "lessons", item.id);
                batch.update(lessonRef, { order: index });
            });
            await batch.commit();
            showToast("ย้ายตำแหน่งเรียบร้อยแล้ว!");
            fetchCourseInfo();
        } catch (error: any) {
            showToast("Error: " + error.message, "error");
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
    };


    const [flashcardJson, setFlashcardJson] = useState("");

    const [jsonError, setJsonError] = useState<string | null>(null);

    const tryAutoFixFlashcardJson = (raw: string) => {
        let fixed = raw.trim();
        // 1. Fix common quotes (smart quotes -> normal quotes)
        fixed = fixed.replace(/[''‘’]/g, "'");
        fixed = fixed.replace(/[""“”]/g, '"');

        // 2. Fix unquoted keys (e.g. id: 1 -> "id": 1)
        // Matches { key: or , key: ensuring key is alphanumeric/underscore
        fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');

        // 3. Fix trailing commas (e.g. , } -> } and , ] -> ])
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

        return fixed;
    };

    const handleFlashcardJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const rawStr = e.target.value;
        setFlashcardJson(rawStr);

        // 🛡️ Auto-clean common artifacts (e.g. from AI citations)
        let cleanStr = rawStr
            .replace(/\[cite(_start|_end)?(:.*?)?\]/gi, '')
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

        // Try primary parse with JSON5 (more relaxed)
        try {
            const parsed = JSON5.parse(cleanStr);
            if (Array.isArray(parsed)) {
                setFlashcardData(parsed);
                setJsonError(null);
                return;
            } else {
                setJsonError("Format ไม่ถูกต้อง: ต้องเป็น Array [...]");
            }
        } catch (err) {
            // First failure, try Auto-Fix
            try {
                const fixed = tryAutoFixFlashcardJson(cleanStr);
                const parsedFixed = JSON5.parse(fixed);
                if (Array.isArray(parsedFixed)) {
                    setFlashcardData(parsedFixed);
                    setJsonError(null);
                    // Optional: You could allow updating the text area to fixed version automatically, 
                    // but usually better to let user manually click "Fix" or just process it internally.
                    // For now, we just validate it successfully.
                    return;
                }
            } catch (err2) {
                // If still fails, show error
                setFlashcardData([]);
                if (cleanStr.length > 5) {
                    setJsonError("JSON ไม่ถูกต้อง (โปรดตรวจสอบ Syntax หรือกดปุ่ม AI Clean)");
                } else {
                    setJsonError(null);
                }
            }
        }
    };

    const handleQuizOptionChange = (index: number, value: string) => {
        const newOptions = [...quizOptions];
        newOptions[index] = value;
        setQuizOptions(newOptions);
    };

    const handleEditClick = (lesson: any) => {
        setEditId(lesson.id);
        setAddType(lesson.type || 'video');
        setLessonTitle(lesson.title);
        setSelectedHeaderId(lesson.headerId || "");

        // Reset Common Fields
        setVideoUrl("");
        setLessonContent("");
        setIsFree(false);
        setPdfUrl("");
        setCurrentImageUrl("");
        setImagePreview("");
        setImageFile(null);
        setQuizOptions(["", "", "", ""]);
        setCorrectAnswer(0);

        if (lesson.type === 'video') {
            setVideoUrl(lesson.videoId ? `https://youtu.be/${lesson.videoId}` : "");
            setLessonContent(lesson.content || "");
            setIsFree(lesson.isFree || false);
        } else if (lesson.type === 'text') {
            setLessonContent(lesson.content || "");
            setIsFree(lesson.isFree || false);
            setCurrentImageUrl(lesson.image || "");
            setImagePreview(lesson.image || "");
        } else if (lesson.type === 'exercise') {
            // ✅ Load Exercise Data
            setPdfUrl(lesson.docUrl || "");
            setLessonContent(lesson.content || "");
        } else if (lesson.type === 'quiz') {
            setQuizOptions(lesson.options || ["", "", "", ""]);
            setCorrectAnswer(lesson.correctAnswer || 0);
        } else if (lesson.type === 'html') {
            setHtmlCode(lesson.htmlCode || "");
            setLessonContent(lesson.content || "");
            setIsFree(lesson.isFree || false);
        } else if (lesson.type === 'flashcard') {
            const data = lesson.flashcardData || [];
            setFlashcardData(data);
            setFlashcardJson(JSON.stringify(data, null, 2));
            setLessonContent(lesson.content || "");
        } else {
            setCurrentImageUrl(lesson.image || "");
            setImagePreview(lesson.image || "");
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditId(null); setLessonTitle(""); setVideoUrl(""); setLessonContent(""); setIsFree(false); setSelectedHeaderId(""); setPdfUrl("");
        setAddType('header'); setImageFile(null); setImagePreview(""); setCurrentImageUrl(""); setQuizOptions(["", "", "", ""]); setCorrectAnswer(0); setHtmlCode(""); setFlashcardData([]); setFlashcardJson("");
    };



    // ... (existing code)

    // ✨ AI Clean: Auto-fix JSON & LaTeX for Course Lessons
    const handleAIClean = () => {
        try {
            // Use lessonContent as the source
            let contentToClean = lessonContent;

            // If empty, try to derive from existing examQuestions if available
            if (!contentToClean && examQuestions.length > 0) {
                contentToClean = JSON.stringify(examQuestions);
            }

            if (!contentToClean) return showToast("ไม่มีเนื้อหาให้ตรวจสอบ", "error");

            let parsed: any;
            try {
                parsed = JSON.parse(contentToClean);
            } catch (e) {
                // Try Basic JSON Fixes
                try {
                    const fixed = contentToClean
                        .replace(/,\s*}/g, '}') // Remove trailing commas
                        .replace(/,\s*]/g, ']')
                        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Quote keys
                        .replace(/'/g, '"');
                    parsed = JSON.parse(fixed);
                } catch (err) {
                    return showToast("⚠️ JSON เสียหาย (Syntax Error) กรุณาตรวจสอบวงเล็บหรือลูกน้ำ", "error");
                }
            }

            // Deep Clean Logic (Reusable)
            const deepClean = (obj: any): any => {
                if (typeof obj === 'string') {
                    let s = obj;
                    // Fix Typos
                    const commonTypos: Record<string, string> = {
                        '\\farc': '\\frac', '\\frca': '\\frac', '\\tims': '\\times',
                        '\\itmes': '\\times', '\\alpah': '\\alpha', '\\thetaa': '\\theta',
                        '\\lamda': '\\lambda', '\\sigmaa': '\\sigma', '\\right\\)': '\\right)'
                    };
                    Object.keys(commonTypos).forEach(typo => {
                        const escapedTypo = typo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(escapedTypo, 'g');
                        s = s.replace(regex, commonTypos[typo]);
                    });

                    // Balance Braces {}
                    const openBraces = (s.match(/\{/g) || []).length;
                    const closeBraces = (s.match(/\}/g) || []).length;
                    if (openBraces > closeBraces) s += '}'.repeat(openBraces - closeBraces);

                    // Balance \left \right
                    const leftCount = (s.match(/\\left/g) || []).length;
                    const rightCount = (s.match(/\\right/g) || []).length;
                    if (leftCount > rightCount) s += '\\right.'.repeat(leftCount - rightCount);

                    return s;
                } else if (Array.isArray(obj)) {
                    return obj.map(deepClean);
                } else if (obj && typeof obj === 'object') {
                    const newObj: any = {};
                    for (const key in obj) {
                        newObj[key] = deepClean(obj[key]);
                    }
                    return newObj;
                }
                return obj;
            };

            const cleanedData = deepClean(parsed);

            // Update both Raw String and Visual State
            const prettyJson = JSON.stringify(cleanedData, null, 2);
            setLessonContent(prettyJson);
            setExamQuestions(cleanedData);

            showToast("✨ AI Clean เรียบร้อย! (ซ่อม LaTeX + จัด Format)");

        } catch (e: any) {
            showToast("Error: " + e.message, "error");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lessonTitle) return showToast("กรุณาใส่ชื่อ/หัวข้อ", "error");
        if (addType !== 'header' && addType !== 'html' && !selectedHeaderId) return showToast("⚠️ กรุณาเลือก 'บทเรียนหลัก'", "error");
        if (addType === 'quiz' && quizOptions.some(opt => opt.trim() === "")) return showToast("กรุณาใส่ตัวเลือกให้ครบ", "error");
        if (addType === 'flashcard' && flashcardData.length === 0) return showToast("กรุณาระบุข้อมูล JSON Flashcard", "error");

        // ✅ Validate JSON for Smart Lesson
        if (addType === 'text' && lessonContent.trim().includes('"type":')) {
            try {
                JSON.parse(lessonContent);
            } catch (e) {
                return showToast("❌ รูปแบบ JSON ไม่ถูกต้อง (Syntax Error)\nกรุณาตรวจสอบวงเล็บ { } หรือตัวคั่น , ให้ถูกต้อง", "error");
            }
        }

        setSubmitting(true);
        try {
            let dataToSave: any = { title: lessonTitle, type: addType };
            if (addType !== 'header') dataToSave.headerId = selectedHeaderId;

            let downloadURL = currentImageUrl;
            if (imageFile) {
                const storageRef = ref(storage, `lesson-images/${Date.now()}-${imageFile.name}`);
                const snapshot = await uploadBytes(storageRef, imageFile);
                downloadURL = await getDownloadURL(snapshot.ref);
            }
            if (addType === 'header' || addType === 'text') {
                dataToSave.image = downloadURL;
            }

            if (addType === 'video') {
                dataToSave.videoId = extractVideoId(videoUrl);
                dataToSave.content = lessonContent;
                dataToSave.isFree = isFree;
            } else if (addType === 'text') {
                dataToSave.content = lessonContent;
                dataToSave.isFree = isFree;
            } else if (addType === 'exercise') {
                // ✅ Save Exercise Data
                dataToSave.docUrl = pdfUrl;
                dataToSave.content = lessonContent;
            } else if (addType === 'quiz') {
                dataToSave.options = quizOptions;
                dataToSave.correctAnswer = correctAnswer;
            } else if (addType === 'html') {
                dataToSave.htmlCode = htmlCode;
                dataToSave.content = lessonContent;
                dataToSave.isFree = isFree;
            } else if (addType === 'flashcard') {
                dataToSave.flashcardData = flashcardData;
                dataToSave.content = lessonContent;
            }

            if (editId) {
                await updateDoc(doc(db, "courses", courseId, "lessons", editId), dataToSave);
                showToast("✏️ แก้ไขข้อมูลแล้ว!");
            } else {
                // Assign order: max order + 1
                const maxOrder = lessons.reduce((max, l) => Math.max(max, l.order || 0), 0);
                dataToSave.order = maxOrder + 1;

                await addDoc(collection(db, "courses", courseId, "lessons"), { ...dataToSave, createdAt: new Date() });



                showToast("✅ เพิ่มข้อมูลสำเร็จ!");
            }
            handleCancelEdit();
            fetchCourseInfo();
        } catch (error: any) { showToast("Error: " + error.message, "error"); } finally { setSubmitting(false); }
    };

    const handleDelete = async (lessonId: string) => {
        if (confirm("ต้องการลบรายการนี้ใช่ไหม?")) {
            await deleteDoc(doc(db, "courses", courseId, "lessons", lessonId));
            showToast("ลบเรียบร้อย");
            fetchCourseInfo();
        }
    };

    const [bulkImportText, setBulkImportText] = useState("");
    const [bulkHeaderId, setBulkHeaderId] = useState("");

    const handleBulkImport = async () => {
        if (!bulkHeaderId) return showToast("กรุณาเลือกบทเรียน (Chapter) ที่ต้องการนำเข้า", "error");
        if (!bulkImportText.trim()) return showToast("กรุณาระบุรายชื่อตอน", "error");

        const header = availableHeaders.find(h => h.id === bulkHeaderId);
        const headerTitle = header ? header.title : "ไม่ระบุ";

        const lines = bulkImportText.trim().split('\n').filter(line => line.trim() !== "");
        if (!confirm(`⚠️ คุณต้องการนำเข้าบทเรียน ${lines.length} ตอน ไปยัง "${headerTitle}" ใช่หรือไม่?`)) return;

        setSubmitting(true);
        try {
            // Get Current Max Order
            let currentOrder = lessons.length > 0 ? Math.max(...lessons.map(l => l.order || 0)) + 1 : 1;

            // Process Text
            const batch = writeBatch(db);

            lines.forEach((line, index) => {
                // Split Title | URL
                const parts = line.split('|');
                const title = parts[0].trim();
                const url = parts[1] ? parts[1].trim() : "";
                const videoId = extractVideoId(url);

                const docRef = doc(collection(db, "courses", courseId, "lessons"));
                batch.set(docRef, {
                    title: title,
                    type: "video",
                    headerId: bulkHeaderId, // Use selected header ID
                    videoId: videoId,
                    content: "",
                    isFree: false,
                    createdAt: new Date(),
                    order: currentOrder + index
                });
            });

            await batch.commit();
            showToast(`✅ นำเข้า ${lines.length} ตอนไปยัง "${headerTitle}" สำเร็จ!`);
            setBulkImportText("");
            setBulkHeaderId("");
            fetchCourseInfo();

        } catch (error: any) {
            showToast("Error importing: " + error.message, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAllLessons = async () => {
        if (!confirm("⚠️ คุณแน่ใจหรือไม่ที่จะลบ 'บทเรียนทั้งหมด' ในคอร์สนี้?\n\n(รวมถึงวิดีโอ, แบบฝึกหัด, และข้อสอบทั้งหมด)\n\nการกระทำนี้ไม่สามารถกู้คืนได้!")) return;
        if (!confirm("ยืนยันครั้งสุดท้าย: ลบข้อมูลทั้งหมดจริงหรือไม่?")) return;

        setSubmitting(true);
        try {
            const q = query(collection(db, "courses", courseId, "lessons"));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                showToast("ไม่มีข้อมูลให้ลบ");
                setSubmitting(false);
                return;
            }

            // Delete in batches of 500
            const chunks = [];
            let currentChunk = writeBatch(db);
            let count = 0;

            snapshot.docs.forEach((doc) => {
                currentChunk.delete(doc.ref);
                count++;
                if (count >= 400) { // Safe limit
                    chunks.push(currentChunk);
                    currentChunk = writeBatch(db);
                    count = 0;
                }
            });
            if (count > 0) chunks.push(currentChunk);

            for (const chunk of chunks) {
                await chunk.commit();
            }

            showToast("🗑 ลบข้อมูลทั้งหมดเรียบร้อยแล้ว");
            fetchCourseInfo();
        } catch (error: any) {
            showToast("Error deleting: " + error.message, "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (

        <div className="min-h-screen bg-[#EEF2FF] p-6 md:p-10 font-sans text-slate-700 relative">
            {/* Global KaTeX Styles */}
            <style dangerouslySetInnerHTML={{ __html: katexGlobalStyles }} />
            {toast && (
                <div className={`fixed bottom-5 right-5 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce z-50 border-l-8 ${toast.type === 'success' ? 'bg-white text-teal-700 border-teal-400' : 'bg-white text-rose-600 border-rose-400'}`}>
                    <span className="text-2xl">{toast.type === 'success' ? '🎉' : '🚨'}</span><p className="font-bold text-lg">{toast.msg}</p>
                </div>
            )}

            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Link href="/admin/courses" className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 mb-4 transition font-bold bg-white px-4 py-2 rounded-full shadow-sm">← กลับไปหน้ารวมคอร์ส</Link>
                    <div className="flex items-center gap-4 mt-2">
                        <div className="w-14 h-14 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg></div>
                        <div><h1 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">จัดการบทเรียน</h1><h2 className="text-3xl font-extrabold text-indigo-900">{courseTitle}</h2></div>
                    </div>
                </div>

                {/* ✅ Tab Navigation */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('lessons')}
                        className={`px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'lessons' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                        📚 จัดการบทเรียน
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                        👨‍🎓 รายชื่อผู้เรียน ({students.length})
                    </button>
                </div>

                {
                    loading ? <div className="p-10 text-center text-indigo-400">กำลังโหลด...</div> : activeTab === 'lessons' ? (
                        <>
                            <div className={`bg-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100 border border-indigo-50 mb-10 transition-all duration-300 ${editId ? 'ring-4 ring-amber-200' : ''}`}>

                                {/* ✅ เพิ่มปุ่มเมนู 5 ปุ่ม (รวม Exercise) */}
                                <div className="grid grid-cols-5 gap-2 p-2 bg-slate-100 rounded-3xl mb-8 overflow-x-auto">
                                    <button type="button" onClick={() => setAddType('header')} disabled={!!editId && addType !== 'header'} className={`py-3 px-2 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 ${addType === 'header' ? 'bg-orange-400 text-white shadow-lg shadow-orange-200 scale-105' : 'text-slate-400 hover:bg-white'} ${!!editId && addType !== 'header' ? 'opacity-30 cursor-not-allowed' : ''}`}><HeaderIcon /> <span className="hidden sm:inline">ชื่อบท</span></button>
                                    <button type="button" onClick={() => setAddType('video')} disabled={!!editId && addType === 'header'} className={`py-3 px-2 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 ${addType === 'video' ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 scale-105' : 'text-slate-400 hover:bg-white'} ${!!editId && addType === 'header' ? 'opacity-30 cursor-not-allowed' : ''}`}><VideoIcon /> <span className="hidden sm:inline">วิดีโอ</span></button>
                                    <button type="button" onClick={() => setAddType('text')} disabled={!!editId && addType === 'header'} className={`py-3 px-2 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 ${addType === 'text' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200 scale-105' : 'text-slate-400 hover:bg-white'} ${!!editId && addType === 'header' ? 'opacity-30 cursor-not-allowed' : ''}`}><TextIcon /> <span className="hidden sm:inline">สรุปเนื้อหา</span></button>
                                    <button type="button" onClick={() => setAddType('quiz')} disabled={!!editId && addType === 'header'} className={`py-3 px-2 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 ${addType === 'quiz' ? 'bg-purple-500 text-white shadow-lg shadow-purple-200 scale-105' : 'text-slate-400 hover:bg-white'} ${!!editId && addType === 'header' ? 'opacity-30 cursor-not-allowed' : ''}`}><QuizIcon /> <span className="hidden sm:inline">คำถาม</span></button>
                                    {/* ✅ ปุ่ม Exercise ใหม่ */}
                                    <button type="button" onClick={() => setAddType('exercise')} disabled={!!editId && addType === 'header'} className={`py-3 px-2 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 ${addType === 'exercise' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-105' : 'text-slate-400 hover:bg-white'} ${!!editId && addType === 'header' ? 'opacity-30 cursor-not-allowed' : ''}`}><ExerciseIcon /> <span className="hidden sm:inline">แบบฝึกหัด</span></button>
                                    {/* ✅ ปุ่ม HTML ใหม่ -> เปลี่ยนเป็น Exam System */}
                                    <button type="button" onClick={() => setAddType('html')} disabled={!!editId && addType === 'header'} className={`py-3 px-2 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 ${addType === 'html' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-200 scale-105' : 'text-slate-400 hover:bg-white'} ${!!editId && addType === 'header' ? 'opacity-30 cursor-not-allowed' : ''}`}><Blocks size={18} /> <span className="hidden sm:inline">ข้อสอบ (Exam)</span></button>
                                    {/* ✅ ปุ่ม Flashcard ใหม่ */}
                                    <button type="button" onClick={() => setAddType('flashcard')} disabled={!!editId && addType === 'header'} className={`py-3 px-2 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 ${addType === 'flashcard' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-200 scale-105' : 'text-slate-400 hover:bg-white'} ${!!editId && addType === 'header' ? 'opacity-30 cursor-not-allowed' : ''}`}><FlashcardIcon /> <span className="hidden sm:inline">Flashcard</span></button>
                                </div>

                                <div className="flex justify-between items-center mb-6 px-2">
                                    <h3 className={`font-bold text-xl flex items-center gap-3 ${addType === 'video' ? 'text-blue-600' : addType === 'quiz' ? 'text-purple-600' : addType === 'text' ? 'text-pink-600' : addType === 'exercise' ? 'text-emerald-600' : addType === 'flashcard' ? 'text-yellow-600' : 'text-orange-600'}`}>
                                        <div className={`w-3 h-3 rounded-full ${addType === 'video' ? 'bg-blue-500' : addType === 'quiz' ? 'bg-purple-500' : addType === 'text' ? 'bg-pink-500' : addType === 'exercise' ? 'bg-emerald-500' : addType === 'flashcard' ? 'bg-yellow-500' : 'bg-orange-500'}`}></div>
                                        {editId ? '✏️ แก้ไขข้อมูล' : (addType === 'video' ? 'เพิ่มวิดีโอใหม่' : addType === 'quiz' ? 'สร้างคำถาม (Quiz)' : addType === 'text' ? 'เพิ่มสรุปเนื้อหา (Smart Content)' : addType === 'exercise' ? 'เพิ่มแบบฝึกหัด (PDF Link)' : addType === 'flashcard' ? 'เพิ่ม Flashcard' : 'เพิ่มหัวข้อบทเรียน')}
                                    </h3>
                                    <div className="flex gap-2">
                                        {editId && <button onClick={handleCancelEdit} className="text-sm font-bold text-rose-400 hover:text-rose-600 underline transition bg-rose-50 px-3 py-1 rounded-lg">ยกเลิก</button>}
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                    {addType !== 'header' && addType !== 'html' && (
                                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 ml-1">📂 เลือกบทเรียนหลัก</label>
                                            <select value={selectedHeaderId} onChange={(e) => setSelectedHeaderId(e.target.value)} className="w-full p-3 rounded-xl border-2 border-indigo-200 bg-white font-bold text-indigo-900 outline-none focus:border-indigo-500 transition">
                                                <option value="">-- กรุณาเลือกบทเรียน --</option>
                                                {availableHeaders.length > 0 ? availableHeaders.map((h) => <option key={h.id} value={h.id}>📂 {h.title}</option>) : <option disabled>⚠️ ยังไม่มีชื่อบทเรียน</option>}
                                            </select>
                                        </div>
                                    )}

                                    <input type="text" placeholder={addType === 'quiz' ? "ตั้งคำถาม..." : addType === 'exercise' ? "ชื่อแบบฝึกหัดทบทวน..." : addType === 'html' ? "ชื่อหัวข้อ (เช่น แบบฝึกหัด, สรุปเนื้อหา)..." : "ชื่อ/หัวข้อ..."} className="w-full p-5 border-2 rounded-2xl outline-none transition font-bold text-lg shadow-sm" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />

                                    {addType === 'video' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                            <input type="text" placeholder="🔗 วางลิงก์ YouTube..." className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none transition font-mono text-sm" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                                            <div className="flex items-center gap-3 p-4 bg-teal-50 rounded-2xl border-2 border-teal-100 cursor-pointer hover:bg-teal-100 transition" onClick={() => setIsFree(!isFree)}>
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${isFree ? 'bg-teal-500 border-teal-500' : 'bg-white border-teal-300'}`}>{isFree && <span className="text-white text-xs font-bold">✓</span>}</div>
                                                <label className="text-teal-800 font-bold text-sm cursor-pointer">ใจดี! เปิดให้ดูฟรี (Free Preview) 🎁</label>
                                            </div>
                                            <textarea placeholder="📝 คำอธิบายวิดีโอ..." className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none min-h-[120px]" value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} />
                                        </div>
                                    )}

                                    {addType === 'text' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="bg-pink-50 p-4 rounded-2xl border-2 border-pink-100 border-dashed">
                                                <label className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-2 block">🖼️ รูปภาพปกบทความ (Cover Image)</label>
                                                <div className="relative group">
                                                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="article-image-upload" />
                                                    <label htmlFor="article-image-upload" className="w-full h-32 bg-white border-2 border-dashed border-pink-300 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-pink-100 hover:border-pink-400 transition text-pink-400 font-bold shadow-sm">
                                                        <span className="text-2xl bg-pink-100 p-2 rounded-full">📷</span>
                                                        <span>คลิกเพิ่มรูปภาพ</span>
                                                        <span className="text-xs text-pink-300 font-normal mt-1">ขนาดแนะนำ 1920 x 1080 px (16:9)</span>
                                                    </label>
                                                </div>
                                                {imagePreview && <div className="mt-4 rounded-xl overflow-hidden h-40 w-full bg-slate-200 border-2 border-white shadow-md"><img src={imagePreview} alt="Preview" className="h-full w-full object-cover" /></div>}
                                            </div>

                                            <div className="relative group">
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="text-[10px] text-pink-400 font-bold opacity-80 pl-1">JSON / Markdown Supported</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            try {
                                                                // 1. Remove [cite_start] artifacts globally
                                                                let cleaned = lessonContent.replace(/\[cite_start\]/g, "");
                                                                // 2. Remove [cite: ...] tags
                                                                cleaned = cleaned.replace(/\[cite:\s*[^\]]+\]/g, "");
                                                                // 3. Remove "Based on..." preambles
                                                                cleaned = cleaned.replace(/^Based on the provided[\s\S]*?\[/, "[");
                                                                // 4. Try to parse and pretty print
                                                                const parsed = JSON.parse(cleaned);
                                                                setLessonContent(JSON.stringify(parsed, null, 2));
                                                                showToast("✨ ล้างโค้ดและจัดรูปแบบเรียบร้อย!");
                                                            } catch (e) {
                                                                // Fallback: Just simple replace if JSON parse fails
                                                                let cleaned = lessonContent.replace(/\[cite_start\]/g, "").replace(/\[cite:\s*[^\]]+\]/g, "");
                                                                setLessonContent(cleaned);
                                                                showToast("⚠️ ล้างโค้ดบางส่วนแล้ว (JSON ยังไม่สมบูรณ์)", "error");
                                                            }
                                                        }}
                                                        className="text-[10px] bg-pink-100 text-pink-600 px-2 py-1 rounded-lg font-bold hover:bg-pink-200 transition flex items-center gap-1"
                                                    >
                                                        ✨ ล้างโค้ด (Clean Code)
                                                    </button>
                                                </div>
                                                <textarea
                                                    placeholder={`เขียนเนื้อหาบทเรียน หรือวาง JSON Code ที่นี่...\n\nตัวอย่าง JSON:\n[\n  { "type": "header", "content": "หัวข้อเรื่อง" },\n  { "type": "definition", "title": "นิยาม", "content": "เนื้อหา..." }\n]`}
                                                    className="w-full p-6 bg-slate-50 border-2 border-pink-100 focus:border-pink-400 rounded-2xl outline-none min-h-[300px] font-mono text-sm text-slate-700 leading-relaxed"
                                                    value={lessonContent}
                                                    onChange={(e) => setLessonContent(e.target.value)}
                                                    spellCheck={false}
                                                />
                                            </div>

                                            <div className="flex items-center gap-3 p-4 bg-teal-50 rounded-2xl border-2 border-teal-100 cursor-pointer hover:bg-teal-100 transition" onClick={() => setIsFree(!isFree)}>
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${isFree ? 'bg-teal-500 border-teal-500' : 'bg-white border-teal-300'}`}>{isFree && <span className="text-white text-xs font-bold">✓</span>}</div>
                                                <label className="text-teal-800 font-bold text-sm cursor-pointer">ใจดี! เปิดให้อ่านฟรี (Free Read) 📖</label>
                                            </div>
                                        </div>
                                    )}

                                    {/* ✅ New Exercise Form (PDF Link) */}
                                    {addType === 'exercise' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100">
                                                <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">🔗 ลิงก์ไฟล์แบบฝึกหัด (Google Drive / PDF)</label>
                                                <input
                                                    type="text"
                                                    placeholder="วางลิงก์ Google Drive หรือ PDF ที่นี่..."
                                                    className="w-full p-4 bg-white border-2 border-emerald-200 rounded-xl outline-none focus:border-emerald-500 transition text-emerald-800 font-medium placeholder:text-emerald-300/70"
                                                    value={pdfUrl}
                                                    onChange={(e) => setPdfUrl(e.target.value)}
                                                />
                                                <p className="text-xs text-emerald-500 mt-2">* แนะนำให้แชร์ลิงก์เป็น "ทุกคนที่มีลิงก์" (Anyone with the link) เพื่อให้นักเรียนเข้าถึงได้</p>
                                            </div>
                                            <textarea placeholder="📝 คำอธิบายเพิ่มเติม (ถ้ามี)..." className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl outline-none min-h-[100px]" value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} />
                                        </div>
                                    )}

                                    {addType === 'quiz' && (
                                        <div className="space-y-3 bg-purple-50 p-6 rounded-[2rem] border-2 border-purple-100 animate-in fade-in">
                                            <p className="text-sm font-bold text-purple-500 uppercase tracking-wider mb-2">กำหนดตัวเลือก & เฉลย</p>
                                            {quizOptions.map((opt, index) => (
                                                <div key={index} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${correctAnswer === index ? 'bg-white border-green-400 shadow-md' : 'bg-white/50 border-transparent'}`}>
                                                    <div className="cursor-pointer" onClick={() => setCorrectAnswer(index)}><div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${correctAnswer === index ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300'}`}>✓</div></div>
                                                    <input type="text" placeholder={`ตัวเลือกที่ ${index + 1}`} className="flex-1 p-2 bg-transparent outline-none" value={opt} onChange={(e) => handleQuizOptionChange(index, e.target.value)} />
                                                </div>
                                            ))}
                                        </div>
                                    )}



                                    {addType === 'flashcard' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="bg-yellow-50 p-6 rounded-2xl border-2 border-yellow-100">
                                                <label className="block text-xs font-bold text-yellow-600 uppercase tracking-wider mb-2">📝 วางข้อมูล JSON (Format: Array of Objects)</label>
                                                <textarea
                                                    placeholder={`[\n  {\n    "id": 1,\n    "topic": "ชื่อหัวข้อ",\n    "question": "คำถาม $$...$$",\n    "answer": "คำตอบ"\n  }\n]`}
                                                    value={flashcardJson}
                                                    onChange={handleFlashcardJsonChange}
                                                    className={`w-full p-4 bg-white border-2 rounded-xl outline-none transition text-slate-700 min-h-[200px] font-mono text-sm ${jsonError ? 'border-red-300 focus:border-red-500' : 'border-yellow-200 focus:border-yellow-500'}`}
                                                />
                                                <div className="flex justify-between items-start mt-2">
                                                    <div className="flex flex-col gap-1">
                                                        <p className="text-xs text-yellow-500">* รองรับมาตรฐาน JSON และ LaTeX ($$ ... $$)</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const fixed = tryAutoFixFlashcardJson(flashcardJson);
                                                                setFlashcardJson(fixed);
                                                                try {
                                                                    const parsed = JSON5.parse(fixed);
                                                                    if (Array.isArray(parsed)) {
                                                                        setFlashcardData(parsed);
                                                                        setJsonError(null);
                                                                        showToast("✨ AI Clean เรียบร้อย!");
                                                                    }
                                                                } catch (e) {
                                                                    // If auto-fix fails to produce valid JSON, just leave it (user sees error)
                                                                }
                                                            }}
                                                            className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg hover:bg-yellow-200 transition font-bold flex items-center gap-1 w-fit"
                                                        >
                                                            🪄 AI Clean (Auto Fix)
                                                        </button>
                                                    </div>
                                                    {flashcardJson && (
                                                        <p className={`text-xs font-bold ${jsonError ? 'text-red-500' : 'text-emerald-500'}`}>
                                                            {jsonError ? `⚠️ ${jsonError}` : `✅ พบข้อมูล ${flashcardData.length} รายการ`}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {flashcardData.length > 0 && (
                                                <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm max-h-80 overflow-y-auto">
                                                    <h4 className="font-bold text-slate-700 mb-3 sticky top-0 bg-white pb-2 border-b">📋 ตัวอย่างข้อมูล ({flashcardData.length} ใบ)</h4>
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-slate-400 uppercase bg-slate-50 sticky top-8">
                                                            <tr>
                                                                <th className="px-3 py-2 w-10">ID</th>
                                                                <th className="px-3 py-2 w-24">Topic</th>
                                                                <th className="px-3 py-2">Question</th>
                                                                <th className="px-3 py-2">Answer</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {flashcardData.map((card, idx) => (
                                                                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 align-top">
                                                                    <td className="px-3 py-2 text-slate-400 font-mono text-xs">{card.id}</td>
                                                                    <td className="px-3 py-2 text-slate-600 font-bold text-xs">{card.topic}</td>
                                                                    <td className="px-3 py-2 font-medium text-slate-700">{renderWithLatex(card.question || card.front)}</td>
                                                                    <td className="px-3 py-2 text-slate-500">{renderWithLatex(card.answer || card.back)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            <textarea placeholder="📝 คำอธิบายเพิ่มเติม (ถ้ามี)..." className="w-full p-4 bg-yellow-50 border-2 border-yellow-100 rounded-2xl outline-none min-h-[100px]" value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} />
                                        </div>
                                    )}

                                    {addType === 'header' && (
                                        <div className="space-y-4 p-6 bg-orange-50 border-2 border-orange-100 rounded-[2rem] animate-in fade-in">
                                            <div className="relative group">
                                                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="header-upload" />
                                                <label htmlFor="header-upload" className="w-full h-40 bg-white border-2 border-dashed border-orange-300 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-orange-100 hover:border-orange-400 transition text-orange-400 font-bold shadow-sm">
                                                    <span className="text-4xl bg-orange-100 p-3 rounded-full">📁</span>
                                                    <span>คลิกเพื่ออัปโหลดรูปภาพ</span>
                                                    <span className="text-xs text-orange-300 font-normal mt-1">ขนาดแนะนำ 1920 x 1080 px (16:9)</span>
                                                </label>
                                            </div>
                                            {imagePreview && <div className="mt-4 rounded-2xl overflow-hidden h-56 w-full bg-slate-200"><img src={imagePreview} alt="Preview" className="h-full w-full object-contain" /></div>}
                                        </div>
                                    )}

                                    {addType === 'html' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                            {/* Toolbar */}
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex bg-cyan-50 p-1 rounded-xl border border-cyan-100">
                                                        <button type="button" onClick={() => setIsRawMode(false)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${!isRawMode ? 'bg-cyan-500 text-white shadow-sm' : 'text-cyan-600 hover:bg-cyan-100'}`}>🃏 Smart Cards</button>
                                                        <button type="button" onClick={() => setIsRawMode(true)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${isRawMode ? 'bg-cyan-500 text-white shadow-sm' : 'text-cyan-600 hover:bg-cyan-100'}`}>📝 Raw (Advanced)</button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleAIClean}
                                                        className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-600 hover:bg-amber-200 border border-amber-200 transition flex items-center gap-1 shadow-sm"
                                                        title="ซ่อมแซม LaTeX และจัด Format JSON อัตโนมัติ"
                                                    >
                                                        <span>✨</span> AI Clean
                                                    </button>
                                                </div>

                                                {!isRawMode && (
                                                    <button type="button" onClick={() => setIsAddingQuestion(!isAddingQuestion)} className="bg-cyan-100 hover:bg-cyan-200 text-cyan-700 font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1 border border-cyan-200">
                                                        {isAddingQuestion ? '❌ ยกเลิก' : '➕ เพิ่มข้อ (Paste Code)'}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Add Question Panel */}
                                            {isAddingQuestion && !isRawMode && (
                                                <div className="bg-cyan-50 p-4 rounded-2xl border-2 border-cyan-200 shadow-sm animate-in slide-in-from-top-2">
                                                    <label className="block text-xs font-bold text-cyan-700 mb-2">วางโค้ด JSON ของข้อสอบ "ข้อเดียว" ที่นี่:</label>
                                                    <textarea
                                                        placeholder={`{\n  "id": ...,\n  "question": "..."\n}`}
                                                        className="w-full p-4 bg-white border-2 border-cyan-100 rounded-xl outline-none min-h-[150px] font-mono text-xs text-slate-600 mb-3"
                                                        value={newQuestionJson}
                                                        onChange={(e) => setNewQuestionJson(e.target.value)}
                                                    />
                                                    <button type="button" onClick={handleAddSingleQuestion} className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-bold transition shadow-sm">บันทึกข้อสอบข้อนี้ ✅</button>
                                                </div>
                                            )}

                                            {/* Editor Area */}
                                            {isRawMode ? (
                                                <div className="bg-slate-900 p-6 rounded-2xl border-2 border-slate-700 relative group">
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"><span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-1 rounded">Raw JSON Mode</span></div>
                                                    <textarea
                                                        className="w-full bg-transparent text-cyan-400 outline-none min-h-[400px] font-mono text-xs leading-relaxed custom-scrollbar"
                                                        value={lessonContent}
                                                        onChange={(e) => setLessonContent(e.target.value)}
                                                        spellCheck={false}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                                    {examQuestions.length > 0 ? [...examQuestions].reverse().map((q, reversedIdx) => {
                                                        const idx = examQuestions.length - 1 - reversedIdx; // Get original index
                                                        const isEditing = editingQIndex === idx;

                                                        if (isEditing) {
                                                            return (
                                                                <div key={idx} className="bg-cyan-50 p-6 rounded-xl border-2 border-cyan-300 shadow-md animate-in zoom-in-95 duration-200">
                                                                    <div className="flex justify-between items-center mb-4">
                                                                        <span className="font-black text-cyan-700">✏️ แก้ไขข้อที่ {idx + 1}</span>
                                                                        <div className="flex gap-2">
                                                                            <button type="button" onClick={() => setEditingQIndex(null)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 font-bold hover:bg-slate-50">ยกเลิก</button>
                                                                            <button type="button" onClick={handleSaveEditQuestion} className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-700 shadow-sm">บันทึก</button>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <label className="text-xs font-bold text-cyan-600 mb-1 block">โจทย์คำถาม</label>
                                                                            <textarea
                                                                                className="w-full p-3 rounded-lg border border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-medium"
                                                                                rows={3}
                                                                                value={tempEditQuestion.question}
                                                                                onChange={(e) => setTempEditQuestion({ ...tempEditQuestion, question: e.target.value })}
                                                                            />
                                                                        </div>

                                                                        <div className="grid md:grid-cols-2 gap-4">
                                                                            <div className="space-y-2">
                                                                                <label className="text-xs font-bold text-cyan-600 mb-1 block">ตัวเลือก (Options)</label>
                                                                                {tempEditQuestion.options?.map((opt: string, optIdx: number) => (
                                                                                    <div key={optIdx} className="flex gap-2">
                                                                                        <span className="w-6 h-8 flex items-center justify-center bg-cyan-100 rounded text-cyan-700 font-bold text-xs shrink-0">{optIdx + 1}</span>
                                                                                        <input
                                                                                            type="text"
                                                                                            className="flex-1 p-2 rounded border border-cyan-100 text-sm"
                                                                                            value={opt}
                                                                                            onChange={(e) => {
                                                                                                const newOptions = [...tempEditQuestion.options];
                                                                                                newOptions[optIdx] = e.target.value;
                                                                                                setTempEditQuestion({ ...tempEditQuestion, options: newOptions });
                                                                                            }}
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                const newOptions = tempEditQuestion.options.filter((_: any, i: number) => i !== optIdx);
                                                                                                setTempEditQuestion({ ...tempEditQuestion, options: newOptions });
                                                                                            }}
                                                                                            className="w-8 h-8 rounded bg-red-50 text-red-400 hover:bg-red-100"
                                                                                        >
                                                                                            <Trash2 size={14} className="mx-auto" />
                                                                                        </button>
                                                                                    </div>
                                                                                ))}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setTempEditQuestion({ ...tempEditQuestion, options: [...(tempEditQuestion.options || []), ""] })}
                                                                                    className="text-xs font-bold text-cyan-600 hover:underline mt-2 flex items-center gap-1"
                                                                                >
                                                                                    <Plus size={12} /> เพิ่มตัวเลือก
                                                                                </button>
                                                                            </div>

                                                                            <div className="space-y-4">
                                                                                <div>
                                                                                    <label className="text-xs font-bold text-cyan-600 mb-1 block">เฉลยข้อที่ถูกต้อง (Index)</label>
                                                                                    <select
                                                                                        className="w-full p-2 rounded border border-cyan-200 text-sm font-bold text-cyan-800"
                                                                                        value={tempEditQuestion.answerIndex ?? 0}
                                                                                        onChange={(e) => setTempEditQuestion({ ...tempEditQuestion, answerIndex: parseInt(e.target.value) })}
                                                                                    >
                                                                                        {tempEditQuestion.options?.map((opt: string, i: number) => (
                                                                                            <option key={i} value={i}>ตัวเลือกที่ {i + 1}: {opt.substring(0, 30)}...</option>
                                                                                        ))}
                                                                                    </select>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-xs font-bold text-cyan-600 mb-1 block">คำอธิบายเฉลย (Explanation)</label>
                                                                                    <textarea
                                                                                        className="w-full p-2 rounded-lg border border-cyan-200 text-sm"
                                                                                        rows={3}
                                                                                        value={tempEditQuestion.explanation || ""}
                                                                                        placeholder="อธิบายว่าทำไมถึงตอบข้อนี้..."
                                                                                        onChange={(e) => setTempEditQuestion({ ...tempEditQuestion, explanation: e.target.value })}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 0.05}s` }}>
                                                                <div className="flex justify-between items-start gap-4">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="bg-cyan-100 text-cyan-700 text-[10px] font-bold px-1.5 py-0.5 rounded">#{idx + 1}</span>
                                                                            {q.id && <span className="text-[10px] text-slate-400 font-mono">ID: {q.id}</span>}
                                                                        </div>
                                                                        <p className="text-sm font-bold text-slate-700 line-clamp-2">{q.question || "(ไม่มีโจทย์)"}</p>

                                                                        {/* Image Preview & Upload */}
                                                                        <div className="mt-2 flex items-center gap-3">
                                                                            {q.image && (
                                                                                <div className="relative group w-16 h-12 bg-slate-900 rounded border border-slate-200 overflow-hidden shrink-0">
                                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                    <img src={q.image} alt="Q" className="w-full h-full object-contain" />
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const updated = [...examQuestions];
                                                                                            delete updated[idx].image;
                                                                                            updateExamContent(updated);
                                                                                        }}
                                                                                        className="absolute top-0 right-0 bg-red-500/80 hover:bg-red-600 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition"
                                                                                    >
                                                                                        <Trash2 size={10} />
                                                                                    </button>
                                                                                </div>
                                                                            )}

                                                                            <label className="cursor-pointer flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-500 font-bold transition">
                                                                                <ImageIcon size={12} />
                                                                                {q.image ? "เปลี่ยนรูป" : "แนบรูป"}
                                                                                <input
                                                                                    type="file"
                                                                                    className="hidden"
                                                                                    accept="image/*"
                                                                                    onChange={async (e) => {
                                                                                        const file = e.target.files?.[0];
                                                                                        if (!file) return;
                                                                                        try {
                                                                                            const filename = `course-exam-images/${Date.now()}_${idx}_${file.name}`;
                                                                                            const storageRef = ref(storage, filename);
                                                                                            const snapshot = await uploadBytes(storageRef, file);
                                                                                            const url = await getDownloadURL(snapshot.ref);

                                                                                            const updated = [...examQuestions];
                                                                                            updated[idx] = { ...updated[idx], image: url };
                                                                                            updateExamContent(updated);
                                                                                        } catch (err) {
                                                                                            console.error(err);
                                                                                            alert("อัปโหลดไม่สำเร็จ");
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </label>
                                                                        </div>

                                                                        <p className="text-xs text-slate-500 mt-2 truncate">
                                                                            ตัวเลือก: {Array.isArray(q.options) ? q.options.length : 0} ข้อ | เฉลย: ข้อ {(q.answerIndex || 0) + 1}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                                                                        <button type="button" onClick={() => { setEditingQIndex(idx); setTempEditQuestion(JSON.parse(JSON.stringify(q))); }} className="p-1 hover:bg-cyan-50 rounded text-slate-400 hover:text-cyan-600 mb-2" title="แก้ไขข้อความ"><Edit2 size={16} /></button>
                                                                        <button type="button" onClick={() => handleMoveQuestion(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowUpIcon /></button>
                                                                        <button type="button" onClick={() => handleMoveQuestion(idx, 'down')} disabled={idx === examQuestions.length - 1} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowDownIcon /></button>
                                                                        <button type="button" onClick={() => handleDeleteQuestion(idx)} className="p-1 hover:bg-red-50 rounded text-red-300 hover:text-red-500 mt-2"><Trash2 size={16} /></button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }) : (
                                                        <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
                                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl">📭</div>
                                                            <p className="font-bold">ยังไม่มีข้อสอบในชุดนี้</p>
                                                            <p className="text-xs">กดปุ่ม <span className="text-cyan-600 font-bold">+ เพิ่มข้อ</span> ด้านบนเพื่อเริ่มสร้าง</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <button type="submit" disabled={submitting} className={`w-full py-4 rounded-2xl font-black text-white shadow-lg hover:shadow-xl transition text-lg tracking-wide mt-2 ${submitting ? 'bg-slate-400 cursor-not-allowed' : addType === 'exercise' ? 'bg-emerald-500 hover:bg-emerald-600' : addType === 'html' ? 'bg-cyan-500 hover:bg-cyan-600' : addType === 'flashcard' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                                        {submitting ? '⏳ กำลังบันทึก...' : editId ? '💾 บันทึกการแก้ไข' : '+ เพิ่มลงในบทเรียน'}
                                    </button>
                                </form>
                            </div>

                            {/* Lesson List */}
                            <div className="space-y-8">

                                {/* ⚡️ ZONE 1: Exam Hub */}
                                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-100 rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-200/20 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none"></div>

                                    <div className="relative z-10 flex flex-col gap-6">
                                        <div className="flex items-center gap-3 border-b-2 border-cyan-200/50 pb-4">
                                            <div className="w-10 h-10 bg-cyan-200 text-cyan-700 rounded-xl flex items-center justify-center text-xl shadow-sm">⚡️</div>
                                            <div>
                                                <h3 className="text-xl font-black text-cyan-900">โซนข้อสอบ (Exam Zone)</h3>
                                                <p className="text-xs font-bold text-cyan-600/70">จัดการชุดข้อสอบทั้งหมดที่นี่</p>
                                            </div>
                                        </div>

                                        {examLessons.length > 0 ? (
                                            <div className="grid gap-3">
                                                {examLessons.map(exam => (
                                                    <div key={exam.id} className="bg-white p-4 rounded-2xl border-2 border-cyan-100/50 shadow-sm hover:shadow-md hover:border-cyan-300 transition flex items-center justify-between group/card">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center font-bold text-sm border-2 border-cyan-100 group-hover/card:scale-105 transition shadow-sm">
                                                                <Blocks size={24} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="bg-cyan-100 text-cyan-700 text-[10px] font-bold px-2 py-0.5 rounded-full">EXAM</span>
                                                                    {exam.isHidden && <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">HIDDEN</span>}
                                                                </div>
                                                                <h4 className="font-bold text-slate-700 text-lg">{exam.title}</h4>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-100 transition">
                                                            <button onClick={() => handleEditClick(exam)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition border border-transparent hover:border-indigo-200" title="แก้ไข"><Edit2 size={18} /></button>
                                                            <button onClick={() => handleToggleVisibility(exam)} className={`p-2.5 rounded-xl transition border border-transparent ${exam.isHidden ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-200'}`} title={exam.isHidden ? "แสดง" : "ซ่อน"}>{exam.isHidden ? "👁️‍🗨️" : "👁️"}</button>
                                                            <button onClick={() => handleDelete(exam.id)} className="p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition border border-transparent hover:border-rose-200 hover:shadow-sm" title="ลบ"><Trash2 size={18} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 bg-white/60 rounded-3xl border-2 border-dashed border-cyan-200/50 backdrop-blur-sm">
                                                <div className="text-4xl mb-3 opacity-50">✨</div>
                                                <p className="text-cyan-600 font-bold mb-1">ยังไม่มีข้อสอบในคอร์สนี้</p>
                                                <p className="text-xs text-cyan-400 opacity-80">กดปุ่ม <span className="underline">ข้อสอบ (Exam)</span> ด้านบนเพื่อสร้างใหม่</p>
                                            </div>
                                        )}
                                    </div>
                                </div>


                                {/* 📚 ZONE 2: Curriculum */}
                                <div className="space-y-6 relative pl-4 md:pl-8 border-l-2 border-slate-100">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 ring-4 ring-white"></div>
                                    <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs mb-6">บทเรียนหลัก (Curriculum)</h3>

                                    {groupedLessons.map((group, index) => (
                                        <LessonGroup
                                            key={index}
                                            group={group}
                                            handleEdit={handleEditClick}
                                            handleDelete={handleDelete}
                                            handleToggleVisibility={handleToggleVisibility}
                                            handleMoveLesson={handleMoveLesson}
                                            onDragEnd={handleDragEnd}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Bulk Import & Delete All */}
                            <div className="mt-20 pt-10 border-t-2 border-slate-100">
                                <h3 className="text-xl font-black text-slate-700 mb-6">⚙️ เครื่องมือขั้นสูง</h3>

                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Bulk Import */}
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">📥 นำเข้าบทเรียนทีละเยอะๆ (Bulk Import)</h4>
                                        <select
                                            value={bulkHeaderId}
                                            onChange={(e) => setBulkHeaderId(e.target.value)}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 outline-none"
                                        >
                                            <option value="">-- เลือกบทเรียนที่จะนำเข้า (Select Chapter) --</option>
                                            {availableHeaders.map((h) => (
                                                <option key={h.id} value={h.id}>{h.title}</option>
                                            ))}
                                        </select>
                                        <textarea
                                            placeholder={`วางรายชื่อตอนที่นี่...\nตัวอย่าง:\nEP.1 ปูพื้นฐาน | https://youtu.be/...\nEP.2 ตะลุยโจทย์ | https://youtu.be/...`}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[150px] font-mono text-sm mb-4"
                                            value={bulkImportText}
                                            onChange={(e) => setBulkImportText(e.target.value)}
                                        />
                                        <button
                                            onClick={handleBulkImport}
                                            disabled={submitting}
                                            className="w-full py-3 bg-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-200 transition"
                                        >
                                            {submitting ? 'กำลังทำงาน...' : '🚀 เริ่มนำเข้าข้อมูล'}
                                        </button>
                                    </div>

                                    {/* Danger Zone */}
                                    <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                                        <h4 className="font-bold text-rose-900 mb-4 flex items-center gap-2">⚠️ พื้นที่อันตราย (Danger Zone)</h4>
                                        <p className="text-sm text-rose-700 mb-6">การลบข้อมูลที่นี่จะไม่สามารถกู้คืนได้ กรุณาตรวจสอบให้แน่ใจก่อนกดปุ่ม</p>
                                        <button
                                            onClick={handleDeleteAllLessons}
                                            disabled={submitting}
                                            className="w-full py-3 bg-white border-2 border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-500 hover:text-white hover:border-rose-500 transition"
                                        >
                                            🗑 ลบบทเรียนทั้งหมดในคอร์สนี้
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {students.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400">
                                    ยังไม่มีนักเรียนในคอร์สนี้
                                </div>
                            ) : (
                                students.map((student) => {
                                    // Calculate Attendance Status
                                    let status = 'none';
                                    let diffDays = 0;
                                    let lastAccessDate = null;

                                    if (student.lastAccessedAt) {
                                        lastAccessDate = student.lastAccessedAt.toDate();
                                        const now = new Date();
                                        const diffTime = Math.abs(now.getTime() - lastAccessDate.getTime());
                                        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                        if (diffDays > 7) status = 'critical';
                                        else if (diffDays > 3) status = 'warning';
                                        else status = 'good';
                                    }

                                    const isExpanded = expandedStudentIds.includes(student.id);

                                    return (
                                        <div key={student.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition">
                                            <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                                <div className="flex items-center gap-4 w-full md:w-auto">
                                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg shrink-0
                                                ${status === 'critical' ? 'bg-rose-500 shadow-rose-200' :
                                                            status === 'warning' ? 'bg-amber-400 shadow-amber-200' :
                                                                status === 'good' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-300'}`}>
                                                        {student.studentName ? student.studentName.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-lg text-slate-800 truncate">{student.studentName || "ไม่ระบุชื่อ"}</h3>
                                                        <div className="flex flex-col text-sm text-slate-500 gap-1">
                                                            <span>📞 {student.studentTel || "-"}</span>
                                                            <span>🆔 {student.studentLine || "-"}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                                                    {/* Progress Section */}
                                                    <div className="flex flex-col items-end w-full md:w-48">
                                                        <div className="flex justify-between w-full text-xs font-bold mb-1">
                                                            <span className="text-slate-400">ความคืบหน้า</span>
                                                            <span className="text-indigo-600">{student.progressPercent || 0}%</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                                                                style={{ width: `${student.progressPercent || 0}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>

                                                    {/* Attendance Section */}
                                                    <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl w-full md:w-auto justify-between md:justify-start">
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">เข้าเรียนล่าสุด</p>
                                                            <p className={`font-bold text-sm ${status === 'critical' ? 'text-rose-600' : status === 'warning' ? 'text-amber-600' : status === 'good' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                {lastAccessDate ? `${diffDays} วันที่แล้ว` : "ยังไม่เคย"}
                                                            </p>
                                                        </div>
                                                        <div className="text-2xl">
                                                            {status === 'critical' ? '🚨' : status === 'warning' ? '⚡' : status === 'good' ? '🔥' : '💤'}
                                                        </div>
                                                    </div>

                                                    {/* Expand Button */}
                                                    <button
                                                        onClick={() => toggleStudentExpand(student.id)}
                                                        className={`p-2 rounded-xl border-2 transition ${isExpanded ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-500'}`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-in slide-in-from-top-2">
                                                    <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                                        <span>📚</span> รายละเอียดการเรียน
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {lessons.filter(l => l.type !== 'header').map((lesson) => {
                                                            const isCompleted = (student.completedLessons || []).includes(lesson.id);
                                                            return (
                                                                <div key={lesson.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isCompleted ? 'bg-white border-emerald-100 shadow-sm' : 'bg-slate-50 border-transparent opacity-60'}`}>
                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                                        {isCompleted ? '✓' : ''}
                                                                    </div>
                                                                    <span className={`text-sm truncate ${isCompleted ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>{lesson.title}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )
                }
            </div >
        </div >
    );
}