"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, doc, setDoc, getDoc, getDocs, query, where } from "firebase/firestore";
import { withTimeout } from "@/lib/netGuard";
import { useInAppBrowser, openInExternalBrowser } from "@/lib/inAppBrowser";
import { uploadPublicFile } from "@/lib/pdfUpload";
import { prepareSlipImage, slipPrepErrorText, slipContentType } from "@/lib/slipFile";
import { useUserAuth } from "@/context/AuthContext";
import type { ExamPaper } from "@/types";
import toast, { Toaster } from "react-hot-toast";
import { FileText, Eye, EyeOff, ShoppingCart, Check, ShieldCheck, Download, ArrowLeft, X, UploadCloud, Loader2, Clock, UserPlus } from "lucide-react";
import ExamAnalysisSection from "@/components/exampapers/ExamAnalysisSection";
import ExamAnalysisArticle from "@/components/exampapers/ExamAnalysisArticle";
import PaymentTransferInfo from "@/components/payment/PaymentTransferInfo";

const PHONE_RE = /^[0-9]{9,10}$/;

// สถานะการซื้อชุดนี้ของบัญชีที่ล็อกอินอยู่ (เช็คจาก enrollments ฝั่ง client)
type OwnStatus = "none" | "pending" | "approved";

export default function PaperDetailClient({
    paper,
    fileLabels = [],
    related = [],
}: {
    paper: ExamPaper;
    fileLabels?: string[];
    related?: ExamPaper[];
}) {
    // authLoading สำคัญมาก: ตอนหน้าเพิ่งโหลด Firebase ยังกู้เซสชันไม่เสร็จ user
    // จะเป็น null ชั่วขณะ — ถ้าไม่รอ สมาชิกเดิมจะเห็นช่องสมัครวูบขึ้นมา และ
    // คนที่ซื้อไปแล้วอาจถูกเปิดฟอร์มให้จ่ายซ้ำ
    const { user, userProfile, loading: authLoading, emailSignUp, emailSignIn, resetPassword } = useUserAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    // FB/LINE in-app webview เปิดลิงก์ PDF แบบ target="_blank" มักเงียบ →
    // ต้องเด้งออกไปเบราว์เซอร์จริงแทน (pattern เดียวกับ MyPapersSection)
    const { isInApp, platform } = useInAppBrowser();

    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [done, setDone] = useState(false);
    const [ownStatus, setOwnStatus] = useState<OwnStatus>("none");
    // true เมื่อเช็คสถานะการซื้อจบแล้ว (สำเร็จหรือพังก็ตาม) — ?buy=1 ต้องรอค่านี้
    // ก่อนเปิดฟอร์ม ไม่งั้นคนที่ซื้อไปแล้วเปิดลิงก์เดิมจะถูกพาไปจ่ายซ้ำ
    const [statusChecked, setStatusChecked] = useState(false);
    const [previewHint, setPreviewHint] = useState(false);

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [lineId, setLineId] = useState("");
    // สมัคร+ซื้อในฟอร์มเดียว: คนยังไม่มีบัญชีกรอก 2 ช่องนี้เพิ่ม ระบบเปิดบัญชีให้
    // ตอนกดยืนยัน (ไฟล์ต้องผูกบัญชีถึงจะโหลดซ้ำได้ตลอดชีพตามที่หน้าขายสัญญา)
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [authNotice, setAuthNotice] = useState(""); // ข้อความช่วยเหลือเรื่องบัญชี (ไม่ใช่ error ร้ายแรง)
    const [slip, setSlip] = useState<File | null>(null);
    const [slipPreview, setSlipPreview] = useState<string>("");
    const [slipBusy, setSlipBusy] = useState(false); // validating/compressing the picked file
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState(0);

    const price = Number(paper.price || 0);
    const fullPrice = Number(paper.fullPrice || 0);
    const hasDiscount = fullPrice > price;

    // เช็คว่าบัญชีนี้เคยสั่งซื้อชุดนี้ไปแล้วหรือยัง — ถ้าเช็คไม่สำเร็จให้ถือว่า
    // "ยังไม่ซื้อ" เสมอ (แสดงปุ่มซื้อปกติ) เพื่อไม่ให้การเช็คนี้บล็อกการขาย
    useEffect(() => {
        if (authLoading) { setStatusChecked(false); return; }
        if (!user) {
            setOwnStatus("none");
            setStatusChecked(true);
            return;
        }
        let cancelled = false;
        setStatusChecked(false);
        (async () => {
            try {
                const snap = await withTimeout(
                    getDocs(query(collection(db, "enrollments"), where("userId", "==", user.uid), where("paperId", "==", paper.id))),
                    10_000,
                    "เช็คสถานะการซื้อ",
                );
                const mine = snap.docs
                    .map((d) => d.data() as Record<string, unknown>)
                    .filter((r) => r.productType === "examPaper");
                const next: OwnStatus = mine.some((r) => r.status === "approved")
                    ? "approved"
                    : mine.some((r) => r.status === "pending")
                        ? "pending"
                        : "none";
                if (!cancelled) setOwnStatus(next);
            } catch { /* เช็คพัง → ปุ่มซื้อปกติ ไม่ต้องรบกวนผู้ใช้ */ }
            finally { if (!cancelled) setStatusChecked(true); }
        })();
        return () => { cancelled = true; };
    }, [user, authLoading, paper.id]);

    // เติมชื่อ/เบอร์จากโปรไฟล์ให้สมาชิกเดิม (บัญชีที่สมัครทางเว็บมักไม่มี
    // displayName ใน Auth — ของจริงอยู่ใน users doc เหมือนหน้าแจ้งโอน)
    useEffect(() => {
        if (!userProfile) return;
        if (userProfile.displayName) setFullName((prev) => prev || userProfile.displayName || "");
        if (userProfile.phoneNumber) setPhone((prev) => prev || userProfile.phoneNumber || "");
    }, [userProfile]);

    const openCheckout = () => {
        // ไม่ล็อกอินก็เปิดฟอร์มได้เลย — ฟอร์มมีช่องสมัครในตัว (สมัคร+ซื้อจบทีเดียว)
        // ปุ่มซื้อโชว์เฉพาะตอน ownStatus === "none" อยู่แล้ว — กันซ้ำอีกชั้นเผื่อ
        // ถูกเรียกจากทางอื่นระหว่างสถานะกำลังเปลี่ยน
        if (user && ownStatus !== "none") return;
        setCheckoutOpen(true);
    };

    // ลิงก์ ?buy=1 (จากหน้าล็อกอินรุ่นก่อน หรือที่แชร์กันมา) → เปิดฟอร์มให้เลย
    // ต้องรอ Firebase กู้เซสชันจบก่อนเสมอ ไม่งั้นคนที่ซื้อแล้วจะถูกเปิดฟอร์มจ่ายซ้ำ
    // (ช่วงกู้เซสชัน user เป็น null เหมือนคนไม่เคยล็อกอิน แยกกันไม่ออก)
    useEffect(() => {
        if (searchParams.get("buy") !== "1" || done || authLoading) return;
        if (!user) { setCheckoutOpen(true); return; }
        if (statusChecked && ownStatus === "none") setCheckoutOpen(true);
    }, [user, authLoading, searchParams, statusChecked, ownStatus, done]);

    // ถ้ารู้ทีหลังว่าบัญชีนี้สั่งชุดนี้ไปแล้ว (เซสชันเพิ่งกู้เสร็จ / เช็คสถานะเพิ่งกลับมา)
    // ให้ปิดฟอร์มที่เปิดค้างอยู่ทิ้ง — กันลูกค้าโอนซ้ำเพราะเห็นฟอร์มค้างหน้าจอ
    useEffect(() => {
        if (checkoutOpen && !submitting && user && ownStatus !== "none") setCheckoutOpen(false);
    }, [checkoutOpen, submitting, user, ownStatus]);

    // ปุ่มดูตัวอย่างตอนอยู่ใน FB/LINE: เด้งออกไปเปิดในเบราว์เซอร์จริง
    // (target="_blank" ใน webview มักเงียบ) + โชว์คำใบ้เผื่อระบบเด้งไม่สำเร็จ
    const openPreview = () => {
        if (!paper.previewUrl) return;
        const escaped = openInExternalBrowser(paper.previewUrl, platform);
        if (!escaped) window.open(paper.previewUrl, "_blank", "noopener,noreferrer");
        setPreviewHint(true);
    };

    // Shared slip helper: tolerant validation (empty file.type from
    // Android/in-app pickers), compression, HEIC→JPEG, storage.rules 5MB cap.
    const pickSlip = async (f: File | null) => {
        if (!f) return;
        setSlipBusy(true);
        try {
            const prep = await prepareSlipImage(f);
            if (!prep.ok) return void toast.error(slipPrepErrorText(prep.reason));
            if (slipPreview) URL.revokeObjectURL(slipPreview);
            setSlip(prep.file);
            setSlipPreview(URL.createObjectURL(prep.file));
        } finally {
            setSlipBusy(false);
        }
    };

    // กรอกอะไรไปแล้ว (แก้ชื่อเอง/เบอร์/LINE/แนบสลิป) → แตะฉากหลังไม่ปิด modal
    // กันข้อมูลหาย ปิดได้ที่ปุ่ม X เท่านั้น (ชื่อที่ระบบเติมให้เองไม่นับว่า "กรอกแล้ว")
    const formDirty = !!(phone || lineId || slip || email || password || fullName.trim() !== (userProfile?.displayName || "").trim());

    // สมัครให้เองเมื่อยังไม่มีบัญชี — คืน uid ที่พร้อมใช้ต่อ หรือ null ถ้าไปต่อไม่ได้
    // (แจ้งเหตุผลผ่าน authNotice/toast แล้ว) ใช้ auth.currentUser เพราะ context
    // ยังไม่ทันอัปเดตในจังหวะเดียวกับที่สมัครเสร็จ
    const ensureAccount = async (): Promise<{ uid: string; email: string | null } | null> => {
        if (user) return { uid: user.uid, email: user.email };

        const mail = email.trim().toLowerCase();
        if (!mail) { toast.error("กรุณากรอกอีเมล"); return null; }
        if (password.length < 6) { toast.error("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร"); return null; }

        const finish = () => {
            const u = auth.currentUser;
            if (u) return { uid: u.uid, email: u.email };
            // เกิดได้เมื่อเบราว์เซอร์เก็บสถานะล็อกอินไม่ได้ (โหมดส่วนตัว / webview บางตัว)
            setAuthNotice("เบราว์เซอร์นี้เก็บสถานะเข้าสู่ระบบไม่ได้ ลองเปิดในเบราว์เซอร์ปกติ (Safari/Chrome) แล้วสั่งซื้ออีกครั้งนะครับ");
            return null;
        };

        try {
            await emailSignUp(mail, password, { displayName: fullName.trim(), phoneNumber: phone });
            return finish();
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code;
            if (code === "auth/email-already-in-use") {
                // เคยสมัครไว้แล้ว — ลองใช้รหัสที่กรอกเข้าสู่ระบบให้เลย ถ้าตรงก็ซื้อต่อได้ทันที
                try {
                    await emailSignIn(mail, password);
                    setAuthNotice("");
                    return finish();
                } catch {
                    setAuthNotice('อีเมลนี้เคยสมัครไว้แล้ว — ใส่รหัสผ่านเดิมของอีเมลนี้ หรือกด "ลืมรหัสผ่าน" ด้านล่างครับ');
                    return null;
                }
            }
            if (code === "auth/invalid-email") { setAuthNotice("รูปแบบอีเมลไม่ถูกต้อง"); return null; }
            if (code === "auth/weak-password") { setAuthNotice("รหัสผ่านง่ายเกินไป ลองยาวขึ้นอีกนิดครับ"); return null; }
            if (code === "auth/too-many-requests") { setAuthNotice("ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่"); return null; }
            console.error("signup during checkout failed:", err);
            setAuthNotice("สร้างบัญชีไม่สำเร็จ ลองใหม่อีกครั้งนะครับ");
            return null;
        }
    };

    const sendReset = async () => {
        const mail = email.trim().toLowerCase();
        if (!mail) return toast.error("กรอกอีเมลก่อนนะครับ");
        try {
            await resetPassword(mail);
            setAuthNotice("ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว ✉️ ตั้งรหัสใหม่แล้วกลับมากรอกที่นี่ได้เลย");
        } catch {
            toast.error("ส่งลิงก์ไม่สำเร็จ ลองใหม่อีกครั้ง");
        }
    };

    const submit = async () => {
        if (authLoading) return toast("กำลังตรวจสอบบัญชี รอสักครู่นะครับ");
        if (!fullName.trim()) return toast.error("กรุณากรอกชื่อ-นามสกุล");
        if (!PHONE_RE.test(phone)) return toast.error("กรุณากรอกเบอร์โทร 9–10 หลัก");
        if (!slip) return toast.error("กรุณาแนบสลิปโอนเงิน");

        setSubmitting(true);
        try {
            const account = await ensureAccount();
            if (!account) return; // ปัญหาเรื่องบัญชี — แจ้งผู้ใช้ไปแล้ว
            const { uid, email: accountEmail } = account;

            // ด่านสุดท้ายกันจ่ายซ้ำ — เช็คทุกครั้งก่อนสร้างใบ ไม่ใช่เฉพาะคนที่เพิ่งสมัคร
            // (สถานะที่เช็คไว้ตอนเปิดหน้าอาจเก่าไปแล้ว หรือเซสชันเพิ่งกู้เสร็จกลางคัน)
            try {
                const snap = await withTimeout(
                    getDocs(query(collection(db, "enrollments"), where("userId", "==", uid), where("paperId", "==", paper.id))),
                    10_000,
                    "เช็คสถานะการซื้อ",
                );
                const existing = snap.docs.map((d) => d.data() as Record<string, unknown>);
                if (existing.some((r) => r.status === "approved" || r.status === "pending")) {
                    setCheckoutOpen(false);
                    setOwnStatus(existing.some((r) => r.status === "approved") ? "approved" : "pending");
                    // ลูกค้าอาจเพิ่งโอนเงินมารอบสอง — ต้องบอกช่องทางขอคืน ไม่ใช่แค่พาไปโหลด
                    toast.success("บัญชีนี้เคยสั่งซื้อชุดนี้ไว้แล้ว พาไปหน้าดาวน์โหลดให้เลยครับ", { duration: 6000 });
                    toast("ถ้าเพิ่งโอนเงินซ้ำ ทักไลน์ครูฮีมได้เลย เดี๋ยวคืนให้ครับ", { duration: 9000, icon: "💬" });
                    router.push("/my-courses");
                    return;
                }
            } catch { /* เช็คไม่ได้ → ปล่อยให้สั่งซื้อตามปกติ ดีกว่าบล็อกการขาย */ }

            const slipUrl = await uploadPublicFile(slip, `slips/${uid}_${Date.now()}`, (p) => setProgress(p), slipContentType(slip));
            // ครอบ withTimeout ตามกติกาโปรเจกต์ — ถ้าช่องสัญญาณ Firestore ตายเงียบ
            // (เครื่องเพิ่งตื่น/เน็ตสลับเสา) promise จะไม่ settle แล้วปุ่มค้างถาวร
            // ทั้งที่ลูกค้าโอนเงินไปแล้ว
            await withTimeout(addDoc(collection(db, "enrollments"), {
                userId: uid,
                userEmail: accountEmail,
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
            }), 20_000, "ส่งคำสั่งซื้อ");

            // เก็บชื่อ/เบอร์เข้าโปรไฟล์ (เฉพาะช่องที่ยังว่างจริงใน users doc) — หลังบ้าน
            // จะได้ข้อมูลติดต่อครบ ทำหลังสั่งซื้อสำเร็จและห้าม throw ต่อ
            // อ่าน doc จริงแทน userProfile: สมาชิกเดิมที่เพิ่งล็อกอินในฟอร์มนี้ยังมี
            // userProfile เป็น null อยู่ ถ้าเชื่อค่านั้นจะเขียนทับชื่อ/เบอร์เดิมของเขา
            try {
                const profileRef = doc(db, "users", uid);
                const current = (await withTimeout(getDoc(profileRef), 10_000, "อ่านโปรไฟล์")).data() || {};
                const patch: Record<string, string> = {};
                if (!current.displayName && fullName.trim()) patch.displayName = fullName.trim();
                if (!current.phoneNumber && phone.trim()) patch.phoneNumber = phone.trim();
                if (Object.keys(patch).length > 0) await withTimeout(setDoc(profileRef, patch, { merge: true }), 10_000, "บันทึกโปรไฟล์");
            } catch (profileError) {
                console.error("Profile writeback failed (order already submitted):", profileError);
            }

            if (slipPreview) URL.revokeObjectURL(slipPreview);
            setPassword("");
            setCheckoutOpen(false);
            setOwnStatus("pending");
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
            <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
                <div className="max-w-lg mx-auto py-16 text-center">
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
                <RelatedPapers items={related} />
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

                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mt-6">
                        <span className="text-3xl font-black text-teal-600 dark:text-teal-400">฿{price.toLocaleString()}</span>
                        {hasDiscount && (
                            <>
                                <span className="text-lg font-bold text-slate-400 line-through">฿{fullPrice.toLocaleString()}</span>
                                <span className="rounded-full bg-rose-50 dark:bg-rose-950 px-2 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-300">
                                    ประหยัด ฿{(fullPrice - price).toLocaleString()}
                                </span>
                            </>
                        )}
                        {paper.questionCount ? <span className="text-sm text-slate-400">· {paper.questionCount} ข้อ</span> : null}
                        {paper.pageCount ? <span className="text-sm text-slate-400">· {paper.pageCount} หน้า</span> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-6">
                        {ownStatus === "approved" ? (
                            <Link href="/my-courses" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 transition shadow-sm">
                                <Download size={19} /> ซื้อแล้ว — ไปหน้าดาวน์โหลด
                            </Link>
                        ) : ownStatus === "pending" ? (
                            <button disabled className="inline-flex items-center gap-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold px-6 py-3 cursor-not-allowed">
                                <Clock size={19} /> ส่งสลิปแล้ว รอครูตรวจ
                            </button>
                        ) : (
                            <button onClick={openCheckout} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 transition shadow-sm">
                                <ShoppingCart size={19} /> ซื้อและดาวน์โหลด
                            </button>
                        )}
                        {paper.previewUrl && (isInApp ? (
                            <button onClick={openPreview} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                                <Eye size={18} /> ดูตัวอย่างฟรี
                            </button>
                        ) : (
                            <a href={paper.previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                                <Eye size={18} /> ดูตัวอย่างฟรี
                            </a>
                        ))}
                    </div>
                    {ownStatus === "pending" && (
                        <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                            ครูฮีมกำลังตรวจสลิปให้อยู่ครับ — <Link href="/my-courses" className="font-semibold text-teal-600 dark:text-teal-400 underline">ดูสถานะได้ที่หน้าคอร์สเรียนของฉัน</Link>
                        </p>
                    )}
                    {isInApp && previewHint && (
                        <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                            ถ้าไฟล์ตัวอย่างไม่เด้งขึ้นมา ลองกดเมนู ⋯ มุมขวาบน แล้วเลือก “เปิดในเบราว์เซอร์” นะครับ
                        </p>
                    )}

                    {/* ในแพ็กนี้ได้อะไรบ้าง — รายชื่อไฟล์จากฝั่งเซิร์ฟเวอร์ (เฉพาะ label ไม่มี path) */}
                    <div className="mt-6 rounded-xl border border-teal-100 dark:border-teal-900/60 bg-teal-50/70 dark:bg-teal-950/30 p-4">
                        <div className="text-sm font-bold text-teal-800 dark:text-teal-200 mb-1">📦 ในชุดนี้ได้รับ</div>
                        <div className="text-sm text-teal-900/80 dark:text-teal-100/80 leading-relaxed">
                            {fileLabels.length > 0 ? fileLabels.join(" · ") : "ตัวข้อสอบ · เฉลย"}
                            <span className="text-teal-700/70 dark:text-teal-300/70"> (ไฟล์ PDF ดาวน์โหลดเก็บได้ตลอด)</span>
                        </div>
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

            {/* บทวิเคราะห์ฉบับเต็ม — long-form Markdown write-up (optional) */}
            <ExamAnalysisArticle article={paper.analysis?.article} />

            {/* ชุดอื่นที่น่าสนใจ — cross-sell */}
            <RelatedPapers items={related} />

            {/* คำถามที่พบบ่อย */}
            <div className="mt-14 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-6 md:p-8">
                <h2 className="text-lg font-black text-slate-900 dark:text-white mb-5">คำถามที่คุณพ่อคุณแม่ถามบ่อย</h2>
                <div className="space-y-5 text-sm leading-relaxed">
                    <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">ซื้อแล้วได้ไฟล์เมื่อไร?</div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1">หลังครูฮีมตรวจสลิปและอนุมัติ ปกติไม่เกินไม่กี่ชั่วโมง ไฟล์จะไปรออยู่ที่หน้า “คอร์สเรียนของฉัน” ให้ดาวน์โหลดได้เลยครับ</p>
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">ดาวน์โหลดซ้ำได้ไหม?</div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1">ได้ตลอดชีพครับ ซื้อครั้งเดียว กลับมาโหลดใหม่เมื่อไรก็ได้</p>
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">พิมพ์ออกมาให้ลูกทำได้ไหม?</div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1">ได้เลยครับ ไฟล์ทำไว้สำหรับปริ้นท์ให้ลูกฝึกทำบนกระดาษจริงเหมือนสอบจริง</p>
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">ติดปัญหาติดต่อที่ไหน?</div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1">
                            ทัก <a href="https://line.me/ti/p/~kruheemschool" target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-600 dark:text-teal-400 underline">LINE ครูฮีม</a> ได้เลยครับ ครูตอบเองทุกข้อความ
                        </p>
                    </div>
                </div>
            </div>

            {/* checkout modal */}
            {checkoutOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }} onClick={() => !submitting && !formDirty && setCheckoutOpen(false)}>
                    <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">สั่งซื้อข้อสอบ</h2>
                            <button onClick={() => !submitting && setCheckoutOpen(false)} aria-label="ปิด" className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X size={20} /></button>
                        </div>

                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 mb-4 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 line-clamp-1 pr-2">{paper.title}</span>
                            <span className="flex items-baseline gap-1.5 shrink-0">
                                {hasDiscount && <span className="text-xs text-slate-400 line-through">฿{fullPrice.toLocaleString()}</span>}
                                <span className="font-black text-teal-600 dark:text-teal-400">฿{price.toLocaleString()}</span>
                            </span>
                        </div>

                        {/* transfer details — same block as the main checkout */}
                        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">1. สแกน QR หรือโอนเข้าบัญชี</div>
                        <div className="mb-4"><PaymentTransferInfo compact /></div>
                        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">2. กรอกข้อมูล แล้วแนบสลิป</div>

                        <div className="space-y-3">
                            {authLoading ? (
                                // ระหว่างกู้เซสชันยังไม่รู้ว่าเป็นสมาชิกเดิมหรือคนใหม่ —
                                // ห้ามเดา ไม่งั้นสมาชิกเดิมจะเห็นช่องสมัครวูบขึ้นมา
                                <p className="flex items-center gap-2 text-[12.5px] text-slate-400 dark:text-slate-500 -mt-1">
                                    <Loader2 size={14} className="animate-spin" /> กำลังตรวจสอบบัญชี...
                                </p>
                            ) : user ? (
                                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 -mt-1">
                                    สั่งซื้อในบัญชี <span className="font-semibold text-slate-700 dark:text-slate-200">{user.email}</span>
                                </p>
                            ) : (
                                <div className="rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 p-3 space-y-2.5">
                                    <p className="flex items-start gap-1.5 text-[12.5px] text-teal-800 dark:text-teal-200 leading-relaxed">
                                        <UserPlus size={15} className="shrink-0 mt-0.5" />
                                        <span>ตั้งอีเมลกับรหัสผ่านไว้ด้วยนะครับ ระบบจะเก็บไฟล์ไว้ในบัญชีนี้ให้ กลับมาโหลดซ้ำได้ตลอด</span>
                                    </p>
                                    <input
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                                        placeholder="อีเมล *"
                                        type="email"
                                        inputMode="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setAuthNotice(""); }}
                                    />
                                    <div className="relative">
                                        <input
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 pr-11 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                                            placeholder="ตั้งรหัสผ่าน (อย่างน้อย 6 ตัว) *"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setAuthNotice(""); }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "ดูรหัสผ่าน"}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {authNotice && (
                                        <div className="text-[12.5px] text-amber-700 dark:text-amber-300 leading-relaxed">
                                            {authNotice}
                                            <button type="button" onClick={sendReset} className="ml-1.5 font-semibold underline hover:no-underline">ลืมรหัสผ่าน</button>
                                        </div>
                                    )}
                                </div>
                            )}
                            <input className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-teal-500" placeholder="ชื่อ-นามสกุล *" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                            <input className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-teal-500" placeholder="เบอร์โทรศัพท์ *" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))} />
                            <input className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-teal-500" placeholder="LINE ID (ถ้ามี)" value={lineId} onChange={(e) => setLineId(e.target.value)} />

                            <label className="block cursor-pointer">
                                <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 text-center hover:border-teal-500 transition">
                                    {slipBusy ? (
                                        <div className="text-slate-400 py-3">
                                            <Loader2 size={26} className="mx-auto mb-1.5 animate-spin" />
                                            <span className="text-sm font-semibold">กำลังเตรียมรูปสลิป...</span>
                                        </div>
                                    ) : slipPreview ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={slipPreview} alt="สลิป" className="max-h-40 mx-auto rounded-lg" />
                                    ) : (
                                        <div className="text-slate-400">
                                            <UploadCloud size={26} className="mx-auto mb-1.5" />
                                            <span className="text-sm font-semibold">แนบสลิปโอนเงิน *</span>
                                        </div>
                                    )}
                                    {/* value reset → re-picking the SAME file after a rejection still fires onChange */}
                                    <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0] || null; e.target.value = ""; pickSlip(f); }} />
                                </div>
                            </label>
                        </div>

                        <button onClick={submit} disabled={submitting || slipBusy || authLoading} className="w-full mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold px-5 py-3 transition">
                            {submitting ? <><Loader2 className="animate-spin" size={18} /> {progress > 0 ? `กำลังอัปโหลด ${progress}%` : "กำลังส่ง..."}</> : <><Check size={18} /> ยืนยันสั่งซื้อ</>}
                        </button>
                        {!user && !authLoading && (
                            <p className="mt-2.5 text-center text-[12px] text-slate-400 dark:text-slate-500">
                                มีบัญชีอยู่แล้ว? กรอกอีเมลกับรหัสผ่านเดิมได้เลย ระบบจะเข้าสู่ระบบให้อัตโนมัติ
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// การ์ดเล็ก "ชุดอื่นที่น่าสนใจ" — ใช้ทั้งท้ายหน้าขายและใต้หน้า "สั่งซื้อสำเร็จ"
function RelatedPapers({ items }: { items: ExamPaper[] }) {
    if (!items.length) return null;
    return (
        <div className="mt-14">
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">ชุดอื่นที่น่าสนใจ</h2>
            <div className="grid gap-4 sm:grid-cols-3">
                {items.map((p) => {
                    const pr = Number(p.price || 0);
                    const full = Number(p.fullPrice || 0);
                    return (
                        <Link
                            key={p.id}
                            href={`/exam-papers/${p.id}`}
                            className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition"
                        >
                            <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                {p.coverUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.coverUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition" />
                                ) : (
                                    <FileText size={36} className="text-slate-300 dark:text-slate-600" />
                                )}
                            </div>
                            <div className="p-3.5">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    {p.level && <span className="rounded-full bg-teal-50 dark:bg-teal-950 px-2 py-0.5 text-[11px] font-bold text-teal-700 dark:text-teal-300">{p.level}</span>}
                                    {p.category && <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">{p.category}</span>}
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">{p.title}</h3>
                                <div className="flex items-baseline gap-1.5 mt-2">
                                    <span className="font-black text-teal-600 dark:text-teal-400">฿{pr.toLocaleString()}</span>
                                    {full > pr && <span className="text-xs text-slate-400 line-through">฿{full.toLocaleString()}</span>}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
