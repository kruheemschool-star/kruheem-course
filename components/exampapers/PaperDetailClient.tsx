"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { uploadPublicFile } from "@/lib/pdfUpload";
import { useUserAuth } from "@/context/AuthContext";
import type { ExamPaper } from "@/types";
import toast, { Toaster } from "react-hot-toast";
import { FileText, Eye, ShoppingCart, Check, ShieldCheck, Download, ArrowLeft, X, UploadCloud, Loader2 } from "lucide-react";
import ExamAnalysisSection from "@/components/exampapers/ExamAnalysisSection";
import PaymentTransferInfo from "@/components/payment/PaymentTransferInfo";

const PHONE_RE = /^[0-9]{9,10}$/;

export default function PaperDetailClient({ paper }: { paper: ExamPaper }) {
    const { user } = useUserAuth();
    const router = useRouter();

    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [done, setDone] = useState(false);

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [lineId, setLineId] = useState("");
    const [slip, setSlip] = useState<File | null>(null);
    const [slipPreview, setSlipPreview] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState(0);

    const openCheckout = () => {
        if (!user) {
            toast("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ");
            router.push(`/login?redirect=/exam-papers/${paper.id}`);
            return;
        }
        setFullName(user.displayName || "");
        setCheckoutOpen(true);
    };

    const pickSlip = (f: File | null) => {
        if (!f) return;
        if (!f.type.startsWith("image/")) return toast.error("สลิปต้องเป็นรูปภาพ");
        if (f.size > 10 * 1024 * 1024) return toast.error("รูปใหญ่เกิน 10MB");
        if (slipPreview) URL.revokeObjectURL(slipPreview);
        setSlip(f);
        setSlipPreview(URL.createObjectURL(f));
    };

    const submit = async () => {
        if (!user) return;
        if (!fullName.trim()) return toast.error("กรุณากรอกชื่อ-นามสกุล");
        if (!PHONE_RE.test(phone)) return toast.error("กรุณากรอกเบอร์โทร 9–10 หลัก");
        if (!slip) return toast.error("กรุณาแนบสลิปโอนเงิน");

        setSubmitting(true);
        try {
            const slipUrl = await uploadPublicFile(slip, `slips/${user.uid}_${Date.now()}`, (p) => setProgress(p));
            const price = Number(paper.price || 0);
            await addDoc(collection(db, "enrollments"), {
                userId: user.uid,
                userEmail: user.email,
                userName: fullName.trim(),
                userTel: phone,
                lineId: lineId,
                courseId: paper.id,
                courseTitle: `ข้อสอบ PDF: ${paper.title}`,
                productType: "examPaper",
                paperId: paper.id,
                allowedExamLevel: null,
                price,
                discountAmount: 0,
                finalPrice: price,
                accessType: "lifetime",
                slipUrl,
                slipUrls: [slipUrl],
                status: "pending",
                createdAt: new Date(),
            });
            if (slipPreview) URL.revokeObjectURL(slipPreview);
            setCheckoutOpen(false);
            setDone(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
            console.error(e);
            toast.error("ส่งคำสั่งซื้อไม่สำเร็จ ลองใหม่อีกครั้ง");
        } finally {
            setSubmitting(false);
            setProgress(0);
        }
    };

    if (done) {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center mb-5">
                    <Check size={32} className="text-teal-600 dark:text-teal-300" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">ส่งคำสั่งซื้อแล้ว!</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-3">
                    ครูฮีมกำลังตรวจสอบสลิปของคุณ เมื่ออนุมัติแล้วคุณจะดาวน์โหลดไฟล์ได้ที่หน้า “คอร์สเรียนของฉัน” ทันที
                </p>
                <div className="flex items-center justify-center gap-3 mt-7">
                    <Link href="/my-courses" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5 transition">
                        <Download size={17} /> ไปหน้าคอร์สเรียนของฉัน
                    </Link>
                    <Link href="/exam-papers" className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold px-5 py-2.5 transition hover:bg-slate-200 dark:hover:bg-slate-700">
                        เลือกซื้อชุดอื่น
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
            <Toaster position="top-center" />
            <Link href="/exam-papers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-teal-600 mb-6">
                <ArrowLeft size={16} /> กลับไปคลังข้อสอบ
            </Link>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                {/* cover */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden aspect-[4/3] flex items-center justify-center">
                    {paper.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={paper.coverUrl} alt={paper.title} className="w-full h-full object-cover" />
                    ) : (
                        <FileText size={64} className="text-slate-300 dark:text-slate-600" />
                    )}
                </div>

                {/* info */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        {paper.level && <span className="rounded-full bg-teal-50 dark:bg-teal-950 px-2.5 py-1 text-xs font-bold text-teal-700 dark:text-teal-300">{paper.level}</span>}
                        {paper.category && <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">{paper.category}</span>}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">{paper.title}</h1>
                    {paper.description && <p className="text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">{paper.description}</p>}

                    <div className="flex items-baseline gap-2 mt-6">
                        <span className="text-3xl font-black text-teal-600 dark:text-teal-400">฿{Number(paper.price || 0).toLocaleString()}</span>
                        {paper.pageCount ? <span className="text-sm text-slate-400">· {paper.pageCount} หน้า</span> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-6">
                        <button onClick={openCheckout} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 transition shadow-sm">
                            <ShoppingCart size={19} /> ซื้อและดาวน์โหลด
                        </button>
                        {paper.previewUrl && (
                            <a href={paper.previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                                <Eye size={18} /> ดูตัวอย่างฟรี
                            </a>
                        )}
                    </div>

                    <div className="mt-7 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-teal-500 shrink-0" /> ไฟล์ PDF พร้อมเฉลยละเอียด</div>
                        <div className="flex items-center gap-2"><Download size={16} className="text-teal-500 shrink-0" /> ซื้อครั้งเดียว โหลดซ้ำได้ตลอดที่หน้า “ข้อสอบของฉัน”</div>
                        <div className="flex items-center gap-2"><Check size={16} className="text-teal-500 shrink-0" /> โอนเงินแล้วแนบสลิป ครูฮีมตรวจและอนุมัติให้</div>
                    </div>
                </div>
            </div>

            {/* วิเคราะห์แนวข้อสอบ — the sales section (shows only if data is filled in) */}
            <ExamAnalysisSection analysis={paper.analysis} />

            {/* checkout modal */}
            {checkoutOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }} onClick={() => !submitting && setCheckoutOpen(false)}>
                    <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">สั่งซื้อข้อสอบ</h2>
                            <button onClick={() => !submitting && setCheckoutOpen(false)} aria-label="ปิด" className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X size={20} /></button>
                        </div>

                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 mb-4 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 line-clamp-1 pr-2">{paper.title}</span>
                            <span className="font-black text-teal-600 dark:text-teal-400 shrink-0">฿{Number(paper.price || 0).toLocaleString()}</span>
                        </div>

                        {/* transfer details — same block as the main checkout */}
                        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">1. สแกน QR หรือโอนเข้าบัญชี</div>
                        <div className="mb-4"><PaymentTransferInfo compact /></div>
                        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">2. กรอกข้อมูล แล้วแนบสลิป</div>

                        <div className="space-y-3">
                            <input className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-teal-500" placeholder="ชื่อ-นามสกุล *" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                            <input className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-teal-500" placeholder="เบอร์โทรศัพท์ *" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))} />
                            <input className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-teal-500" placeholder="LINE ID (ถ้ามี)" value={lineId} onChange={(e) => setLineId(e.target.value)} />

                            <label className="block cursor-pointer">
                                <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 text-center hover:border-teal-500 transition">
                                    {slipPreview ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={slipPreview} alt="สลิป" className="max-h-40 mx-auto rounded-lg" />
                                    ) : (
                                        <div className="text-slate-400">
                                            <UploadCloud size={26} className="mx-auto mb-1.5" />
                                            <span className="text-sm font-semibold">แนบสลิปโอนเงิน *</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" hidden onChange={(e) => pickSlip(e.target.files?.[0] || null)} />
                                </div>
                            </label>
                        </div>

                        <button onClick={submit} disabled={submitting} className="w-full mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold px-5 py-3 transition">
                            {submitting ? <><Loader2 className="animate-spin" size={18} /> {progress > 0 ? `กำลังอัปโหลด ${progress}%` : "กำลังส่ง..."}</> : <><Check size={18} /> ยืนยันสั่งซื้อ</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
