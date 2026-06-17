"use client";
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { uploadImageToStorage } from "@/lib/upload";
import Link from "next/link";
import { MessageSquare, Paperclip, CheckCircle, Trash2, Clock, User, Send, X, Inbox, ListChecks, Hourglass } from "lucide-react";
import { useConfirmModal } from "@/hooks/useConfirmModal";

export default function AdminSupportPage() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [replyText, setReplyText] = useState("");
    const [replyFile, setReplyFile] = useState<File | null>(null);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const q = query(collection(db, "support_tickets"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    // Real-time listener for messages when a ticket is selected
    useEffect(() => {
        if (!selectedTicket) return;

        // 1. Listen to Messages
        const qMessages = query(collection(db, "support_tickets", selectedTicket.id, "messages"), orderBy("createdAt", "asc"));
        const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        });

        // 2. Listen to Ticket Status (for Read Receipts)
        const unsubscribeTicket = onSnapshot(doc(db, "support_tickets", selectedTicket.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Update selectedTicket with latest data (especially lastUserReadAt)
                setSelectedTicket((prev: any) => ({ ...prev, ...data }));
            }
        });

        // 3. Mark as read by admin (Initial open)
        updateDoc(doc(db, "support_tickets", selectedTicket.id), {
            lastAdminReadAt: serverTimestamp()
        });

        return () => {
            unsubscribeMessages();
            unsubscribeTicket();
        };
    }, [selectedTicket?.id]); // Only re-run if ticket ID changes

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!replyText.trim() && !replyFile) || !selectedTicket) return;

        setIsSending(true);
        try {
            let attachmentUrl = "";
            if (replyFile) {
                attachmentUrl = await uploadImageToStorage(replyFile, `support/admin/${Date.now()}_${replyFile.name}`);
            }

            await addDoc(collection(db, "support_tickets", selectedTicket.id, "messages"), {
                text: replyText,
                attachmentUrl,
                sender: "admin",
                createdAt: serverTimestamp()
            });
            setReplyText("");
            setReplyFile(null);
        } catch (error) {
            console.error("Error sending reply:", error);
            alert("ส่งข้อความไม่สำเร็จ");
        } finally {
            setIsSending(false);
        }
    };

    const handleStatusChange = async (ticketId: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, "support_tickets", ticketId), { status: newStatus });
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
        }
    };

    const handleDelete = (ticketId: string) => {
        confirmModal("ยืนยันการลบ", "คุณต้องการลบรายการนี้ใช่หรือไม่?", async () => {
            try {
                await deleteDoc(doc(db, "support_tickets", ticketId));
                setTickets(prev => prev.filter(t => t.id !== ticketId));
            } catch (error) {
                console.error("Error deleting ticket:", error);
                alert("เกิดข้อผิดพลาดในการลบ");
            }
        }, true);
    };

    // Presentational only: derived stats from data already in component
    const totalCount = tickets.length;
    const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
    const pendingCount = totalCount - resolvedCount;

    return (
        <div className="space-y-6">

            {/* ===== Stat chips ===== */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="kh-card p-4 flex items-center justify-between">
                    <div>
                        <div className="kh-eyebrow">Ticket ทั้งหมด</div>
                        <div className="kh-num text-3xl font-black kh-ink mt-1">{totalCount}</div>
                    </div>
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                        <ListChecks size={20} />
                    </span>
                </div>
                <div className="kh-card p-4 flex items-center justify-between">
                    <div>
                        <div className="kh-eyebrow">รอดำเนินการ</div>
                        <div className="kh-num text-3xl font-black mt-1" style={{ color: "var(--warn)" }}>{pendingCount}</div>
                    </div>
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                        <Hourglass size={20} />
                    </span>
                </div>
                <div className="kh-card p-4 flex items-center justify-between">
                    <div>
                        <div className="kh-eyebrow">แก้ไขแล้ว</div>
                        <div className="kh-num text-3xl font-black mt-1" style={{ color: "var(--good)" }}>{resolvedCount}</div>
                    </div>
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "var(--good-soft)", color: "var(--good)" }}>
                        <CheckCircle size={20} />
                    </span>
                </div>
            </div>

            {/* ===== Toolbar ===== */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <span className="kh-eyebrow">รายการแจ้งปัญหา</span>
                    <span className="kh-pill kh-pill-warn">{pendingCount} รอดำเนินการ</span>
                </div>
            </div>

            {/* ===== Tickets table ===== */}
            {loading ? (
                <div className="kh-card p-10 text-center" style={{ color: "var(--ink-3)" }}>กำลังโหลด...</div>
            ) : tickets.length === 0 ? (
                <div className="kh-card p-16 flex flex-col items-center justify-center text-center gap-3" style={{ color: "var(--ink-3)" }}>
                    <Inbox size={40} style={{ color: "var(--ink-3)" }} />
                    <p className="font-bold kh-ink2">ยังไม่มีรายการแจ้งปัญหา</p>
                </div>
            ) : (
                <div className="kh-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="kh-table">
                            <thead>
                                <tr>
                                    <th>#ID</th>
                                    <th>เรื่อง</th>
                                    <th>ผู้แจ้ง</th>
                                    <th>สถานะ</th>
                                    <th>อัปเดต</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id} className="cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                                        <td>
                                            <span className="kh-num text-xs" style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--ink-3)" }}>
                                                {ticket.id.slice(0, 6)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="font-bold kh-ink block max-w-[260px] truncate">{ticket.subject}</span>
                                        </td>
                                        <td>
                                            <span className="flex items-center gap-2 min-w-0">
                                                <span className="kh-avatar w-8 h-8 text-xs flex-shrink-0">
                                                    {(ticket.userName || "?").trim().charAt(0).toUpperCase()}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block kh-ink2 truncate max-w-[160px]">{ticket.userName || 'ไม่ระบุชื่อ'}</span>
                                                    <span className="block kh-ink3 text-xs truncate max-w-[160px]">{ticket.userEmail || 'ไม่ระบุอีเมล'}</span>
                                                </span>
                                            </span>
                                        </td>
                                        <td>
                                            {ticket.status === 'resolved' ? (
                                                <span className="kh-pill kh-pill-good">แก้ไขแล้ว</span>
                                            ) : (
                                                <span className="kh-pill kh-pill-warn">รอดำเนินการ</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="flex items-center gap-1 kh-ink3 text-xs whitespace-nowrap">
                                                <Clock size={12} />
                                                {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleString('th-TH') : 'ไม่ระบุเวลา'}
                                            </span>
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-2 justify-end">
                                                {ticket.status !== 'resolved' && (
                                                    <button
                                                        onClick={() => handleStatusChange(ticket.id, 'resolved')}
                                                        className="kh-btn-ghost"
                                                        style={{ color: "var(--good)", borderColor: "color-mix(in srgb, var(--good) 35%, transparent)" }}
                                                        title="ทำเครื่องหมายว่าแก้ไขแล้ว"
                                                    >
                                                        <CheckCircle size={15} /> เสร็จสิ้น
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className="kh-btn-ghost"
                                                >
                                                    <MessageSquare size={15} /> เปิดดู
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ticket.id)}
                                                    className="kh-btn-ghost"
                                                    style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 35%, transparent)" }}
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Chat Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
                    <div className="kh-card w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden" style={{ boxShadow: "var(--shadow)" }}>
                        {/* Modal Header */}
                        <div className="p-4 flex justify-between items-center" style={{ borderBottom: "1px solid var(--line)", background: "var(--card-2)" }}>
                            <div className="min-w-0">
                                <h3 className="font-bold kh-ink truncate">{selectedTicket.subject}</h3>
                                <p className="text-xs kh-ink3 flex items-center gap-1">
                                    <User size={12} /> {selectedTicket.userName}
                                </p>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} className="kh-btn-ghost flex-shrink-0" style={{ padding: 8 }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ background: "var(--card-2)" }}>
                            {/* Original Ticket Message */}
                            <div className="flex justify-start">
                                <div className="kh-card p-4 max-w-[80%]" style={{ borderTopLeftRadius: 4 }}>
                                    <p className="kh-ink2 text-sm">{selectedTicket.message}</p>
                                    {selectedTicket.attachmentUrl && (
                                        <a href={selectedTicket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                                            <Paperclip size={12} /> ไฟล์แนบ
                                        </a>
                                    )}
                                    <span className="text-[10px] kh-ink3 block mt-1">
                                        {selectedTicket.createdAt?.toDate ? selectedTicket.createdAt.toDate().toLocaleString('th-TH') : 'เริ่มต้น'}
                                    </span>
                                </div>
                            </div>

                            {/* Conversation */}
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className="p-3 max-w-[80%] rounded-2xl"
                                        style={msg.sender === 'admin'
                                            ? { background: "var(--accent)", color: "#fff", borderTopRightRadius: 4, boxShadow: "var(--shadow-sm)" }
                                            : { background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-2)", borderTopLeftRadius: 4, boxShadow: "var(--shadow-sm)" }}
                                    >
                                        <p className="text-sm">{msg.text}</p>
                                        {msg.attachmentUrl && (
                                            <a
                                                href={msg.attachmentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                                                style={msg.sender === 'admin'
                                                    ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                                                    : { background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                                            >
                                                <Paperclip size={12} /> ไฟล์แนบ
                                            </a>
                                        )}
                                        <div className={`flex items-center gap-1 mt-1 ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                            <span className="text-[10px]" style={{ color: msg.sender === 'admin' ? "rgba(255,255,255,0.7)" : "var(--ink-3)" }}>
                                                {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString('th-TH') : 'เมื่อสักครู่'}
                                            </span>
                                            {msg.sender === 'admin' && (
                                                <span className="text-[10px] ml-1 font-bold">
                                                    {selectedTicket.lastUserReadAt?.toDate && msg.createdAt?.toDate && selectedTicket.lastUserReadAt.toDate() > msg.createdAt.toDate() ? (
                                                        <span style={{ color: "var(--good-soft)" }}>อ่านแล้ว</span>
                                                    ) : (
                                                        <span style={{ color: "rgba(255,255,255,0.7)" }}>ยังไม่อ่าน</span>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendReply} className="p-4 flex gap-2 items-end" style={{ background: "var(--card)", borderTop: "1px solid var(--line)" }}>
                            <label className="kh-btn-ghost cursor-pointer flex-shrink-0" style={{ padding: 10 }}>
                                <Paperclip size={18} />
                                <input type="file" className="hidden" onChange={(e) => setReplyFile(e.target.files?.[0] || null)} />
                            </label>
                            <div className="flex-1 flex flex-col gap-2">
                                {replyFile && (
                                    <div className="flex items-center justify-between px-3 py-1 rounded-lg text-xs" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                                        <span className="truncate max-w-[200px]">{replyFile.name}</span>
                                        <button type="button" onClick={() => setReplyFile(null)} className="hover:opacity-70"><X size={14} /></button>
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="พิมพ์ข้อความตอบกลับ..."
                                    className="kh-input"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSending || (!replyText.trim() && !replyFile)}
                                className="kh-btn flex-shrink-0"
                                style={{ padding: 10 }}
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmDialog />
        </div>
    );
}
