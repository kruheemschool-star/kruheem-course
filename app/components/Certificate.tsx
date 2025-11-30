"use client";
import { useRef } from "react";
import html2canvas from "html2canvas";

interface CertificateProps {
    studentName: string;
    courseTitle: string;
    onClose: () => void;
}

export default function Certificate({ studentName, courseTitle, onClose }: CertificateProps) {
    const certificateRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (certificateRef.current) {
            const canvas = await html2canvas(certificateRef.current, {
                scale: 2, // Higher resolution
                useCORS: true,
                backgroundColor: null,
            });
            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `Certificate-${studentName}-${courseTitle}.png`;
            link.click();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 text-white hover:text-rose-400 font-bold text-xl transition"
                >
                    ✕ ปิดหน้าต่าง
                </button>

                {/* Certificate Container (To be captured) */}
                <div
                    ref={certificateRef}
                    className="relative bg-white aspect-[4/3] md:aspect-[16/9] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col items-center justify-center text-center p-8 md:p-12 border-[8px] border-white"
                    style={{
                        background: "linear-gradient(135deg, #FF00CC 0%, #333399 100%)",
                    }}
                >
                    {/* Background Patterns */}
                    <div className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 20%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.4) 0%, transparent 20%)",
                            backgroundSize: "50% 50%"
                        }}
                    />

                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-400 rounded-br-[4rem] opacity-80 z-0"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-cyan-400 rounded-tl-[4rem] opacity-80 z-0"></div>

                    {/* Content Layer */}
                    <div className="relative z-10 w-full h-full flex flex-col items-center justify-between bg-white/10 backdrop-blur-md rounded-[1.5rem] border border-white/20 p-6 md:p-10 shadow-inner">

                        {/* Header: LEVEL UP */}
                        <div className="space-y-2">
                            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] tracking-wider uppercase"
                                style={{ WebkitTextStroke: "2px #5B21B6" }}>
                                LEVEL UP!
                            </h1>
                            <p className="text-white font-bold tracking-[0.2em] text-sm md:text-base uppercase opacity-90">
                                Mission Accomplished • 100% Complete
                            </p>
                        </div>

                        {/* Progress Bar Visual */}
                        <div className="w-full max-w-lg h-6 md:h-8 bg-black/40 rounded-full border-2 border-white/30 relative overflow-hidden my-4 shadow-inner">
                            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 w-full animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.6)]"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-black text-white drop-shadow-md">
                                MAX ENERGY
                            </div>
                        </div>

                        {/* Main Text */}
                        <div className="flex-1 flex flex-col justify-center w-full space-y-4">
                            <p className="text-cyan-200 font-bold text-lg md:text-xl uppercase tracking-widest">
                                Certificate of Completion
                            </p>

                            <div className="relative py-4">
                                <h2 className="text-4xl md:text-6xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
                                    {studentName}
                                </h2>
                                <div className="h-1 w-1/2 mx-auto bg-gradient-to-r from-transparent via-yellow-400 to-transparent mt-2"></div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-slate-200 text-sm md:text-base font-medium">
                                    Has successfully mastered the skill:
                                </p>
                                <h3 className="text-2xl md:text-3xl font-extrabold text-yellow-300 drop-shadow-md">
                                    {courseTitle}
                                </h3>
                            </div>
                        </div>

                        {/* Footer / Badges */}
                        <div className="flex items-center justify-center gap-6 mt-6">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl border-2 border-white/30 shadow-lg flex items-center justify-center text-2xl md:text-3xl">
                                    🧠
                                </div>
                                <span className="text-[10px] md:text-xs font-bold text-white uppercase bg-black/20 px-2 py-0.5 rounded-full">Intelligence</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-rose-500 to-orange-600 rounded-xl border-2 border-white/30 shadow-lg flex items-center justify-center text-2xl md:text-3xl">
                                    🔥
                                </div>
                                <span className="text-[10px] md:text-xs font-bold text-white uppercase bg-black/20 px-2 py-0.5 rounded-full">Passion</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl border-2 border-white/30 shadow-lg flex items-center justify-center text-2xl md:text-3xl">
                                    ⚡
                                </div>
                                <span className="text-[10px] md:text-xs font-bold text-white uppercase bg-black/20 px-2 py-0.5 rounded-full">Skill</span>
                            </div>
                        </div>

                        {/* Signature / Date */}
                        <div className="absolute bottom-4 right-6 text-right opacity-80">
                            <p className="text-[10px] text-white font-mono">AUTHORIZED BY</p>
                            <p className="text-sm font-bold text-yellow-400 font-script">KruHeem Academy</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex justify-center gap-4">
                    <button
                        onClick={handleDownload}
                        className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xl rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition flex items-center gap-3 border-4 border-white/20"
                    >
                        <span>📸</span> บันทึกรูปภาพ (Save Image)
                    </button>
                </div>
            </div>
        </div>
    );
}
