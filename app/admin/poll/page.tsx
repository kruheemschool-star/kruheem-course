"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, where, writeBatch, serverTimestamp, orderBy } from "firebase/firestore";
import { Loader2, Plus, Trash2, Save, BarChart3, CheckCircle2, Power, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminPollPage() {
    const [polls, setPolls] = useState<any[]>([]);
    const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editor State
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState<string[]>(["", ""]);
    const [isActive, setIsActive] = useState(false);
    const [stats, setStats] = useState<{ [key: string]: number }>({});
    const [totalVotes, setTotalVotes] = useState(0);

    // Fetch Polls
    useEffect(() => {
        const q = query(collection(db, "polls"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPolls(items);

            // Auto-select logic
            if (!selectedPollId) {
                if (items.length > 0) {
                    // If there are polls, select the active one or the first one
                    const active = items.find((i: any) => i.isActive);
                    handleSelectPoll(active ? active : items[0]);
                } else {
                    // If no polls exist, default to "new" mode
                    handleCreateNew();
                }
            } else if (selectedPollId !== "new") {
                // Update current view if data changes (and we are not creating a new one)
                const current = items.find((i: any) => i.id === selectedPollId);
                if (current) {
                    updateEditorState(current);
                } else {
                    // If the selected poll was deleted, switch to new or first
                    if (items.length > 0) handleSelectPoll(items[0]);
                    else handleCreateNew();
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [selectedPollId]); // Add selectedPollId to dependency to ensure logic runs correctly when it changes or on mount

    const handleSelectPoll = (poll: any) => {
        setSelectedPollId(poll.id);
        updateEditorState(poll);
    };

    const updateEditorState = (poll: any) => {
        setQuestion(poll.question || "");
        setOptions(poll.options || ["", ""]);
        setIsActive(poll.isActive || false);
        setStats(poll.votes || {});
        const total = Object.values(poll.votes || {}).reduce((a: any, b: any) => a + b, 0) as number;
        setTotalVotes(total);
    };

    const handleCreateNew = () => {
        setSelectedPollId("new");
        setQuestion("");
        setOptions(["", ""]);
        setIsActive(false);
        setStats({});
        setTotalVotes(0);
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOption = () => setOptions([...options, ""]);

    const removeOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    const handleSave = async () => {
        if (!question.trim() || options.some(opt => !opt.trim())) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        setSaving(true);
        try {
            const pollData = {
                question,
                options,
                isActive,
                updatedAt: serverTimestamp()
            };

            let targetId = selectedPollId;

            if (selectedPollId === "new" || !selectedPollId) {
                const newRef = doc(collection(db, "polls"));
                targetId = newRef.id;
                await setDoc(newRef, { ...pollData, createdAt: serverTimestamp(), votes: {} });
                setSelectedPollId(newRef.id);
            } else {
                await setDoc(doc(db, "polls", selectedPollId), pollData, { merge: true });
            }

            // If setting to active, deactivate others
            if (isActive) {
                await deactivateOtherPolls(targetId);
            }

            alert("บันทึกข้อมูลสำเร็จ!");
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    const deactivateOtherPolls = async (currentId: string | null) => {
        const q = query(collection(db, "polls"), where("isActive", "==", true));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        let changed = false;
        snapshot.docs.forEach(d => {
            if (d.id !== currentId) {
                batch.update(d.ref, { isActive: false });
                changed = true;
            }
        });

        if (changed) await batch.commit();
    };

    const handleDelete = async () => {
        if (!selectedPollId || selectedPollId === "new") return;
        if (!confirm("คุณแน่ใจหรือไม่ที่จะลบแบบสอบถามนี้?")) return;

        try {
            await deleteDoc(doc(db, "polls", selectedPollId));
            setSelectedPollId(null);
            handleCreateNew();
        } catch (error) {
            console.error(error);
            alert("ลบไม่สำเร็จ");
        }
    };

    const handleResetVotes = async () => {
        if (!selectedPollId || selectedPollId === "new") return;
        if (!confirm("คุณแน่ใจหรือไม่ที่จะล้างผลโหวตทั้งหมด?")) return;
        try {
            await setDoc(doc(db, "polls", selectedPollId), { votes: {} }, { merge: true });
            alert("ล้างผลโหวตเรียบร้อย");
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 min-h-screen bg-slate-50/50 font-sans">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-indigo-600" />
                        จัดการแบบสอบถาม (Polls)
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Sidebar: Poll List */}
                <div className="lg:col-span-4 space-y-4">
                    <button
                        onClick={handleCreateNew}
                        className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                    >
                        <Plus size={20} /> สร้างคำถามใหม่
                    </button>

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-500 text-sm">
                            รายการคำถามทั้งหมด ({polls.length})
                        </div>
                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {polls.map(poll => (
                                <div
                                    key={poll.id}
                                    onClick={() => handleSelectPoll(poll)}
                                    className={`p-4 rounded-xl cursor-pointer transition border-2 relative group ${selectedPollId === poll.id ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${poll.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {poll.isActive ? '● ใช้งานอยู่' : '○ ปิดใช้งาน'}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {Object.values(poll.votes || {}).reduce((a: any, b: any) => a + b, 0) as number} โหวต
                                        </span>
                                    </div>
                                    <h3 className={`font-bold text-sm line-clamp-2 ${selectedPollId === poll.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                                        {poll.question}
                                    </h3>
                                </div>
                            ))}
                            {polls.length === 0 && (
                                <div className="text-center py-10 text-slate-400 text-sm">ยังไม่มีแบบสอบถาม</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Content: Editor & Results */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                                {selectedPollId === "new" ? "✨ สร้างแบบสอบถามใหม่" : "✏️ แก้ไขแบบสอบถาม"}
                            </h2>

                            {selectedPollId !== "new" && (
                                <button onClick={handleDelete} className="text-rose-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition">
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-6">
                            {/* Active Toggle */}
                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <div>
                                    <h3 className="font-bold text-slate-700">สถานะการแสดงผล</h3>
                                    <p className="text-xs text-slate-500">เปิดให้แสดงบนหน้าเว็บนักเรียน (แสดงได้ทีละ 1 อัน)</p>
                                </div>
                                <button
                                    onClick={() => setIsActive(!isActive)}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">คำถาม</label>
                                <input
                                    type="text"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition font-bold text-lg text-slate-800"
                                    placeholder="เช่น คุณชอบเรียนวิชาอะไรมากที่สุด?"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">ตัวเลือกคำตอบ</label>
                                <div className="space-y-3">
                                    {options.map((opt, idx) => (
                                        <div key={idx} className="flex gap-2 group">
                                            <div className="w-8 h-12 flex items-center justify-center font-bold text-slate-300 bg-slate-50 rounded-lg">{idx + 1}</div>
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                className="flex-1 p-3 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition font-medium text-slate-700"
                                                placeholder={`ตัวเลือกที่ ${idx + 1}`}
                                            />
                                            {options.length > 2 && (
                                                <button onClick={() => removeOption(idx)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={addOption} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold hover:border-indigo-300 hover:text-indigo-500 transition flex items-center justify-center gap-2 hover:bg-indigo-50">
                                        <Plus size={20} /> เพิ่มตัวเลือก
                                    </button>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex gap-3">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                    บันทึกข้อมูล
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Section (Only if saved) */}
                    {selectedPollId !== "new" && (
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                                    📊 ผลโหวตปัจจุบัน
                                    <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-1 rounded-full">{totalVotes} คน</span>
                                </h2>
                                <button
                                    onClick={handleResetVotes}
                                    className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition"
                                >
                                    ล้างผลโหวต
                                </button>
                            </div>

                            {totalVotes === 0 ? (
                                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>ยังไม่มีผู้ตอบแบบสอบถาม</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div className="space-y-4">
                                        {options.map((opt, idx) => {
                                            const count = stats[opt] || 0;
                                            const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                                            return (
                                                <div key={idx}>
                                                    <div className="flex justify-between text-sm font-bold text-slate-600 mb-1">
                                                        <span>{opt}</span>
                                                        <span>{count} ({percent}%)</span>
                                                    </div>
                                                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Pie Chart */}
                                    <div className="flex justify-center">
                                        <div
                                            className="w-40 h-40 rounded-full shadow-inner border-4 border-white"
                                            style={{
                                                background: `conic-gradient(
                                                    ${options.map((opt, i) => {
                                                    const count = stats[opt] || 0;
                                                    const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                                                    const prevPercent = options.slice(0, i).reduce((acc, curr) => acc + ((stats[curr] || 0) / totalVotes) * 100, 0);
                                                    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
                                                    const color = colors[i % colors.length];
                                                    return `${color} 0 ${prevPercent + percent}%`;
                                                }).join(', ')}
                                                )`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
