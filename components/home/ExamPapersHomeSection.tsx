import Link from "next/link";
import { FileText, ArrowRight, Download } from "lucide-react";
import type { ExamPaper } from "@/types";

/**
 * ทางเข้าร้านเอกสาร/ข้อสอบ PDF บนหน้าแรก
 *
 * ก่อนหน้านี้หน้าแรกไม่มีทางเข้าร้านเลยนอกจากเมนูบนสุดกับลิงก์ในฟุตเตอร์ —
 * คนที่ไถหน้าแรกลงมาเรื่อยๆ จึงไม่มีวันรู้ว่าครูฮีมขายไฟล์ PDF อยู่
 *
 * การ์ดดึงสินค้าจริงจากร้าน (ไม่ฮาร์ดโค้ด) เพิ่มชุดใหม่ในหลังบ้านแล้วขึ้นเอง
 * ไม่มีสินค้า = ไม่แสดงทั้งส่วน
 */
export default function ExamPapersHomeSection({ papers }: { papers: ExamPaper[] }) {
    const items = papers.slice(0, 4);
    if (items.length === 0) return null;

    return (
        <section className="py-16 px-6 relative z-10">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-white/60 dark:border-slate-800 shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-bold px-3 py-1.5">
                                <FileText size={14} />
                                เอกสาร · ข้อสอบ PDF
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mt-3 leading-snug">
                                โหลดเก็บไว้ได้เลย ไม่ต้องรอเปิดคอร์ส
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mt-2 leading-relaxed max-w-2xl">
                                เอกสารสรุปบทและแนวข้อสอบเข้าเป็นไฟล์ PDF พร้อมเฉลยละเอียด
                                ซื้อครั้งเดียวโหลดเก็บไว้ได้ตลอด ปริ้นให้ลูกทำที่บ้านได้
                            </p>
                        </div>
                        <Link
                            href="/exam-papers"
                            className="shrink-0 self-start md:self-auto inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-6 py-3 hover:-translate-y-0.5 hover:shadow-lg transition-all group"
                        >
                            ดูทั้งร้าน
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    {/* จำนวนคอลัมน์ตามจำนวนสินค้าจริง — ตอนมี 3 ชุด กริด 4 ช่องจะเหลือช่องว่างข้างขวา */}
                    <div className={`grid grid-cols-2 gap-5 ${items.length >= 4 ? "lg:grid-cols-4" : items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                        {items.map((p) => (
                            <PaperCard key={p.id} paper={p} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function PaperCard({ paper: p }: { paper: ExamPaper }) {
    const inner = (
        <>
            {/* ปกเป็นกระดาษ A4 แนวตั้ง — object-contain ไม่งั้นโดนครอบหัวท้ายทิ้ง */}
            <div className="relative aspect-[3/4] bg-slate-50 dark:bg-slate-800 overflow-hidden">
                {p.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={p.coverUrl}
                        alt={p.title}
                        loading="lazy"
                        className={`w-full h-full object-contain transition ${p.comingSoon ? "opacity-60 grayscale" : "group-hover:scale-[1.03]"}`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                        <FileText size={40} />
                    </div>
                )}
                {p.badge && !p.comingSoon && (
                    <span className="absolute top-2 left-2 rounded-full bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 shadow">
                        {p.badge}
                    </span>
                )}
                {p.comingSoon && (
                    <span className="absolute top-2 left-2 rounded-full bg-slate-900/85 text-white text-[11px] font-bold px-2.5 py-1">
                        เร็วๆ นี้
                    </span>
                )}
            </div>

            <div className="p-4 flex flex-col flex-1">
                {/* whitespace-nowrap: บนมือถือแคบๆ ไม่งั้น "32 หน้า" ถูกตัดเป็นสองบรรทัด */}
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 [&>*]:whitespace-nowrap">
                    {p.level && <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">{p.level}</span>}
                    {p.pageCount ? <span>{p.pageCount} หน้า</span> : null}
                    {p.questionCount ? <span>· {p.questionCount} ข้อ</span> : null}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2 leading-snug line-clamp-3 flex-1">
                    {p.title}
                </h3>
                <div className="mt-3">
                    {p.comingSoon ? (
                        <span className="text-sm font-semibold text-slate-400">กำลังจัดทำ</span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-teal-700 dark:text-teal-300 font-black">
                            <Download size={14} />฿{p.price.toLocaleString()}
                        </span>
                    )}
                </div>
            </div>
        </>
    );

    const cls = "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col";

    // ชุด "เร็วๆ นี้" ยังไม่มีหน้าขายให้เข้า — ปล่อยเป็นการ์ดเฉยๆ ไม่ใช่ลิงก์ตาย
    if (p.comingSoon) return <div className={`${cls} group`}>{inner}</div>;

    return (
        <Link
            href={`/exam-papers/${p.id}`}
            className={`${cls} group hover:shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition`}
        >
            {inner}
        </Link>
    );
}
