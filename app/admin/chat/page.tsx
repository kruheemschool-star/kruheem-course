"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { MessageCircle, Clock, Send, Phone, Smartphone, Trash2, Loader2, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useConfirmModal } from "@/hooks/useConfirmModal";

export default function AdminChatPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center" style={{ height: "calc(100vh - 112px)" }}><Loader2 className="animate-spin" size={32} style={{ color: "var(--accent)" }} /></div>}>
            <AdminChatContent />
        </Suspense>
    );
}

function AdminChatContent() {
    const searchParams = useSearchParams();
    const targetedChatId = searchParams.get('chatId');

    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChat, setSelectedChat] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [replyMessage, setReplyMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();

    // 🔊 Sound Effect
    const playNotificationSound = () => {
        try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            audio.play().catch(() => { });
        } catch (error) {
            console.error("Error playing sound", error);
        }
    };

    // 1. Fetch All Chats (Real-time)
    useEffect(() => {
        const q = query(collection(db, "chats"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setFetchError(null);
            const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort client-side
            chatList.sort((a: any, b: any) => {
                const timeA = a.lastUpdated?.toMillis() || 0;
                const timeB = b.lastUpdated?.toMillis() || 0;
                return timeB - timeA;
            });

            setChats(chatList);
            setLoading(false);

            // ✅ Auto-select chat from URL if available
            if (targetedChatId) {
                const target = chatList.find(c => c.id === targetedChatId);
                if (target) {
                    setSelectedChat(target);
                }
            }

            // Check for unread messages to play sound
            // In a real app, track previous state to only play on NEW unread
        }, (error) => {
            console.error("Error fetching chat list:", error);
            setFetchError(error.message);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [targetedChatId]);

    // 2. Fetch Messages for Selected Chat
    useEffect(() => {
        if (!selectedChat) return;

        // Mark as read & Update Admin Read Timestamp
        const chatRef = doc(db, "chats", selectedChat.id);
        updateDoc(chatRef, {
            isRead: true,
            lastAdminReadAt: serverTimestamp()
        }).catch(err => console.error("Error marking read:", err));

        const q = query(collection(db, "chats", selectedChat.id, "messages"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort client-side by createdAt
            msgs.sort((a: any, b: any) => {
                const timeA = a.createdAt ? a.createdAt.toMillis() : Date.now();
                const timeB = b.createdAt ? b.createdAt.toMillis() : Date.now();
                return timeA - timeB;
            });

            setMessages(msgs);

            // Play sound if last message is from user and very recent
            const lastMsg: any = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.sender === 'user' && Date.now() - (lastMsg.createdAt?.toMillis() || 0) < 5000) {
                playNotificationSound();
            }
        }, (error) => {
            console.error("Error fetching messages:", error);
        });

        return () => unsubscribe();
    }, [selectedChat?.id]);

    // Helper to get latest chat data
    const currentChat = selectedChat ? (chats.find(c => c.id === selectedChat.id) || selectedChat) : null;

    // Presentational derivations (no listener/state logic)
    const unreadCount = chats.filter(c => c.isRead === false).length;
    const filteredChats = searchTerm.trim()
        ? chats.filter(c =>
            (c.userName || "").toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
            (c.lastMessage || "").toLowerCase().includes(searchTerm.trim().toLowerCase())
        )
        : chats;

    // 3. Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, selectedChat]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedChat) return;

        const text = replyMessage;
        setReplyMessage("");

        try {
            await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
                text: text,
                sender: 'admin',
                createdAt: serverTimestamp()
            });

            const chatRef = doc(db, "chats", selectedChat.id);
            await updateDoc(chatRef, {
                lastMessage: text,
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending reply:", error);
            alert("ส่งข้อความไม่สำเร็จ");
        }
    };

    const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        confirmModal("ยืนยันการลบ", "คุณแน่ใจหรือไม่ว่าต้องการลบแชทนี้? การกระทำนี้ไม่สามารถย้อนกลับได้", async () => {
            try {
                await deleteDoc(doc(db, "chats", chatId));
                if (selectedChat?.id === chatId) {
                    setSelectedChat(null);
                }
            } catch (error) {
                console.error("Error deleting chat:", error);
                alert("เกิดข้อผิดพลาดในการลบแชท");
            }
        }, true);
    };

    if (loading) return <div className="flex items-center justify-center kh-ink3" style={{ height: "calc(100vh - 112px)" }}>กำลังโหลด...</div>;

    return (
        <div className="flex flex-col" style={{ height: "calc(100vh - 112px)" }}>
            {fetchError && (
                <div className="kh-card !rounded-xl mb-3 px-4 py-3 flex items-center gap-2 text-sm" style={{ background: "var(--danger-soft)", borderColor: "var(--danger)", color: "var(--danger)" }}>
                    <span>เกิดข้อผิดพลาด: {fetchError}</span>
                    <span className="kh-pill kh-pill-danger no-dot !text-[10px]">โปรดตรวจสอบ Firestore Rules</span>
                </div>
            )}

            <div className="kh-card !p-0 flex-1 min-h-0 overflow-hidden grid" style={{ gridTemplateColumns: "320px 1fr" }}>
                {/* ===== LEFT: master list ===== */}
                <div className="flex flex-col min-h-0" style={{ borderRight: "1px solid var(--line)" }}>
                    {/* List header */}
                    <div className="px-4 pt-4 pb-3 space-y-3" style={{ borderBottom: "1px solid var(--line)" }}>
                        <div className="flex items-center justify-between">
                            <h2 className="kh-eyebrow !text-[13px] !normal-case">
                                <MessageCircle size={15} style={{ color: "var(--accent)" }} />
                                ข้อความ
                            </h2>
                            {unreadCount > 0 && (
                                <span className="kh-pill kh-pill-accent no-dot !text-[10px]">{unreadCount} ใหม่</span>
                            )}
                        </div>
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 kh-ink3" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="ค้นหาแชท..."
                                className="kh-input !pl-9 !py-2 !text-[13px]"
                            />
                        </div>
                    </div>

                    {/* List rows */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {filteredChats.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <MessageCircle size={40} className="mx-auto kh-ink3 mb-3 opacity-50" />
                                <p className="kh-ink3 text-sm">{searchTerm.trim() ? "ไม่พบแชทที่ค้นหา" : "ยังไม่มีการสนทนา"}</p>
                            </div>
                        ) : (
                            filteredChats.map((chat) => {
                                const isActive = selectedChat?.id === chat.id;
                                return (
                                    <div
                                        key={chat.id}
                                        onClick={() => setSelectedChat(chat)}
                                        className="group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                                        style={{
                                            borderBottom: "1px solid var(--line)",
                                            borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                                            background: isActive ? "var(--accent-soft)" : "transparent",
                                        }}
                                    >
                                        <div className="kh-avatar w-10 h-10 !rounded-full shrink-0 text-base">
                                            {chat.userName?.charAt(0) || "G"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="font-semibold kh-ink text-sm truncate flex items-center gap-1.5">
                                                    {chat.userName || "Guest"}
                                                    {chat.userType === 'member' && (
                                                        <span className="kh-pill kh-pill-accent no-dot !text-[9px] !px-1.5 !py-0">Member</span>
                                                    )}
                                                </h3>
                                                <span className="text-[10px] kh-ink3 shrink-0 flex items-center gap-0.5">
                                                    <Clock size={10} />
                                                    {chat.lastUpdated?.toDate ? chat.lastUpdated.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mt-0.5">
                                                <p className="text-xs kh-ink3 truncate flex-1">{chat.lastMessage}</p>
                                                {chat.isRead === false && (
                                                    <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} title="ข้อความใหม่" />
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteChat(e, chat.id)}
                                            className="absolute right-2 bottom-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition kh-ink3 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] z-10"
                                            title="ลบแชท"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ===== RIGHT: conversation detail ===== */}
                {selectedChat ? (
                    <div className="flex flex-col min-h-0">
                        {/* Conversation header */}
                        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--line)" }}>
                            <div className="flex items-center gap-3">
                                <div className="kh-avatar w-10 h-10 !rounded-full text-base">
                                    {selectedChat.userName?.charAt(0) || "G"}
                                </div>
                                <div>
                                    <h3 className="font-semibold kh-ink text-sm flex items-center gap-2">
                                        {selectedChat.userName || "Guest"}
                                        <span className="inline-flex items-center gap-1 text-[11px] kh-ink3">
                                            <span className="w-2 h-2 rounded-full" style={{ background: "var(--good)" }} />
                                            {selectedChat.userType === 'member' ? 'สมาชิก' : 'ผู้เยี่ยมชม'}
                                        </span>
                                    </h3>
                                    <div className="flex flex-wrap gap-3 mt-0.5 text-[11px] kh-ink3">
                                        {selectedChat.enrolledCourses && selectedChat.enrolledCourses !== "Guest" && (
                                            <span className="flex items-center gap-1">📚 {selectedChat.enrolledCourses}</span>
                                        )}
                                        {selectedChat.userTel && (
                                            <span className="flex items-center gap-1"><Phone size={11} /> {selectedChat.userTel}</span>
                                        )}
                                        {selectedChat.lineId && (
                                            <span className="flex items-center gap-1"><Smartphone size={11} /> {selectedChat.lineId}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Message area */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3" style={{ background: "var(--card-2)" }}>
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                                    <div
                                        className="py-2.5 px-4 max-w-[75%] text-sm leading-relaxed"
                                        style={
                                            msg.sender === 'admin'
                                                ? { background: "linear-gradient(135deg,var(--accent),var(--accent-ink))", color: "#fff", borderRadius: "16px 16px 4px 16px" }
                                                : { background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink)", borderRadius: "16px 16px 16px 4px" }
                                        }
                                    >
                                        {msg.text}
                                        <div className="text-[10px] mt-1 text-right" style={{ opacity: 0.7, color: msg.sender === 'admin' ? "rgba(255,255,255,0.85)" : "var(--ink-3)" }}>
                                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '...'}
                                        </div>
                                    </div>
                                    {/* Read Receipt for Admin Messages */}
                                    {msg.sender === 'admin' && (
                                        <span className="text-[10px] kh-ink3 mt-1 mr-1">
                                            {currentChat?.lastUserReadAt && msg.createdAt?.toMillis() <= currentChat.lastUserReadAt.toMillis()
                                                ? "อ่านแล้ว"
                                                : "ยังไม่อ่าน"}
                                        </span>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input row */}
                        <form onSubmit={handleSendMessage} className="px-4 py-3 flex gap-2 items-end" style={{ borderTop: "1px solid var(--line)", background: "var(--card)" }}>
                            <input
                                type="text"
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                placeholder="พิมพ์ข้อความตอบกลับ..."
                                className="kh-input flex-1"
                            />
                            <button type="submit" disabled={!replyMessage.trim()} className="kh-btn !px-4">
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center px-6" style={{ background: "var(--card-2)" }}>
                        <MessageCircle size={48} className="kh-ink3 mb-3 opacity-40" />
                        <p className="kh-ink2 text-sm font-medium">เลือกการสนทนาเพื่อเริ่มแชท</p>
                        <p className="kh-ink3 text-xs mt-1">เลือกรายชื่อจากด้านซ้ายเพื่อดูข้อความ</p>
                    </div>
                )}
            </div>
            <ConfirmDialog />
        </div>
    );
}
