"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Plus, Minus, HelpCircle, MessageCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const faqs = [
    {
        question: "1️⃣ พื้นฐานไม่แน่นเลย จะเรียนทันเพื่อนไหม?",
        answer: "✅ ทันแน่นอน! เพราะเราเริ่มให้ใหม่ตั้งแต่ 'ศูนย์' ไม่ต้องกลัวว่าจะตามใครไม่ทัน ในคอร์สนี้ ครูจะรื้อฟื้นพื้นฐานที่จำเป็นให้ใหม่หมด ปูให้แน่นปึ้กก่อนขึ้นเนื้อหายาก ใครที่เคยหลับในห้อง หรือเรียนไม่รู้เรื่องมาก่อน มาเริ่มนับหนึ่งใหม่ที่นี่ รับรองเครื่องติดไว แซงเพื่อนทันแน่นอน!"
    },
    {
        question: "2️⃣ คอร์สนี้ต่างจากที่อื่น หรือเรียนฟรีในยูทูปยังไง?",
        answer: "✅ ต่างที่ 'ความเข้าใจ' ไม่ใช่แค่ 'การจำ' ที่อื่นอาจสอนให้จำสูตรแล้วไปสอบ แต่ที่นี่ ครูสอนให้ \"เห็นภาพ\" ว่าทำไมต้องใช้สูตรนี้ มีเทคนิคเฉพาะตัวที่ สั้น กระชับ ตรงจุด ช่วยให้มองโจทย์ออกทันทีโดยไม่ต้องเสียเวลางม ประหยัดเวลาอ่านหนังสือไปได้มหาศาล!"
    },
    {
        question: "3️⃣ ถ้าเรียนแล้วงง มีคำถาม จะไปถามใคร?",
        answer: "✅ ถามครูได้โดยตรง! ไม่ต้องเก็บความงงไว้ข้ามคืน หมดยุคเรียนกับวิดีโอแล้วถูกทิ้ง เรามีช่องทางพิเศษ (LINE/Facebook Group) สำหรับนักเรียนโดยเฉพาะ ติดตรงไหน แคปจอส่งมา ครูและทีมงานพร้อมอธิบายจนกว่าจะร้อง \"อ๋อ!\" ไม่ปล่อยผ่านแน่นอน"
    },
    {
        question: "4️⃣ เรียนออนไลน์ น้องจะเบื่อไหม? จะมีสมาธิเหรอ?",
        answer: "✅ ลืมภาพการนั่งเรียนน่าเบื่อไปได้เลย! ไม่ใช่การอัดวิดีโอสอนยาวๆ ชวนง่วง 2 ชั่วโมง บทเรียนถูกย่อยมาเป็น คลิปสั้นๆ (Bite-sized) จบเป็นเรื่องๆ เหมือนดูซีรีส์ที่สนุกและได้ความรู้ กระตุ้นความสนใจตลอดเวลา รับรองว่า \"เรียนเพลินจนลืมเวลา\""
    },
    {
        question: "5️⃣ ราคาแพงไปไหม? จะคุ้มค่าหรือเปล่า?",
        answer: "✅ คุ้มยิ่งกว่าคุ้ม! เพราะนี่คือการลงทุน 'ครั้งเดียว' ลองเทียบกับการจ้างครูมาสอนตัวต่อตัว (ชั่วโมงละ 300-500 บาท) เรียนแป๊บเดียวเงินหมด แต่คอร์สนี้ ราคาหารออกมาตกวันละไม่กี่บาท แต่ดูทวนซ้ำได้ตลอด 5 ปี! แถมได้เทคนิคที่ติดตัวไปจนสอบเข้ามหาวิทยาลัย ถูกกว่ากาแฟแก้วโปรด แต่เปลี่ยนอนาคตได้จริง!"
    },
    {
        question: "6️⃣ ต้องใช้อุปกรณ์อะไรบ้าง ยุ่งยากไหม?",
        answer: "✅ ง่ายมาก! มีแค่มือถือเครื่องเดียวก็เรียนได้ จะเรียนผ่าน มือถือ, แท็บเล็ต, ไอแพด หรือคอมพิวเตอร์ ก็ได้หมด ระบบรองรับทุกอุปกรณ์ ขอแค่มีอินเทอร์เน็ต จะนั่งเรียนที่บ้าน หรือระหว่างรอผู้ปกครอง ก็หยิบขึ้นมาเก่งได้ทุกที่ ทุกเวลา"
    },
    {
        question: "7️⃣ จะมั่นใจได้ยังไง ว่าเกรดน้องจะดีขึ้นจริง?",
        answer: "✅ พิสูจน์แล้วจากรุ่นพี่นับพันคน! ถ้าน้อง \"ดูคลิปครบ + ทำแบบฝึกหัดตาม\" ครูการันตีว่าคะแนนพุ่งแน่นอน เรามีรีวิวจากเด็กที่เคยสอบตก จนกลายเป็นท็อปห้องเพียบ! ขอแค่เปิดใจและลงมือทำตามที่ครูบอก ผลลัพธ์เปลี่ยน 100%"
    },
    {
        question: "8️⃣ สมัครแล้ว จะได้เรียนทันทีเลยไหม?",
        answer: "✅ แจ้งโอนเสร็จ ครูจะรีบตรวจสลิปแล้วเปิดสิทธิ์ให้เร็วที่สุดเลยครับ! เช็กสถานะได้ที่หน้า “คอร์สเรียนของฉัน” พอครูเปิดสิทธิ์ให้แล้ว เริ่มเรียนได้ทันที 🚀"
    },
    {
        question: "9️⃣ คอร์สนี้เหมาะกับใครบ้าง?",
        answer: "✅ เหมาะกับทุกคนที่ 'ไม่อยากแพ้' ในสนามสอบ ไม่ว่าจะเป็นน้องที่พื้นฐานอ่อน อยากปูใหม่ให้แน่น, น้องที่พอได้แล้ว แต่อยากได้เทคนิคทำโจทย์ไว หรือน้องที่เตรียมสอบเก็บคะแนน สอบกลางภาค-ปลายภาค หรือสอบเข้า ไม่ว่าต้นทุนมาเท่าไหร่ จบคอร์สนี้ \"เก่งขึ้น\" ทุกคน!"
    }
];

