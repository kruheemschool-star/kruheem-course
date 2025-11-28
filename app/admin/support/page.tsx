"use client";
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Paperclip, CheckCircle, Trash2, Clock, User, Send, X } from "lucide-react";

export default function AdminSupportPage() {
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
                const storageRef = ref(storage, `support/admin/${Date.now()}_${replyFile.name}`);
                await uploadBytes(storageRef, replyFile);
                attachmentUrl = await getDownloadURL(storageRef);
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

    const handleDelete = async (ticketId: string) => {
        if (!confirm("คุณต้องการลบรายการนี้ใช่หรือไม่?")) return;
        try {
            await deleteDoc(doc(db, "support_tickets", ticketId));
            setTickets(prev => prev.filter(t => t.id !== ticketId));
        } catch (error) {
            console.error("Error deleting ticket:", error);
            alert("เกิดข้อผิดพลาดในการลบ");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-stone-500 bg-orange-50">กำลังโหลด...</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50 font-sans text-stone-700 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-white/20 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <Link href="/admin" className="p-2 rounded-full hover:bg-white/50 transition">
                        <ArrowLeft size={24} className="text-stone-600" />
                    </Link>
                    <h1 className="text-xl font-bold text-stone-800">จัดการคำถามและแจ้งปัญหา (Support)</h1>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 md:p-10">
                <div className="grid gap-6">
                    {tickets.length === 0 ? (
                        <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-stone-200">
                            <MessageSquare size={48} className="mx-auto text-stone-300 mb-4" />
                            <p className="text-stone-500">ยังไม่มีรายการแจ้งปัญหา</p>
                        </div>
                    ) : (
                        tickets.map((ticket) => (
                            <div key={ticket.id} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${ticket.status === 'resolved' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                {ticket.status === 'resolved' ? 'แก้ไขแล้ว' : 'รอตรวจสอบ'}
                                            </span>
                                            <span className="text-xs text-stone-400 flex items-center gap-1">
                                                <Clock size={12} />
                                                {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleString('th-TH') : 'ไม่ระบุเวลา'}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-lg text-stone-800">{ticket.subject}</h3>
                                    <p className="text-stone-600 bg-stone-50 p-4 rounded-2xl text-sm leading-relaxed">
                                        {ticket.message}
                                    </p>

                                    {ticket.attachmentUrl && (
                                        <a
                                            href={ticket.attachmentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition"
                                        >
                                            <Paperclip size={16} />
                                            ดูไฟล์แนบ
                                        </a>
                                    )}

                                    <div className="flex items-center gap-2 text-xs text-stone-400 pt-2 border-t border-stone-50">
                                        <User size={12} />
                                        <span>{ticket.userName || 'ไม่ระบุชื่อ'} ({ticket.userEmail || 'ไม่ระบุอีเมล'})</span>
                                    </div>
                                </div>

                                <div className="flex flex-row md:flex-col gap-2 border-t md:border-t-0 md:border-l border-stone-100 pt-4 md:pt-0 md:pl-6 justify-center md:justify-start min-w-[140px]">
                                    {ticket.status !== 'resolved' && (
                                        <button
                                            onClick={() => handleStatusChange(ticket.id, 'resolved')}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl font-bold hover:bg-green-100 transition"
                                        >
                                            <CheckCircle size={16} />
                                            เสร็จสิ้น
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(ticket.id)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition"
                                    >
                                        <Trash2 size={16} />
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Chat Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                            <div>
                                <h3 className="font-bold text-stone-800">{selectedTicket.subject}</h3>
                                <p className="text-xs text-stone-500 flex items-center gap-1">
                                    <User size={12} /> {selectedTicket.userName}
                                </p>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-stone-200 rounded-full transition">
                                <X size={20} className="text-stone-500" />
                            </button>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/50">
                            {/* Original Ticket Message */}
                            <div className="flex justify-start">
                                <div className="bg-white border border-stone-100 p-4 rounded-2xl rounded-tl-none max-w-[80%] shadow-sm">
                                    <p className="text-stone-700 text-sm">{selectedTicket.message}</p>
                                    {selectedTicket.attachmentUrl && (
                                        <a href={selectedTicket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                            <Paperclip size={12} /> ไฟล์แนบ
                                        </a>
                                    )}
                                    <span className="text-[10px] text-stone-400 block mt-1">
                                        {selectedTicket.createdAt?.toDate ? selectedTicket.createdAt.toDate().toLocaleString('th-TH') : 'เริ่มต้น'}
                                    </span>
                                </div>
                            </div>

                            {/* Conversation */}
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-2xl max-w-[80%] shadow-sm ${msg.sender === 'admin' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-stone-100 text-stone-700 rounded-tl-none'}`}>
                                        <p className="text-sm">{msg.text}</p>
                                        {msg.attachmentUrl && (
                                            <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${msg.sender === 'admin' ? 'bg-indigo-700/50 text-indigo-100 hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                                                <Paperclip size={12} /> ไฟล์แนบ
                                            </a>
                                        )}
                                        <div className={`flex items-center gap-1 mt-1 ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                            <span className={`text-[10px] ${msg.sender === 'admin' ? 'text-indigo-200' : 'text-stone-400'}`}>
                                                {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString('th-TH') : 'เมื่อสักครู่'}
                                            </span>
                                            {msg.sender === 'admin' && (
                                                <span className="text-[10px] ml-1 font-bold">
                                                    {selectedTicket.lastUserReadAt?.toDate && msg.createdAt?.toDate && selectedTicket.lastUserReadAt.toDate() > msg.createdAt.toDate() ? (
                                                        <span className="text-green-300">อ่านแล้ว</span>
                                                    ) : (
                                                        <span className="text-indigo-300">ยังไม่อ่าน</span>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-stone-100 flex gap-2 items-end">
                            <label className="p-3 rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200 cursor-pointer transition">
                                <Paperclip size={20} />
                                <input type="file" className="hidden" onChange={(e) => setReplyFile(e.target.files?.[0] || null)} />
                            </label>
                            <div className="flex-1 flex flex-col gap-2">
                                {replyFile && (
                                    <div className="flex items-center justify-between bg-indigo-50 px-3 py-1 rounded-lg text-xs text-indigo-600">
                                        <span className="truncate max-w-[200px]">{replyFile.name}</span>
                                        <button type="button" onClick={() => setReplyFile(null)} className="hover:text-indigo-800"><X size={14} /></button>
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="พิมพ์ข้อความตอบกลับ..."
                                    className="w-full px-4 py-2 rounded-xl bg-stone-50 border-transparent focus:bg-white border focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSending || (!replyText.trim() && !replyFile)}
                                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-200"
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
