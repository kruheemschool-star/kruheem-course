"use client";

import { useRef, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import { Save, ArrowLeft, HelpCircle, UploadCloud, Loader2, Image as ImageIcon, FileJson as FileJsonIcon, Wrench, XCircle, Target, Plus, Trash2, ChevronDown, ChevronUp, Copy, Blocks, Download, FileUp } from "lucide-react";
import ImageUploadHelper from "@/components/admin/ImageUploadHelper";

export default function ExamEditorPage() {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [activeTab, setActiveTab] = useState<'json' | 'images' | 'smart'>('smart');
    const [jsonError, setJsonError] = useState<{ line: number, message: string, advice: string, start: number, end: number, scroll: number } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [smartBlocks, setSmartBlocks] = useState<string[]>([]);

    // Smart Editor Synchronization
    useEffect(() => {
        if (activeTab === 'smart') {
            try {
                // Try to parse existing content to initialize blocks
                // If empty, init with empty array
                const content = jsonContent.trim() || '[]';
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    setSmartBlocks(parsed.map(q => JSON.stringify(q, null, 2)));
                } else {
                    // Not an array? Wrap it? or Error. 
                    // If root is not array, Smart Editor can't handle.
                    // But we won't overwrite jsonContent here.
                }
            } catch (e) {
                // Invalid JSON, rely on empty or previous state? 
                // Mostly will show empty if parse fails.
            }
        }
    }, [activeTab]);

    const updateSmartBlock = (index: number, val: string) => {
        const newBlocks = [...smartBlocks];
        newBlocks[index] = val;
        setSmartBlocks(newBlocks);

        // Auto-Sync to Main JSON (Constructing string manually to allow temporary invalid syntax in blocks)
        setJsonContent(`[\n${newBlocks.join(',\n')}\n]`);
    };

    const addSmartQuestion = () => {
        // Create an empty object string to allow easy pasting
        // We add a comment to show which question number this is
        const nextId = smartBlocks.length + 1;
        const emptyBlock = `// ข้อที่ ${nextId}\n`;
        const newBlocks = [...smartBlocks, emptyBlock];
        setSmartBlocks(newBlocks);
        setJsonContent(`[\n${newBlocks.join(',\n')}\n]`);
    };

    const deleteSmartQuestion = (index: number) => {
        if (!confirm("ยืนยันการลบข้อนี้?")) return;
        const newBlocks = [...smartBlocks];
        newBlocks.splice(index, 1);
        setSmartBlocks(newBlocks);
        setJsonContent(`[\n${newBlocks.join(',\n')}\n]`);
    };

    const handleClearAll = () => {
        if (!confirm("⚠️ คุณแน่ใจหรือไม่ที่จะลบโจทย์ 'ทั้งหมด'?\nการกระทำนี้ไม่สามารถย้อนกลับได้!")) return;
        setSmartBlocks([]);
        setJsonContent("[]");
        showToast("ลบโจทย์ทั้งหมดเรียบร้อยแล้ว", "success");
    };

    // ... (state)

    const handleFixJSON = () => {
        setJsonError(null);
        let currentText = jsonContent;

        // --- LEVEL 1: Aggressive Auto-Fix (พยายามซ่อมเองก่อน) ---
        try {
            // 1. Basic cleanup strings (Smart quotes, invisible chars)
            currentText = currentText
                .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"') // Smart double quotes
                .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
                .replace(/[\t]/g, "  ") // Tabs to spaces
                // eslint-disable-next-line no-control-regex
                .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ""); // Control chars

            // 2. Fix Trailing Commas (Common mistake: options: ["A", "B",],)
            // Regex replace ", ]" -> "]" and ", }" -> "}"
            currentText = currentText.replace(/,(\s*[}\]])/g, '$1');

            // 3. Fix Unquoted Keys ( { id: 1 } -> { "id": 1 } )
            // Regex to find "key:" without quotes and add them
            currentText = currentText.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');

            // 4. Try to parse with the polished text
            const parsed = JSON.parse(currentText);

            // If success, save and notify
            setJsonContent(JSON.stringify(parsed, null, 2));
            alert("✅ ซ่อมแซมและจัดรูปแบบ JSON เรียบร้อย!");
            return;
        } catch (e: any) {
            // If auto-fix failed, proceed to Level 2 Analysis
        }

        // --- LEVEL 2: Smart Suggestions & Highlighting ---
        try {
            JSON.parse(currentText); // Re-throw to get specific syntax error
        } catch (e: any) {
            const errorMsg = e.message;
            let advice = "ตรวจสอบโครงสร้าง JSON อีกครั้ง";

            // Extract position
            const match = errorMsg.match(/position (\d+)/);
            if (match) {
                const pos = parseInt(match[1]);
                const charAtError = currentText[pos];

                // Calculate Line Number & Indices for finding the whole line
                const linesToPos = currentText.substring(0, pos).split("\n");
                const lineNum = linesToPos.length;

                // Find start and end of the error line for better highlighting
                const lastNewLinePos = currentText.lastIndexOf("\n", pos - 1);
                const lineStartIndex = lastNewLinePos === -1 ? 0 : lastNewLinePos + 1;
                const nextNewLinePos = currentText.indexOf("\n", pos);
                const lineEndIndex = nextNewLinePos === -1 ? currentText.length : nextNewLinePos;

                // Heuristic Advice Mapping
                if (errorMsg.includes("Unexpected token }") || errorMsg.includes("Unexpected token ]")) {
                    advice = "⚠️ น่าจะมีลูกน้ำ (,) เกินมาที่ตัวสุดท้าย หรือวงเล็บเปิด/ปิดไม่ครบคู่";
                } else if (errorMsg.includes("Unexpected string")) {
                    advice = "⚠️ น่าจะลืมใส่ลูกน้ำ (,) คั่นระหว่างบรรทัด หรือคั่นระหว่างข้อมูล";
                } else if (errorMsg.includes("Expected property name")) {
                    advice = "⚠️ ชื่อตัวแปร (Key) ต้องอยู่ในเครื่องหมายคำพูดคู่ (\") เช่น \"id\":";
                } else if (charAtError === "'") {
                    advice = "⚠️ JSON ห้ามใช้ Single Quote (') ต้องใช้ Double Quote (\") เท่านั้น";
                } else if (errorMsg.includes("Unexpected end of JSON")) {
                    advice = "⚠️ วงเล็บปิด } หรือ ] ไม่ครบ หรือข้อความขาดหายไปตอนท้าย";
                } else {
                    advice = `⚠️ เจอปัญหาที่ตัวอักษร '${charAtError || '?'}' (ตำแหน่งที่ ${pos})`;
                }

                // Set Error State for UI
                const lineHeight = 24;
                const scrollPos = (lineNum - 10) * lineHeight;
                const finalScroll = scrollPos > 0 ? scrollPos : 0;

                setJsonError({
                    line: lineNum,
                    message: errorMsg,
                    advice,
                    start: lineStartIndex,
                    end: lineEndIndex,
                    scroll: finalScroll
                });

                // ** Improved Highlighting & Scrolling **
                if (textareaRef.current) {
                    const ta = textareaRef.current;
                    ta.focus();
                    // Highlight the WHOLE line (Blue background selection)
                    ta.setSelectionRange(lineStartIndex, lineEndIndex);

                    // Scroll
                    ta.scrollTop = finalScroll;
                }

            } else {
                alert(`❌ JSON เสียหายรูปแบบ: ${errorMsg}`);
            }
        }
    };

    // ... (render)



    // Form States
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [coverImage, setCoverImage] = useState("");
    const [category, setCategory] = useState("ม.ต้น");
    const [level, setLevel] = useState("ม.1");
    const [timeLimit, setTimeLimit] = useState(30);
    const [difficulty, setDifficulty] = useState("Medium");
    const [themeColor, setThemeColor] = useState("Amber");

    // JSON Content
    const [jsonContent, setJsonContent] = useState("");

    useEffect(() => {
        const fetchExam = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "exams", id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTitle(data.title || "");
                    setDescription(data.description || "");
                    setCoverImage(data.coverImage || "");
                    setCategory(data.category || "ม.ต้น");
                    setLevel(data.level || "");
                    setTimeLimit(data.timeLimit || 30);
                    setDifficulty(data.difficulty || "Medium");
                    setThemeColor(data.themeColor || "Amber");

                    // Convert questions array back to JSON string for editing
                    const questions = data.questions || [];
                    const jsonStr = JSON.stringify(questions, null, 2);
                    setJsonContent(jsonStr);

                    // Initialize Smart Blocks immediately
                    if (Array.isArray(questions)) {
                        setSmartBlocks(questions.map((q: any) => JSON.stringify(q, null, 2)));
                    }
                }
            } catch (error) {
                console.error("Error fetching exam:", error);
                alert("โหลดข้อมูลไม่สำเร็จ");
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [id]);

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingCover(true);
        try {
            const filename = `exam-covers/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filename);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            setCoverImage(url);
        } catch (error) {
            console.error("Upload failed", error);
            alert("อัปโหลดรูปภาพไม่สำเร็จ");
        } finally {
            setUploadingCover(false);
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        // ... (rest of save logic)
        try {
            // Validate JSON
            let parsedQuestions = [];
            try {
                parsedQuestions = JSON.parse(jsonContent);
                if (!Array.isArray(parsedQuestions)) throw new Error("Root must be an array");

                // Fix: Sanitize Data Structure & Types
                // Ensure correctIndex is a number and options is an array
                parsedQuestions = parsedQuestions.flat().map((q: any) => ({
                    ...q,
                    correctIndex: isNaN(Number(q.correctIndex)) ? 0 : Number(q.correctIndex),
                    options: Array.isArray(q.options) ? q.options : [],
                    // Optional: remove legacy 'answer' field if you want to normalize fully, but keeping it is safer for now.
                }));
            } catch (err) {
                alert("รูปแบบ JSON ไม่ถูกต้อง กรุณาตรวจสอบ Syntax");
                setSaving(false);
                return;
            }

            // 1. Generate Search Index (Keyword Array)
            const searchTerms = new Set<string>();

            // Add Title & Description
            (title + " " + (description || "")).split(/\s+/).forEach(word => {
                if (word.length > 1) searchTerms.add(word.toLowerCase());
            });

            // Add Questions Content & Keywords
            parsedQuestions.forEach((q: any) => {
                const qText = q.question || "";
                const qKey = q.keywords || "";
                const content = qText + " " + qKey;

                content.split(/\s+/).forEach(word => {
                    // Filter out common symbols, keep meaningful words
                    const cleanWord = word.replace(/[^\w\u0E00-\u0E7F]/g, "").toLowerCase();
                    if (cleanWord.length > 1) searchTerms.add(cleanWord);
                });
            });

            // Convert Set to Array
            const searchKeywords = Array.from(searchTerms);

            const docRef = doc(db, "exams", id as string);
            await updateDoc(docRef, {
                title,
                description,
                coverImage,
                category,
                level,
                timeLimit: Number(timeLimit),
                difficulty,
                themeColor,
                questions: parsedQuestions,
                questionCount: parsedQuestions.length,
                searchKeywords: searchKeywords, // New Search Index Field
                updatedAt: serverTimestamp()
            });

            // Show simple toast or alert
            // alert("บันทึกข้อมูลเรียบร้อยแล้ว!"); // Remove alert to make it smoother
            showToast("บันทึกข้อมูลเรียบร้อยแล้ว!", "success");
            // router.push("/admin/exams"); // Optional: Don't redirect immediately if they want to keep editing
        } catch (error) {
            console.error("Error updating exam:", error);
            alert("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSaving(false);
        }
    };

    // Keyboard Shortcut (Cmd+S / Ctrl+S)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [jsonContent, title, description, coverImage, category, level, timeLimit, difficulty, themeColor]); // Deps need to be current for handleSave closure if not using refs (React state closure trap), strictly relying on state in handleSave

    // --- Export / Import System ---
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        try {
            // 1. Get current Questions
            let questions = [];
            try {
                questions = JSON.parse(jsonContent);
            } catch (e) {
                alert("⚠️ ไม่สามารถ Export ได้เนื่องจาก JSON ข้อสอบไม่ถูกต้อง กรุณาแก้ไขก่อน");
                return;
            }

            // 2. Build Blueprint
            const blueprint = {
                metadata: {
                    title,
                    description,
                    category,
                    level,
                    timeLimit,
                    difficulty,
                    themeColor,
                    coverImage,
                    exportedAt: new Date().toISOString(),
                    version: "1.0"
                },
                questions
            };

            // 3. Download File
            const dataStr = JSON.stringify(blueprint, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `exam-blueprint-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Export ไฟล์เรียบร้อยแล้ว!", "success");

        } catch (e) {
            console.error(e);
            alert("เกิดข้อผิดพลาดในการ Export");
        }
    };

    const handleImportClick = () => {
        if (!confirm("⚠️ การนำเข้าไฟล์จะทับข้อมูลปัจจุบันทั้งหมด แน่ใจหรือไม่?")) return;
        fileInputRef.current?.click();
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const blueprint = JSON.parse(content);

                // Validation
                if (!blueprint.questions || !Array.isArray(blueprint.questions)) {
                    throw new Error("ไฟล์ไม่ถูกต้อง: ไม่พบข้อมูล questions");
                }

                // Restore Metadata (Optional chaining for backward compatibility)
                if (blueprint.metadata) {
                    const m = blueprint.metadata;
                    if (m.title) setTitle(m.title);
                    if (m.description) setDescription(m.description);
                    if (m.category) setCategory(m.category);
                    if (m.level) setLevel(m.level);
                    if (m.timeLimit) setTimeLimit(m.timeLimit);
                    if (m.difficulty) setDifficulty(m.difficulty);
                    if (m.themeColor) setThemeColor(m.themeColor);
                    if (m.coverImage) setCoverImage(m.coverImage);
                }

                // Restore Questions
                const qStr = JSON.stringify(blueprint.questions, null, 2);
                setJsonContent(qStr);

                // Sync Smart Blocks
                setSmartBlocks(blueprint.questions.map((q: any) => JSON.stringify(q, null, 2)));

                showToast("Import ข้อมูลเรียบร้อยแล้ว!", "success");

            } catch (err: any) {
                console.error(err);
                alert(`Import ล้มเหลว: ${err.message}`);
            }
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    // Toast State (Local helper)
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className="bg-slate-800 p-6 flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/exams" className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-xl font-bold">แก้ไขชุดข้อสอบ</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".json"
                            onChange={handleImportFile}
                        />
                        <button
                            onClick={handleImportClick}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors border border-slate-600"
                            title="Import from JSON File"
                        >
                            <FileUp size={14} /> Import
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors border border-slate-600"
                            title="Export to JSON File"
                        >
                            <Download size={14} /> Export
                        </button>
                        {loading && <span className="text-slate-400 ml-2">Loading...</span>}
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">กำลังโหลดข้อมูล...</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                        {/* Left Column: Exam Meta Data */}
                        <div className="p-8 space-y-6">
                            <h3 className="font-bold text-slate-700 border-b border-slate-100 pb-2">ข้อมูลทั่วไป</h3>
                            {/* ... Title Input ... */}
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2">ชื่อชุดข้อสอบ</label>
                                <textarea
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    rows={2}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                                />
                                <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Tip: กด Enter เพื่อขึ้นบรรทัดใหม่ได้เลย (แสดงผลตามจริง)</p>
                            </div>

                            {/* Cover Image Upload */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">รูปหน้าปก</label>
                                <div className="relative group">
                                    <div className="w-full aspect-[3/4] rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden hover:border-indigo-400 transition-colors">
                                        {coverImage ? (
                                            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-slate-400 flex flex-col items-center">
                                                <ImageIcon size={32} className="mb-2" />
                                                <span className="text-xs">ไม่มีรูปภาพ</span>
                                            </div>
                                        )}

                                        {/* Upload Overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <label className="cursor-pointer bg-white text-slate-800 px-4 py-2 rounded-full text-xs font-bold hover:bg-indigo-50 flex items-center gap-2">
                                                <UploadCloud size={14} />
                                                {coverImage ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพ"}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleCoverUpload}
                                                />
                                            </label>
                                        </div>

                                        {uploadingCover && (
                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                                                <Loader2 className="animate-spin text-indigo-600" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                        <HelpCircle size={10} /> แนะนำแนวตั้ง 3:4 (เช่น 600x800px)
                                    </p>
                                </div>

                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2">คำอธิบาย</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>

                            {/* ... Categories, Level, Time, Difficulty ... */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">หมวดหมู่</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    >
                                        <option value="ประถม">ประถม</option>
                                        <option value="ม.ต้น">ม.ต้น</option>
                                        <option value="ม.ปลาย">ม.ปลาย</option>
                                        <option value="สอบเข้า">สอบเข้า</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">ระดับชั้น</label>
                                    <input
                                        type="text"
                                        value={level}
                                        onChange={(e) => setLevel(e.target.value)}
                                        placeholder="เช่น ม.1"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">เวลา (นาที)</label>
                                    <input
                                        type="number"
                                        value={timeLimit}
                                        onChange={(e) => setTimeLimit(Number(e.target.value))}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">ความยาก</label>
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    >
                                        <option value="Easy">ง่าย</option>
                                        <option value="Medium">ปานกลาง</option>
                                        <option value="Hard">ยาก</option>
                                    </select>
                                </div>
                            </div>

                            {/* Theme Color Selector */}
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2">สีประจำชุด (Theme Color)</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {[
                                        // Primary Colors & Basics
                                        { name: 'Red', class: 'bg-red-500', rings: 'ring-red-500' },
                                        { name: 'Yellow', class: 'bg-yellow-400', rings: 'ring-yellow-400' },
                                        { name: 'Blue', class: 'bg-blue-600', rings: 'ring-blue-600' },
                                        { name: 'White', class: 'bg-white border border-slate-200', rings: 'ring-slate-200' },
                                        { name: 'Black', class: 'bg-slate-900', rings: 'ring-slate-900' },

                                        // Special & Metallic
                                        { name: 'Gold', class: 'bg-[#FFD700] bg-[linear-gradient(45deg,#FFD700,#FDB931,#FFD700)]', rings: 'ring-yellow-500' },

                                        // Gradients
                                        { name: 'Sunrise', class: 'bg-gradient-to-br from-orange-400 to-rose-500', rings: 'ring-orange-500' },
                                        { name: 'Ocean', class: 'bg-gradient-to-br from-cyan-400 to-blue-600', rings: 'ring-cyan-500' },
                                        { name: 'Forest', class: 'bg-gradient-to-br from-emerald-400 to-green-600', rings: 'ring-emerald-500' },
                                        { name: 'Twilight', class: 'bg-gradient-to-br from-violet-500 to-purple-600', rings: 'ring-purple-500' },

                                        // Others
                                        { name: 'Orange', class: 'bg-orange-500', rings: 'ring-orange-500' },
                                        { name: 'Green', class: 'bg-green-500', rings: 'ring-green-500' },
                                        { name: 'Sky', class: 'bg-sky-500', rings: 'ring-sky-500' },
                                        { name: 'Pink', class: 'bg-pink-500', rings: 'ring-pink-500' },
                                        { name: 'Teal', class: 'bg-teal-500', rings: 'ring-teal-500' },
                                    ].map((t) => (
                                        <button
                                            key={t.name}
                                            onClick={() => setThemeColor(t.name)}
                                            className={`h-10 rounded-xl transition-all duration-200 ${t.class} ${themeColor === t.name ? `ring-4 ring-offset-2 ${t.rings} scale-105 shadow-lg` : 'opacity-60 hover:opacity-100 hover:scale-105'
                                                }`}
                                            title={t.name}
                                        />
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 text-right">เลือกสีที่ต้องการ (ส่งผลต่อกรอบและการ์ดข้อสอบ)</p>
                            </div>

                        </div>

                        {/* Right Column: Content Editor */}
                        <div className="col-span-2 p-0 flex flex-col h-[800px] bg-[#1e1e1e] relative">
                            {/* Tabs */}
                            <div className="flex items-center bg-[#252526] border-b border-[#3d3d3d]">
                                <button
                                    onClick={() => setActiveTab('smart')}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeTab === 'smart' ? 'bg-[#1e1e1e] text-emerald-400 border-t-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    <Blocks size={14} /> Smart Editor
                                </button>
                                <button
                                    onClick={() => setActiveTab('json')}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeTab === 'json' ? 'bg-[#1e1e1e] text-amber-500 border-t-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    <FileJsonIcon /> JSON Editor
                                </button>
                                <button
                                    onClick={() => setActiveTab('images')}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeTab === 'images' ? 'bg-[#1e1e1e] text-indigo-400 border-t-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    <ImageIcon size={14} /> จัดการรูปภาพรายข้อ
                                </button>
                            </div>

                            {activeTab === 'smart' ? (
                                <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-[#1e1e1e]">
                                    {smartBlocks.length === 0 && (
                                        <div className="text-center py-10 text-slate-500">
                                            <Blocks size={48} className="mx-auto mb-4 opacity-20" />
                                            <p>ยังไม่มีข้อสอบ เริ่มเพิ่มข้อแรกเลย!</p>
                                        </div>
                                    )}

                                    {smartBlocks.map((block, idx) => (
                                        <div key={idx} className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden shadow-lg group hover:border-emerald-500/50 transition-colors">
                                            {/* Card Header */}
                                            <div className="bg-[#252526] p-3 flex items-center justify-between border-b border-[#3d3d3d]">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-mono">Question Block</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => deleteSmartQuestion(idx)}
                                                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                                                        title="ลบข้อนี้"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Editor Area */}
                                            <div className="relative">
                                                <textarea
                                                    value={block}
                                                    onChange={(e) => updateSmartBlock(idx, e.target.value)}
                                                    className="w-full h-48 bg-[#1e1e1e] text-[#d4d4d4] p-4 text-sm font-mono outline-none resize-y leading-relaxed"
                                                    spellCheck="false"
                                                />
                                                {/* Mini Help */}
                                                <div className="absolute right-2 bottom-2 pointer-events-none opacity-50">
                                                    <FileJsonIcon size={12} className="text-slate-600" />
                                                </div>
                                            </div>

                                            {/* Smart Image Uploader for this block */}
                                            {(() => {
                                                try {
                                                    const parsed = JSON.parse(block);
                                                    return (
                                                        <div className="p-3 bg-[#252526] border-t border-[#3d3d3d] flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                {parsed.image ? (
                                                                    <div className="relative group w-10 h-10 rounded bg-black border border-slate-700 overflow-hidden">
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img src={parsed.image} alt="preview" className="w-full h-full object-contain" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded bg-[#333] border border-[#444] flex items-center justify-center text-slate-500">
                                                                        <ImageIcon size={14} />
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <label className="cursor-pointer px-3 py-1.5 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-slate-300 text-xs rounded border border-[#555] flex items-center gap-2 transition-all group">
                                                                        <UploadCloud size={14} className="text-amber-500 group-hover:scale-110 transition-transform" />
                                                                        <span className="font-bold">{parsed.image ? "เปลี่ยนรูปภาพ" : "แนบรูปภาพ"}</span>
                                                                        <input
                                                                            type="file"
                                                                            className="hidden"
                                                                            accept="image/*"
                                                                            onChange={async (e) => {
                                                                                const file = e.target.files?.[0];
                                                                                if (!file) return;
                                                                                try {
                                                                                    const filename = `exam-q-images/${Date.now()}_${idx}_${file.name}`;
                                                                                    const storageRef = ref(storage, filename);
                                                                                    const snapshot = await uploadBytes(storageRef, file);
                                                                                    const url = await getDownloadURL(snapshot.ref);

                                                                                    const newObj = { ...parsed, image: url };
                                                                                    updateSmartBlock(idx, JSON.stringify(newObj, null, 2));
                                                                                } catch (err) {
                                                                                    console.error(err);
                                                                                    alert("อัปโหลดไม่สำเร็จ");
                                                                                }
                                                                            }}
                                                                        />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                            {parsed.image && (
                                                                <button
                                                                    onClick={() => {
                                                                        const newObj = { ...parsed };
                                                                        delete newObj.image;
                                                                        updateSmartBlock(idx, JSON.stringify(newObj, null, 2));
                                                                    }}
                                                                    className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 bg-rose-950/20 px-2 py-1 rounded border border-rose-900/30 transition-colors"
                                                                >
                                                                    <Trash2 size={12} /> ลบรูป
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                } catch (e) {
                                                    return null; // Invalid JSON, don't show uploader
                                                }
                                            })()}
                                        </div>
                                    ))}

                                    {/* Add Button */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {smartBlocks.length > 0 ? (
                                            <button
                                                onClick={handleClearAll}
                                                className="w-full py-4 rounded-xl border-2 border-dashed border-[#3d3d3d] hover:border-rose-500/50 hover:bg-rose-500/5 text-slate-400 hover:text-rose-400 transition-all flex flex-col items-center justify-center gap-2 font-bold order-2 md:order-1"
                                            >
                                                <Trash2 size={24} />
                                                ลบทั้งหมด ({smartBlocks.length} ข้อ)
                                            </button>
                                        ) : (
                                            <div className="hidden md:block"></div> /* Spacer to keep Add on right if using simple grid, or we can use flex/other tricks. But standard grid with empty div works to push next item to slot 2 if we want strict right alignment. */
                                        )}

                                        <button
                                            onClick={addSmartQuestion}
                                            className="w-full py-4 rounded-xl border-2 border-dashed border-[#3d3d3d] hover:border-emerald-500/50 hover:bg-emerald-500/5 text-slate-400 hover:text-emerald-400 transition-all flex flex-col items-center justify-center gap-2 font-bold order-1 md:order-2"
                                        >
                                            <Plus size={24} />
                                            <span>เพิ่มข้อที่ {smartBlocks.length + 1} (Paste Code)</span>
                                        </button>
                                    </div>

                                    <div className="h-10"></div>
                                </div>
                            ) : activeTab === 'json' ? (
                                <>
                                    <div className="p-3 bg-[#2d2d2d] flex justify-between items-center border-b border-[#3d3d3d]">
                                        <span className="text-slate-300 font-mono text-sm flex items-center gap-2">
                                            <FileJsonIcon /> questions.json
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleFixJSON}
                                                className="text-xs flex items-center gap-1 px-3 py-1.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 hover:text-indigo-200 transition-colors border border-indigo-500/30"
                                            >
                                                <Wrench size={12} /> ตรวจสอบ & จัดรูปแบบ
                                            </button>
                                            <a href="#" onClick={(e) => { e.preventDefault(); alert("รูปแบบ JSON:\n[\n  {\n    \"id\": 1,\n    \"question\": \"โจทย์...\",\n    \"keywords\": \"ระบุคำค้นหาตรงนี้ (Search จะเจอ)\",\n    \"image\": \"URL_รูปภาพ (ถ้ามี)\",\n    \"options\": [\"ก\", \"ข\", \"ค\", \"ง\"],\n    \"correctIndex\": 0,\n    \"explanation\": \"เฉลยละเอียด\"\n  }\n]") }} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
                                                <HelpCircle size={14} /> ดูตัวอย่าง Format
                                            </a>
                                        </div>
                                    </div>

                                    {/* Error Banner */}
                                    {jsonError && (
                                        <div className="bg-rose-500/10 border-b border-rose-500/20 p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                            <XCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={16} />
                                            <div className="min-w-0 flex-grow">
                                                <div className="text-rose-400 font-bold text-xs mb-0.5">
                                                    พบข้อผิดพลาดที่บรรทัด {jsonError.line}
                                                </div>
                                                <div className="text-rose-300 text-xs opacity-90 mb-1">
                                                    {jsonError.message}
                                                </div>
                                                <div className="text-amber-400 text-xs font-medium bg-amber-500/10 px-2 py-1 rounded inline-block">
                                                    💡 {jsonError.advice}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (textareaRef.current) {
                                                        const ta = textareaRef.current;
                                                        ta.focus();
                                                        ta.setSelectionRange(jsonError.start, jsonError.end);
                                                        ta.scrollTop = jsonError.scroll;
                                                    }
                                                }}
                                                className="bg-rose-500 text-white p-1.5 rounded hover:bg-rose-600 transition-colors shadow-lg shadow-rose-900/20 active:scale-95 flex flex-col items-center gap-1 min-w-[60px]"
                                                title="ไปที่จุดผิดพลาด"
                                            >
                                                <Target size={16} />
                                                <span className="text-[10px] font-bold">ไปยังจุดผิด</span>
                                            </button>
                                        </div>
                                    )}

                                    <textarea
                                        ref={textareaRef}
                                        value={jsonContent}
                                        onChange={(e) => setJsonContent(e.target.value)}
                                        className={`flex-grow w-full h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-4 outline-none resize-none leading-relaxed ${jsonError ? 'bg-rose-900/5' : ''}`}
                                        spellCheck="false"
                                    />
                                </>
                            ) : (
                                /* Visual Image Manager Mode */
                                <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#1e1e1e]">
                                    {(() => {
                                        try {
                                            const questions = JSON.parse(jsonContent);
                                            if (!Array.isArray(questions)) return <div className="text-rose-400 p-4">Error: JSON must be an array</div>;

                                            return questions.map((q: any, idx: number) => (
                                                <div key={idx} className="bg-[#2d2d2d] rounded-xl p-4 border border-[#3d3d3d] flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    {/* Question Number */}
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#3d3d3d] text-slate-400 font-bold flex items-center justify-center text-sm">
                                                        {idx + 1}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-grow min-w-0">
                                                        <p className="text-slate-200 font-medium mb-3 line-clamp-2 text-sm">{q.question}</p>

                                                        {/* Image Preview / Upload Area */}
                                                        <div className="flex items-start gap-4">
                                                            {q.image ? (
                                                                <div className="relative group rounded-lg overflow-hidden border border-[#444] w-32 h-24 bg-black/50 flex-shrink-0">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={q.image} alt="Q" className="w-full h-full object-contain" />
                                                                    <button
                                                                        onClick={() => {
                                                                            const newQuestions = [...questions];
                                                                            delete newQuestions[idx].image;
                                                                            setJsonContent(JSON.stringify(newQuestions, null, 2));
                                                                        }}
                                                                        className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                                                        title="ลบรูปภาพ"
                                                                    >
                                                                        <Loader2 size={12} className={uploadingCover ? "animate-spin" : "hidden"} /> {/* Dummy spacer */}
                                                                        X
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="w-32 h-24 bg-[#333] rounded-lg border border-dashed border-[#555] flex flex-col items-center justify-center text-slate-500 text-xs gap-1 flex-shrink-0">
                                                                    <ImageIcon size={16} />
                                                                    <span>ไม่มีรูปภาพ</span>
                                                                </div>
                                                            )}

                                                            <div className="flex flex-col gap-2">
                                                                <label className="px-3 py-1.5 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-slate-300 text-xs rounded cursor-pointer transition-colors flex items-center gap-2 border border-[#555]">
                                                                    <UploadCloud size={14} className="text-amber-500" />
                                                                    {q.image ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพ"}
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept="image/*"
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (!file) return;
                                                                            try {
                                                                                // 1. Upload
                                                                                const filename = `exam-q-images/${Date.now()}_${idx}_${file.name}`;
                                                                                const storageRef = ref(storage, filename);
                                                                                const snapshot = await uploadBytes(storageRef, file);
                                                                                const url = await getDownloadURL(snapshot.ref);

                                                                                // 2. Update JSON
                                                                                const newQuestions = [...questions];
                                                                                newQuestions[idx].image = url;
                                                                                setJsonContent(JSON.stringify(newQuestions, null, 2));
                                                                            } catch (err) {
                                                                                console.error(err);
                                                                                alert("อัปโหลดไม่สำเร็จ");
                                                                            }
                                                                        }}
                                                                    />
                                                                </label>
                                                                <span className="text-[10px] text-slate-500 block mt-1 opacity-80">แนะนำกว้างไม่เกิน 800px</span>
                                                                <div className="text-[10px] text-slate-500">
                                                                    *อัปโหลดแล้วบันทึก Auto ลง JSON
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ));
                                        } catch (e: any) {
                                            const isExample = !jsonContent.trim();
                                            return (
                                                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 mt-20">
                                                    <div className="w-16 h-16 bg-[#2d2d2d] rounded-full flex items-center justify-center text-slate-600 mb-2">
                                                        <FileJsonIcon size={32} />
                                                    </div>

                                                    {isExample ? (
                                                        <div className="text-center">
                                                            <h3 className="text-lg font-bold text-slate-400 mb-1">ยังไม่มีโจทย์</h3>
                                                            <p className="text-slate-500 text-sm mb-4">เริ่มเพิ่มโจทย์โดยการแก้ไข JSON</p>
                                                            <button
                                                                onClick={() => setActiveTab('json')}
                                                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold transition-colors"
                                                            >
                                                                ไปที่ JSON Editor
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center max-w-md">
                                                            <h3 className="text-lg font-bold text-rose-400 mb-1">JSON เสียหาย (เปิดอ่านไม่ได้)</h3>
                                                            <p className="text-rose-300 text-xs mb-4 font-mono bg-rose-950/30 p-2 rounded border border-rose-500/20 break-all">
                                                                {e.message}
                                                            </p>

                                                            <div className="flex items-center justify-center gap-3">
                                                                <button
                                                                    onClick={() => setActiveTab('json')}
                                                                    className="px-4 py-2 border border-[#444] hover:bg-[#333] text-slate-300 rounded transition-colors text-sm"
                                                                >
                                                                    กลับไปแก้เอง
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleFixJSON();
                                                                        // Small delay to allow state update before re-rendering this view (though react usually batches, handleFixJSON sets state)
                                                                    }}
                                                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold transition-colors text-sm flex items-center gap-2"
                                                                >
                                                                    <Wrench size={14} /> ลองซ่อมแซมอัตโนมัติ
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>

            {/* Floating Save Button */}
            <div className="fixed bottom-8 right-8 z-50 flex items-center gap-4">
                <button
                    onClick={() => handleSave()}
                    disabled={saving}
                    className={`
                        h-14 px-8 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 transform hover:-translate-y-1 active:scale-95
                        ${saving
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                            : "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-orange-500/40 ring-4 ring-white/20"
                        }
                    `}
                >
                    {saving ? (
                        <>
                            <Loader2 className="animate-spin" size={24} />
                            <span className="font-bold">กำลังบันทึก...</span>
                        </>
                    ) : (
                        <>
                            <Save size={24} />
                            <span className="font-bold text-lg">บันทึก</span>
                        </>
                    )}
                </button>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-white font-bold shadow-2xl z-[60] animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}>
                    {toast.type === 'success' ? <div className="p-1 bg-white/20 rounded-full">✓</div> : "!"}
                    {toast.msg}
                </div>
            )}
        </div>
    );
}


