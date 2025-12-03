"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, where } from "firebase/firestore";
import Image from "next/image";

export default function AdminChatPage() {
    const [chats, setChats] = useState<any[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [replyMessage, setReplyMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 🔊 Sound Effect
    const playNotificationSound = () => {
        try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"); // เสียงเตือนแบบนุ่มนวล
            audio.play().catch(e => console.log("Audio play failed", e));
        } catch (error) {
            console.error("Error playing sound", error);
        }
    };

    // 1. Fetch All Chats (Real-time)
    useEffect(() => {
        // Remove orderBy to avoid index issues for now
        const q = query(collection(db, "chats"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort client-side
            chatList.sort((a: any, b: any) => {
                const timeA = a.lastUpdated?.toMillis() || 0;
                const timeB = b.lastUpdated?.toMillis() || 0;
                return timeB - timeA;
            });

            setChats(chatList);

            // Check for unread messages to play sound (logic can be improved)
            const hasUnread = chatList.some((c: any) => c.isRead === false);
            // In a real app, we'd track previous state to only play on NEW unread
        });
        return () => unsubscribe();
    }, []);

    // 2. Fetch Messages for Selected Chat
    useEffect(() => {
        if (!selectedChatId) return;

        // Mark as read
        const chatRef = doc(db, "chats", selectedChatId);
        updateDoc(chatRef, { isRead: true });

        const q = query(collection(db, "chats", selectedChatId, "messages"), orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);

            // Play sound if last message is from user and very recent
            const lastMsg: any = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.sender === 'user' && Date.now() - (lastMsg.createdAt?.toMillis() || 0) < 5000) {
                playNotificationSound();
            }
        });

        return () => unsubscribe();
    }, [selectedChatId]);

    // 3. Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedChatId) return;

        const text = replyMessage;
        setReplyMessage("");

        try {
            await addDoc(collection(db, "chats", selectedChatId, "messages"), {
                text: text,
                sender: 'admin',
                createdAt: serverTimestamp()
            });

            const chatRef = doc(db, "chats", selectedChatId);
            await updateDoc(chatRef, {
                lastMessage: text,
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending reply:", error);
        }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
            {/* Left Sidebar: Chat List */}
            <div className="w-1/3 border-r border-slate-100 bg-slate-50 flex flex-col">
                <div className="p-6 border-b border-slate-200 bg-white">
                    <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                        💬 แชทลูกค้า
                        <span className="bg-rose-100 text-rose-600 text-xs px-2 py-1 rounded-full">{chats.filter((c: any) => c.isRead === false).length} ใหม่</span>
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {chats.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">ยังไม่มีการสนทนา</div>
                    ) : (
                        chats.map((chat: any) => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChatId(chat.id)}
                                className={`p-4 border-b border-slate-100 cursor-pointer transition hover:bg-white
                                    ${selectedChatId === chat.id ? 'bg-white border-l-4 border-l-indigo-500 shadow-sm' : ''}
                                    ${chat.isRead === false ? 'bg-rose-50' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`font-bold text-sm ${chat.isRead === false ? 'text-rose-600' : 'text-slate-700'}`}>
                                        {chat.userName || "Guest"}
                                    </h4>
                                    <span className="text-[10px] text-slate-400">
                                        {chat.lastUpdated?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Area: Chat Window */}
            <div className="flex-1 flex flex-col bg-slate-100/50">
                {selectedChatId ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                    {chats.find((c: any) => c.id === selectedChatId)?.userName?.charAt(0) || "G"}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        {chats.find((c: any) => c.id === selectedChatId)?.userName || "Guest"}
                                        {chats.find((c: any) => c.id === selectedChatId)?.userType === 'member' && (
                                            <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full">Member</span>
                                        )}
                                    </h3>
                                    <div className="text-xs text-slate-500 mt-1">
                                        <p>📚 คอร์ส: {chats.find((c: any) => c.id === selectedChatId)?.enrolledCourses || "-"}</p>
                                        <div className="flex gap-3 mt-0.5 text-slate-400">
                                            <span>📞 {chats.find((c: any) => c.id === selectedChatId)?.userTel || "-"}</span>
                                            <span>LINE: {chats.find((c: any) => c.id === selectedChatId)?.lineId || "-"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg: any) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`py-3 px-5 rounded-2xl max-w-[70%] shadow-sm text-sm
                                        ${msg.sender === 'admin'
                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-200'
                                        }`}>
                                        {msg.text}
                                        <div className={`text-[10px] mt-1 text-right ${msg.sender === 'admin' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex gap-3">
                            <input
                                type="text"
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                placeholder="พิมพ์ข้อความตอบกลับ..."
                                className="flex-1 bg-slate-100 border-0 rounded-xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            />
                            <button
                                type="submit"
                                disabled={!replyMessage.trim()}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition"
                            >
                                ส่ง
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 mb-4 opacity-20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                        <p>เลือกแชททางซ้ายเพื่อเริ่มสนทนา</p>
                    </div>
                )}
            </div>
        </div>
    );
}
