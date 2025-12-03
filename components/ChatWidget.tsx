"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, updateDoc, getDoc, where, getDocs } from "firebase/firestore";
import { useUserAuth } from "@/context/AuthContext";

import { usePathname } from "next/navigation";

export default function ChatWidget() {
    const { user } = useUserAuth();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [chatId, setChatId] = useState<string>("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Hide on classroom pages
    if (pathname?.startsWith("/learn/")) {
        return null;
    }

    // 🔊 Sound Effect
    const playNotificationSound = () => {
        try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3"); // เสียงแจ้งเตือนสั้นๆ
            audio.play().catch(e => console.log("Audio play failed", e));
        } catch (error) {
            console.error("Error playing sound", error);
        }
    };

    // 1. Determine Chat ID (User ID or Guest ID)
    useEffect(() => {
        if (user) {
            setChatId(user.uid);
        } else {
            // Check local storage for existing guest ID
            let guestId = localStorage.getItem("kruheem_guest_chat_id");
            if (!guestId) {
                guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                localStorage.setItem("kruheem_guest_chat_id", guestId);
            }
            setChatId(guestId);
        }
    }, [user]);

    // 2. Listen to Messages
    useEffect(() => {
        if (!chatId) return;

        // Remove orderBy to prevent Indexing issues
        const q = query(collection(db, "chats", chatId, "messages"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort client-side
            msgs.sort((a: any, b: any) => {
                const timeA = a.createdAt ? a.createdAt.toMillis() : Date.now();
                const timeB = b.createdAt ? b.createdAt.toMillis() : Date.now();
                return timeA - timeB;
            });

            setMessages(msgs);

            const lastMsg: any = msgs[msgs.length - 1];
            if (lastMsg) {
                // Sound Alert
                if (lastMsg.sender === 'admin' && Date.now() - (lastMsg.createdAt?.toMillis() || 0) < 5000) {
                    playNotificationSound();
                }

                // Unread Badge Logic
                const lastReadId = localStorage.getItem(`chat_last_read_${chatId}`);
                if (!isOpen && lastMsg.sender === 'admin' && lastMsg.id !== lastReadId) {
                    setUnreadCount(1);
                }
            }
        }, (error) => {
            console.error("Error fetching messages:", error);
            // alert("Connection Error: " + error.message);
        });

        return () => unsubscribe();
    }, [chatId, isOpen]);

    // 3. Auto-scroll and Mark Read
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

        if (isOpen && messages.length > 0) {
            setUnreadCount(0);
            const lastMsg = messages[messages.length - 1];
            localStorage.setItem(`chat_last_read_${chatId}`, lastMsg.id);
        }
    }, [messages, isOpen, chatId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !chatId) return;

        const text = newMessage;
        setNewMessage(""); // Clear input immediately

        try {
            // 1. Add message to subcollection
            await addDoc(collection(db, "chats", chatId, "messages"), {
                text: text,
                sender: 'user',
                createdAt: serverTimestamp()
            });

            // 2. Update main chat document (for Admin list)
            const chatRef = doc(db, "chats", chatId);

            // Get enrolled courses if user is logged in
            let enrolledCourses = "Guest";
            let userTel = "";
            let lineId = "";

            if (user) {
                try {
                    const q = query(
                        collection(db, "enrollments"),
                        where("userId", "==", user.uid),
                        where("status", "==", "approved")
                    );
                    const snapshot = await getDocs(q);
                    const courses = snapshot.docs.map(doc => doc.data().courseTitle);
                    enrolledCourses = courses.length > 0 ? courses.join(", ") : "ยังไม่มีคอร์ส";

                    // Try to get contact info from latest enrollment
                    if (snapshot.docs.length > 0) {
                        const lastEnrollment = snapshot.docs[0].data();
                        userTel = lastEnrollment.userTel || "";
                        lineId = lastEnrollment.lineId || "";
                    }
                } catch (err) {
                    console.error("Error fetching enrollments:", err);
                    enrolledCourses = "Error fetching courses";
                }
            }

            await setDoc(chatRef, {
                lastMessage: text,
                lastUpdated: serverTimestamp(),
                userId: chatId,
                userName: user?.displayName || "Guest (ผู้เยี่ยมชม)",
                userImage: user?.photoURL || "",
                isRead: false, // Mark as unread for admin
                userType: user ? 'member' : 'guest',
                enrolledCourses: enrolledCourses,
                userTel: userTel,
                lineId: lineId
            }, { merge: true });

        } catch (error) {
            console.error("Error sending message:", error);
            alert("ส่งข้อความไม่สำเร็จ! กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ");
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 group flex items-center gap-3 p-2 pr-6 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]
                ${isOpen ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'} border border-slate-100`}
            >
                {isOpen ? (
                    <>
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <span className="font-bold text-sm">ปิดแชท</span>
                    </>
                ) : (
                    <>
                        <div className="relative">
                            <div className="w-12 h-12 -ml-4 -my-4 flex items-center justify-center">
                                <img
                                    src="/assets/kruheem_avatar.png"
                                    alt="Admin"
                                    className="w-24 h-24 max-w-none object-cover drop-shadow-xl transform -translate-y-3 -translate-x-1 hover:scale-110 transition-transform duration-300"
                                />
                            </div>
                            {/* Online status */}
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full animate-pulse z-10"></span>
                        </div>

                        <div className="flex flex-col items-start">
                            <span className="text-[10px] text-slate-400 leading-tight">สนใจคอร์สเรียน?</span>
                            <span className="text-sm font-black leading-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                สอบถามครูฮีม
                            </span>
                        </div>

                        {/* Red Dot for unread */}
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white"></span>
                            </span>
                        )}
                    </>
                )}
            </button>

            {/* Chat Window */}
            <div className={`fixed bottom-24 right-6 w-[90vw] md:w-[380px] h-[500px] bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right
                ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}
            `}>
                {/* Header */}
                <div className="bg-indigo-600 p-4 flex items-center gap-3 text-white shadow-md">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/30">
                        <img src="/assets/kruheem_avatar.png" alt="Admin" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">สอบถามครูฮีม</h3>
                        <p className="text-xs text-indigo-100 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            Online ตอบไวมาก
                        </p>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                    {/* Welcome Message */}
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 text-slate-600 py-3 px-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] text-sm">
                            สวัสดีครับ 👋 สนใจคอร์สไหน หรือมีคำถามอะไร สอบถามครูฮีมได้เลยนะครับ
                        </div>
                    </div>

                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`py-2 px-4 rounded-2xl shadow-sm max-w-[85%] text-sm break-words
                                ${msg.sender === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="พิมพ์ข้อความ..."
                        className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </form>
            </div>
        </>
    );
}
