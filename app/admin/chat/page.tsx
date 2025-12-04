"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Clock, User, Send, X, Phone, Smartphone, Trash2 } from "lucide-react";

export default function AdminChatPage() {
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChat, setSelectedChat] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [replyMessage, setReplyMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // 🔊 Sound Effect
    const playNotificationSound = () => {
        try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            audio.play().catch(e => console.log("Audio play failed", e));
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

            // Check for unread messages to play sound
            // In a real app, track previous state to only play on NEW unread
        }, (error) => {
            console.error("Error fetching chat list:", error);
            setFetchError(error.message);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

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
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบแชทนี้? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;

        try {
            await deleteDoc(doc(db, "chats", chatId));
            if (selectedChat?.id === chatId) {
                setSelectedChat(null);
            }
        } catch (error) {
            console.error("Error deleting chat:", error);
            alert("เกิดข้อผิดพลาดในการลบแชท");
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
                    <h1 className="text-xl font-bold text-stone-800">แชทกับลูกค้า (Live Chat)</h1>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 md:p-10">
                {fetchError && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-200 flex items-center gap-2">
                        <span>⚠️ เกิดข้อผิดพลาด: {fetchError}</span>
                        <span className="text-xs bg-white px-2 py-1 rounded border border-red-100">โปรดตรวจสอบ Firestore Rules</span>
                    </div>
                )}

                <div className="grid gap-6">
                    {chats.length === 0 ? (
                        <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-stone-200">
                            <MessageCircle size={48} className="mx-auto text-stone-300 mb-4" />
                            <p className="text-stone-500">ยังไม่มีการสนทนา</p>
                        </div>
                    ) : (
                        chats.map((chat) => (
                            <div
                                key={chat.id}
                                className={`bg-white rounded-3xl p-6 shadow-sm border flex flex-col md:flex-row gap-6 hover:shadow-md transition-all cursor-pointer relative overflow-hidden
                                    ${chat.isRead === false ? 'border-indigo-200 bg-indigo-50/30' : 'border-stone-100'}
                                `}
                                onClick={() => setSelectedChat(chat)}
                            >
                                {chat.isRead === false && (
                                    <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                                        ข้อความใหม่
                                    </div>
                                )}

                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm
                                                ${chat.userType === 'member' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}
                                            `}>
                                                {chat.userName?.charAt(0) || "G"}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-stone-800 flex items-center gap-2">
                                                    {chat.userName || "Guest"}
                                                    {chat.userType === 'member' && (
                                                        <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full">Member</span>
                                                    )}
                                                </h3>
                                                <div className="text-xs text-stone-400 flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {chat.lastUpdated?.toDate ? chat.lastUpdated.toDate().toLocaleString('th-TH') : 'ไม่ระบุเวลา'}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteChat(e, chat.id)}
                                            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition z-10"
                                            title="ลบแชท"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <div className="bg-stone-50 p-4 rounded-2xl text-sm text-stone-600 flex items-start gap-2">
                                        <MessageCircle size={16} className="mt-0.5 text-stone-400 shrink-0" />
                                        <span className="truncate line-clamp-2">{chat.lastMessage}</span>
                                    </div>

                                    <div className="flex flex-wrap gap-4 pt-2 border-t border-stone-50 text-xs text-stone-500">
                                        {chat.enrolledCourses && chat.enrolledCourses !== "Guest" && (
                                            <div className="flex items-center gap-1">
                                                <span>📚 {chat.enrolledCourses}</span>
                                            </div>
                                        )}
                                        {chat.userTel && (
                                            <div className="flex items-center gap-1">
                                                <Phone size={12} /> {chat.userTel}
                                            </div>
                                        )}
                                        {chat.lineId && (
                                            <div className="flex items-center gap-1">
                                                <Smartphone size={12} /> {chat.lineId}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Chat Modal */}
            {selectedChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold
                                    ${selectedChat.userType === 'member' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}
                                `}>
                                    {selectedChat.userName?.charAt(0) || "G"}
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-800">{selectedChat.userName || "Guest"}</h3>
                                    <p className="text-xs text-stone-500 flex items-center gap-1">
                                        {selectedChat.userType === 'member' ? 'สมาชิก' : 'ผู้เยี่ยมชม'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedChat(null)} className="p-2 hover:bg-stone-200 rounded-full transition">
                                <X size={20} className="text-stone-500" />
                            </button>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/50">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                                    <div className={`py-3 px-5 rounded-2xl max-w-[80%] shadow-sm text-sm
                                        ${msg.sender === 'admin'
                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                            : 'bg-white border border-stone-100 text-stone-700 rounded-tl-none'
                                        }`}>
                                        {msg.text}
                                        <div className={`text-[10px] mt-1 text-right ${msg.sender === 'admin' ? 'text-indigo-200' : 'text-stone-400'}`}>
                                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '...'}
                                        </div>
                                    </div>
                                    {/* Read Receipt for Admin Messages */}
                                    {msg.sender === 'admin' && (
                                        <span className="text-[10px] text-stone-400 mt-1 mr-1">
                                            {currentChat?.lastUserReadAt && msg.createdAt?.toMillis() <= currentChat.lastUserReadAt.toMillis()
                                                ? "อ่านแล้ว"
                                                : "ยังไม่อ่าน"}
                                        </span>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-stone-100 flex gap-2 items-end">
                            <input
                                type="text"
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                placeholder="พิมพ์ข้อความตอบกลับ..."
                                className="flex-1 px-4 py-3 rounded-xl bg-stone-50 border-transparent focus:bg-white border focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                            />
                            <button
                                type="submit"
                                disabled={!replyMessage.trim()}
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
