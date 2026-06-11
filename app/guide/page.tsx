"use client";
// ============================================================
// /guide — "คู่มือการใช้งานเว็บไซต์" · Guide v2
// Theme: Math Notebook (สมุดกราฟคณิต) — graph-paper bg, mint brand,
// per-section accent via --acc + color-mix, light/dark via next-themes.
// Self-contained chrome: reading-progress bar, brand bar, hero with
// floating math glyphs, 5-step flow chart, in-guide search, sticky
// quick-nav, 13 sections in 3 groups, CSS UI mockups, themed footer.
// ============================================================
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
    ArrowLeft, ArrowRight, Sun, Moon, Search, ChevronDown,
    UserPlus, BookOpen, CreditCard, LayoutGrid, PlayCircle, Zap, Award,
    Star, FileText, NotebookPen, Users, Palette, Lightbulb,
    Facebook, MessageCircle, Mail, Sparkles,
} from "lucide-react";

// ── building blocks ───────────────────────────────────────────────────
function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
    return (
        <div className="gd-step">
            <span className="gd-step-n">{n}</span>
            <div className="min-w-0">
                <h4 className="gd-step-t">{title}</h4>
                {children && <div className="gd-step-d">{children}</div>}
            </div>
        </div>
    );
}
function Tip({ children, k = "info" }: { children: React.ReactNode; k?: "info" | "warn" | "ok" }) {
    const ic = { info: "💡", warn: "⚠️", ok: "✅" };
    return <div className={`gd-tip ${k}`}><span>{ic[k]}</span><div>{children}</div></div>;
}
function Mini({ icon, title, desc }: { icon: string; title: string; desc: string }) {
    return (
        <div className="gd-mini">
            <span className="gd-mini-ic">{icon}</span>
            <div className="min-w-0"><p className="gd-mini-t">{title}</p><p className="gd-mini-d">{desc}</p></div>
        </div>
    );
}

// ── CSS mockups (no external images) ──────────────────────────────────
function MockLogin() {
    return (
        <div className="gd-mock">
            <div className="gd-mock-bar"><span /><span /><span /></div>
            <div className="gd-mock-body" style={{ gap: 10 }}>
                <div className="gd-mk-label">อีเมล</div>
                <div className="gd-mk-input">student@email.com</div>
                <div className="gd-mk-label">รหัสผ่าน</div>
                <div className="gd-mk-input">••••••••</div>
                <div className="gd-mk-btn">สมัครสมาชิก</div>
            </div>
        </div>
    );
}
function MockPay() {
    return (
        <div className="gd-mock">
            <div className="gd-mock-bar"><span /><span /><span /></div>
            <div className="gd-mock-body gd-grid2">
                <div className="gd-mk-qr"><div className="gd-mk-qr-grid" />พร้อมเพย์</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="gd-mk-slip">＋ แนบสลิป</div>
                    <div className="gd-mk-btn">ยืนยันการแจ้งโอน →</div>
                </div>
            </div>
        </div>
    );
}
function MockVideo() {
    return (
        <div className="gd-mock">
            <div className="gd-mk-video">
                <div className="gd-mk-float">📝 สรุปเนื้อหา</div>
                <div className="gd-mk-float b">📄 ดาวน์โหลดเอกสาร</div>
                <div className="gd-mk-play">▶</div>
                <div className="gd-mk-save">บันทึกและไปต่อ</div>
            </div>
        </div>
    );
}
function MockCert() {
    return (
        <div className="gd-mock gd-mk-cert">
            <div className="gd-mk-cert-seal">🏆</div>
            <p className="gd-mk-cert-h">CERTIFICATE OF COMPLETION</p>
            <p className="gd-mk-cert-name">ชื่อนักเรียน</p>
            <span className="gd-mk-cert-line" />
            <p className="gd-mk-cert-sub">KruHeem Math School</p>
        </div>
    );
}

// ── section model ─────────────────────────────────────────────────────
interface Sec {
    id: string; n: number; acc: string; icon: React.ReactNode; title: string; sub: string;
    keys: string; content: React.ReactNode;
}

