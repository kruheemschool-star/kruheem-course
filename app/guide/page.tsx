"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import {
    ArrowLeft, UserPlus, BookOpen, CreditCard, CheckCircle, Play,
    Star, Gift, Search, BarChart3, Award, FileText, MessageCircle,
    Moon, Mail, Eye, ChevronDown, ChevronUp,
    Monitor, Smartphone, HelpCircle, Zap, Clock, Sparkles
} from "lucide-react";

interface GuideSection {
    id: string;
    icon: React.ReactNode;
    emoji: string;
    title: string;
    subtitle: string;
    color: string;
    bgColor: string;
    borderColor: string;
    content: React.ReactNode;
}

function StepCard({ number, title, children, color }: { number: number; title: string; children: React.ReactNode; color: string }) {
    return (
        <div className="flex gap-4 items-start">
            <div className={`w-9 h-9 ${color} text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm`}>
                {number}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{title}</h4>
                <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{children}</div>
            </div>
        </div>
    );
}

function TipBox({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warning" | "success" }) {
    const styles = {
        info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
        warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
        success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
    };
    const icons = { info: "💡", warning: "⚠️", success: "✅" };

    return (
        <div className={`${styles[variant]} border rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2 mt-3`}>
            <span className="shrink-0 text-base">{icons[variant]}</span>
            <div>{children}</div>
        </div>
    );
}

export default function UserGuidePage() {
    const [openSection, setOpenSection] = useState<string | null>("register");

    const toggleSection = (id: string) => {
        setOpenSection(openSection === id ? null : id);
    };

    const sections: GuideSection[] = [
        {
            id: "register",
            icon: <UserPlus size={20} />,
            emoji: "👤",
            title: "สมัครสมาชิก & เข้าสู่ระบบ",
            subtitle: "สร้างบัญชีเพื่อเริ่มต้นใช้งาน",
            color: "text-indigo-600 dark:text-indigo-400",
            bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
            borderColor: "border-indigo-200 dark:border-indigo-800",
            content: (
                <div className="space-y-6">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">มี 2 วิธีในการสมัครสมาชิก:</p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                </div>
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Google Sign In</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">กดปุ่ม &quot;เข้าสู่ระบบด้วย Google&quot; เลือกบัญชี Gmail แล้วเข้าใช้งานได้ทันที — ไม่ต้องตั้งรหัสผ่าน</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                    <Mail size={16} className="text-slate-600 dark:text-slate-300" />
                                </div>
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">อีเมล + รหัสผ่าน</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">กดปุ่ม &quot;สมัครสมาชิก&quot; กรอกอีเมลและรหัสผ่าน (อย่างน้อย 6 ตัวอักษร) แล้วยืนยัน</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <StepCard number={1} title="เข้าหน้าเข้าสู่ระบบ" color="bg-indigo-500">
                            กดปุ่ม <strong>&quot;เข้าสู่ระบบ&quot;</strong> หรือ <strong>&quot;สมัครสมาชิก&quot;</strong> ที่แถบเมนูด้านบน
                        </StepCard>
                        <StepCard number={2} title="เลือกวิธีสมัคร" color="bg-indigo-500">
                            เลือก <strong>Google Sign In</strong> (แนะนำ — ง่ายและเร็ว) หรือกรอกอีเมล + รหัสผ่าน
                        </StepCard>
                        <StepCard number={3} title="เข้าสู่ระบบสำเร็จ" color="bg-indigo-500">
                            หลังสมัครเสร็จจะเข้าสู่ระบบอัตโนมัติ พร้อมใช้งานทุกฟีเจอร์
                        </StepCard>
                    </div>
                    <TipBox variant="info">
                        ลืมรหัสผ่าน? กด <strong>&quot;ลืมรหัสผ่าน&quot;</strong> ในหน้าล็อกอิน ระบบจะส่งลิงก์รีเซ็ตไปที่อีเมลของคุณ
                    </TipBox>
                </div>
            ),
        },
        {
            id: "courses",
            icon: <BookOpen size={20} />,
            emoji: "📚",
            title: "เลือกคอร์สเรียน",
            subtitle: "ดูรายละเอียดคอร์สและเลือกสมัคร",
            color: "text-amber-600 dark:text-amber-400",
            bgColor: "bg-amber-50 dark:bg-amber-900/20",
            borderColor: "border-amber-200 dark:border-amber-800",
            content: (
                <div className="space-y-4">
                    <StepCard number={1} title="เลือกดูคอร์สที่หน้าแรก" color="bg-amber-500">
                        เลื่อนลงไปที่ส่วน <strong>&quot;คอร์สเรียนทั้งหมด&quot;</strong> ในหน้าแรก จะเห็นคอร์สแบ่งตามระดับชั้น
                    </StepCard>
                    <StepCard number={2} title="กดดูรายละเอียดคอร์ส" color="bg-amber-500">
                        กดที่การ์ดคอร์สเพื่อดูเนื้อหาที่เรียน, หลักสูตร, ราคา, รีวิวจากผู้เรียน และ FAQ
                    </StepCard>
                    <StepCard number={3} title="สมัครเรียน" color="bg-amber-500">
                        กดปุ่ม <strong>&quot;สมัครเรียน&quot;</strong> ในหน้าคอร์ส หรือไปที่หน้า <strong>&quot;แจ้งโอน&quot;</strong> เพื่อเลือกหลายคอร์สพร้อมกัน
                    </StepCard>
                    <TipBox variant="success">
                        บางคอร์สมีโปรโมชั่นราคาพิเศษ! ติดตามข่าวสารได้ที่หน้าแรกและเพจ Facebook ของเรา
                    </TipBox>
                </div>
            ),
        },
        {
            id: "payment",
            icon: <CreditCard size={20} />,
            emoji: "💳",
            title: "ชำระเงิน & แจ้งโอน",
            subtitle: "ขั้นตอนการจ่ายเงินและแนบสลิป",
            color: "text-emerald-600 dark:text-emerald-400",
            bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
            borderColor: "border-emerald-200 dark:border-emerald-800",
            content: (
                <div className="space-y-4">
                    <StepCard number={1} title="ไปที่หน้าแจ้งโอน" color="bg-emerald-500">
                        กดเมนู <strong>&quot;แจ้งโอน&quot;</strong> ที่แถบเมนูด้านบน หรือกดปุ่มสมัครเรียนในหน้าคอร์ส
                    </StepCard>
                    <StepCard number={2} title="เลือกคอร์สที่ต้องการ" color="bg-emerald-500">
                        เลือกคอร์สที่ต้องการสมัคร (เลือกได้หลายคอร์สพร้อมกัน) ระบบจะคำนวณราคารวมให้
                    </StepCard>
                    <StepCard number={3} title="ใส่โค้ดส่วนลด (ถ้ามี)" color="bg-emerald-500">
                        มีโค้ดคูปอง? กรอกในช่อง <strong>&quot;กรอกโค้ดส่วนลด&quot;</strong> แล้วกด <strong>&quot;ใช้โค้ด&quot;</strong> เพื่อรับส่วนลด
                    </StepCard>
                    <StepCard number={4} title="กรอกข้อมูลผู้สมัคร" color="bg-emerald-500">
                        กรอกชื่อ-นามสกุล, เบอร์โทร และ LINE ID
                    </StepCard>
                    <StepCard number={5} title="โอนเงินและแนบสลิป" color="bg-emerald-500">
                        สแกน QR Code เพื่อโอนเงิน จากนั้นแนบสลิปการโอน (รองรับ JPG, PNG สูงสุด 10MB)
                    </StepCard>
                    <StepCard number={6} title="ส่งข้อมูลและรออนุมัติ" color="bg-emerald-500">
                        กดปุ่ม <strong>&quot;ส่งข้อมูลการแจ้งโอน&quot;</strong> แล้วรอแอดมินตรวจสอบ (ปกติภายใน 24 ชม.)
                    </StepCard>
                    <TipBox variant="warning">
                        กรุณาตรวจสอบยอดเงินให้ถูกต้องก่อนโอน หากโอนผิดจำนวนอาจทำให้การอนุมัติล่าช้า
                    </TipBox>
                </div>
            ),
        },
        {
            id: "my-courses",
            icon: <Monitor size={20} />,
            emoji: "🎓",
            title: "คอร์สเรียนของฉัน",
            subtitle: "จัดการคอร์ส ดูความก้าวหน้า เข้าเรียน",
            color: "text-teal-600 dark:text-teal-400",
            bgColor: "bg-teal-50 dark:bg-teal-900/20",
            borderColor: "border-teal-200 dark:border-teal-800",
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                        หน้า <strong>&quot;คอร์สของฉัน&quot;</strong> คือศูนย์กลางการเรียนรู้ของคุณ ประกอบด้วย:
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                        {[
                            { icon: "📊", title: "โปรไฟล์นักเรียน", desc: "แสดงชื่อ รูปประจำตัว และลิงก์แก้ไขข้อมูล" },
                            { icon: "🎫", title: "คูปองของฉัน", desc: "ดูโค้ดส่วนลดทั้งหมด (ใช้แล้ว + ยังไม่ใช้)" },
                            { icon: "▶️", title: "เรียนต่อจากที่ค้าง", desc: "กดเพื่อกลับไปเรียนบทเรียนล่าสุด" },
                            { icon: "📈", title: "ความก้าวหน้า", desc: "แสดง % ที่เรียนไปแล้วของแต่ละคอร์ส" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
                                <span className="text-xl">{item.icon}</span>
                                <div>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{item.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <TipBox variant="info">
                        คอร์สจะแสดงสถานะ: <strong>&quot;รออนุมัติ&quot;</strong> (หลังแจ้งโอน), <strong>&quot;เริ่มเรียน&quot;</strong> (อนุมัติแล้ว), <strong>&quot;เรียนต่อ&quot;</strong> (มีความก้าวหน้า)
                    </TipBox>
                </div>
            ),
        },
        {
            id: "learning",
            icon: <Play size={20} />,
            emoji: "🎬",
            title: "ระบบเข้าเรียน (ในห้องเรียน)",
            subtitle: "เรียนวิดีโอ, ดาวน์โหลดเอกสาร, สรุปเนื้อหา",
            color: "text-violet-600 dark:text-violet-400",
            bgColor: "bg-violet-50 dark:bg-violet-900/20",
            borderColor: "border-violet-200 dark:border-violet-800",
            content: (
                <div className="space-y-5">
                    <StepCard number={1} title="กดเข้าห้องเรียน" color="bg-violet-500">
                        จากหน้า <strong>&quot;คอร์สของฉัน&quot;</strong> กดปุ่ม <strong>&quot;เริ่มเรียน&quot;</strong> หรือ <strong>&quot;เรียนต่อ&quot;</strong> (ระบบจะจำจุดที่เรียนค้างและกลับไปต่อให้อัตโนมัติ)
                    </StepCard>
                    <StepCard number={2} title="เลือกบทเรียนจากแถบซ้าย" color="bg-violet-500">
                        แถบด้านซ้ายแสดงบทเรียนทั้งหมด แบ่งตามหัวข้อ — กดขยายดูได้
                        <br />• ค้นหาบทเรียนได้จากช่องด้านบน
                        <br />• หมวด <strong>⚡️ ตะลุยโจทย์ (Exams)</strong> สำหรับฝึกทำโจทย์ในคอร์ส
                    </StepCard>
                    <StepCard number={3} title="ปุ่มลอย 2 ปุ่มบนวิดีโอ" color="bg-violet-500">
                        <div className="space-y-2 mt-2">
                            <div className="flex items-start gap-2 bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-100 dark:border-slate-700">
                                <span className="text-lg shrink-0">📝</span>
                                <div>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">สรุปเนื้อหา</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">กดดูสรุปสั้น ๆ ของบทนั้น ช่วยทบทวนก่อน/หลังดูวิดีโอ</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-100 dark:border-slate-700">
                                <span className="text-lg shrink-0">📄</span>
                                <div>
                                    <p className="font-bold text-blue-600 dark:text-blue-400 text-xs">ดาวน์โหลดเอกสาร</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">ไฟล์ PDF ประกอบการเรียน (ใบงาน, สไลด์, โจทย์)</p>
                                </div>
                            </div>
                        </div>
                    </StepCard>
                    <StepCard number={4} title="ดูวิดีโอและทำควิซ" color="bg-violet-500">
                        ระบบจะเล่นวิดีโอจาก YouTube (เสียงเปิดอัตโนมัติ 100%) — บทที่มีควิซให้ทำ ต้องทำผ่านก่อนจึงจะไปบทถัดไปได้
                    </StepCard>
                    <StepCard number={5} title="กด 'บันทึกและไปต่อ'" color="bg-violet-500">
                        ปุ่มสีเขียวมุมขวาบน — กดเมื่อเรียนจบบทนั้น ระบบจะนับ % ความก้าวหน้าและไปบทถัดไปให้อัตโนมัติ
                    </StepCard>

                    <div className="grid md:grid-cols-3 gap-3 mt-4">
                        {[
                            { icon: <CheckCircle size={16} />, title: "Smart Resume", desc: "จำจุดที่ดูค้างให้" },
                            { icon: <BarChart3 size={16} />, title: "นับ % Real-time", desc: "แสดงความก้าวหน้าทุกคอร์ส" },
                            { icon: <Smartphone size={16} />, title: "ทุกอุปกรณ์", desc: "คอม / แท็บเล็ต / มือถือ" },
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-violet-700 dark:text-violet-300">
                                {f.icon}
                                <div>
                                    <p className="text-xs font-bold">{f.title}</p>
                                    <p className="text-[10px] opacity-70">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <TipBox variant="info">
                        <strong>💡 Tip:</strong> หาปุ่ม &quot;ดาวน์โหลดเอกสาร&quot; ไม่เจอ? มันคือปุ่มลอยเล็ก ๆ มุมบนซ้ายของวิดีโอ ใต้ชื่อคลิป 📄
                    </TipBox>
                    <TipBox variant="success">
                        เรียนครบ 100% ของคอร์สไหน จะปลดล็อก <strong>🏆 ใบประกาศนียบัตร</strong> ให้อัตโนมัติ ดาวน์โหลดเป็นรูปเก็บไว้ได้
                    </TipBox>
                </div>
            ),
        },
        {
            id: "in-course-exams",
            icon: <Zap size={20} />,
            emoji: "⚡️",
            title: "ตะลุยโจทย์ในคอร์ส & ดูเฉลย",
            subtitle: "ฝึกทำข้อสอบพร้อมเฉลยละเอียดในห้องเรียน",
            color: "text-fuchsia-600 dark:text-fuchsia-400",
            bgColor: "bg-fuchsia-50 dark:bg-fuchsia-900/20",
            borderColor: "border-fuchsia-200 dark:border-fuchsia-800",
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                        ในห้องเรียน (หน้า <strong>/learn</strong>) มีหมวด <strong>⚡️ ตะลุยโจทย์ (Exams)</strong> แยกในแถบด้านซ้าย — กดขยายเพื่อเลือกชุดโจทย์
                    </p>
                    <StepCard number={1} title="เลือกชุดข้อสอบ" color="bg-fuchsia-500">
                        กดที่หมวด <strong>⚡️ ตะลุยโจทย์</strong> แล้วเลือกชุดโจทย์ที่ต้องการฝึก
                    </StepCard>
                    <StepCard number={2} title="อ่านโจทย์ & เลือกคำตอบ" color="bg-fuchsia-500">
                        กดเลือกช้อยส์ที่คิดว่าถูก (ก, ข, ค, ง หรือ 1-4) ระบบไม่จับเวลา ฝึกเต็มที่ได้
                    </StepCard>
                    <StepCard number={3} title="กด 'ดูเฉลยข้อนี้'" color="bg-fuchsia-500">
                        เฉลยจะแสดงแบบโครงสร้าง 3 ส่วน:
                        <div className="grid md:grid-cols-3 gap-2 mt-2">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500 p-2 rounded">
                                <p className="font-bold text-indigo-700 dark:text-indigo-400 text-[11px]">💡 หลักการ</p>
                                <p className="text-[10px] text-slate-500">สูตร/concept ที่ใช้</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 border-l-2 border-slate-500 p-2 rounded">
                                <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">👣 ขั้นตอน</p>
                                <p className="text-[10px] text-slate-500">step-by-step ทีละข้อ</p>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-900/20 border-l-2 border-rose-500 p-2 rounded">
                                <p className="font-bold text-rose-700 dark:text-rose-400 text-[11px]">⚠️ ข้อควรระวัง</p>
                                <p className="text-[10px] text-slate-500">จุดที่คนมักพลาด</p>
                            </div>
                        </div>
                    </StepCard>
                    <StepCard number={4} title="ทำข้อถัดไป" color="bg-fuchsia-500">
                        กด <strong>&quot;ข้อถัดไป&quot;</strong> หรือเลือกจากเลขข้อด้านบน ฝึกทำได้เรื่อย ๆ ไม่จำกัดจำนวนครั้ง
                    </StepCard>
                    <TipBox variant="info">
                        สูตรคณิตศาสตร์ทั้งหมดในเฉลยแสดงด้วย <strong>LaTeX</strong> สวยงามอ่านง่าย พร้อมแสดงผลเป็นสมการคณิตศาสตร์จริง ๆ
                    </TipBox>
                </div>
            ),
        },
        {
            id: "certificate",
            icon: <Award size={20} />,
            emoji: "🏆",
            title: "ใบประกาศนียบัตร",
            subtitle: "รับใบเกียรติบัตรเมื่อเรียนจบคอร์ส",
            color: "text-yellow-600 dark:text-yellow-400",
            bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
            borderColor: "border-yellow-200 dark:border-yellow-800",
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                        เมื่อเรียนจบทุกบทเรียนในคอร์สครบ 100% ระบบจะแสดงปุ่ม <strong>&quot;รับใบประกาศนียบัตร&quot;</strong>
                    </p>
                    <StepCard number={1} title="เรียนให้ครบทุกบท" color="bg-yellow-500">
                        ทำเครื่องหมายเสร็จทุกบทเรียนจนแถบ Progress ขึ้น 100%
                    </StepCard>
                    <StepCard number={2} title="กดรับใบประกาศ" color="bg-yellow-500">
                        กดปุ่ม <strong>&quot;🏆 รับใบประกาศนียบัตร&quot;</strong> ที่แสดงขึ้นในหน้าเรียน
                    </StepCard>
                    <StepCard number={3} title="ดาวน์โหลดเก็บไว้" color="bg-yellow-500">
                        ใบประกาศจะแสดงชื่อนักเรียน + ชื่อคอร์ส สามารถดาวน์โหลดเป็นรูปภาพได้
                    </StepCard>
                </div>
            ),
        },
        {
            id: "review",
            icon: <Star size={20} />,
            emoji: "⭐",
            title: "รีวิว & คูปองส่วนลด",
            subtitle: "เขียนรีวิวรับโค้ดส่วนลด 100 บาท",
            color: "text-orange-600 dark:text-orange-400",
            bgColor: "bg-orange-50 dark:bg-orange-900/20",
            borderColor: "border-orange-200 dark:border-orange-800",
            content: (
                <div className="space-y-4">
                    <StepCard number={1} title="กดปุ่มรีวิว" color="bg-orange-500">
                        ที่หน้า &quot;คอร์สของฉัน&quot; คอร์สที่ได้รับอนุมัติแล้วจะมีปุ่ม <strong>&quot;⭐ รีวิวเพื่อรับส่วนลด 100 บาท&quot;</strong>
                    </StepCard>
                    <StepCard number={2} title="เขียนรีวิว" color="bg-orange-500">
                        ให้คะแนนดาว (1-5), ตั้งชื่อที่จะแสดง, และเขียนความคิดเห็น <strong>(อย่างน้อย 20 ตัวอักษร)</strong>
                    </StepCard>
                    <StepCard number={3} title="รับโค้ดส่วนลด" color="bg-orange-500">
                        ส่งรีวิวสำเร็จ → ได้รับโค้ดคูปอง <strong>REVIEW-XXXXXX</strong> ลด 100 บาททันที!
                    </StepCard>
                    <StepCard number={4} title="ใช้โค้ดตอนชำระเงิน" color="bg-orange-500">
                        นำโค้ดไปกรอกในช่อง &quot;โค้ดส่วนลด&quot; ในหน้าแจ้งโอนเงินเมื่อสมัครคอร์สถัดไป
                    </StepCard>
                    <TipBox variant="info">
                        ไม่ต้องกลัวโค้ดหาย! ดูโค้ดย้อนหลังได้ที่หมวด <strong>&quot;คูปองของฉัน&quot;</strong> ในหน้าคอร์สเรียนของฉันเสมอ (ทั้งที่ใช้แล้วและยังไม่ใช้)
                    </TipBox>
                    <TipBox variant="warning">
                        แต่ละคอร์สรีวิวได้ 1 ครั้ง และโค้ดส่วนลดผูกกับบัญชีของคุณ — ใช้ได้เฉพาะเจ้าของเท่านั้น
                    </TipBox>
                </div>
            ),
        },
        {
            id: "exam",
            icon: <FileText size={20} />,
            emoji: "📝",
            title: "คลังข้อสอบ & แบบฝึกหัด",
            subtitle: "ฝึกทำโจทย์จับเวลาจำลองสอบจริง",
            color: "text-rose-600 dark:text-rose-400",
            bgColor: "bg-rose-50 dark:bg-rose-900/20",
            borderColor: "border-rose-200 dark:border-rose-800",
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                        เว็บไซต์มีระบบฝึกทำข้อสอบ 2 โหมด:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock size={18} className="text-rose-500" />
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">โหมดจับเวลา (Exam)</span>
                            </div>
                            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                                <li>• จำลองสอบจริง มีจับเวลา</li>
                                <li>• ทำเสร็จแล้วดูคะแนนทันที</li>
                                <li>• มีเฉลยละเอียดทุกข้อ</li>
                                <li>• เข้าที่เมนู <strong>&quot;คลังข้อสอบ&quot;</strong></li>
                            </ul>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Search size={18} className="text-blue-500" />
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">โหมดฝึกทำ (Practice)</span>
                            </div>
                            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                                <li>• เลือกทำทีละข้อตามหัวข้อ</li>
                                <li>• ค้นหาโจทย์ตามเรื่องได้</li>
                                <li>• กรองตาม Tag / Topic</li>
                                <li>• เข้าที่เมนู <strong>&quot;ฝึกทำโจทย์&quot;</strong></li>
                            </ul>
                        </div>
                    </div>
                    <TipBox variant="success">
                        ไม่ต้องล็อกอินก็สามารถเข้าทำข้อสอบและฝึกทำโจทย์ได้ฟรี!
                    </TipBox>
                </div>
            ),
        },
        {
            id: "summary",
            icon: <Sparkles size={20} />,
            emoji: "📖",
            title: "สรุปสูตร & บทความ",
            subtitle: "อ่านทบทวนเนื้อหาก่อนสอบ",
            color: "text-cyan-600 dark:text-cyan-400",
            bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
            borderColor: "border-cyan-200 dark:border-cyan-800",
            content: (
                <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap size={18} className="text-cyan-500" />
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">สรุปสูตร (Short Note)</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">รวมสูตรคณิตศาสตร์สำคัญ ม.ต้น - ม.ปลาย อ่านทบทวนก่อนสอบ เน้นจุดที่ออกสอบบ่อย</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText size={18} className="text-emerald-500" />
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">บล็อก / บทความ</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">บทความให้ความรู้ เทคนิคการเรียน เคล็ดลับทำข้อสอบ และข่าวสารจากครูฮีม</p>
                        </div>
                    </div>
                    <TipBox variant="info">
                        เนื้อหาสรุปสูตรและบทความ <strong>อ่านฟรี</strong> ไม่ต้องสมัครสมาชิก!
                    </TipBox>
                </div>
            ),
        },
        {
            id: "parent",
            icon: <BarChart3 size={20} />,
            emoji: "📊",
            title: "ติดตามผลการเรียน (สำหรับผู้ปกครอง)",
            subtitle: "ดูความก้าวหน้าการเรียนของลูก",
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-50 dark:bg-blue-900/20",
            borderColor: "border-blue-200 dark:border-blue-800",
            content: (
                <div className="space-y-4">
                    <StepCard number={1} title="เข้าหน้า 'คอร์สของฉัน'" color="bg-blue-500">
                        ล็อกอินด้วยบัญชีของนักเรียน แล้วไปที่ <strong>&quot;คอร์สของฉัน&quot;</strong>
                    </StepCard>
                    <StepCard number={2} title="กดปุ่ม 'ติดตามผลการเรียน'" color="bg-blue-500">
                        ที่ส่วนโปรไฟล์ด้านบน จะมีการ์ด <strong>📊 &quot;ติดตามผลการเรียน&quot;</strong> กดเข้าไป
                    </StepCard>
                    <StepCard number={3} title="ดูผลรายคอร์ส" color="bg-blue-500">
                        จะเห็นข้อมูลทุกคอร์สที่สมัคร: ความก้าวหน้า, บทที่เรียนจบแล้ว, บทที่ยังไม่ได้เรียน — แสดงแบบละเอียดทุกบท
                    </StepCard>
                    <TipBox variant="info">
                        ลิงก์ติดตามผลการเรียนสามารถแชร์ให้ผู้ปกครองเปิดดูได้ตลอดเวลา โดยไม่ต้องล็อกอิน
                    </TipBox>
                </div>
            ),
        },
        {
            id: "profile",
            icon: <Eye size={20} />,
            emoji: "🎨",
            title: "แก้ไขโปรไฟล์",
            subtitle: "เปลี่ยนรูป ชื่อ และคำคม",
            color: "text-pink-600 dark:text-pink-400",
            bgColor: "bg-pink-50 dark:bg-pink-900/20",
            borderColor: "border-pink-200 dark:border-pink-800",
            content: (
                <div className="space-y-4">
                    <StepCard number={1} title="เข้าหน้าโปรไฟล์" color="bg-pink-500">
                        ไปที่ <strong>&quot;คอร์สของฉัน&quot;</strong> แล้วกด <strong>&quot;แก้ไขข้อมูลส่วนตัว&quot;</strong> ที่โปรไฟล์ด้านบน
                    </StepCard>
                    <StepCard number={2} title="เลือกอวาตาร์" color="bg-pink-500">
                        เลือกรูปประจำตัวจากคอลเลคชั่น: ผู้ชาย, ผู้หญิง, สัตว์น่ารัก, หรือสัตว์ประหลาด — หรืออัปโหลดรูปตัวเองก็ได้!
                    </StepCard>
                    <StepCard number={3} title="ตั้งชื่อและคำคม" color="bg-pink-500">
                        เปลี่ยนชื่อที่แสดง และเลือกคำคมสร้างแรงบันดาลใจประจำตัว
                    </StepCard>
                    <StepCard number={4} title="กดบันทึก" color="bg-pink-500">
                        กดปุ่ม <strong>&quot;บันทึก&quot;</strong> ข้อมูลจะอัปเดตทันทีทั้งเว็บ
                    </StepCard>
                </div>
            ),
        },
        {
            id: "darkmode",
            icon: <Moon size={20} />,
            emoji: "🌙",
            title: "โหมดกลางคืน & เคล็ดลับอื่นๆ",
            subtitle: "ฟีเจอร์เสริมที่ช่วยให้ใช้งานสะดวก",
            color: "text-slate-600 dark:text-slate-400",
            bgColor: "bg-slate-50 dark:bg-slate-800/50",
            borderColor: "border-slate-200 dark:border-slate-700",
            content: (
                <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-3">
                        {[
                            { icon: <Moon size={16} />, title: "Dark Mode", desc: "กดไอคอนพระจันทร์/พระอาทิตย์ที่มุมขวาบนเพื่อเปลี่ยนธีม ถนอมสายตาเวลาเรียนตอนกลางคืน" },
                            { icon: <Smartphone size={16} />, title: "ใช้งานบนมือถือ", desc: "เว็บไซต์รองรับทุกขนาดหน้าจอ กดปุ่มเมนู (☰) ที่มุมขวาบนเพื่อเปิดเมนูบนมือถือ" },
                            { icon: <HelpCircle size={16} />, title: "คำถามที่พบบ่อย (FAQ)", desc: "มีคำถาม? เข้าหน้า FAQ เพื่ออ่านคำตอบเรื่องการเรียน การชำระเงิน และอื่นๆ" },
                            { icon: <MessageCircle size={16} />, title: "ติดต่อครูฮีม", desc: "สอบถามเพิ่มเติมผ่าน Facebook, LINE @kruheem หรือ Email: kruheemschool@gmail.com" },
                        ].map((f, i) => (
                            <div key={i} className="flex items-start gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
                                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">{f.icon}</div>
                                <div>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{f.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans flex flex-col transition-colors">
            <Navbar />

            <div className="relative flex-grow pt-24 pb-24">
                {/* Background Orbs */}
                <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-200/30 dark:bg-teal-900/10 rounded-full filter blur-[120px] pointer-events-none"></div>
                <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-200/30 dark:bg-indigo-900/10 rounded-full filter blur-[120px] pointer-events-none"></div>

                <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6">
                    {/* Back */}
                    <Link href="/my-courses" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors group mb-8">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        กลับหน้าคอร์สของฉัน
                    </Link>

                    {/* Hero Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-4 py-1.5 rounded-full text-xs font-bold mb-4 border border-teal-200 dark:border-teal-800">
                            <BookOpen size={14} />
                            คู่มือฉบับสมบูรณ์ · อัปเดตล่าสุด 2026
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 dark:from-teal-400 dark:via-blue-400 dark:to-indigo-400 mb-4 leading-tight">
                            คู่มือการใช้งานเว็บไซต์
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-2xl mx-auto mb-6">
                            ทุกสิ่งที่คุณต้องรู้เกี่ยวกับ <strong className="text-slate-700 dark:text-slate-200">KruHeem School</strong><br className="hidden md:block" />
                            ตั้งแต่สมัครสมาชิก จนถึงรับใบประกาศ
                        </p>

                        {/* ✨ Read-First Banner */}
                        <div className="max-w-2xl mx-auto bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 dark:from-amber-900/10 dark:via-orange-900/10 dark:to-rose-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 text-left flex gap-4 items-start shadow-sm">
                            <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                                <span className="text-2xl">👋</span>
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 text-sm md:text-base">
                                    สวัสดีครับ ผู้ปกครอง & นักเรียนทุกคน!
                                </p>
                                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    แนะนำให้ <strong className="text-orange-600 dark:text-orange-400">อ่านคู่มือนี้ก่อนเริ่มใช้งาน</strong> สัก 5 นาที จะช่วยให้ใช้งานได้อย่างลื่นไหล ไม่พลาดฟีเจอร์สำคัญ
                                    และได้ประโยชน์จากทุกเครื่องมือที่เราตั้งใจทำให้ 💚
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Nav */}
                    <div className="mb-10 flex flex-wrap justify-center gap-2">
                        {sections.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    setOpenSection(s.id);
                                    document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 ${openSection === s.id
                                    ? `${s.bgColor} ${s.color} ${s.borderColor}`
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                {s.emoji} {s.title.split(' ')[0]}
                            </button>
                        ))}
                    </div>

                    {/* Sections */}
                    <div className="space-y-4">
                        {sections.map((section, index) => (
                            <div key={section.id} id={`section-${section.id}`} className="scroll-mt-24">
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className={`w-full text-left bg-white dark:bg-slate-900 border rounded-2xl p-5 transition-all duration-300 hover:shadow-md group ${openSection === section.id
                                        ? `${section.borderColor} shadow-sm`
                                        : 'border-slate-100 dark:border-slate-800'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-11 h-11 ${section.bgColor} rounded-xl flex items-center justify-center ${section.color} shrink-0 group-hover:scale-110 transition-transform`}>
                                                {section.icon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-300 dark:text-slate-600">
                                                        {String(index + 1).padStart(2, '0')}
                                                    </span>
                                                    <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base md:text-lg">
                                                        {section.title}
                                                    </h2>
                                                </div>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">{section.subtitle}</p>
                                            </div>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${openSection === section.id
                                            ? `${section.bgColor} ${section.color}`
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                                            }`}>
                                            {openSection === section.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>
                                </button>

                                {/* Expandable Content */}
                                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openSection === section.id ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="px-5 pt-4 pb-6 bg-white dark:bg-slate-900 border border-t-0 border-slate-100 dark:border-slate-800 rounded-b-2xl -mt-2">
                                        {section.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>

            <Footer />
        </div>
    );
}
