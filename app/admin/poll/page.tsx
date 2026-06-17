"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, writeBatch, serverTimestamp, orderBy } from "firebase/firestore";
import { Loader2, Plus, Trash2, Save, BarChart3, ListChecks, Pencil, Sparkles } from "lucide-react";
import { useConfirmModal } from "@/hooks/useConfirmModal";

export default function AdminPollPage() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
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

    // Fetch Polls (one-time fetch — polls don't need real-time updates)
    const fetchPolls = async () => {
        try {
            const q = query(collection(db, "polls"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setPolls(items);
            return items;
        } catch (error) {
            console.error("Error fetching polls:", error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolls().then(items => {
            if (items.length > 0) {
                const active = items.find((i: any) => i.isActive);
                handleSelectPoll(active ? active : items[0]);
            } else {
                handleCreateNew();
            }
        });
    }, []);

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

            await fetchPolls();
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
        confirmModal("ยืนยันการลบ", "คุณแน่ใจหรือไม่ที่จะลบแบบสอบถามนี้?", async () => {
            try {
                await deleteDoc(doc(db, "polls", selectedPollId));
                setSelectedPollId(null);
                handleCreateNew();
                await fetchPolls();
            } catch (error) {
                console.error(error);
                alert("ลบไม่สำเร็จ");
            }
        }, true);
    };

    const handleResetVotes = async () => {
        if (!selectedPollId || selectedPollId === "new") return;
        confirmModal("ยืนยันการล้างผลโหวต", "คุณแน่ใจหรือไม่ที่จะล้างผลโหวตทั้งหมด?", async () => {
            try {
                await setDoc(doc(db, "polls", selectedPollId), { votes: {} }, { merge: true });
                await fetchPolls();
                alert("ล้างผลโหวตเรียบร้อย");
            } catch (error) {
                console.error(error);
            }
        }, true);
    };

    if (loading) return (
        <div className="flex justify-center items-center py-24 kh-ink3">
            <Loader2 className="animate-spin" size={24} />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="kh-eyebrow"><BarChart3 size={15} strokeWidth={1.9} /> จัดการแบบสอบถาม</div>
                <button onClick={handleCreateNew} className="kh-btn">
                    <Plus size={15} strokeWidth={2.1} /> สร้างแบบสอบถาม
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Sidebar: Poll List */}
                <div className="lg:col-span-4">
                    <div className="kh-card overflow-hidden">
                        <div className="px-4 py-3 border-b flex items-center gap-2 kh-eyebrow" style={{ borderColor: "var(--line)" }}>
                            <ListChecks size={14} strokeWidth={1.9} /> รายการทั้งหมด ({polls.length})
                        </div>
                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                            {polls.map(poll => {
                                const active = selectedPollId === poll.id;
                                return (
                                    <button
                                        key={poll.id}
                                        onClick={() => handleSelectPoll(poll)}
                                        className="w-full text-left p-3.5 rounded-xl transition border"
                                        style={{
                                            background: active ? "var(--accent-soft)" : "transparent",
                                            borderColor: active ? "color-mix(in srgb, var(--accent) 35%, transparent)" : "transparent",
                                        }}
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-1.5">
                                            <span className={`kh-pill ${poll.isActive ? "kh-pill-good" : "kh-pill-ink"}`}>
                                                {poll.isActive ? "กำลังเปิดโหวต" : "ปิดอยู่"}
                                            </span>
                                            <span className="kh-num text-xs kh-ink3 whitespace-nowrap mt-0.5">
                                                {Object.values(poll.votes || {}).reduce((a: any, b: any) => a + b, 0) as number} โหวต
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-sm line-clamp-2" style={{ color: active ? "var(--accent-ink)" : "var(--ink)" }}>
                                            {poll.question}
                                        </h3>
                                    </button>
                                );
                            })}
                            {polls.length === 0 && (
                                <div className="text-center py-10 kh-ink3 text-sm">ยังไม่มีแบบสอบถาม</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Content: Editor & Results */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="kh-card p-6">
                        <div className="flex justify-between items-center mb-5 pb-5 border-b" style={{ borderColor: "var(--line)" }}>
                            <h2 className="text-base font-semibold kh-ink flex items-center gap-2">
                                {selectedPollId === "new"
                                    ? <><Sparkles size={16} strokeWidth={1.9} style={{ color: "var(--accent)" }} /> สร้างแบบสอบถามใหม่</>
                                    : <><Pencil size={16} strokeWidth={1.9} style={{ color: "var(--accent)" }} /> แก้ไขแบบสอบถาม</>}
                            </h2>

                            {selectedPollId !== "new" && (
                                <button onClick={handleDelete} className="kh-btn-ghost p-2" style={{ color: "var(--danger)" }} title="ลบแบบสอบถาม">
                                    <Trash2 size={16} strokeWidth={1.9} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-5">
                            {/* Active Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>
                                <div>
                                    <h3 className="font-semibold text-sm kh-ink">สถานะการแสดงผล</h3>
                                    <p className="text-xs kh-ink3 mt-0.5">เปิดให้แสดงบนหน้าเว็บนักเรียน (แสดงได้ทีละ 1 อัน)</p>
                                </div>
                                <button
                                    onClick={() => setIsActive(!isActive)}
                                    className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none"
                                    style={{ background: isActive ? "var(--good)" : "var(--line-2)" }}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold kh-ink2 mb-2">คำถาม</label>
                                <input
                                    type="text"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    className="kh-input font-medium"
                                    placeholder="เช่น คุณชอบเรียนวิชาอะไรมากที่สุด?"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold kh-ink2 mb-2">ตัวเลือกคำตอบ</label>
                                <div className="space-y-2.5">
                                    {options.map((opt, idx) => (
                                        <div key={idx} className="flex gap-2 group items-center">
                                            <div className="kh-num w-9 h-9 flex-shrink-0 flex items-center justify-center font-semibold text-sm rounded-lg kh-ink3" style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>{idx + 1}</div>
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                className="kh-input flex-1"
                                                placeholder={`ตัวเลือกที่ ${idx + 1}`}
                                            />
                                            {options.length > 2 && (
                                                <button onClick={() => removeOption(idx)} className="kh-btn-ghost p-2 opacity-0 group-hover:opacity-100" style={{ color: "var(--danger)" }} title="ลบตัวเลือก">
                                                    <Trash2 size={16} strokeWidth={1.9} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={addOption} className="w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition kh-ink3" style={{ border: "1.5px dashed var(--line-2)", background: "var(--card-2)" }}>
                                        <Plus size={16} strokeWidth={2} /> เพิ่มตัวเลือก
                                    </button>
                                </div>
                            </div>

                            <div className="pt-5 border-t flex gap-3" style={{ borderColor: "var(--line)" }}>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="kh-btn flex-1"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={15} strokeWidth={1.9} />}
                                    บันทึกข้อมูล
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Section (Only if saved) */}
                    {selectedPollId !== "new" && (
                        <div className="kh-card p-6">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-base font-semibold kh-ink flex items-center gap-2">
                                    <BarChart3 size={16} strokeWidth={1.9} style={{ color: "var(--accent)" }} /> ผลโหวตปัจจุบัน
                                    <span className="kh-pill kh-pill-accent no-dot kh-num">{totalVotes} คน</span>
                                </h2>
                                <button
                                    onClick={handleResetVotes}
                                    className="kh-btn-ghost"
                                    style={{ color: "var(--danger)" }}
                                >
                                    ล้างผลโหวต
                                </button>
                            </div>

                            {totalVotes === 0 ? (
                                <div className="text-center py-10 kh-ink3 rounded-xl" style={{ background: "var(--card-2)", border: "1px dashed var(--line-2)" }}>
                                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">ยังไม่มีผู้ตอบแบบสอบถาม</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div className="space-y-4">
                                        {options.map((opt, idx) => {
                                            const count = stats[opt] || 0;
                                            const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                                            return (
                                                <div key={idx}>
                                                    <div className="flex justify-between text-sm font-medium kh-ink2 mb-1.5 gap-2">
                                                        <span className="truncate">{opt}</span>
                                                        <span className="kh-num whitespace-nowrap kh-ink3">{count} ({percent}%)</span>
                                                    </div>
                                                    <div className="kh-progress">
                                                        <span style={{ width: `${percent}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Pie Chart */}
                                    <div className="flex justify-center">
                                        <div
                                            className="w-40 h-40 rounded-full shadow-inner"
                                            style={{
                                                border: "4px solid var(--card)",
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
            <ConfirmDialog />
        </div>
    );
}