export default function FAQPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 flex flex-col transition-colors">
            <Navbar />

            <main className="flex-grow pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto">

                    {/* Back Button */}
                    <div className="mb-6">
                        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            กลับหน้าแรก
                        </Link>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-16 space-y-4">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold tracking-wider uppercase">
                            FAQ & Support
                        </span>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                            🔥 ถามตรง-ตอบเคลียร์! <br className="hidden md:block" />เรื่องที่ใจอยากรู้ ก่อนตัดสินใจลุย 🔥
                        </h1>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mt-4">
                            มีความกังวลเหล่านี้อยู่ใช่ไหม? อ่านให้จบ แล้วจะพบว่า <span className="text-indigo-600 font-bold">"ทางออก"</span> ของเกรด 4 อยู่ใกล้แค่นี้!
                        </p>
                    </div>

                    {/* FAQ Grid */}
                    <div className="grid gap-4">
                        {faqs.map((faq, index) => {
                            const isOpen = openIndex === index;
                            const colors = [
                                "bg-rose-50 border-rose-100",
                                "bg-orange-50 border-orange-100",
                                "bg-amber-50 border-amber-100",
                                "bg-yellow-50 border-yellow-100",
                                "bg-lime-50 border-lime-100",
                                "bg-green-50 border-green-100",
                                "bg-emerald-50 border-emerald-100",
                                "bg-teal-50 border-teal-100",
                                "bg-cyan-50 border-cyan-100"
                            ];
                            const colorClass = colors[index % colors.length];

                            return (
                                <div
                                    key={index}
                                    className={`rounded-2xl border transition-all duration-300 overflow-hidden ${colorClass}
                                        ${isOpen
                                            ? 'shadow-lg scale-[1.02]'
                                            : 'shadow-sm hover:shadow-md'
                                        }
                                    `}
                                >
                                    <button
                                        onClick={() => setOpenIndex(isOpen ? null : index)}
                                        className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                                                ${isOpen ? 'bg-white/50 text-indigo-600' : 'bg-white/30 text-slate-500'}
                                            `}>
                                                <HelpCircle size={20} className={isOpen ? 'animate-pulse' : ''} />
                                            </div>
                                            <span className={`font-bold text-lg ${isOpen ? 'text-slate-900' : 'text-slate-700'}`}>
                                                {faq.question}
                                            </span>
                                        </div>
                                        <div className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                            {isOpen ? <Minus size={20} className="text-indigo-600" /> : <Plus size={20} className="text-slate-400" />}
                                        </div>
                                    </button>

                                    <div
                                        className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                                    >
                                        <div className="overflow-hidden">
                                            <div className="px-6 pb-6 pt-0 pl-[4.5rem]">
                                                <p className="text-slate-700 leading-relaxed text-lg border-t border-black/5 pt-4">
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Call to Action */}
                    <div className="mt-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-10 md:p-16 text-center text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
                        {/* Decorative Circles */}
                        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

                        <div className="relative z-10 space-y-6">
                            <h2 className="text-3xl md:text-4xl font-black">พร้อมเก่งคณิตศาสตร์หรือยัง?</h2>
                            <p className="text-indigo-100 text-lg max-w-xl mx-auto">
                                อย่าปล่อยให้ความไม่เข้าใจสะสมจนแก้ไม่ทัน เริ่มต้นปูพื้นฐานใหม่วันนี้ เพื่ออนาคตที่ดีกว่า
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                                <Link href="/#courses" className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-50 transition transform hover:-translate-y-1 flex items-center justify-center gap-2">
                                    <CheckCircle2 size={20} />
                                    สมัครเรียนเลย
                                </Link>
                                <a href="https://line.me/ti/p/~@kruheem" target="_blank" rel="noreferrer" className="px-8 py-4 bg-indigo-500/30 border border-white/30 text-white rounded-xl font-bold text-lg backdrop-blur-sm hover:bg-indigo-500/50 transition transform hover:-translate-y-1 flex items-center justify-center gap-2">
                                    <MessageCircle size={20} />
                                    ทักแชทสอบถาม
                                </a>
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}
