"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import {
    ArrowLeft, Rocket, UserPlus, ClipboardCheck, GraduationCap, Play,
    Zap, FileText, BarChart3, Star, Sparkles,
    ChevronDown, Mail, MessageCircle, Facebook, Smartphone, HelpCircle,
} from "lucide-react";

// ── small building blocks ─────────────────────────────────────────────
function Step({ n, title, children, color }: { n: number; title: string; children?: React.ReactNode; color: string }) {
    return (
        <div className="flex gap-3.5 items-start">
            <div className={`w-8 h-8 ${color} text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm`}>
                {n}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-snug">{title}</h4>
                {children && <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-1">{children}</div>}
            </div>
        </div>
    );
}

function Tip({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warn" | "ok" }) {
    const styles = {
        info: "bg-blue-50 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-900 text-blue-800 dark:text-blue-300",
        warn: "bg-amber-50 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900 text-amber-800 dark:text-amber-300",
        ok: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300",
    };
    const icon = { info: "💡", warn: "⚠️", ok: "✅" };
    return (
        <div className={`${styles[variant]} border rounded-xl px-4 py-3 text-[13px] font-medium flex items-start gap-2.5 mt-3`}>
            <span className="shrink-0 text-base leading-none mt-0.5">{icon[variant]}</span>
            <div className="leading-relaxed">{children}</div>
        </div>
    );
}

function MiniCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
    return (
        <div className="flex items-start gap-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 p-3.5">
            <span className="text-xl leading-none shrink-0">{icon}</span>
            <div className="min-w-0">
                <p className="font-bold text-slate-700 dark:text-slate-200 text-[13px] leading-snug">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

interface Sec {
    id: string; emoji: string; icon: React.ReactNode; title: string; sub: string;
    accent: string; chipBg: string; iconBg: string; iconText: string; border: string;
    content: React.ReactNode;
}

export default function UserGuidePage() {
    const [open, setOpen] = useState<string | null>("start");
    const toggle = (id: string) => setOpen(open === id ? null : id);

    const sections: Sec[] = [
        // 1 ── overview ────────────────────────────────────────────────
        {
            id: "start", emoji: "🚀", icon: <Rocket size={20} />, title: "เริ่มต้นใช้งาน",
            sub: "ภาพรวมทั้งเว็บใน 1 นาที",
            accent: "bg-teal-500", chipBg: "bg-teal-50 dark:bg-teal-950/40", iconBg: "bg-teal-50 dark:bg-teal-950/40",
            iconText: "text-teal-600 dark:text-teal-400", border: "border-teal-200 dark:border-teal-900",
            content: (
                <div className="space-y-5">
                    <p className="text-slate-600 dark:text-slate-300 text-[15px] leading-relaxed">
                        <strong className="text-slate-800 dark:text-slate-100">KruHeem School</strong> คือเว็บเรียนคณิตศาสตร์ออนไลน์ของครูฮีม
                        เรียนผ่านวิดีโอ ฝึกทำข้อสอบพร้อมเฉลยละเอียด และติดตามผลการเรียนได้ทุกที่ ทุกอุปกรณ์
                    </p>

                    <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-2.5">เส้นทางใช้งานง่าย ๆ 4 ขั้น</p>
                        <div className="grid sm:grid-cols-2 gap-2.5">
                            <MiniCard icon="①" title="สมัครสมาชิก" desc="ใช้อีเมล + รหัสผ่าน ฟรี ไม่ถึง 5 นาที" />
                            <MiniCard icon="②" title="เลือกคอร์ส & แจ้งโอน" desc="โอนเงิน แนบสลิป แล้วรอครูเปิดสิทธิ์" />
                            <MiniCard icon="③" title="เข้าห้องเรียน" desc="ดูวิดีโอ ทำโจทย์ เก็บความก้าวหน้า" />
                            <MiniCard icon="④" title="รับใบประกาศ" desc="เรียนครบ 100% รับเกียรติบัตรเก็บไว้" />
                        </div>
                    </div>

                    <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-2.5">ส่วนที่ใช้ได้ฟรี — ไม่ต้องสมัครก็ได้ 🆓</p>
                        <div className="flex flex-wrap gap-2">
                            {["คลังข้อสอบ (ชุดฟรี)", "ฝึกทำโจทย์ตามหัวข้อ", "สรุปสูตร & เนื้อหา", "บทความครูฮีม", "รีวิว", "คำถามที่พบบ่อย"].map((t) => (
                                <span key={t} className="px-3 py-1.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-900">
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>

                    <Tip variant="info">
                        เมนูด้านบนสุดของเว็บคือทางลัดไปทุกอย่าง — <strong>รีวิว · วิธีสมัคร · สมัครสมาชิก · แจ้งโอน</strong>
                        เมื่อล็อกอินแล้วจะมีปุ่ม <strong>&quot;คอร์สของฉัน&quot;</strong> เพิ่มเข้ามา บนมือถือกดไอคอนเมนู (☰) มุมขวาบน
                    </Tip>
                </div>
            ),
        },
        // 2 ── sign up ─────────────────────────────────────────────────
        {
            id: "signup", emoji: "👤", icon: <UserPlus size={20} />, title: "สมัครสมาชิก & เข้าสู่ระบบ",
            sub: "สร้างบัญชีด้วยอีเมล + รหัสผ่าน",
            accent: "bg-indigo-500", chipBg: "bg-indigo-50 dark:bg-indigo-950/40", iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
            iconText: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-900",
            content: (
                <div className="space-y-4">
                    <div className="space-y-3.5">
                        <Step n={1} title="กดปุ่ม “สมัครสมาชิก” บนเมนูด้านบน" color="bg-indigo-500" />
                        <Step n={2} title="กรอกอีเมล + ตั้งรหัสผ่าน" color="bg-indigo-500">
                            ใส่อีเมล แล้วตั้งรหัสผ่าน <strong>อย่างน้อย 6 ตัวอักษร</strong> และยืนยันรหัสผ่านอีกครั้ง
                        </Step>
                        <Step n={3} title="เริ่มใช้งานได้ทันที" color="bg-indigo-500">
                            สมัครเสร็จระบบจะพาไปขั้นถัดไปให้เลย — กด <strong>&quot;ไปแจ้งโอนเงิน&quot;</strong> เพื่อสมัครคอร์ส หรือเข้า <strong>&quot;คอร์สของฉัน&quot;</strong> ก่อนก็ได้
                        </Step>
                    </div>
                    <Tip variant="info">
                        <strong>ลืมรหัสผ่าน?</strong> ในหน้าเข้าสู่ระบบกด <strong>&quot;ลืมรหัสผ่าน?&quot;</strong> ระบบจะส่งลิงก์รีเซ็ตไปที่อีเมล (ภายใน 1–2 นาที — ถ้าไม่เจอ ลองดูในกล่อง Spam/Junk)
                    </Tip>
                    <Tip variant="ok">
                        เคยสมัครด้วย <strong>Google</strong> ไว้? ยังเข้าได้เหมือนเดิม — ในหน้า <strong>&quot;เข้าสู่ระบบ&quot;</strong> กดปุ่ม &quot;เข้าสู่ระบบด้วย Google&quot; (และถ้าต้องการ ตั้งรหัสผ่านเพิ่มไว้ล็อกอินด้วยอีเมลก็ได้)
                    </Tip>
                </div>
            ),
        },
        // 3 ── enroll & pay ────────────────────────────────────────────
        {
            id: "enroll", emoji: "🧾", icon: <ClipboardCheck size={20} />, title: "สมัครเรียน & แจ้งโอน",
            sub: "เลือกคอร์ส โอนเงิน แนบสลิป",
            accent: "bg-emerald-500", chipBg: "bg-emerald-50 dark:bg-emerald-950/40", iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
            iconText: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-900",
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                        กดเมนู <strong>&quot;แจ้งโอน&quot;</strong> ด้านบน (หรือปุ่มสมัครในหน้าคอร์ส) จะเข้าสู่หน้าแจ้งโอนแบบ <strong>4 ขั้นตอน</strong>:
                    </p>
                    <div className="space-y-3.5">
                        <Step n={1} title="เลือกคอร์ส" color="bg-emerald-500">
                            เลือกคอร์สที่ต้องการ — <strong>เลือกได้หลายคอร์สพร้อมกัน</strong> ระบบรวมราคาให้อัตโนมัติ
                        </Step>
                        <Step n={2} title="กรอกข้อมูลผู้เรียน" color="bg-emerald-500">
                            ชื่อ–นามสกุล, เบอร์โทร และ LINE ID (ถ้ามี)
                        </Step>
                        <Step n={3} title="ชำระเงิน" color="bg-emerald-500">
                            สแกน <strong>QR พร้อมเพย์</strong> หรือโอนเข้าบัญชีที่แสดงไว้ (กดปุ่ม &quot;คัดลอก&quot; เลขบัญชีได้)
                            มีโค้ดส่วนลด? กรอกในช่อง <strong>&quot;กรอกโค้ดส่วนลด&quot;</strong> แล้วกด <strong>&quot;ใช้&quot;</strong>
                        </Step>
                        <Step n={4} title="แนบสลิป & ยืนยัน" color="bg-emerald-500">
                            แนบรูปสลิป (JPG/PNG สูงสุด 5 รูป) — กดเลือก ลากวาง หรือวาง (Ctrl+V) ก็ได้ แล้วกด <strong>&quot;ยืนยันการแจ้งโอน&quot;</strong>
                        </Step>
                    </div>
                    <Tip variant="ok">
                        ส่งเสร็จคอร์สจะขึ้นสถานะ <strong>&quot;รออนุมัติ&quot;</strong> ในหน้าคอร์สของฉัน — ครูจะตรวจสลิปและเปิดสิทธิ์ให้ <strong>ภายใน 24 ชม.</strong>
                    </Tip>
                    <Tip variant="warn">
                        ถ้าเปิดเว็บจากในแอป <strong>LINE / Facebook / Messenger / IG</strong> ระบบจะเตือนให้กด <strong>&quot;เปิดใน Chrome/Safari&quot;</strong> ก่อน —
                        สำคัญมาก! ถ้าไม่เปิดในเบราว์เซอร์จริง การสมัครและล็อกอินอาจไม่สำเร็จ
                    </Tip>
                </div>
            ),
        },
        // 4 ── my courses hub ──────────────────────────────────────────
        {
            id: "hub", emoji: "🎓", icon: <GraduationCap size={20} />, title: "คอร์สเรียนของฉัน",
            sub: "ศูนย์รวมการเรียนของคุณ",
            accent: "bg-cyan-500", chipBg: "bg-cyan-50 dark:bg-cyan-950/40", iconBg: "bg-cyan-50 dark:bg-cyan-950/40",
            iconText: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-200 dark:border-cyan-900",
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                        หน้า <strong>&quot;คอร์สของฉัน&quot;</strong> คือหน้าหลักของนักเรียน รวมทุกอย่างไว้ที่เดียว:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2.5">
                        <MiniCard icon="🙋" title="โปรไฟล์ & สถิติ" desc="ชื่อ รูป คำคม + จำนวนคอร์ส & ความก้าวหน้าเฉลี่ย" />
                        <MiniCard icon="▶️" title="เรียนต่อจากครั้งล่าสุด" desc="กดเดียวกลับไปบทที่ค้างไว้ ต่อจากวินาทีเดิม" />
                        <MiniCard icon="📚" title="คอร์สแยกตามระดับชั้น" desc="เห็นความก้าวหน้า & สถานะของแต่ละคอร์ส" />
                        <MiniCard icon="🎁" title="คูปองของฉัน" desc="โค้ดส่วนลดทั้งหมด (พร้อมใช้ + ใช้แล้ว) ดูย้อนหลังได้เสมอ" />
                    </div>
                    <Tip variant="info">
                        แต่ละคอร์สมีสถานะชัดเจน: <strong>&quot;รออนุมัติ&quot;</strong> (เพิ่งแจ้งโอน) · <strong>&quot;เริ่มเรียน/เรียนต่อ&quot;</strong> (เปิดสิทธิ์แล้ว) ·
                        <strong> &quot;ทำข้อสอบเลย&quot;</strong> (คอร์สคลังข้อสอบ) — และมีปุ่ม <strong>&quot;⭐ รีวิวคอร์สนี้ รับส่วนลด ฿100&quot;</strong>
                    </Tip>
                    <Tip variant="ok">
                        อยากแต่งหน้าตา? กดปุ่มกลม ⚙️ มุมขวาล่าง <strong>&quot;ปรับแต่งธีม&quot;</strong> — เปลี่ยนสีพื้น โหมดสว่าง/มืด ลวดลาย ได้ตามใจ (เป็นของส่วนตัว เห็นเฉพาะคุณ)
                        และมีปุ่ม <strong>&quot;✏️ แก้ไขข้อมูลส่วนตัว&quot;</strong> ไว้เปลี่ยนรูป/ชื่อ/คำคม (เลือกอวาตาร์หรืออัปโหลดรูปเองก็ได้)
                    </Tip>
                </div>
            ),
        },
        // 5 ── classroom ───────────────────────────────────────────────
        {
            id: "classroom", emoji: "🎬", icon: <Play size={20} />, title: "เข้าห้องเรียน (ดูวิดีโอ)",
            sub: "เรียน เก็บความก้าวหน้า รับใบประกาศ",
            accent: "bg-violet-500", chipBg: "bg-violet-50 dark:bg-violet-950/40", iconBg: "bg-violet-50 dark:bg-violet-950/40",
            iconText: "text-violet-600 dark:text-violet-400", border: "border-violet-200 dark:border-violet-900",
            content: (
                <div className="space-y-4">
                    <div className="space-y-3.5">
                        <Step n={1} title="กด “เริ่มเรียน” หรือ “เรียนต่อ”" color="bg-violet-500">
                            จากหน้าคอร์สของฉัน — ระบบจำจุดที่เรียนค้างไว้และพากลับไปต่อให้อัตโนมัติ
                        </Step>
                        <Step n={2} title="เลือกบทจากแถบซ้าย" color="bg-violet-500">
                            บทเรียนแบ่งเป็นหัวข้อ กดขยายดูได้ · ค้นหาบทได้จากช่อง <strong>&quot;ค้นหา&quot;</strong> ·
                            มีแถบความก้าวหน้า % และปุ่ม <strong>&quot;📊 ดูสรุปผลของฉัน&quot;</strong>
                        </Step>
                        <Step n={3} title="ดูวิดีโอ + เครื่องมือประจำบท" color="bg-violet-500">
                            <div className="grid sm:grid-cols-3 gap-2 mt-2">
                                <MiniCard icon="📝" title="สรุปเนื้อหา" desc="สรุปสั้น ๆ ของบท ทบทวนก่อน/หลังดู" />
                                <MiniCard icon="📄" title="ดาวน์โหลดเอกสาร" desc="ไฟล์ PDF ใบงาน/สไลด์ประกอบ" />
                                <MiniCard icon="🛠️" title="แก้ไขข้อมูล" desc="หมายเหตุ/จุดแก้ไขเพิ่มเติม (บางบท)" />
                            </div>
                        </Step>
                        <Step n={4} title="กด “บันทึกและไปต่อ”" color="bg-violet-500">
                            ปุ่มเขียวมุมขวาบน — เรียนจบบทแล้วกด ระบบจะนับ % และพาไปบทถัดไปให้เอง
                        </Step>
                    </div>
                    <Tip variant="info">
                        แต่ละคอร์สเปิดให้ <strong>ดูฟรีบทแรก ๆ</strong> (โดยปกติ 3 บทแรก) ลองชิมก่อนได้ · ปุ่มลูกศร <strong>← →</strong> บนคีย์บอร์ดใช้เปลี่ยนบทได้
                    </Tip>
                    <Tip variant="ok">
                        เรียนครบ <strong>100%</strong> ปุ่ม <strong>&quot;🏆 รับใบประกาศนียบัตร&quot;</strong> จะปลดล็อก — กดแล้วบันทึกเป็นรูปเก็บไว้ได้ (ใส่ชื่อนักเรียน + ชื่อคอร์สให้อัตโนมัติ)
                    </Tip>
                </div>
            ),
        },
        // 6 ── in-course drill ─────────────────────────────────────────
        {
            id: "drill", emoji: "⚡️", icon: <Zap size={20} />, title: "ตะลุยโจทย์ & ดูเฉลย (ในคอร์ส)",
            sub: "ฝึกทำข้อสอบ + วิเคราะห์ผลละเอียด",
            accent: "bg-fuchsia-500", chipBg: "bg-fuchsia-50 dark:bg-fuchsia-950/40", iconBg: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
            iconText: "text-fuchsia-600 dark:text-fuchsia-400", border: "border-fuchsia-200 dark:border-fuchsia-900",
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                        ในห้องเรียนมีหมวด <strong>&quot;⚡️ ตะลุยโจทย์&quot;</strong> ในแถบซ้าย กดเลือกชุดโจทย์ แล้วเลือกโหมด:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2.5">
                        <MiniCard icon="📝" title="โหมดฝึก" desc="ไม่กดดัน เปิดดูเฉลยทีละข้อได้ระหว่างทำ เหมาะกับการทำความเข้าใจ" />
                        <MiniCard icon="⏱️" title="โหมดจำลองสอบ" desc="จับเวลาเหมือนสอบจริง หมดเวลาส่งอัตโนมัติ วัดความพร้อม" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-2">เฉลยละเอียดทุกข้อ — แสดงเป็นสมการจริง (LaTeX) อ่านง่าย แบ่ง 3 ส่วน</p>
                        <div className="grid sm:grid-cols-3 gap-2">
                            <div className="bg-indigo-50 dark:bg-indigo-950/30 border-l-2 border-indigo-500 px-3 py-2 rounded">
                                <p className="font-bold text-indigo-700 dark:text-indigo-300 text-xs">💡 หลักการ</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">สูตร/แนวคิดที่ใช้</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/60 border-l-2 border-slate-400 px-3 py-2 rounded">
                                <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">👣 ขั้นตอน</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">ทำทีละสเต็ป</p>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-950/30 border-l-2 border-rose-500 px-3 py-2 rounded">
                                <p className="font-bold text-rose-700 dark:text-rose-300 text-xs">⚠️ ข้อควรระวัง</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">จุดที่คนมักพลาด</p>
                            </div>
                        </div>
                    </div>
                    <Tip variant="ok">
                        ทำเสร็จได้รายงานผลแบบจัดเต็ม: <strong>ระดับความพร้อม</strong>, <strong>อันดับเทียบเพื่อน</strong> (เก่งกว่า X% ของคนที่ทำชุดนี้),
                        หัวข้อที่ควรทบทวน, เทียบกับครั้งก่อน และปุ่ม <strong>&quot;🔁 ฝึกเฉพาะข้อที่ผิด&quot;</strong> — ทำคะแนนดี ๆ มีเซอร์ไพรส์ฉลองด้วยนะ 🎉
                    </Tip>
                </div>
            ),
        },
        // 7 ── exam bank & practice ────────────────────────────────────
        {
            id: "exambank", emoji: "📝", icon: <FileText size={20} />, title: "คลังข้อสอบ & ฝึกทำโจทย์",
            sub: "ฝึกฟรีได้ทุกคน + สถิติส่วนตัว",
            accent: "bg-rose-500", chipBg: "bg-rose-50 dark:bg-rose-950/40", iconBg: "bg-rose-50 dark:bg-rose-950/40",
            iconText: "text-rose-600 dark:text-rose-400", border: "border-rose-200 dark:border-rose-900",
            content: (
                <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-2.5">
                        <MiniCard icon="🗂️" title="คลังข้อสอบ" desc="ชุดข้อสอบแยกตามหมวด ทำแบบจับเวลา ดูคะแนน+เฉลยทันที (ชุดฟรีมีให้ทำเลย)" />
                        <MiniCard icon="🎯" title="ฝึกทำโจทย์ตามหัวข้อ" desc="เลือกเรื่องที่อยากฝึก เช่น เศษส่วน สมการ ไม่จับเวลา ทำได้ไม่จำกัด" />
                        <MiniCard icon="🔖" title="บันทึกข้อที่ชอบ" desc="กดหัวใจที่โจทย์ เก็บไว้ดูทีหลังที่ “ข้อสอบที่บันทึกไว้”" />
                        <MiniCard icon="📊" title="สถิติการทำข้อสอบ" desc="กราฟพัฒนาการ, สถิติต่อเนื่อง 🔥, เรดาร์จุดแข็ง-จุดอ่อนรายหัวข้อ" />
                    </div>
                    <Tip variant="ok">
                        <strong>เข้าทำข้อสอบ & ฝึกโจทย์ได้ฟรี ไม่ต้องล็อกอิน!</strong> แต่ถ้าล็อกอิน ระบบจะ <strong>จำผลและสร้างสถิติส่วนตัว</strong> ให้
                        (ดูได้ที่หน้า <strong>&quot;สถิติการทำข้อสอบ&quot;</strong>) — มีทั้งเป้าหมาย 80%, Heatmap หัวข้อ และการเทียบกับค่าเฉลี่ยรวม
                    </Tip>
                    <Tip variant="info">
                        อยากลองหน้าตาก่อน? มีหน้า <strong>ทดลองทำข้อสอบ</strong> (ตัวอย่างฟรี) ให้ลองจับเวลาดูได้เลย
                    </Tip>
                </div>
            ),
        },
        // 8 ── parent dashboard ────────────────────────────────────────
        {
            id: "parent", emoji: "📊", icon: <BarChart3 size={20} />, title: "ติดตามผลการเรียน (ผู้ปกครอง)",
            sub: "ลิงก์แชร์ให้พ่อแม่ดูได้ ไม่ต้องล็อกอิน",
            accent: "bg-blue-500", chipBg: "bg-blue-50 dark:bg-blue-950/40", iconBg: "bg-blue-50 dark:bg-blue-950/40",
            iconText: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-900",
            content: (
                <div className="space-y-4">
                    <div className="space-y-3.5">
                        <Step n={1} title="เปิดหน้า “ติดตามผลการเรียน”" color="bg-blue-500">
                            จากหน้าคอร์สของฉัน (หรือหน้าโปรไฟล์) กดการ์ด <strong>&quot;📊 ติดตามผลการเรียน&quot;</strong>
                        </Step>
                        <Step n={2} title="ดูผลแบบรวมและรายคอร์ส" color="bg-blue-500">
                            คะแนนเฉลี่ย, พัฒนาการการทำข้อสอบ, หัวข้อที่ควรฝึกเพิ่ม และความคืบหน้าของแต่ละคอร์ส (ดูจบแล้วกี่คลิป)
                        </Step>
                        <Step n={3} title="แชร์ลิงก์ให้ผู้ปกครอง" color="bg-blue-500">
                            ก๊อปปี้ลิงก์หน้านี้ส่งให้พ่อแม่ได้เลย — <strong>เปิดดูได้โดยไม่ต้องล็อกอิน</strong>
                        </Step>
                    </div>
                    <Tip variant="info">
                        หน้านี้ออกแบบมาให้ผู้ปกครองเห็นภาพรวมง่าย ๆ ว่าลูกเรียนไปถึงไหน เก่งเรื่องไหน และควรเสริมเรื่องอะไร
                    </Tip>
                </div>
            ),
        },
        // 9 ── review & coupon ─────────────────────────────────────────
        {
            id: "review", emoji: "⭐", icon: <Star size={20} />, title: "รีวิว & รับคูปอง ฿100",
            sub: "เขียนรีวิวคอร์ส รับส่วนลดทันที",
            accent: "bg-amber-500", chipBg: "bg-amber-50 dark:bg-amber-950/40", iconBg: "bg-amber-50 dark:bg-amber-950/40",
            iconText: "text-amber-600 dark:text-amber-500", border: "border-amber-200 dark:border-amber-900",
            content: (
                <div className="space-y-4">
                    <div className="space-y-3.5">
                        <Step n={1} title="กดปุ่มรีวิวที่คอร์สของคุณ" color="bg-amber-500">
                            คอร์สที่เปิดสิทธิ์แล้วจะมีปุ่ม <strong>&quot;⭐ รีวิวคอร์สนี้ รับส่วนลด ฿100&quot;</strong>
                        </Step>
                        <Step n={2} title="ให้ดาว + เขียนความรู้สึก" color="bg-amber-500">
                            เลือกคะแนนดาว (1–5), ตั้งชื่อที่แสดง และเขียนรีวิว <strong>อย่างน้อย 20 ตัวอักษร</strong>
                        </Step>
                        <Step n={3} title="รับโค้ดส่วนลดทันที" color="bg-amber-500">
                            ส่งสำเร็จได้โค้ด <strong>REVIEW-XXXXXX</strong> ลด <strong>100 บาท</strong> ใช้กับคอร์สถัดไปได้เลย
                        </Step>
                    </div>
                    <Tip variant="info">
                        ไม่ต้องกลัวโค้ดหาย — ดูย้อนหลังได้เสมอที่ <strong>&quot;🎁 คูปองของฉัน&quot;</strong> ในหน้าคอร์สของฉัน
                    </Tip>
                    <Tip variant="warn">
                        รีวิวได้ <strong>คอร์สละ 1 ครั้ง</strong> และโค้ดผูกกับบัญชีของคุณ ใช้ได้เฉพาะเจ้าของเท่านั้น
                    </Tip>
                </div>
            ),
        },
        // 10 ── more: free content, dark mode, contact ─────────────────
        {
            id: "more", emoji: "✨", icon: <Sparkles size={20} />, title: "เนื้อหาฟรี, โหมดมืด & ติดต่อเรา",
            sub: "ตัวช่วยและช่องทางสอบถาม",
            accent: "bg-slate-500", chipBg: "bg-slate-100 dark:bg-slate-800", iconBg: "bg-slate-100 dark:bg-slate-800",
            iconText: "text-slate-600 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700",
            content: (
                <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-2.5">
                        <MiniCard icon="📖" title="สรุปสูตร & เนื้อหา" desc="คลังสรุปคณิตศาสตร์ อ่านทบทวนก่อนสอบ — ฟรี ไม่ต้องสมัคร" />
                        <MiniCard icon="📰" title="บทความครูฮีม" desc="เทคนิคเรียน ข่าวสอบ และเรื่องดี ๆ — ฟรี" />
                        <MiniCard icon="❓" title="คำถามที่พบบ่อย (FAQ)" desc="คลายข้อสงสัยก่อนตัดสินใจ" />
                        <MiniCard icon="🌙" title="โหมดกลางคืน" desc="กดไอคอนพระอาทิตย์/พระจันทร์มุมขวาบน ถนอมสายตา จำค่าทั้งเว็บ" />
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-3">มีคำถาม? ทักครูฮีมได้เลย 💬</p>
                        <div className="flex flex-wrap gap-2">
                            <a href="https://www.facebook.com/kruheem.math/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors">
                                <Facebook size={15} /> Facebook: ครูฮีม
                            </a>
                            <a href="https://line.me/ti/p/~kruheemschool" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors">
                                <MessageCircle size={15} /> LINE: @kruheemschool
                            </a>
                            <a href="mailto:kruheemschool@gmail.com" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors">
                                <Mail size={15} /> kruheemschool@gmail.com
                            </a>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <Smartphone size={14} /> เว็บไซต์ใช้งานได้ลื่นทั้งคอม แท็บเล็ต และมือถือ — บนมือถือกดไอคอนเมนู (☰) มุมขวาบน
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans flex flex-col transition-colors">
            <Navbar />

            <div className="relative flex-grow pt-24 pb-24">
                {/* soft background glow */}
                <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-200/30 dark:bg-teal-900/10 rounded-full filter blur-[120px] pointer-events-none" />
                <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-200/30 dark:bg-indigo-900/10 rounded-full filter blur-[120px] pointer-events-none" />

                <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6">
                    {/* back */}
                    <Link href="/my-courses" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors group mb-8">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        กลับหน้าคอร์สของฉัน
                    </Link>

                    {/* hero */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 px-4 py-1.5 rounded-full text-xs font-bold mb-4 border border-teal-200/70 dark:border-teal-900">
                            <Sparkles size={14} />
                            คู่มือฉบับเข้าใจง่าย · อัปเดต 2026
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 dark:from-teal-400 dark:via-blue-400 dark:to-indigo-400 mb-4 leading-tight pb-1">
                            คู่มือการใช้งานเว็บไซต์
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg font-medium max-w-xl mx-auto">
                            ทุกอย่างที่ผู้ปกครองและนักเรียนต้องรู้เกี่ยวกับ <strong className="text-slate-700 dark:text-slate-200">KruHeem School</strong>
                            <br className="hidden sm:block" /> ตั้งแต่สมัคร จนถึงรับใบประกาศ — เลือกหัวข้อที่อยากรู้ได้เลย 👇
                        </p>
                    </div>

                    {/* quick nav */}
                    <div className="mb-8 flex flex-wrap justify-center gap-2">
                        {sections.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    setOpen(s.id);
                                    setTimeout(() => document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 ${open === s.id
                                    ? `${s.chipBg} ${s.iconText} ${s.border}`
                                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                    }`}
                            >
                                {s.emoji} {s.title.split(" ")[0].replace(/[,&]$/, "")}
                            </button>
                        ))}
                    </div>

                    {/* sections */}
                    <div className="space-y-3">
                        {sections.map((s, i) => {
                            const isOpen = open === s.id;
                            return (
                                <div key={s.id} id={`sec-${s.id}`} className="scroll-mt-24">
                                    <button
                                        onClick={() => toggle(s.id)}
                                        className={`w-full text-left bg-white dark:bg-slate-900 border rounded-2xl p-4 md:p-5 transition-all duration-300 hover:shadow-md ${isOpen ? `${s.border} shadow-sm` : "border-slate-100 dark:border-slate-800"}`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className={`w-11 h-11 ${s.iconBg} rounded-xl flex items-center justify-center ${s.iconText} shrink-0`}>
                                                    {s.icon}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-black text-slate-300 dark:text-slate-600">{String(i + 1).padStart(2, "0")}</span>
                                                        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] md:text-lg truncate">{s.title}</h2>
                                                    </div>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate">{s.sub}</p>
                                                </div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isOpen ? `${s.chipBg} ${s.iconText} rotate-180` : "bg-slate-50 dark:bg-slate-800 text-slate-400"}`}>
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    </button>

                                    <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"}`}>
                                        <div className="overflow-hidden">
                                            <div className="px-4 md:px-5 pt-4 pb-6 bg-white dark:bg-slate-900 border border-t-0 border-slate-100 dark:border-slate-800 rounded-b-2xl -mt-2">
                                                {s.content}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* footer CTA */}
                    <div className="mt-10 rounded-2xl bg-gradient-to-r from-teal-50 via-blue-50 to-indigo-50 dark:from-teal-950/30 dark:via-blue-950/20 dark:to-indigo-950/30 border border-teal-100 dark:border-teal-900/50 p-6 text-center">
                        <p className="text-2xl mb-1">🤙</p>
                        <p className="font-bold text-slate-800 dark:text-slate-100">ยังมีคำถามอยู่ใช่ไหม?</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">ครูฮีมและทีมงานยินดีช่วยเสมอ</p>
                        <div className="flex flex-wrap justify-center gap-2.5">
                            <Link href="/faq" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold border border-slate-200 dark:border-slate-700 hover:border-teal-300 hover:text-teal-600 transition-colors">
                                <HelpCircle size={15} /> คำถามที่พบบ่อย
                            </Link>
                            <Link href="/how-to-apply" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm shadow-teal-600/20">
                                <Rocket size={15} /> เริ่มสมัครเรียน
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
