"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, increment, collection, query, where } from "firebase/firestore";
import { MessageCircle, X, CheckCircle2, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PollWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [pollData, setPollData] = useState<any>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    // Fetch Active Poll
    useEffect(() => {
        const q = query(collection(db, "polls"), where("isActive", "==", true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                // Get the most recently created active poll if there are multiple (though admin should prevent this)
                const polls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
                polls.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
                const activePoll = polls[0];

                setPollData(activePoll);

                // Check if user has voted (using LocalStorage for simplicity)
                const votedKey = `voted_poll_${activePoll.id}`;
                if (localStorage.getItem(votedKey)) {
                    setHasVoted(true);
                } else {
                    // Auto open if not voted and not closed in session
                    const closedKey = `closed_poll_${activePoll.id}`;
                    if (!sessionStorage.getItem(closedKey)) {
                        setTimeout(() => setIsOpen(true), 1500); // Delay slightly for effect
                    }
                }
            } else {
                setPollData(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleVote = async (option: string) => {
        if (hasVoted || !pollData) return;
        setSelectedOption(option);

        try {
            // Optimistic UI update
            setHasVoted(true);
            localStorage.setItem(`voted_poll_${pollData.id}`, "true");

            // Update Firestore
            const pollRef = doc(db, "polls", pollData.id);
            await updateDoc(pollRef, {
                [`votes.${option}`]: increment(1)
            });
        } catch (error) {
            console.error("Vote failed:", error);
            // Revert if needed, but simple alert is enough for now
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        if (pollData) {
            sessionStorage.setItem(`closed_poll_${pollData.id}`, "true");
        }
    };

    if (loading || !pollData) return null;

    // Calculate stats
    const totalVotes = Object.values(pollData.votes || {}).reduce((a: any, b: any) => a + b, 0) as number;

    return (
        <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-4 font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 p-6 w-80 md:w-96 relative overflow-hidden"
                    >
                        {/* Decorative Background */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl"></div>

                        {/* Header */}
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="flex items-center gap-2">
                                <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                                    <BarChart3 size={18} />
                                </span>
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">แบบสอบถาม</span>
                            </div>
                            <button
                                onClick={handleClose}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Question */}
                        <h3 className="font-bold text-slate-800 text-lg leading-tight mb-6 relative z-10">
                            {hasVoted ? "🎉 ขอบคุณสำหรับคำตอบครับ!" : pollData.question}
                        </h3>

                        {/* Options / Results */}
                        <div className="space-y-3 relative z-10">
                            {!hasVoted ? (
                                pollData.options?.map((opt: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleVote(opt)}
                                        className="w-full text-left p-4 rounded-xl bg-white/50 border border-white hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all duration-200 group flex items-center justify-between"
                                    >
                                        <span className="font-medium text-slate-600 group-hover:text-indigo-700 transition-colors">{opt}</span>
                                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-indigo-500 transition-colors"></div>
                                    </button>
                                ))
                            ) : (
                                <div className="space-y-4">
                                    {pollData.options?.map((opt: string, idx: number) => {
                                        const votes = pollData.votes?.[opt] || 0;
                                        const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                                        const isSelected = selectedOption === opt;

                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className={`font-medium ${isSelected ? "text-indigo-600" : "text-slate-600"}`}>
                                                        {opt} {isSelected && "(คุณเลือก)"}
                                                    </span>
                                                    <span className="font-bold text-slate-400">{percent}%</span>
                                                </div>
                                                <div className="h-2.5 w-full bg-slate-100/50 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percent}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className={`h-full rounded-full ${isSelected ? "bg-gradient-to-r from-indigo-500 to-purple-500" : "bg-slate-300"}`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <button
                                        onClick={handleClose}
                                        className="w-full mt-4 py-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200 transition"
                                    >
                                        ปิดหน้าต่าง
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button (When closed) */}
            {!isOpen && (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-white/80 backdrop-blur-md border border-white/50 text-indigo-600 rounded-full shadow-lg shadow-indigo-500/20 flex items-center justify-center relative group"
                >
                    <MessageCircle size={28} />
                    {!hasVoted && (
                        <span className="absolute top-0 right-0 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white"></span>
                        </span>
                    )}
                </motion.button>
            )}
        </div>
    );
}
