"use client";
import { useState, useEffect, useCallback } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, getDoc, query, orderBy, writeBatch, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";
import { Plus, Trash2, FileJson, Blocks, AlertCircle, Image as ImageIcon } from 'lucide-react';


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

// ✅ Helper to render LaTeX mixed with text
const renderWithLatex = (text: string) => {
    if (!text) return "";
    // Split by $...$
    const parts = text.split(/(\$[^$]+\$)/g);
    return parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
            // Remove $ and render LaTeX
            return <InlineMath key={index} math={part.slice(1, -1)} />;
        }
        return <span key={index}>{part}</span>;
    });
};

// ✨ Component แสดงกลุ่มบทเรียน
const LessonGroup = ({ group, handleEdit, handleDelete, handleToggleVisibility, handleMoveLesson }: { group: any, handleEdit: any, handleDelete: any, handleToggleVisibility: any, handleMoveLesson: any }) => {
    const [isOpen, setIsOpen] = useState(true);

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
                    {group.items.map((lesson: any, index: number) => (
                        <div key={lesson.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition group ml-4 md:ml-10">
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
                                <div className="flex flex-col gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleMoveLesson(lesson, 'up', group.items)}
                                        disabled={index === 0}
                                        className={`p-1 rounded hover:bg-slate-100 ${index === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-500'}`}
                                    >
                                        <ArrowUpIcon />
                                    </button>
                                    <button
                                        onClick={() => handleMoveLesson(lesson, 'down', group.items)}
                                        disabled={index === group.items.length - 1}
                                        className={`p-1 rounded hover:bg-slate-100 ${index === group.items.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-500'}`}
                                    >
                                        <ArrowDownIcon />
                                    </button>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleToggleVisibility(lesson)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${lesson.isHidden ? 'bg-gray-100 text-gray-400 hover:bg-gray-200' : 'bg-indigo-50 text-indigo-400 hover:bg-indigo-100'}`} title={lesson.isHidden ? "แสดงเนื้อหา" : "ซ่อนเนื้อหา"}>
                                        {lesson.isHidden ? <EyeSlashIcon /> : <EyeIcon />}
                                    </button>
                                    <button onClick={() => handleEdit(lesson)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100">✏️</button>
                                    <button onClick={() => handleDelete(lesson.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100">🗑</button>
                                </div>
                            </div>
                        </div>
                    ))}
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
    const [flashcardData, setFlashcardData] = useState<{ front: string, back: string }[]>([]);
    const [pasteMode, setPasteMode] = useState(false); // Toggle between File and Paste

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
    const groupedLessons = (() => {
        const groups: any[] = availableHeaders.map(header => ({ header: header, items: [] }));
        const uncategorizedItems: any[] = [];
        lessons.forEach(lesson => {
            if (lesson.type === 'header') return;
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
    };

    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const lines = text.split(/\r?\n/); // Handle both \n and \r\n
        const parsedData: { front: string, back: string }[] = [];

        for (let line of lines) {
            if (!line.trim()) continue;

            // ✅ Robust CSV Parser: Handles commas inside quotes (e.g., "89,542")
            const parts: string[] = [];
            let current = '';
            let inQuote = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuote = !inQuote;
                }

                if (char === ',' && !inQuote) {
                    parts.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            parts.push(current);

            if (parts.length >= 2) {
                // Clean up quotes from the extracted parts
                const clean = (str: string) => {
                    let s = str.trim();
                    if (s.startsWith('"') && s.endsWith('"')) {
                        s = s.slice(1, -1);
                    }
                    return s.replace(/""/g, '"');
                };

                // ✅ Improved Logic: If multiple parts found, assume the LAST part is the Back, 
                // and everything before it is the Front (joined by comma).
                // This handles "Question with 89,542, Answer" correctly.

                const back = clean(parts[parts.length - 1]);
                const frontParts = parts.slice(0, parts.length - 1);
                // We join with comma because the split removed them. 
                // Note: If the original had quotes, this simple join might be slightly off if mixed, 
                // but for the user's case of "Text, Number, Answer", it works perfectly.
                // ✅ Remove commas as requested by user to avoid formatting issues
                const front = clean(frontParts.join(',')).replace(/,/g, '');

                if (front && back) {
                    parsedData.push({ front, back });
                }
            }
        }
        setFlashcardData(parsedData);
        showToast(`✅ โหลดข้อมูลสำเร็จ ${parsedData.length} ใบ`);
    };

    const handleTextPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        if (!text.trim()) {
            setFlashcardData([]);
            return;
        }

        const lines = text.split(/\r?\n/);
        const parsedData: { front: string, back: string }[] = [];

        // Detect delimiter: Check first line for Tab
        let delimiter = ',';
        const firstLine = lines.find(l => l.trim().length > 0);
        if (firstLine) {
            const tabCount = (firstLine.match(/\t/g) || []).length;
            if (tabCount > 0) delimiter = '\t';
        }

        for (let line of lines) {
            if (!line.trim()) continue;

            let parts: string[] = [];
            if (delimiter === '\t') {
                parts = line.split('\t');
            } else {
                // Comma: Use simple split
                parts = line.split(',');
            }

            if (parts.length >= 2) {
                const clean = (str: string) => str.trim().replace(/^"|"$/g, '').replace(/""/g, '"');

                const back = clean(parts[parts.length - 1]);
                const frontParts = parts.slice(0, parts.length - 1);
                // ✅ Remove commas as requested by user
                const front = clean(frontParts.join(delimiter === '\t' ? ' ' : ',')).replace(/,/g, '');

                if (front && back) {
                    parsedData.push({ front, back });
                }
            }
        }
        setFlashcardData(parsedData);
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
            setFlashcardData(lesson.flashcardData || []);
            setLessonContent(lesson.content || "");
        } else {
            setCurrentImageUrl(lesson.image || "");
            setImagePreview(lesson.image || "");
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditId(null); setLessonTitle(""); setVideoUrl(""); setLessonContent(""); setIsFree(false); setSelectedHeaderId(""); setPdfUrl("");
        setAddType('header'); setImageFile(null); setImagePreview(""); setCurrentImageUrl(""); setQuizOptions(["", "", "", ""]); setCorrectAnswer(0); setHtmlCode(""); setFlashcardData([]); setPasteMode(false);
    };



    // ... (existing code)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lessonTitle) return showToast("กรุณาใส่ชื่อ/หัวข้อ", "error");
        if (addType !== 'header' && !selectedHeaderId) return showToast("⚠️ กรุณาเลือก 'บทเรียนหลัก'", "error");
        if (addType === 'quiz' && quizOptions.some(opt => opt.trim() === "")) return showToast("กรุณาใส่ตัวเลือกให้ครบ", "error");
        if (addType === 'flashcard' && flashcardData.length === 0) return showToast("กรุณาอัปโหลดไฟล์ CSV หรือเพิ่มข้อมูล Flashcard", "error");

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
                                    <button type="button" onClick={() => setAddType('text')} disabled={!!editId && addType === 'header'} className={`py-3 px-2 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 ${addType === 'text' ? 'bg-pink-500 text-white shadow-lg shadow-pink-200 scale-105' : 'text-slate-400 hover:bg-white'} ${!!editId && addType === 'header' ? 'opacity-30 cursor-not-allowed' : ''}`}><TextIcon /> <span className="hidden sm:inline">บทความ</span></button>
                                    <button type="button" onClick={() => setAddType('quiz')} disabled={!!editId && addType === 'header'} className={`py-3 px-2 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 ${addType === 'quiz' ? 'bg-purple-500 text-white shadow-lg shadow-purple-200 scale-105' : 'text-slate-400 hover:bg-white'} ${!!editId && addType === 'header' ? 'opacity-30 cursor-not-allowed' : ''}`}><QuizIcon /> <span className="hidden sm:inline">คำถาม</span></button>
                                    {/* ✅ ปุ่ม Exercise ใหม่ */}
                                    <button type="button" onClick={() => setAddType('exercise')} disabled={!!editId && addType === 'header'} className={`py-3 px-2 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 ${addType === 'exercise' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-105' : 'text-slate-400 hover:bg-white'} ${!!editId && addType === 'header' ? 'opacity-30 cursor-not-allowed' : ''}`}><ExerciseIcon /> <span className="hidden sm:inline">แบบฝึกหัด</span></button>
                                    {/* ✅ ปุ่ม HTML ใหม่ -> เปลี่ยนเป็น Exam System */}
                                    <button type="button" onClick={() => setAddType('html')} disabled={!!editId && addType === 'header'} className={`py-3 px-2 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 ${addType === 'html' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-200 scale-105' : 'text-slate-400 hover:bg-white'} ${!!editId && addType === 'header' ? 'opacity-30 cursor-not-allowed' : ''}`}><Blocks size={18} /> <span className="hidden sm:inline">ข้อสอบ (Exam)</span></button>
                                    {/* ✅ ปุ่ม Flashcard ใหม่ */}
                                    <button type="button" onClick={() => setAddType('flashcard')} disabled={!!editId && addType === 'header'} className={`py-3 px-2 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1 ${addType === 'flashcard' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-200 scale-105' : 'text-slate-400 hover:bg-white'} ${!!editId && addType === 'header' ? 'opacity-30 cursor-not-allowed' : ''}`}><FlashcardIcon /> <span className="hidden sm:inline">Flashcard</span></button>
                                </div>

                                <div className="flex justify-between items-center mb-6 px-2">
                                    <h3 className={`font-bold text-xl flex items-center gap-3 ${addType === 'video' ? 'text-blue-600' : addType === 'quiz' ? 'text-purple-600' : addType === 'text' ? 'text-pink-600' : addType === 'exercise' ? 'text-emerald-600' : addType === 'html' ? 'text-cyan-600' : addType === 'flashcard' ? 'text-yellow-600' : 'text-orange-600'}`}>
                                        <div className={`w-3 h-3 rounded-full ${addType === 'video' ? 'bg-blue-500' : addType === 'quiz' ? 'bg-purple-500' : addType === 'text' ? 'bg-pink-500' : addType === 'exercise' ? 'bg-emerald-500' : addType === 'html' ? 'bg-cyan-500' : addType === 'flashcard' ? 'bg-yellow-500' : 'bg-orange-500'}`}></div>
                                        {editId ? '✏️ แก้ไขข้อมูล' : (addType === 'video' ? 'เพิ่มวิดีโอใหม่' : addType === 'quiz' ? 'สร้างคำถาม (Quiz)' : addType === 'text' ? 'เพิ่มบทความ/ชีท' : addType === 'exercise' ? 'เพิ่มแบบฝึกหัด (PDF Link)' : addType === 'html' ? 'สร้างชุดข้อสอบ (Exam System)' : addType === 'flashcard' ? 'เพิ่ม Flashcard' : 'เพิ่มหัวข้อบทเรียน')}
                                    </h3>
                                    <div className="flex gap-2">
                                        {editId && <button onClick={handleCancelEdit} className="text-sm font-bold text-rose-400 hover:text-rose-600 underline transition bg-rose-50 px-3 py-1 rounded-lg">ยกเลิก</button>}
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                    {addType !== 'header' && (
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
                                            <textarea placeholder="เขียนเนื้อหาบทเรียน..." className="w-full p-6 bg-pink-50 border-2 border-pink-100 rounded-2xl outline-none min-h-[200px]" value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} />
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
                                            <div className="flex gap-4 mb-2">
                                                <button type="button" onClick={() => setPasteMode(false)} className={`flex-1 py-2 rounded-xl font-bold transition ${!pasteMode ? 'bg-yellow-500 text-white shadow-md' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'}`}>📂 อัปโหลดไฟล์ CSV</button>
                                                <button type="button" onClick={() => setPasteMode(true)} className={`flex-1 py-2 rounded-xl font-bold transition ${pasteMode ? 'bg-yellow-500 text-white shadow-md' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'}`}>📝 วางข้อมูล (Copy & Paste)</button>
                                            </div>

                                            {!pasteMode ? (
                                                <div className="bg-yellow-50 p-6 rounded-2xl border-2 border-yellow-100">
                                                    <label className="block text-xs font-bold text-yellow-600 uppercase tracking-wider mb-2">📂 อัปโหลดไฟล์ CSV (Front,Back)</label>
                                                    <input
                                                        type="file"
                                                        accept=".csv"
                                                        onChange={handleCsvUpload}
                                                        className="w-full p-3 bg-white border-2 border-yellow-200 rounded-xl outline-none focus:border-yellow-500 transition text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-100 file:text-yellow-700 hover:file:bg-yellow-200"
                                                    />
                                                    <p className="text-xs text-yellow-500 mt-2">* รูปแบบไฟล์: บรรทัดละ 1 คู่ (คำถาม,คำตอบ)</p>
                                                </div>
                                            ) : (
                                                <div className="bg-yellow-50 p-6 rounded-2xl border-2 border-yellow-100">
                                                    <label className="block text-xs font-bold text-yellow-600 uppercase tracking-wider mb-2">📝 วางข้อมูลจาก Excel / Sheets</label>
                                                    <textarea
                                                        placeholder={`ตัวอย่าง:\nคำถาม 1\tคำตอบ 1\nคำถาม 2\tคำตอบ 2`}
                                                        onChange={handleTextPaste}
                                                        className="w-full p-4 bg-white border-2 border-yellow-200 rounded-xl outline-none focus:border-yellow-500 transition text-slate-700 min-h-[150px] font-mono text-sm"
                                                    />
                                                    <p className="text-xs text-yellow-500 mt-2">* รองรับการก๊อปปี้จาก Excel (คั่นด้วย Tab) หรือ CSV (คั่นด้วย Comma)</p>
                                                </div>
                                            )}

                                            {flashcardData.length > 0 && (
                                                <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm max-h-60 overflow-y-auto">
                                                    <h4 className="font-bold text-slate-700 mb-3 sticky top-0 bg-white pb-2 border-b">📋 ตัวอย่างข้อมูล ({flashcardData.length} ใบ)</h4>
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                                                            <tr>
                                                                <th className="px-3 py-2 rounded-l-lg">ด้านหน้า (Front)</th>
                                                                <th className="px-3 py-2 rounded-r-lg">ด้านหลัง (Back)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {flashcardData.map((card, idx) => (
                                                                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                                    <td className="px-3 py-2 font-medium text-slate-700">{renderWithLatex(card.front)}</td>
                                                                    <td className="px-3 py-2 text-slate-500">{renderWithLatex(card.back)}</td>
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
                                            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-cyan-100">
                                                <div className="flex items-center justify-between mb-4">
                                                    <label className="block text-xs font-bold text-cyan-600 uppercase tracking-wider">🧩 Exam Editor (JSON System)</label>
                                                    <div className="text-[10px] bg-cyan-100 text-cyan-700 px-2 py-1 rounded">
                                                        รองรับ One-Question-Per-Block
                                                    </div>
                                                </div>

                                                {/* Smart Editor Area */}
                                                <div className="space-y-4">
                                                    {smartExamBlocks.length === 0 && !htmlCode.trim() && (
                                                        <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl">
                                                            <Blocks className="mx-auto text-slate-300 mb-2" size={32} />
                                                            <p className="text-slate-400 text-sm">ยังไม่มีข้อสอบ</p>
                                                            <p className="text-slate-400 text-xs mt-1">กดปุ่มด้านล่างเพื่อเพิ่มข้อแรก</p>
                                                        </div>
                                                    )}

                                                    {/* Fallback for Legacy HTML: If htmlCode has content but not JSON array */}
                                                    {htmlCode.trim() && !htmlCode.trim().startsWith('[') && (
                                                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 mb-4">
                                                            <h4 className="flex items-center gap-2 text-orange-700 font-bold text-sm mb-2"><AlertCircle size={16} /> ตรวจพบ HTML เดิม</h4>
                                                            <textarea
                                                                value={htmlCode}
                                                                onChange={(e) => setHtmlCode(e.target.value)}
                                                                className="w-full p-2 text-xs font-mono bg-white border border-orange-200 rounded"
                                                                rows={5}
                                                            />
                                                            <p className="text-xs text-orange-500 mt-2">ระบบตรวจพบว่าเป็น HTML ไม่ใช่ JSON ข้อสอบ. คุณสามารถลบแล้วสร้างใหม่เป็นข้อสอบได้ หรือใช้งานแบบเดิม.</p>
                                                        </div>
                                                    )}

                                                    {smartExamBlocks.map((block, idx) => (
                                                        <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:border-cyan-300 transition-colors">
                                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                                                                <span className="text-xs font-bold text-slate-500">ข้อที่ {idx + 1}</span>
                                                                <button type="button" onClick={() => deleteSmartQuestion(idx)} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                                                            </div>
                                                            <textarea
                                                                value={block}
                                                                onChange={(e) => updateSmartBlock(idx, e.target.value)}
                                                                className="w-full h-40 p-4 text-sm font-mono text-slate-700 outline-none resize-y"
                                                                spellCheck="false"
                                                            />
                                                        </div>
                                                    ))}

                                                    <button type="button" onClick={addSmartQuestion} className="w-full py-3 border-2 border-dashed border-cyan-300 bg-cyan-50 hover:bg-cyan-100 text-cyan-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                                                        <Plus size={18} /> เพิ่มข้อสอบใหม่
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-4 bg-teal-50 rounded-2xl border-2 border-teal-100 cursor-pointer hover:bg-teal-100 transition" onClick={() => setIsFree(!isFree)}>
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${isFree ? 'bg-teal-500 border-teal-500' : 'bg-white border-teal-300'}`}>{isFree && <span className="text-white text-xs font-bold">✓</span>}</div>
                                                <label className="text-teal-800 font-bold text-sm cursor-pointer">ใจดี! เปิดให้ดูฟรี (Free Preview) 🎁</label>
                                            </div>
                                            <textarea placeholder="📝 คำอธิบายเพิ่มเติม (ถ้ามี)..." className="w-full p-4 bg-cyan-50 border-2 border-cyan-100 rounded-2xl outline-none min-h-[100px]" value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} />
                                        </div>
                                    )}

                                    <button type="submit" disabled={submitting} className={`w-full py-4 rounded-2xl font-black text-white shadow-lg hover:shadow-xl transition text-lg tracking-wide mt-2 ${submitting ? 'bg-slate-400 cursor-not-allowed' : addType === 'exercise' ? 'bg-emerald-500 hover:bg-emerald-600' : addType === 'html' ? 'bg-cyan-500 hover:bg-cyan-600' : addType === 'flashcard' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                                        {submitting ? '⏳ กำลังบันทึก...' : editId ? '💾 บันทึกการแก้ไข' : '+ เพิ่มลงในบทเรียน'}
                                    </button>
                                </form>
                            </div>

                            {/* Lesson List */}
                            <div className="space-y-6">
                                {groupedLessons.map((group, index) => (
                                    <LessonGroup
                                        key={index}
                                        group={group}
                                        handleEdit={handleEditClick}
                                        handleDelete={handleDelete}
                                        handleToggleVisibility={handleToggleVisibility}
                                        handleMoveLesson={handleMoveLesson}
                                    />
                                ))}
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