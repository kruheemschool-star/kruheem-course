"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, limit } from "firebase/firestore";
import { useUserAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminChatInbox() {
    const { isAdmin } = useUserAuth();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [chats, setChats] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Hide on specific pages
    const isHidden = pathname?.startsWith("/admin/chat") || pathname?.startsWith("/learn/") || pathname === "/login" || pathname === "/register";

    // Sound notification
    const playNotificationSound = () => {
        try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            audio.play().catch(e => console.log("Audio play failed", e));
        } catch (error) {
            console.error("Error playing sound", error);
        }
    };

    // Listen to all chats
    // Track previous unread count for sound effect
    const prevUnreadCountRef = useRef(0);

    // Listen to all chats
    useEffect(() => {
        if (!isAdmin || isHidden) return;

        const q = query(collection(db, "chats"), orderBy("lastUpdated", "desc"), limit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Count unread
            const unread = chatData.filter((c: any) => c.isRead === false).length;

            // Play sound if new unread message (compare with ref)
            if (unread > prevUnreadCountRef.current && prevUnreadCountRef.current >= 0) {
                playNotificationSound();
            }
            prevUnreadCountRef.current = unread;

            setUnreadCount(unread);
            setChats(chatData);
        });

        return () => unsubscribe();
    }, [isAdmin, isHidden]);

    // Listen to selected chat messages
    useEffect(() => {
        if (!selectedChat) {
            setMessages([]);
            return;
        }

        const q = query(collection(db, "chats", selectedChat.id, "messages"), orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);

            // Mark as read
            updateDoc(doc(db, "chats", selectedChat.id), {
                isRead: true,
                lastAdminReadAt: serverTimestamp()
            }).catch(err => console.log("Error marking read:", err));
        });

        return () => unsubscribe();
    }, [selectedChat]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Send message
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        const text = newMessage;
        setNewMessage("");

        try {
            await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
                text: text,
                sender: 'admin',
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, "chats", selectedChat.id), {
                lastMessage: text,
                lastUpdated: serverTimestamp(),
                isRead: true
            });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    // Format time
    const formatTime = (timestamp: any) => {
        if (!timestamp?.toDate) return "";
        const date = timestamp.toDate();
        return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    };

    if (!isAdmin || isHidden) return null;

    return (
        <>
            {/* Floating Button - Glassmorphism */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-10 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 border
                ${isOpen
                        ? 'bg-slate-900/80 backdrop-blur-xl text-white border-white/20'
                        : 'bg-white/70 backdrop-blur-xl text-indigo-600 border-white/50 hover:bg-white/90'
                    } `}
            >
                {isOpen ? (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="font-bold text-sm">ปิด Inbox</span>
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
                        </svg>
                        <span className="font-bold text-sm">Inbox</span>
                        {unreadCount > 0 && (
                            <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                                {unreadCount}
                            </span>
                        )}
                    </>
                )}
            </button>

            {/* Popup Window */}
            <div className={`fixed bottom-24 right-6 w-[90vw] md:w-[400px] h-[550px] bg-white rounded-2xl shadow-2xl z-50 border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right
                ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}
            `}>
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex items-center justify-between text-white">
                    {selectedChat ? (
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedChat(null)} className="p-1 hover:bg-white/20 rounded-lg transition">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                            <div>
                                <h3 className="font-bold">{selectedChat.userName || "Guest"}</h3>
                                <p className="text-xs text-indigo-100">{selectedChat.enrolledCourses || "ผู้เยี่ยมชม"}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
                            </svg>
                            <h3 className="font-bold text-lg">กล่องข้อความ</h3>
                        </div>
                    )}
                    <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-medium">Admin</span>
                </div>

                {/* Content */}
                {selectedChat ? (
                    // Chat Messages View
                    <>
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`py-2 px-4 rounded-2xl shadow-sm max-w-[80%] text-sm break-words
                                        ${msg.sender === 'admin'
                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                            : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                                        }`}>
                                        {msg.text}
                                        <div className={`text-[10px] mt-1 ${msg.sender === 'admin' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            {formatTime(msg.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Input */}
                        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="พิมพ์ข้อความตอบกลับ..."
                                className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                </svg>
                            </button>
                        </form>
                    </>
                ) : (
                    // Chat List View
                    <>
                        <div className="flex-1 overflow-y-auto">
                            {chats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                                    </svg>
                                    <p className="text-sm">ยังไม่มีข้อความ</p>
                                </div>
                            ) : (
                                chats.map((chat) => (
                                    <button
                                        key={chat.id}
                                        onClick={() => setSelectedChat(chat)}
                                        className={`w-full p-4 flex items-start gap-3 hover:bg-slate-50 transition border-b border-slate-100 text-left
                                            ${!chat.isRead ? 'bg-indigo-50/50' : ''}`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold
                                                ${chat.userType === 'member' ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                                                {chat.userImage ? (
                                                    <img src={chat.userImage} alt="" className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    chat.userName?.[0]?.toUpperCase() || "G"
                                                )}
                                            </div>
                                            {!chat.isRead && (
                                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white"></span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className={`font-semibold text-slate-800 truncate ${!chat.isRead ? 'text-indigo-700' : ''}`}>
                                                    {chat.userName || "Guest"}
                                                </h4>
                                                <span className="text-xs text-slate-400 flex-shrink-0">
                                                    {formatTime(chat.lastUpdated)}
                                                </span>
                                            </div>
                                            <p className={`text-sm truncate ${!chat.isRead ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                                                {chat.lastMessage}
                                            </p>
                                            {chat.enrolledCourses && chat.enrolledCourses !== "Guest" && (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                                                    {chat.enrolledCourses?.substring(0, 30)}{chat.enrolledCourses?.length > 30 ? "..." : ""}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Footer Link */}
                        <Link
                            href="/admin/chat"
                            className="p-3 bg-slate-50 border-t border-slate-200 text-center text-sm text-indigo-600 font-medium hover:bg-slate-100 transition flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                            เปิดหน้าจัดการแชทเต็ม
                        </Link>
                    </>
                )}
            </div>
        </>
    );
}
