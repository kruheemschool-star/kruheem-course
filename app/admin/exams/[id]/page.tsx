"use client";

import { useRef, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import { Save, ArrowLeft, HelpCircle, UploadCloud, Loader2, Image as ImageIcon, FileJson as FileJsonIcon, Wrench, XCircle, Target, Plus, Trash2, ChevronDown, ChevronUp, Copy, Blocks } from "lucide-react";
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
    const [jsonContent, setJsonContent] = useState("");
    const [smartBlocks, setSmartBlocks] = useState<string[]>([]);
    const [isBulkImporting, setIsBulkImporting] = useState(false);
    const [bulkJson, setBulkJson] = useState("");
    const [collapsedBlocks, setCollapsedBlocks] = useState<Record<number, boolean>>({});
    const isManualUpdate = useRef(false);

    // Smart Editor Synchronization
    useEffect(() => {
        // Skip sync if this was a manual update from add/delete functions
        if (isManualUpdate.current) {
            isManualUpdate.current = false;
            return;
        }

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
    }, [activeTab, jsonContent]);

    const updateSmartBlock = (index: number, val: string) => {
        const newBlocks = [...smartBlocks];
        newBlocks[index] = val;
        isManualUpdate.current = true;
        setSmartBlocks(newBlocks);
        setJsonContent(`[\n${newBlocks.join(',\n')}\n]`);
    };

    const addSmartQuestion = () => {
        // Create an empty object string to allow easy pasting
        const emptyBlock = "{}";
        const newBlocks = [...smartBlocks, emptyBlock];
        isManualUpdate.current = true;
        setSmartBlocks(newBlocks);
        setJsonContent(`[\n${newBlocks.join(',\n')}\n]`);
        // New question starts collapsed
        setCollapsedBlocks({ ...collapsedBlocks, [newBlocks.length - 1]: true });
    };

    const toggleBlockCollapse = (index: number) => {
        setCollapsedBlocks({ ...collapsedBlocks, [index]: !collapsedBlocks[index] });
    };

    // Transform external exam format to internal format
    const transformExamQuestion = (q: any) => {
        let answerIndex = q.answerIndex ?? q.correctIndex ?? 0;
        if (q.answer && typeof q.answer === 'string') {
            const numberMatch = q.answer.match(/^([1-4])\s*\./);
            if (numberMatch) {
                answerIndex = parseInt(numberMatch[1]) - 1;
            }
        }
        const optionsLength = q.options?.length || 4;
        if (answerIndex < 0 || answerIndex >= optionsLength) {
            answerIndex = 0;
        }
        return {
            question: q.question || "",
            image: q.image,
            options: q.options || [],
            correctIndex: answerIndex,
            explanation: q.solution || q.explanation || "",
            tags: q.tags || (q.space ? [q.space] : [])
        };
    };

    // Bulk import multiple questions at once
    const bulkImportQuestions = () => {
        const raw = bulkJson.trim();
        if (!raw) return;
        try {
            let cleanJson = raw
                .replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            const valid = items.filter(item => item.question && item.options && Array.isArray(item.options) && item.options.length >= 2);
            if (valid.length === 0) {
                alert("❌ ไม่พบข้อสอบที่ถูกต้อง (ต้องมี question และ options)");
                return;
            }
            const transformed = valid.map(transformExamQuestion);
            const newBlockStrings = transformed.map(q => JSON.stringify(q, null, 2));
            const allBlocks = [...smartBlocks, ...newBlockStrings];
            isManualUpdate.current = true;
            setSmartBlocks(allBlocks);
            setJsonContent(`[\n${allBlocks.join(',\n')}\n]`);
            setBulkJson("");
            setIsBulkImporting(false);
            const skipped = items.length - valid.length;
            let msg = `✅ เพิ่ม ${valid.length} ข้อเรียบร้อย!`;
            if (skipped > 0) msg += `\n⚠️ ข้าม ${skipped} ข้อที่ไม่ถูกต้อง`;
            alert(msg);
        } catch (e: any) {
            alert(`❌ JSON ไม่ถูกต้อง: ${e.message}`);
        }
    };

    const deleteSmartQuestion = (index: number) => {
        if (!confirm("ยืนยันการลบข้อนี้?")) return;
        const newBlocks = [...smartBlocks];
        newBlocks.splice(index, 1);
        isManualUpdate.current = true;
        setSmartBlocks(newBlocks);
        setJsonContent(`[\n${newBlocks.join(',\n')}\n]`);
    };

    const deleteAllQuestions = () => {
        if (smartBlocks.length === 0) return;
        if (!confirm(`ยืนยันลบข้อสอบทั้งหมด ${smartBlocks.length} ข้อ?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้!`)) return;
        isManualUpdate.current = true;
        setSmartBlocks([]);
        setJsonContent('[]');
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

    const handleAIClean = () => {
        // 1. First, try to fix basic JSON syntax issues using Level 1 logic from handleFixJSON
        let processed = jsonContent;

        // Smart Quotes & invisible chars
        processed = processed
            .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\t]/g, "  ")
            // eslint-disable-next-line no-control-regex
            .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");

        // Struct fixes
        processed = processed.replace(/,(\s*[}\]])/g, '$1');
        processed = processed.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');

        try {
            const parsed = JSON.parse(processed);

            // 2. Now deep clean LaTeX in content
            const deepClean = (obj: any): any => {
                if (typeof obj === 'string') {
                    // Apply LaTeX Fixer
                    let s = obj;

                    // Fix Typos (Same dictionary as MathRenderer)
                    const commonTypos: Record<string, string> = {
                        '\\farc': '\\frac', '\\frca': '\\frac', '\\tims': '\\times',
                        '\\itmes': '\\times', '\\alpah': '\\alpha', '\\thetaa': '\\theta',
                        '\\lamda': '\\lambda', '\\sigmaa': '\\sigma', '\\right\\)': '\\right)'
                    };
                    Object.keys(commonTypos).forEach(typo => {
                        // Escape special regex characters
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
            setJsonContent(JSON.stringify(cleanedData, null, 2));

            // Update smart editor blocks too if active
            if (Array.isArray(cleanedData)) {
                setSmartBlocks(cleanedData.map((q: any) => JSON.stringify(q, null, 2)));
            }

            alert("✨ AI Clean เรียบร้อย! แก้ไขโครงสร้างและสมการให้ถูกต้องแล้ว");
            setJsonError(null);

        } catch (e: any) {
            alert("❌ ไม่สามารถประมวลผลได้: JSON ต้นฉบับเสียหายเกินกว่าจะซ่อมได้อัตโนมัติ กรุณาใช้ปุ่ม 'ตรวจสอบ JSON' เพื่อดูจุดผิด");
        }
    };

    // ... (render)

    // Form States
    // ...


    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [coverImage, setCoverImage] = useState("");
    const [category, setCategory] = useState("ม.ต้น");
    const [level, setLevel] = useState("ม.1");
    const [timeLimit, setTimeLimit] = useState(30);
    const [difficulty, setDifficulty] = useState("Medium");
    const [themeColor, setThemeColor] = useState("Amber");

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

                // Logical Validation: Check if correctIndex is within bounds
                const invalidIndices: number[] = [];
                parsedQuestions.forEach((q: any, idx: number) => {
                    // Check only if there are options (assuming Multiple Choice)
                    if (q.options && q.options.length > 0) {
                        if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
                            invalidIndices.push(idx + 1);
                        }
                    }
                });

                if (invalidIndices.length > 0) {
                    alert(`⚠️ พบข้อผิดพลาดทางตรรกะ:\nข้อที่ ${invalidIndices.join(", ")} มีการระบุคำตอบ (correctIndex) ไม่ตรงกับจำนวนตัวเลือก\n\nกรุณาแก้ไขก่อนบันทึก`);
                    setSaving(false);
                    return;
                }

            } catch (err) {
                alert("รูปแบบ JSON ไม่ถูกต้อง กรุณาตรวจสอบ Syntax");
                setSaving(false);
                return;
            }

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
                    {loading && <span className="text-slate-400">Loading...</span>}
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
                                        { name: 'Amber', class: 'bg-amber-500', rings: 'ring-amber-500' },
                                        { name: 'Rose', class: 'bg-rose-500', rings: 'ring-rose-500' },
                                        { name: 'Violet', class: 'bg-violet-500', rings: 'ring-violet-500' },
                                        { name: 'Emerald', class: 'bg-emerald-500', rings: 'ring-emerald-500' },
                                        { name: 'Sky', class: 'bg-sky-500', rings: 'ring-sky-500' },
                                        { name: 'Red', class: 'bg-red-500', rings: 'ring-red-500' },
                                        { name: 'Indigo', class: 'bg-indigo-500', rings: 'ring-indigo-500' },
                                        { name: 'Pink', class: 'bg-pink-500', rings: 'ring-pink-500' },
                                        { name: 'Teal', class: 'bg-teal-500', rings: 'ring-teal-500' },
                                        { name: 'Cyan', class: 'bg-cyan-500', rings: 'ring-cyan-500' },
                                        { name: 'Fuchsia', class: 'bg-fuchsia-500', rings: 'ring-fuchsia-500' },
                                        { name: 'Lime', class: 'bg-lime-500', rings: 'ring-lime-500' },
                                        { name: 'Orange', class: 'bg-orange-500', rings: 'ring-orange-500' },
                                        { name: 'Blue', class: 'bg-blue-500', rings: 'ring-blue-500' },
                                        { name: 'Green', class: 'bg-green-500', rings: 'ring-green-500' },
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
                                <div className="flex-grow overflow-y-auto bg-[#1e1e1e] relative">
                                    {/* Sticky Toolbar */}
                                    <div className="sticky top-0 z-20 bg-[#252526] border-b border-[#3d3d3d] px-4 py-2.5 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400 font-mono">
                                                {smartBlocks.length > 0 ? `${smartBlocks.length} ข้อ` : 'ว่าง'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={addSmartQuestion}
                                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors flex items-center gap-1.5"
                                            >
                                                <Plus size={12} /> เพิ่มข้อ
                                            </button>
                                            <button
                                                onClick={() => setIsBulkImporting(!isBulkImporting)}
                                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition-colors flex items-center gap-1.5"
                                            >
                                                <Copy size={12} /> เพิ่มหลายข้อ
                                            </button>
                                            {smartBlocks.length > 0 && (
                                                <button
                                                    onClick={deleteAllQuestions}
                                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 transition-colors flex items-center gap-1.5"
                                                >
                                                    <Trash2 size={12} /> ลบทั้งหมด
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6">
                                    {smartBlocks.length === 0 && (
                                        <div className="text-center py-10 text-slate-500">
                                            <Blocks size={48} className="mx-auto mb-4 opacity-20" />
                                            <p>ยังไม่มีข้อสอบ เริ่มเพิ่มข้อแรกเลย!</p>
                                        </div>
                                    )}

                                    {smartBlocks.map((block, idx) => {
                                        const isCollapsed = collapsedBlocks[idx] ?? true; // Default collapsed
                                        return (
                                        <div key={idx} className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden shadow-lg group hover:border-emerald-500/50 transition-colors">
                                            {/* Card Header */}
                                            <div className="bg-[#252526] p-3 flex items-center justify-between cursor-pointer" onClick={() => toggleBlockCollapse(idx)}>
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-mono">Question Block</span>
                                                    <button className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
                                                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => deleteSmartQuestion(idx)}
                                                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                                                        title="ลบข้อนี้"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Editor Area - Only show when expanded */}
                                            {!isCollapsed && (
                                            <>
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
                                            </>
                                            )}
                                        </div>
                                        );
                                    })}

                                    {/* Bulk Import Panel */}
                                    {isBulkImporting && (
                                        <div className="bg-[#2d2d2d] rounded-xl border-2 border-amber-500/50 overflow-hidden shadow-lg">
                                            <div className="bg-[#252526] p-3 flex items-center justify-between border-b border-amber-500/30">
                                                <span className="text-xs text-amber-400 font-bold flex items-center gap-2">
                                                    <Copy size={14} /> วางโค้ด JSON หลายข้อพร้อมกัน
                                                </span>
                                                <button onClick={() => setIsBulkImporting(false)} className="text-slate-500 hover:text-rose-400 transition-colors">
                                                    <XCircle size={16} />
                                                </button>
                                            </div>
                                            <textarea
                                                value={bulkJson}
                                                onChange={(e) => setBulkJson(e.target.value)}
                                                placeholder={`// วาง JSON array ที่นี่ (หลายข้อ)\n[\n  {\n    "question": "...",\n    "options": ["...", "...", "...", "..."],\n    "answer": "1. ...",\n    "solution": "..."\n  },\n  { ... }\n]\n\n// answer ใช้ตัวเลข 1-4`}
                                                className="w-full h-64 bg-[#1e1e1e] text-[#d4d4d4] p-4 text-sm font-mono outline-none resize-y leading-relaxed"
                                                spellCheck="false"
                                            />
                                            <div className="p-3 bg-[#252526] border-t border-[#3d3d3d]">
                                                <button
                                                    onClick={bulkImportQuestions}
                                                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm transition-colors"
                                                >
                                                    นำเข้าข้อสอบทั้งหมด ✅
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="h-10"></div>
                                    </div>
                                </div>
                            ) : activeTab === 'json' ? (
                                <>
                                    <div className="p-3 bg-[#2d2d2d] flex justify-between items-center border-b border-[#3d3d3d]">
                                        <span className="text-slate-300 font-mono text-sm flex items-center gap-2">
                                            <FileJsonIcon /> questions.json
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleAIClean}
                                                className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 hover:text-amber-200 transition-colors border border-amber-500/30 font-bold"
                                            >
                                                <span>✨</span> AI Clean
                                            </button>
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