export default function GuideV2() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState<string | null>("signup");
    const [query, setQuery] = useState("");
    const [progress, setProgress] = useState(0);

    useEffect(() => setMounted(true), []);
    useEffect(() => {
        const onScroll = () => {
            const h = document.documentElement;
            const max = h.scrollHeight - h.clientHeight;
            setProgress(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const go = (id: string) => {
        setOpen(id);
        setTimeout(() => document.getElementById(`gd-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    };

    const sections: Sec[] = [
        // ── Group A: เริ่มต้นใช้งาน ───────────────────────────────────
        {
            id: "signup", n: 1, acc: "#6366f1", icon: <UserPlus size={20} />, title: "สมัครสมาชิก",
            sub: "สร้างบัญชีด้วยอีเมล + รหัสผ่าน", keys: "สมัคร signup register login เข้าสู่ระบบ รหัสผ่าน อีเมล",
            content: (
                <>
                    <div className="gd-steps">
                        <Step n={1} title="กดปุ่ม “สมัครสมาชิก” บนเมนูด้านบน" />
                        <Step n={2} title="กรอกอีเมล + ตั้งรหัสผ่าน">ตั้งรหัสผ่าน <b>อย่างน้อย 6 ตัวอักษร</b> แล้วยืนยันอีกครั้ง</Step>
                        <Step n={3} title="เริ่มใช้งานได้ทันที">สมัครเสร็จกด <b>“ไปแจ้งโอนเงิน”</b> เพื่อสมัครคอร์ส หรือเข้า <b>“คอร์สของฉัน”</b> ก่อนก็ได้</Step>
                    </div>
                    <MockLogin />
                    <Tip k="info"><b>ลืมรหัสผ่าน?</b> กด <b>“ลืมรหัสผ่าน?”</b> ในหน้าเข้าสู่ระบบ ระบบส่งลิงก์รีเซ็ตไปที่อีเมล (1–2 นาที ถ้าไม่เจอลองดูใน Spam)</Tip>
                    <Tip k="ok">เคยสมัครด้วย <b>Google</b> ไว้? ยังเข้าได้เหมือนเดิม — ในหน้าเข้าสู่ระบบกด “เข้าสู่ระบบด้วย Google”</Tip>
                </>
            ),
        },
        {
            id: "courses", n: 2, acc: "#f59e0b", icon: <BookOpen size={20} />, title: "เลือกคอร์ส",
            sub: "ดูรายละเอียดแล้วเลือกสมัคร", keys: "คอร์ส course เลือก ราคา หลักสูตร",
            content: (
                <>
                    <div className="gd-steps">
                        <Step n={1} title="เปิดดูคอร์สที่หน้าแรก">คอร์สแบ่งตามระดับชั้น เลื่อนดูในหน้าแรกได้เลย</Step>
                        <Step n={2} title="กดเข้าไปดูรายละเอียด">เห็นเนื้อหาที่เรียน หลักสูตร ราคา รีวิว และคลิปตัวอย่างฟรี</Step>
                        <Step n={3} title="กด “สมัครเรียน”">หรือไปหน้า <b>“แจ้งโอน”</b> เพื่อเลือกหลายคอร์สพร้อมกัน</Step>
                    </div>
                    <Tip k="ok">บางคอร์สเปิดให้ <b>ดูฟรีบทแรก ๆ</b> และมักมีโปรราคาพิเศษ — ลองชิมก่อนตัดสินใจได้</Tip>
                </>
            ),
        },
        {
            id: "payment", n: 3, acc: "#10b981", icon: <CreditCard size={20} />, title: "ชำระเงิน & แจ้งโอน",
            sub: "เลือกคอร์ส โอนเงิน แนบสลิป", keys: "จ่ายเงิน ชำระ แจ้งโอน สลิป คูปอง qr พร้อมเพย์ payment",
            content: (
                <>
                    <p className="gd-p">กดเมนู <b>“แจ้งโอน”</b> ด้านบน เข้าสู่หน้าแจ้งโอนแบบ <b>4 ขั้นตอน</b>:</p>
                    <div className="gd-steps">
                        <Step n={1} title="เลือกคอร์ส">เลือกได้หลายคอร์สพร้อมกัน ระบบรวมราคาให้</Step>
                        <Step n={2} title="กรอกข้อมูลผู้เรียน">ชื่อ–นามสกุล, เบอร์โทร, LINE ID (ถ้ามี)</Step>
                        <Step n={3} title="ชำระเงิน">สแกน <b>QR พร้อมเพย์</b> หรือโอนตามเลขบัญชี · มีโค้ดส่วนลดกรอกช่อง <b>“กรอกโค้ดส่วนลด”</b> แล้วกด <b>“ใช้”</b></Step>
                        <Step n={4} title="แนบสลิป & ยืนยัน">แนบรูปสลิป (สูงสุด 5 รูป) แล้วกด <b>“ยืนยันการแจ้งโอน”</b></Step>
                    </div>
                    <MockPay />
                    <Tip k="ok">ส่งเสร็จคอร์สขึ้นสถานะ <b>“รออนุมัติ”</b> — ครูตรวจสลิปและเปิดสิทธิ์ให้ <b>ภายใน 24 ชม.</b></Tip>
                    <Tip k="warn">เปิดเว็บจากในแอป <b>LINE / Facebook / Messenger / IG</b>? ระบบจะให้กด <b>“เปิดใน Chrome/Safari”</b> ก่อน — สำคัญมาก ไม่งั้นสมัคร/ล็อกอินอาจไม่สำเร็จ</Tip>
                </>
            ),
        },
        {
            id: "hub", n: 4, acc: "#14b8a6", icon: <LayoutGrid size={20} />, title: "คอร์สของฉัน",
            sub: "ศูนย์รวมการเรียนของคุณ", keys: "คอร์สของฉัน my-courses ความก้าวหน้า คูปอง สถานะ เรียนต่อ",
            content: (
                <>
                    <p className="gd-p">หน้า <b>“คอร์สของฉัน”</b> รวมทุกอย่างไว้ที่เดียว:</p>
                    <div className="gd-grid">
                        <Mini icon="🙋" title="โปรไฟล์ & สถิติ" desc="ชื่อ รูป คำคม + จำนวนคอร์ส & ความก้าวหน้าเฉลี่ย" />
                        <Mini icon="▶️" title="เรียนต่อจากครั้งล่าสุด" desc="กดเดียวกลับไปบทที่ค้าง ต่อจากวินาทีเดิม" />
                        <Mini icon="📚" title="คอร์สแยกตามระดับชั้น" desc="เห็นความก้าวหน้า & สถานะแต่ละคอร์ส" />
                        <Mini icon="🎁" title="คูปองของฉัน" desc="โค้ดส่วนลด (พร้อมใช้ + ใช้แล้ว) ดูย้อนหลังได้เสมอ" />
                    </div>
                    <Tip k="info">สถานะคอร์ส: <b>“รออนุมัติ”</b> · <b>“เริ่มเรียน/เรียนต่อ”</b> · <b>“ทำข้อสอบเลย”</b> (คอร์สคลังข้อสอบ) — และมีปุ่ม <b>“⭐ รีวิวรับส่วนลด ฿100”</b></Tip>
                    <Tip k="ok">กดปุ่มกลม ⚙️ มุมขวาล่าง <b>“ปรับแต่งธีม”</b> เปลี่ยนสีพื้น/ลวดลาย/โหมดสว่าง-มืดของหน้านี้ได้ตามใจ (ของส่วนตัว)</Tip>
                </>
            ),
        },
        // ── Group B: เรียนรู้ในห้องเรียน ─────────────────────────────
        {
            id: "classroom", n: 5, acc: "#8b5cf6", icon: <PlayCircle size={20} />, title: "เข้าเรียน (ดูวิดีโอ)",
            sub: "เรียน เก็บความก้าวหน้า", keys: "เรียน วิดีโอ video บทเรียน สรุป ดาวน์โหลด เอกสาร บันทึกและไปต่อ",
            content: (
                <>
                    <div className="gd-steps">
                        <Step n={1} title="กด “เริ่มเรียน” หรือ “เรียนต่อ”">ระบบจำจุดที่เรียนค้างและพากลับไปต่อให้เอง</Step>
                        <Step n={2} title="เลือกบทจากแถบซ้าย">แบ่งเป็นหัวข้อ ค้นหาได้ มีแถบความก้าวหน้า % และปุ่ม <b>“📊 ดูสรุปผลของฉัน”</b></Step>
                        <Step n={3} title="ดูวิดีโอ + เครื่องมือประจำบท">
                            <div className="gd-grid3" style={{ marginTop: 8 }}>
                                <Mini icon="📝" title="สรุปเนื้อหา" desc="สรุปสั้น ๆ ของบท" />
                                <Mini icon="📄" title="ดาวน์โหลดเอกสาร" desc="ไฟล์ PDF ใบงาน/สไลด์" />
                                <Mini icon="🛠️" title="แก้ไขข้อมูล" desc="หมายเหตุเพิ่มเติม (บางบท)" />
                            </div>
                        </Step>
                        <Step n={4} title="กด “บันทึกและไปต่อ”">ปุ่มเขียวมุมขวาบน — นับ % และพาไปบทถัดไปอัตโนมัติ</Step>
                    </div>
                    <MockVideo />
                    <Tip k="info">ดูฟรีบทแรก ๆ ได้ (ปกติ 3 บทแรก) · กดลูกศร <b>← →</b> บนคีย์บอร์ดเปลี่ยนบทได้</Tip>
                </>
            ),
        },
        {
            id: "drill", n: 6, acc: "#d946ef", icon: <Zap size={20} />, title: "ตะลุยโจทย์ & ดูเฉลย",
            sub: "ฝึกข้อสอบ + วิเคราะห์ผลละเอียด", keys: "ตะลุยโจทย์ ข้อสอบ เฉลย exam โหมดฝึก จำลองสอบ วิเคราะห์",
            content: (
                <>
                    <p className="gd-p">ในห้องเรียนมีหมวด <b>“⚡️ ตะลุยโจทย์”</b> ในแถบซ้าย เลือกชุดแล้วเลือกโหมด:</p>
                    <div className="gd-grid">
                        <Mini icon="📝" title="โหมดฝึก" desc="ไม่กดดัน เปิดดูเฉลยทีละข้อได้ เหมาะกับทำความเข้าใจ" />
                        <Mini icon="⏱️" title="โหมดจำลองสอบ" desc="จับเวลาเหมือนสอบจริง หมดเวลาส่งอัตโนมัติ" />
                    </div>
                    <p className="gd-p" style={{ fontWeight: 600 }}>เฉลยละเอียดเป็นสมการจริง (LaTeX) แบ่ง 3 ส่วน</p>
                    <div className="gd-solve">
                        <div className="gd-solve-c" style={{ ["--c" as string]: "#6366f1" }}><b>💡 หลักการ</b><span>สูตร/แนวคิดที่ใช้</span></div>
                        <div className="gd-solve-c" style={{ ["--c" as string]: "#64748b" }}><b>👣 ขั้นตอน</b><span>ทำทีละสเต็ป</span></div>
                        <div className="gd-solve-c" style={{ ["--c" as string]: "#f43f5e" }}><b>⚠️ ข้อควรระวัง</b><span>จุดที่คนมักพลาด</span></div>
                    </div>
                    <Tip k="ok">ทำเสร็จได้รายงานจัดเต็ม: <b>ระดับความพร้อม</b>, <b>อันดับเทียบเพื่อน</b> (เก่งกว่า X%), หัวข้อที่ควรทบทวน และปุ่ม <b>“🔁 ฝึกเฉพาะข้อที่ผิด”</b> — คะแนนดีมีฉลองด้วย 🎉</Tip>
                </>
            ),
        },
        {
            id: "cert", n: 7, acc: "#eab308", icon: <Award size={20} />, title: "ใบประกาศนียบัตร",
            sub: "เรียนจบ 100% รับเกียรติบัตร", keys: "ใบประกาศ certificate เกียรติบัตร จบคอร์ส 100%",
            content: (
                <>
                    <div className="gd-steps">
                        <Step n={1} title="เรียนให้ครบทุกบท">กด “บันทึกและไปต่อ” จนแถบความก้าวหน้าขึ้น <b>100%</b></Step>
                        <Step n={2} title="กด “🏆 รับใบประกาศนียบัตร”">ปุ่มจะปลดล็อกที่มุมขวาบนของหน้าเรียน</Step>
                        <Step n={3} title="บันทึกเก็บไว้">กด <b>“📸 บันทึกรูปภาพ”</b> — ใส่ชื่อนักเรียน + ชื่อคอร์สให้อัตโนมัติ</Step>
                    </div>
                    <MockCert />
                </>
            ),
        },
        // ── Group C: ฝึกฝน & ฟีเจอร์เสริม ───────────────────────────
        {
            id: "review", n: 8, acc: "#f97316", icon: <Star size={20} />, title: "รีวิว & รับคูปอง ฿100",
            sub: "เขียนรีวิว รับส่วนลดทันที", keys: "รีวิว review คูปอง coupon ส่วนลด 100 บาท",
            content: (
                <>
                    <div className="gd-steps">
                        <Step n={1} title="กดปุ่มรีวิวที่คอร์สของคุณ">คอร์สที่เปิดสิทธิ์แล้วมีปุ่ม <b>“⭐ รีวิวคอร์สนี้ รับส่วนลด ฿100”</b></Step>
                        <Step n={2} title="ให้ดาว + เขียนความรู้สึก">เลือกดาว (1–5), ตั้งชื่อที่แสดง, เขียน <b>อย่างน้อย 20 ตัวอักษร</b></Step>
                        <Step n={3} title="รับโค้ดทันที">ได้โค้ด <b>REVIEW-XXXXXX</b> ลด <b>100 บาท</b> ใช้กับคอร์สถัดไป</Step>
                    </div>
                    <Tip k="info">ดูโค้ดย้อนหลังได้เสมอที่ <b>“🎁 คูปองของฉัน”</b> · รีวิวได้คอร์สละ 1 ครั้ง · โค้ดผูกกับบัญชีคุณ</Tip>
                </>
            ),
        },
        {
            id: "exambank", n: 9, acc: "#f43f5e", icon: <FileText size={20} />, title: "คลังข้อสอบ & ฝึกทำโจทย์",
            sub: "ฝึกฟรีได้ทุกคน + สถิติส่วนตัว", keys: "คลังข้อสอบ ฝึกทำโจทย์ practice exam สถิติ dashboard บันทึกข้อ",
            content: (
                <>
                    <div className="gd-grid">
                        <Mini icon="🗂️" title="คลังข้อสอบ" desc="ชุดข้อสอบแยกหมวด ทำจับเวลา ดูคะแนน+เฉลยทันที (ชุดฟรีมีให้)" />
                        <Mini icon="🎯" title="ฝึกตามหัวข้อ" desc="เลือกเรื่องที่อยากฝึก ไม่จับเวลา ทำได้ไม่จำกัด" />
                        <Mini icon="🔖" title="บันทึกข้อที่ชอบ" desc="กดหัวใจที่โจทย์ เก็บไว้ที่ “ข้อสอบที่บันทึกไว้”" />
                        <Mini icon="📊" title="สถิติการทำข้อสอบ" desc="กราฟพัฒนาการ, streak 🔥, เรดาร์จุดแข็ง-จุดอ่อน" />
                    </div>
                    <Tip k="ok"><b>เข้าทำข้อสอบ & ฝึกโจทย์ได้ฟรี ไม่ต้องล็อกอิน!</b> ถ้าล็อกอินระบบจะ <b>จำผลและสร้างสถิติส่วนตัว</b> ให้ (เป้าหมาย 80%, Heatmap หัวข้อ, เทียบค่าเฉลี่ยรวม)</Tip>
                </>
            ),
        },
        {
            id: "summary", n: 10, acc: "#06b6d4", icon: <NotebookPen size={20} />, title: "สรุปสูตร & บทความ",
            sub: "อ่านทบทวน — ฟรี ไม่ต้องสมัคร", keys: "สรุปสูตร summary บทความ blog ฟรี ทบทวน",
            content: (
                <>
                    <div className="gd-grid">
                        <Mini icon="📖" title="สรุปสูตร & เนื้อหา" desc="คลังสรุปคณิตศาสตร์ อ่านทบทวนก่อนสอบ" />
                        <Mini icon="📰" title="บทความครูฮีม" desc="เทคนิคเรียน ข่าวสอบ และเรื่องดี ๆ" />
                    </div>
                    <Tip k="ok">เนื้อหาสรุปสูตรและบทความ <b>อ่านฟรีทั้งหมด</b> ไม่ต้องสมัครสมาชิก!</Tip>
                </>
            ),
        },
        {
            id: "parent", n: 11, acc: "#3b82f6", icon: <Users size={20} />, title: "ติดตามผลการเรียน (ผู้ปกครอง)",
            sub: "ลิงก์แชร์ ดูได้ไม่ต้องล็อกอิน", keys: "ผู้ปกครอง parent ติดตามผล รายงาน แชร์",
            content: (
                <>
                    <div className="gd-steps">
                        <Step n={1} title="กดการ์ด “📊 ติดตามผลการเรียน”">อยู่ที่หน้าคอร์สของฉัน หรือหน้าโปรไฟล์</Step>
                        <Step n={2} title="ดูผลรวม + รายคอร์ส">คะแนนเฉลี่ย, พัฒนาการการทำข้อสอบ, หัวข้อที่ควรฝึกเพิ่ม, ความคืบหน้าแต่ละคอร์ส</Step>
                        <Step n={3} title="แชร์ลิงก์ให้ผู้ปกครอง">ก๊อปลิงก์ส่งให้พ่อแม่ได้เลย — <b>เปิดดูได้โดยไม่ต้องล็อกอิน</b></Step>
                    </div>
                    <Tip k="info">ออกแบบให้ผู้ปกครองเห็นภาพรวมง่าย ๆ ว่าลูกเรียนถึงไหน เก่งเรื่องไหน ควรเสริมอะไร</Tip>
                </>
            ),
        },
        {
            id: "profile", n: 12, acc: "#ec4899", icon: <Palette size={20} />, title: "แก้ไขโปรไฟล์",
            sub: "เปลี่ยนรูป ชื่อ และคำคม", keys: "โปรไฟล์ profile อวาตาร์ avatar รูป ชื่อ คำคม",
            content: (
                <>
                    <div className="gd-steps">
                        <Step n={1} title="เข้าหน้าโปรไฟล์">ที่คอร์สของฉัน กด <b>“✏️ แก้ไขข้อมูลส่วนตัว”</b></Step>
                        <Step n={2} title="เลือกอวาตาร์">มีหมวดให้เลือก (เด็ก/ชาย/หญิง/สัตว์น่ารัก/มอนสเตอร์) หรือ <b>อัปโหลดรูปตัวเอง</b></Step>
                        <Step n={3} title="ตั้งชื่อ & แคปชั่น">เปลี่ยนชื่อที่แสดง และเลือกคำคมประจำตัว (ฮีลใจ / ปลุกไฟ / Growth)</Step>
                        <Step n={4} title="กดบันทึก">ข้อมูลอัปเดตทันทีทั้งเว็บ</Step>
                    </div>
                </>
            ),
        },
        {
            id: "tips", n: 13, acc: "#64748b", icon: <Lightbulb size={20} />, title: "เคล็ดลับ & ติดต่อเรา",
            sub: "โหมดมืด มือถือ และช่องทางสอบถาม", keys: "เคล็ดลับ โหมดมืด dark mode มือถือ ติดต่อ line facebook อีเมล",
            content: (
                <>
                    <div className="gd-grid">
                        <Mini icon="🌙" title="โหมดกลางคืน" desc="กดไอคอนพระอาทิตย์/พระจันทร์มุมขวาบน จำค่าทั้งเว็บ ถนอมสายตา" />
                        <Mini icon="📱" title="ใช้บนมือถือ" desc="ลื่นทุกขนาดจอ กดไอคอนเมนู (☰) มุมขวาบนเพื่อเปิดเมนู" />
                        <Mini icon="❓" title="คำถามที่พบบ่อย" desc="คลายข้อสงสัยก่อนตัดสินใจที่หน้า FAQ" />
                        <Mini icon="🎬" title="ดูคลิปตัวอย่างฟรี" desc="ทุกคอร์สมีคลิปตัวอย่างให้ดูก่อนสมัคร" />
                    </div>
                    <div className="gd-contact">
                        <p className="gd-contact-h">มีคำถาม? ทักครูฮีมได้เลย 💬</p>
                        <div className="gd-contact-row">
                            <a href="https://www.facebook.com/kruheem.math/" target="_blank" rel="noopener noreferrer" className="gd-contact-b fb"><Facebook size={15} /> Facebook: ครูฮีม</a>
                            <a href="https://line.me/ti/p/~kruheemschool" target="_blank" rel="noopener noreferrer" className="gd-contact-b ln"><MessageCircle size={15} /> LINE: @kruheemschool</a>
                            <a href="mailto:kruheemschool@gmail.com" className="gd-contact-b ml"><Mail size={15} /> kruheemschool@gmail.com</a>
                        </div>
                    </div>
                </>
            ),
        },
    ];

    const groups = [
        { label: "เริ่มต้นใช้งาน", emoji: "🚀", ids: ["signup", "courses", "payment", "hub"] },
        { label: "เรียนรู้ในห้องเรียน", emoji: "📖", ids: ["classroom", "drill", "cert"] },
        { label: "ฝึกฝน & ฟีเจอร์เสริม", emoji: "✨", ids: ["review", "exambank", "summary", "parent", "profile", "tips"] },
    ];

    const byId = (id: string) => sections.find((s) => s.id === id)!;
    const q = query.trim().toLowerCase();
    const matches = (s: Sec) => !q || s.title.toLowerCase().includes(q) || s.keys.toLowerCase().includes(q);
    const flowSteps = ["signup", "courses", "payment", "classroom", "cert"];
    const flowColors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#eab308"];

    // ── one accordion card ───────────────────────────────────────────
    const Card = (s: Sec, nextId?: string) => {
        const isOpen = open === s.id;
        return (
            <div key={s.id} id={`gd-${s.id}`} className={`gd-card ${isOpen ? "open" : ""}`} style={{ ["--acc" as string]: s.acc }}>
                <button className="gd-head" onClick={() => setOpen(isOpen ? null : s.id)}>
                    <span className="gd-head-ic">{s.icon}</span>
                    <span className="gd-head-tx">
                        <span className="gd-head-row"><span className="gd-head-n">{String(s.n).padStart(2, "0")}</span><span className="gd-head-t">{s.title}</span></span>
                        <span className="gd-head-s">{s.sub}</span>
                    </span>
                    <span className="gd-head-cv"><ChevronDown size={17} /></span>
                </button>
                <div className="gd-body">
                    <div className="gd-body-in">
                        <div className="gd-body-pad">
                            {s.content}
                            {nextId && (
                                <button className="gd-next" onClick={() => go(nextId)}>
                                    อ่านหัวข้อถัดไป: {byId(nextId).title} <ArrowRight size={15} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const orderedIds = groups.flatMap((g) => g.ids);
    const nextOf = (id: string) => { const i = orderedIds.indexOf(id); return i >= 0 && i < orderedIds.length - 1 ? orderedIds[i + 1] : undefined; };

    return (
        <div className="gd-root">
            {/* reading progress */}
            <div className="gd-prog" style={{ width: `${progress}%` }} />

            {/* brand bar */}
            <header className="gd-bar">
                <Link href="/" className="gd-brand">
                    <Image src="/logo.png" alt="KruHeem" width={34} height={34} className="rounded-lg" />
                    <span className="gd-brand-tx">KruHeem<small>คู่มือการใช้งาน</small></span>
                </Link>
                <div className="gd-bar-r">
                    <Link href="/my-courses" className="gd-bar-link"><ArrowLeft size={15} /> คอร์สของฉัน</Link>
                    {mounted && (
                        <button className="gd-toggle" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="สลับโหมดสว่าง/มืด">
                            {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                    )}
                </div>
            </header>

            <main className="gd-wrap">
                {/* hero */}
                <section className="gd-hero">
                    <span className="gd-math" style={{ top: "8%", left: "6%" }}>÷</span>
                    <span className="gd-math" style={{ top: "20%", right: "8%" }}>×</span>
                    <span className="gd-math" style={{ top: "62%", left: "10%" }}>π</span>
                    <span className="gd-math" style={{ top: "70%", right: "12%" }}>√</span>
                    <span className="gd-math" style={{ top: "38%", left: "2%" }}>+</span>
                    <span className="gd-math" style={{ top: "4%", right: "26%" }}>%</span>
                    <span className="gd-badge"><Sparkles size={14} /> คู่มือฉบับสมบูรณ์ · อัปเดต 2026</span>
                    <h1 className="gd-h1">คู่มือการใช้งานเว็บไซต์</h1>
                    <p className="gd-lead">ทุกอย่างที่ผู้ปกครองและนักเรียนต้องรู้เกี่ยวกับ <b>KruHeem School</b> — ตั้งแต่สมัคร จนถึงรับใบประกาศ</p>
                    <div className="gd-welcome">
                        <span className="gd-welcome-ic">👋</span>
                        <div>
                            <p className="gd-welcome-t">สวัสดีครับ ผู้ปกครอง & นักเรียนทุกคน!</p>
                            <p className="gd-welcome-d">แนะนำให้อ่านคู่มือนี้สัก 5 นาทีก่อนเริ่มใช้งาน จะได้ใช้ทุกเครื่องมือได้เต็มที่ ไม่พลาดของดี 💚</p>
                        </div>
                    </div>
                </section>

                {/* flow chart */}
                <section className="gd-flow-wrap">
                    <p className="gd-flow-h">🗺️ เส้นทางการใช้งาน · 5 ขั้นตอน <small>(แตะเพื่อไปอ่านหัวข้อนั้น)</small></p>
                    <div className="gd-flow">
                        {flowSteps.map((id, i) => (
                            <div key={id} className="gd-flow-item">
                                <button className="gd-flow-card" style={{ ["--c" as string]: flowColors[i] }} onClick={() => go(id)}>
                                    <span className="gd-flow-n">{i + 1}</span>
                                    <span className="gd-flow-ic">{byId(id).icon}</span>
                                    <span className="gd-flow-t">{byId(id).title}</span>
                                </button>
                                {i < flowSteps.length - 1 && <span className="gd-flow-arrow">→</span>}
                            </div>
                        ))}
                    </div>
                </section>

                {/* search */}
                <div className="gd-search">
                    <Search size={17} />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาในคู่มือ เช่น สลิป, คูปอง, ใบประกาศ…" />
                    {query && <button onClick={() => setQuery("")} className="gd-search-x">✕</button>}
                </div>

                {/* quick nav */}
                <div className="gd-chips">
                    {sections.filter(matches).map((s) => (
                        <button key={s.id} className={`gd-chip ${open === s.id ? "on" : ""}`} style={{ ["--acc" as string]: s.acc }} onClick={() => go(s.id)}>
                            {s.title}
                        </button>
                    ))}
                </div>

                {/* grouped accordion */}
                {groups.map((g) => {
                    const items = g.ids.map(byId).filter(matches);
                    if (items.length === 0) return null;
                    return (
                        <section key={g.label} className="gd-group">
                            <h2 className="gd-group-h"><span>{g.emoji}</span>{g.label}</h2>
                            <div className="gd-group-list">
                                {items.map((s) => Card(s, q ? undefined : nextOf(s.id)))}
                            </div>
                        </section>
                    );
                })}

                {sections.filter(matches).length === 0 && (
                    <p className="gd-empty">🔍 ไม่พบหัวข้อที่ค้นหา — ลองคำอื่น เช่น “แจ้งโอน” หรือ “ใบประกาศ”</p>
                )}

                {/* footer */}
                <footer className="gd-foot">
                    <p className="gd-foot-em">🤙</p>
                    <p className="gd-foot-t">ยังมีคำถามอยู่ใช่ไหม?</p>
                    <p className="gd-foot-d">ครูฮีมและทีมงานยินดีช่วยเสมอ</p>
                    <div className="gd-foot-btns">
                        <Link href="/faq" className="gd-foot-b ghost">คำถามที่พบบ่อย</Link>
                        <Link href="/how-to-apply" className="gd-foot-b solid">เริ่มสมัครเรียน</Link>
                    </div>
                </footer>
            </main>

            {/* ════════ styles ════════ */}
            <style>{`
.gd-root{
  --paper:#F6F8F3; --card:#ffffff; --card2:#F3F7F2; --ink:#16302C; --ink2:#566863; --ink3:#8a9b96;
  --line:#e6ede9; --brand:#13a892; --brand-deep:#0c7d6c;
  --grid:rgba(19,168,146,.06); --grid2:rgba(19,168,146,.11);
  --shadow:0 20px 44px -28px rgba(16,48,44,.30); --shadow-sm:0 10px 24px -18px rgba(16,48,44,.22);
  min-height:100vh; color:var(--ink); background-color:var(--paper);
  background-image:
    linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px),
    linear-gradient(var(--grid2) 1px,transparent 1px),linear-gradient(90deg,var(--grid2) 1px,transparent 1px);
  background-size:32px 32px,32px 32px,160px 160px,160px 160px;
  font-family:var(--font-ibm-loop),var(--font-sarabun),sans-serif; line-height:1.5;
  transition:background-color .3s,color .3s;
}
:global(.dark) .gd-root{
  --paper:#0b1413; --card:#13201d; --card2:#182824; --ink:#e9f3f0; --ink2:#9fb2ad; --ink3:#6b7e79;
  --line:#243531; --brand:#2dd4bf; --brand-deep:#5eead4;
  --grid:rgba(45,212,191,.05); --grid2:rgba(45,212,191,.09);
  --shadow:0 20px 44px -26px rgba(0,0,0,.6); --shadow-sm:0 10px 24px -18px rgba(0,0,0,.5);
}
.gd-root *{box-sizing:border-box;}
.gd-mitr,.gd-h1,.gd-head-t,.gd-step-t,.gd-flow-t,.gd-group-h,.gd-badge,.gd-foot-t,.gd-chip,.gd-next,.gd-foot-b,.gd-mk-btn{font-family:var(--font-mitr),var(--font-kanit),sans-serif;}

/* progress + brand bar */
.gd-prog{position:fixed;top:0;left:0;height:3px;z-index:70;background:linear-gradient(90deg,var(--brand),#6366f1,#eab308);transition:width .12s linear;}
.gd-bar{position:fixed;top:0;left:0;right:0;z-index:60;height:60px;padding:0 clamp(14px,4vw,30px);display:flex;align-items:center;justify-content:space-between;
  background:color-mix(in srgb,var(--paper) 78%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);}
.gd-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.gd-brand-tx{display:flex;flex-direction:column;font-family:var(--font-mitr),sans-serif;font-weight:600;font-size:16px;color:var(--ink);line-height:1.05;}
.gd-brand-tx small{font-family:var(--font-ibm-loop),sans-serif;font-weight:500;font-size:11px;color:var(--ink3);}
.gd-bar-r{display:flex;align-items:center;gap:10px;}
.gd-bar-link{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:600;color:var(--ink2);text-decoration:none;padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:var(--card);transition:.18s;}
.gd-bar-link:hover{color:var(--brand-deep);border-color:color-mix(in srgb,var(--brand) 45%,var(--line));}
.gd-toggle{width:38px;height:38px;border-radius:999px;display:grid;place-items:center;background:var(--card);border:1px solid var(--line);color:var(--ink2);cursor:pointer;transition:.18s;}
.gd-toggle:hover{color:var(--brand-deep);transform:translateY(-1px);}

.gd-wrap{max-width:760px;margin:0 auto;padding:84px clamp(14px,4vw,22px) 70px;}

/* hero */
.gd-hero{position:relative;text-align:center;padding:18px 0 8px;overflow:hidden;}
.gd-math{position:absolute;font-family:var(--font-mitr),serif;font-size:clamp(28px,6vw,52px);font-weight:600;color:color-mix(in srgb,var(--brand) 26%,transparent);pointer-events:none;user-select:none;z-index:0;}
.gd-badge{position:relative;z-index:1;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--brand-deep);background:color-mix(in srgb,var(--brand) 12%,var(--card));border:1px solid color-mix(in srgb,var(--brand) 35%,var(--line));padding:6px 14px;border-radius:999px;margin-bottom:14px;}
.gd-h1{position:relative;z-index:1;font-size:clamp(30px,5.4vw,46px);font-weight:600;line-height:1.2;letter-spacing:-.5px;
  background:linear-gradient(100deg,var(--brand-deep),#6366f1 60%,#8b5cf6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin:0 0 12px;}
:global(.dark) .gd-h1{background:linear-gradient(100deg,var(--brand),#818cf8 60%,#c084fc);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.gd-lead{position:relative;z-index:1;font-size:clamp(14.5px,2vw,16.5px);color:var(--ink2);max-width:540px;margin:0 auto 20px;line-height:1.65;}
.gd-welcome{position:relative;z-index:1;display:flex;gap:14px;text-align:left;align-items:flex-start;max-width:560px;margin:0 auto;background:linear-gradient(120deg,color-mix(in srgb,#f59e0b 12%,var(--card)),var(--card));border:1px solid color-mix(in srgb,#f59e0b 28%,var(--line));border-radius:18px;padding:16px 18px;box-shadow:var(--shadow-sm);}
.gd-welcome-ic{font-size:26px;line-height:1;}
.gd-welcome-t{font-weight:700;color:var(--ink);font-size:14.5px;margin:0 0 3px;font-family:var(--font-mitr),sans-serif;}
.gd-welcome-d{font-size:13px;color:var(--ink2);margin:0;line-height:1.6;}

/* flow chart */
.gd-flow-wrap{margin-top:34px;}
.gd-flow-h{font-family:var(--font-mitr),sans-serif;font-weight:500;font-size:15px;color:var(--ink);text-align:center;margin:0 0 14px;}
.gd-flow-h small{font-weight:400;color:var(--ink3);font-size:12px;}
.gd-flow{display:flex;align-items:stretch;justify-content:center;gap:0;overflow-x:auto;padding:4px 2px 10px;scrollbar-width:thin;}
.gd-flow-item{display:flex;align-items:center;flex:0 0 auto;}
.gd-flow-card{position:relative;width:118px;min-height:104px;border:none;cursor:pointer;border-radius:16px;padding:14px 10px 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;text-align:center;
  background:var(--c);color:#fff;box-shadow:0 12px 22px -14px var(--c);transition:transform .18s,box-shadow .18s;}
.gd-flow-card:hover{transform:translateY(-3px);box-shadow:0 18px 28px -14px var(--c);}
.gd-flow-n{position:absolute;top:8px;left:9px;width:19px;height:19px;border-radius:999px;background:rgba(255,255,255,.28);display:grid;place-items:center;font-family:var(--font-mitr),sans-serif;font-weight:600;font-size:11px;}
.gd-flow-ic{display:grid;place-items:center;}
.gd-flow-t{font-family:var(--font-mitr),sans-serif;font-weight:500;font-size:12.5px;line-height:1.25;}
.gd-flow-arrow{color:var(--ink3);font-size:18px;padding:0 4px;flex:0 0 auto;}

/* search */
.gd-search{display:flex;align-items:center;gap:9px;margin:30px 0 16px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:11px 15px;box-shadow:var(--shadow-sm);color:var(--ink3);}
.gd-search input{flex:1;border:none;outline:none;background:transparent;font-family:var(--font-ibm-loop),sans-serif;font-size:14.5px;color:var(--ink);}
.gd-search input::placeholder{color:var(--ink3);}
.gd-search-x{border:none;background:var(--card2);color:var(--ink2);width:22px;height:22px;border-radius:999px;cursor:pointer;font-size:12px;}

/* quick nav chips */
.gd-chips{position:sticky;top:60px;z-index:30;display:flex;flex-wrap:wrap;gap:7px;padding:11px 0;margin-bottom:8px;background:color-mix(in srgb,var(--paper) 82%,transparent);backdrop-filter:blur(8px);}
.gd-chip{font-size:12.5px;font-weight:600;cursor:pointer;padding:6px 13px;border-radius:999px;background:var(--card);color:var(--ink2);border:1px solid var(--line);transition:.16s;}
.gd-chip:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--acc) 45%,var(--line));color:var(--acc);}
.gd-chip.on{background:color-mix(in srgb,var(--acc) 14%,var(--card));color:var(--acc);border-color:color-mix(in srgb,var(--acc) 40%,var(--line));}

/* groups */
.gd-group{margin-top:26px;}
.gd-group-h{display:flex;align-items:center;gap:8px;font-family:var(--font-mitr),sans-serif;font-weight:500;font-size:15px;color:var(--ink2);margin:0 0 12px;padding-left:4px;}
.gd-group-h span{font-size:17px;}
.gd-group-list{display:flex;flex-direction:column;gap:11px;}

/* accordion card */
.gd-card{background:var(--card);border:1px solid var(--line);border-radius:18px;scroll-margin-top:120px;transition:border-color .25s,box-shadow .25s;}
.gd-card.open{border-color:color-mix(in srgb,var(--acc) 42%,var(--line));box-shadow:var(--shadow);}
.gd-head{width:100%;display:flex;align-items:center;gap:13px;text-align:left;background:transparent;border:none;cursor:pointer;padding:15px 16px;}
.gd-head-ic{flex:0 0 auto;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:var(--acc);background:color-mix(in srgb,var(--acc) 13%,var(--card));border:1px solid color-mix(in srgb,var(--acc) 26%,var(--line));}
.gd-head-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
.gd-head-row{display:flex;align-items:center;gap:8px;}
.gd-head-n{font-family:var(--font-mitr),sans-serif;font-weight:600;font-size:11.5px;color:color-mix(in srgb,var(--acc) 70%,var(--ink3));}
.gd-head-t{font-family:var(--font-mitr),sans-serif;font-weight:500;font-size:16.5px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gd-head-s{font-size:12.5px;color:var(--ink3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gd-head-cv{flex:0 0 auto;width:30px;height:30px;border-radius:999px;display:grid;place-items:center;color:var(--ink3);background:var(--card2);transition:transform .35s,background .25s,color .25s;}
.gd-card.open .gd-head-cv{transform:rotate(180deg);background:color-mix(in srgb,var(--acc) 14%,var(--card));color:var(--acc);}
.gd-body{display:grid;grid-template-rows:0fr;transition:grid-template-rows .42s cubic-bezier(.3,1,.4,1);}
.gd-card.open .gd-body{grid-template-rows:1fr;}
.gd-body-in{overflow:hidden;}
.gd-body-pad{padding:2px 16px 18px;border-top:1px solid var(--line);margin-top:0;}
.gd-body-pad>*{margin-top:14px;}

/* content bits */
.gd-p{font-size:14px;color:var(--ink2);line-height:1.6;margin:0;}
.gd-p b{color:var(--ink);}
.gd-steps{display:flex;flex-direction:column;gap:13px;}
.gd-step{display:flex;gap:12px;align-items:flex-start;}
.gd-step-n{flex:0 0 auto;width:28px;height:28px;border-radius:9px;background:var(--acc);color:#fff;display:grid;place-items:center;font-weight:600;font-size:13px;box-shadow:0 6px 14px -8px var(--acc);}
.gd-step-t{font-family:var(--font-mitr),sans-serif;font-weight:500;font-size:15px;color:var(--ink);margin:2px 0 0;line-height:1.4;}
.gd-step-d{font-size:13px;color:var(--ink2);line-height:1.6;margin-top:3px;}
.gd-step-d b{color:var(--ink);}
.gd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:9px;}
.gd-grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;}
.gd-mini{display:flex;gap:10px;align-items:flex-start;background:var(--card2);border:1px solid var(--line);border-radius:13px;padding:11px 12px;}
.gd-mini-ic{font-size:18px;line-height:1;flex:0 0 auto;}
.gd-mini-t{font-weight:700;font-size:13px;color:var(--ink);margin:0;line-height:1.35;}
.gd-mini-d{font-size:11.5px;color:var(--ink2);margin:2px 0 0;line-height:1.5;}

/* tips */
.gd-tip{display:flex;gap:9px;align-items:flex-start;border-radius:13px;padding:11px 13px;font-size:12.8px;font-weight:500;line-height:1.6;border:1px solid;}
.gd-tip span{flex:0 0 auto;font-size:15px;line-height:1.3;}
.gd-tip b{font-weight:700;}
.gd-tip.info{background:color-mix(in srgb,#3b82f6 10%,var(--card));border-color:color-mix(in srgb,#3b82f6 26%,var(--line));color:color-mix(in srgb,#1d4ed8 88%,var(--ink));}
.gd-tip.warn{background:color-mix(in srgb,#f59e0b 12%,var(--card));border-color:color-mix(in srgb,#f59e0b 30%,var(--line));color:color-mix(in srgb,#b45309 86%,var(--ink));}
.gd-tip.ok{background:color-mix(in srgb,#10b981 11%,var(--card));border-color:color-mix(in srgb,#10b981 28%,var(--line));color:color-mix(in srgb,#047857 86%,var(--ink));}
:global(.dark) .gd-tip.info{color:#93c5fd;}:global(.dark) .gd-tip.warn{color:#fcd34d;}:global(.dark) .gd-tip.ok{color:#6ee7b7;}

/* 3-part solution */
.gd-solve{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;}
.gd-solve-c{background:color-mix(in srgb,var(--c) 9%,var(--card));border-left:3px solid var(--c);border-radius:9px;padding:9px 11px;}
.gd-solve-c b{display:block;font-size:12.5px;color:var(--c);font-weight:700;}
.gd-solve-c span{font-size:11px;color:var(--ink2);}

/* next button */
.gd-next{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-mitr),sans-serif;font-weight:500;font-size:13.5px;color:var(--acc);background:color-mix(in srgb,var(--acc) 10%,var(--card));border:1px solid color-mix(in srgb,var(--acc) 30%,var(--line));border-radius:11px;padding:9px 15px;cursor:pointer;transition:.18s;}
.gd-next:hover{background:color-mix(in srgb,var(--acc) 18%,var(--card));transform:translateX(2px);}

/* mockups */
.gd-mock{background:var(--card2);border:1px solid var(--line);border-radius:14px;overflow:hidden;}
.gd-mock-bar{display:flex;gap:5px;padding:9px 12px;border-bottom:1px solid var(--line);background:var(--card);}
.gd-mock-bar span{width:9px;height:9px;border-radius:999px;background:var(--line);}
.gd-mock-body{padding:13px;display:flex;flex-direction:column;}
.gd-grid2{display:grid;grid-template-columns:1fr 1.2fr;gap:11px;}
.gd-mk-label{font-size:11px;color:var(--ink3);font-weight:600;}
.gd-mk-input{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 11px;font-size:12.5px;color:var(--ink2);}
.gd-mk-btn{background:var(--brand);color:#fff;text-align:center;border-radius:9px;padding:9px;font-weight:600;font-size:13px;margin-top:4px;}
.gd-mk-qr{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;background:var(--card);border:1px solid var(--line);border-radius:10px;font-size:11px;color:var(--ink3);font-weight:600;}
.gd-mk-qr-grid{width:54px;height:54px;border-radius:6px;background:
  conic-gradient(var(--ink) 25%,transparent 0 50%,var(--ink) 0 75%,transparent 0);background-size:18px 18px;border:3px solid var(--ink);}
.gd-mk-slip{flex:1;display:grid;place-items:center;border:2px dashed color-mix(in srgb,var(--brand) 50%,var(--line));border-radius:10px;color:var(--brand-deep);font-size:12.5px;font-weight:600;min-height:54px;background:color-mix(in srgb,var(--brand) 6%,var(--card));}
.gd-mk-video{position:relative;aspect-ratio:16/9;background:linear-gradient(135deg,#1e293b,#334155);display:grid;place-items:center;}
.gd-mk-float{position:absolute;top:9px;left:9px;background:rgba(255,255,255,.92);color:#334155;font-size:10.5px;font-weight:700;padding:4px 8px;border-radius:7px;}
.gd-mk-float.b{top:36px;color:#1d4ed8;}
.gd-mk-play{width:46px;height:46px;border-radius:999px;background:rgba(255,255,255,.92);color:#334155;display:grid;place-items:center;font-size:17px;padding-left:3px;}
.gd-mk-save{position:absolute;top:9px;right:9px;background:#10b981;color:#fff;font-size:10.5px;font-weight:700;padding:5px 10px;border-radius:8px;}
.gd-mk-cert{display:flex;flex-direction:column;align-items:center;text-align:center;padding:20px;background:
  repeating-linear-gradient(45deg,color-mix(in srgb,#eab308 5%,var(--card)),color-mix(in srgb,#eab308 5%,var(--card)) 10px,var(--card) 10px,var(--card) 20px);border:2px solid color-mix(in srgb,#eab308 45%,var(--line));}
.gd-mk-cert-seal{font-size:30px;}
.gd-mk-cert-h{font-family:var(--font-mitr),sans-serif;font-weight:600;font-size:11px;letter-spacing:1.5px;color:#b45309;margin:6px 0 10px;}
.gd-mk-cert-name{font-family:var(--font-mitr),sans-serif;font-weight:500;font-size:18px;color:var(--ink);margin:0;}
.gd-mk-cert-line{width:150px;height:1px;background:var(--ink3);margin:5px 0 8px;}
.gd-mk-cert-sub{font-size:11px;color:var(--ink2);margin:0;}

/* contact */
.gd-contact{background:var(--card2);border:1px solid var(--line);border-radius:14px;padding:14px;}
.gd-contact-h{font-weight:700;font-size:13.5px;color:var(--ink);margin:0 0 10px;}
.gd-contact-row{display:flex;flex-wrap:wrap;gap:8px;}
.gd-contact-b{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;text-decoration:none;padding:8px 12px;border-radius:10px;border:1px solid var(--line);transition:.16s;}
.gd-contact-b:hover{transform:translateY(-1px);}
.gd-contact-b.fb{background:color-mix(in srgb,#3b82f6 12%,var(--card));color:#2563eb;}
.gd-contact-b.ln{background:color-mix(in srgb,#10b981 12%,var(--card));color:#059669;}
.gd-contact-b.ml{background:color-mix(in srgb,#f43f5e 11%,var(--card));color:#e11d48;}
:global(.dark) .gd-contact-b.fb{color:#93c5fd;}:global(.dark) .gd-contact-b.ln{color:#6ee7b7;}:global(.dark) .gd-contact-b.ml{color:#fda4af;}

.gd-empty{text-align:center;color:var(--ink2);font-size:14px;padding:40px 0;}

/* footer */
.gd-foot{margin-top:34px;text-align:center;border-radius:20px;padding:26px 20px;
  background:linear-gradient(120deg,color-mix(in srgb,var(--brand) 10%,var(--card)),color-mix(in srgb,#6366f1 9%,var(--card)));border:1px solid color-mix(in srgb,var(--brand) 24%,var(--line));}
.gd-foot-em{font-size:26px;margin:0;}
.gd-foot-t{font-family:var(--font-mitr),sans-serif;font-weight:600;font-size:18px;color:var(--ink);margin:4px 0 2px;}
.gd-foot-d{font-size:13px;color:var(--ink2);margin:0 0 16px;}
.gd-foot-btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;}
.gd-foot-b{text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:12px;transition:.18s;}
.gd-foot-b.ghost{background:var(--card);color:var(--ink);border:1px solid var(--line);}
.gd-foot-b.ghost:hover{border-color:color-mix(in srgb,var(--brand) 45%,var(--line));color:var(--brand-deep);}
.gd-foot-b.solid{background:var(--brand);color:#fff;box-shadow:0 12px 24px -14px var(--brand);}
.gd-foot-b.solid:hover{filter:brightness(1.05);transform:translateY(-1px);}

@media (max-width:560px){.gd-bar-link span{display:none;}.gd-grid2{grid-template-columns:1fr;}}
@media (prefers-reduced-motion:reduce){.gd-root *{transition:none!important;}}
            `}</style>
        </div>
    );
}
