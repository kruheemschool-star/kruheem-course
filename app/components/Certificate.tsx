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
                    className="relative bg-white aspect-[1.414/1] w-full max-w-5xl mx-auto rounded-xl overflow-hidden shadow-2xl flex flex-col items-center text-center p-12 text-slate-800"
                    style={{
                        backgroundImage: "radial-gradient(circle at 50% 50%, #ffffff 0%, #f8fafc 100%)",
                    }}
                >
                    {/* Formal Border */}
                    <div className="absolute inset-4 border-[3px] border-double border-amber-500/50 rounded-lg pointer-events-none"></div>
                    <div className="absolute inset-6 border border-slate-200 rounded pointer-events-none"></div>

                    {/* Corner Ornaments (CSS Shapes) */}
                    <div className="absolute top-4 left-4 w-16 h-16 border-t-[3px] border-l-[3px] border-amber-500 rounded-tl-lg"></div>
                    <div className="absolute top-4 right-4 w-16 h-16 border-t-[3px] border-r-[3px] border-amber-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-4 left-4 w-16 h-16 border-b-[3px] border-l-[3px] border-amber-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-4 right-4 w-16 h-16 border-b-[3px] border-r-[3px] border-amber-500 rounded-br-lg"></div>

                    {/* Content */}
                    <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-8 px-16">

                        {/* Logo / Header */}
                        <div className="flex flex-col items-center gap-4">
                            {/* Simple Icon Logo */}
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-3xl shadow-md">
                                🎓
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-sm tracking-[0.3em] font-bold text-slate-500 uppercase">
                                    KruHeem Math School
                                </h1>
                                <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-800 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600">
                                    CERTIFICATE
                                </h2>
                                <p className="text-amber-500 font-bold tracking-[0.2em] text-xs uppercase">
                                    OF COMPLETION
                                </p>
                            </div>
                        </div>

                        {/* Main Body */}
                        <div className="w-full flex-1 flex flex-col justify-center gap-6 my-4">
                            <p className="text-slate-500 italic font-serif text-lg">
                                ขอมอบประกาศนียบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า
                                <br />
                                <span className="text-xs not-italic text-slate-400 font-sans tracking-wide">(This certificate is presented to)</span>
                            </p>

                            <div className="relative py-2">
                                <h3 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 drop-shadow-sm px-8 py-2 border-b-2 border-slate-100 inline-block min-w-[50%]">
                                    {studentName}
                                </h3>
                            </div>

                            <p className="text-slate-500 italic font-serif text-lg">
                                ได้ผ่านการเรียนและทดสอบในหลักสูตร
                                <br />
                                <span className="text-xs not-italic text-slate-400 font-sans tracking-wide">(Has successfully completed the course)</span>
                            </p>

                            <h4 className="text-2xl md:text-3xl font-bold text-amber-600">
                                {courseTitle}
                            </h4>
                        </div>

                        {/* Footer: Date & Signature */}
                        <div className="w-full flex justify-between items-end mt-8 px-10">
                            <div className="text-center">
                                <div className="border-b border-slate-300 w-40 mb-2 pb-1">
                                    <p className="text-slate-800 font-medium">
                                        {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Date</p>
                            </div>

                            {/* Seal */}
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-4 border-amber-500/30 flex items-center justify-center opacity-80">
                                    <div className="w-20 h-20 rounded-full border border-amber-500/50 flex items-center justify-center">
                                        <span className="text-amber-500/50 font-black text-xs text-center leading-tight">OFFICIAL<br />SEAL</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="border-b border-slate-300 w-40 mb-2 py-1">
                                    {/* Mock Signature */}
                                    <p className="font-script text-2xl text-slate-800 transform -rotate-2">
                                        KruHeem
                                    </p>
                                </div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">KruHeem Academy</p>
                            </div>
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
