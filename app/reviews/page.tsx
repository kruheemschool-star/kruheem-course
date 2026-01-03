"use client";


import ReviewList from "./ReviewList";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ReviewsPage() {
    return (
        <div className="min-h-screen bg-[#F0F7F4] font-sans">
            <Navbar />

            <main className="pt-24 pb-24 px-4 sm:px-6 relative overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-teal-50 to-transparent pointer-events-none"></div>
                <div className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] bg-teal-200/20 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
                <div className="absolute bottom-[0] left-[-200px] w-[800px] h-[800px] bg-blue-200/20 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto relative z-10">

                    {/* Header Section */}
                    <div className="text-center mb-16 space-y-4">

                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">
                            ความประทับใจจาก <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-600">นักเรียนของเรา</span>
                        </h1>
                        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                            เสียงยืนยันจากผู้เรียนจริง ช่วยให้คุณตัดสินใจได้ง่ายขึ้น และเราอยากฟังเสียงของคุณเช่นกัน
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                        {/* Review List */}
                        <div className="lg:col-span-8 lg:col-start-3 space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                    <span>💬</span> รีวิวล่าสุด
                                </h3>
                            </div>

                            <ReviewList />
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div >
    );
}
