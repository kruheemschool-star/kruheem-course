"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, doc, setDoc, getDoc, getDocs, query, where } from "firebase/firestore";
import { withTimeout } from "@/lib/netGuard";
import { useInAppBrowser, openInExternalBrowser } from "@/lib/inAppBrowser";
import { uploadPublicFile } from "@/lib/pdfUpload";
import { prepareSlipImage, slipPrepErrorText, slipContentType } from "@/lib/slipFile";
import { useUserAuth } from "@/context/AuthContext";
import { PAYMENT_INFO } from "@/lib/constants";
import type { ExamPaper } from "@/types";
import toast, { Toaster } from "react-hot-toast";
import { FileText, Eye, EyeOff, Check, ShieldCheck, Download, ArrowLeft, ArrowRight, X, UploadCloud, Loader2, Clock, UserPlus, Copy } from "lucide-react";
import ExamAnalysisSection from "@/components/exampapers/ExamAnalysisSection";
import ExamAnalysisArticle from "@/components/exampapers/ExamAnalysisArticle";
import SamplePages from "@/components/exampapers/SamplePages";
import StudioTrustStrip from "@/components/exampapers/StudioTrustStrip";
import StudioReviews from "@/components/exampapers/StudioReviews";
import type { TrustReview } from "@/lib/paperTrust";

const LINE_URL = "https://line.me/ti/p/~kruheemschool";

const PHONE_RE = /^[0-9]{9,10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// โดเมนที่ผู้ปกครองพิมพ์ตกบ่อย — พิมพ์ผิดตัวเดียวแปลว่าไฟล์ที่จ่ายเงินแล้วไปอยู่
// บัญชีที่เจ้าตัวเข้าไม่ได้ (เมลรีเซ็ตรหัสก็ไม่มีวันถึง) จึงต้องทักท้วงก่อนสมัคร
const DOMAIN_TYPOS: Record<string, string> = {
    "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com",
    "gmail.cm": "gmail.com", "gmaill.com": "gmail.com", "gnail.com": "gmail.com",
    "gmail.con": "gmail.com", "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com",
    "yahoo.co": "yahoo.com", "outlook.co": "outlook.com", "icloud.co": "icloud.com",
};
const domainSuggestion = (mail: string): string | null => {
    const at = mail.lastIndexOf("@");
    if (at < 0) return null;
    const fixed = DOMAIN_TYPOS[mail.slice(at + 1).toLowerCase()];
    return fixed ? mail.slice(0, at + 1) + fixed : null;
};

// สถานะการซื้อชุดนี้ของบัญชีที่ล็อกอินอยู่ (เช็คจาก enrollments ฝั่ง client)
type OwnStatus = "none" | "pending" | "approved";

export default function PaperDetailClient({
    paper,
    fileLabels = [],
    related = [],
    reviews = [],
    reviewCount,
    avgRating,
}: {
    paper: ExamPaper;
    fileLabels?: string[];
    related?: ExamPaper[];
    reviews?: TrustReview[];
    reviewCount?: number;
    avgRating?: number;
}) {
    // authLoading สำคัญมาก: ตอนหน้าเพิ่งโหลด Firebase ยังกู้เซสชันไม่เสร็จ user
    // จะเป็น null ชั่วขณะ — ถ้าไม่รอ สมาชิกเดิมจะเห็นช่องสมัครวูบขึ้นมา และ
    // คนที่ซื้อไปแล้วอาจถูกเปิดฟอร์มให้จ่ายซ้ำ
    const { user, userProfile, loading: authLoading, emailSignUp, emailSignIn, resetPassword, logOut } = useUserAuth();
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
    // อีเมลที่เพิ่งเตือนเรื่องโดเมนไปแล้ว — กดยืนยันซ้ำแปลว่าผู้ใช้ยืนยันว่าพิมพ์ถูก
    const lastConfirmedEmail = useRef("");

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [lineId, setLineId] = useState("");
    // สมัคร+ซื้อในฟอร์มเดียว: คนยังไม่มีบัญชีกรอก 2 ช่องนี้เพิ่ม ระบบเปิดบัญชีให้
    // ตอนกดยืนยัน (ไฟล์ต้องผูกบัญชีถึงจะโหลดซ้ำได้ตลอดชีพตามที่หน้าขายสัญญา)
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [authNotice, setAuthNotice] = useState(""); // ข้อความช่วยเหลือเรื่องบัญชี (ไม่ใช่ error ร้ายแรง)
    const [needsResetLink, setNeedsResetLink] = useState(false); // โชว์ปุ่มลืมรหัสผ่านเฉพาะตอนที่เกี่ยวกับรหัสจริงๆ
    const [doneEmail, setDoneEmail] = useState(""); // อีเมลบัญชีที่ใบสั่งซื้อไปผูก — ต้องบอกให้ผู้ซื้อทวนได้
    const [dupNotice, setDupNotice] = useState(false); // เจอว่าเคยสั่งชุดนี้แล้ว (แสดงในหน้า ไม่ใช่ toast ที่หายไปพร้อมหน้า)
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
        if (checkoutOpen && !submitting && user && ownStatus !== "none") {
            setCheckoutOpen(false);
            // อย่าปิดเงียบ — ผู้ใช้ที่กรอกค้างอยู่ต้องรู้ว่าทำไมฟอร์มหายไป
            setDupNotice(true);
        }
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
    // ค่าที่ระบบเติมให้เอง (ชื่อ/เบอร์จากโปรไฟล์) ไม่นับว่า "กรอกแล้ว" — ไม่งั้น
    // สมาชิกเดิมที่แค่เปิดดูราคาจะปิดด้วยการแตะฉากหลังไม่ได้เลย
    const formDirty = !!(
        lineId || slip || email || password
        || fullName.trim() !== (userProfile?.displayName || "").trim()
        || phone.trim() !== (userProfile?.phoneNumber || "").trim()
    );

    // สมัครให้เองเมื่อยังไม่มีบัญชี — คืน uid ที่พร้อมใช้ต่อ หรือ null ถ้าไปต่อไม่ได้
    // (แจ้งเหตุผลผ่าน authNotice/toast แล้ว) ใช้ auth.currentUser เพราะ context
    // ยังไม่ทันอัปเดตในจังหวะเดียวกับที่สมัครเสร็จ
    const ensureAccount = async (): Promise<{ uid: string; email: string | null } | null> => {
        if (user) return { uid: user.uid, email: user.email };

        const mail = email.trim().toLowerCase();
        setNeedsResetLink(false);
        if (!mail) { setAuthNotice("กรุณากรอกอีเมลครับ"); return null; }
        if (!EMAIL_RE.test(mail)) { setAuthNotice("รูปแบบอีเมลยังไม่ถูกต้อง ลองตรวจอีกครั้งนะครับ"); return null; }
        // ทักท้วงโดเมนที่พิมพ์ตกก่อนสมัคร — ยอมให้ผ่านถ้ายืนยันซ้ำ (กดยืนยันอีกครั้ง)
        const suggestion = domainSuggestion(mail);
        if (suggestion && suggestion !== lastConfirmedEmail.current) {
            lastConfirmedEmail.current = mail;
            setAuthNotice(`ตรวจอีเมลอีกครั้งนะครับ — หมายถึง ${suggestion} หรือเปล่า? ถ้าถูกแล้วกดยืนยันสั่งซื้ออีกครั้งได้เลย`);
            return null;
        }
        if (password.length < 6) { setAuthNotice("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษรครับ"); return null; }

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
                    setNeedsResetLink(true);
                    setAuthNotice("อีเมลนี้เคยสมัครไว้แล้ว — ใส่รหัสผ่านเดิมของอีเมลนี้ ถ้าจำไม่ได้กดปุ่มด้านล่างได้เลยครับ");
                    return null;
                }
            }
            if (code === "auth/invalid-email") { setAuthNotice("รูปแบบอีเมลไม่ถูกต้อง"); return null; }
            if (code === "auth/weak-password") { setAuthNotice("รหัสผ่านง่ายเกินไป ลองยาวขึ้นอีกนิดครับ"); return null; }
            if (code === "auth/too-many-requests") { setNeedsResetLink(true); setAuthNotice("ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่"); return null; }
            console.error("signup during checkout failed:", err);
            setAuthNotice("สร้างบัญชีไม่สำเร็จ ลองใหม่อีกครั้งนะครับ");
            return null;
        }
    };

    const sendReset = async () => {
        const mail = email.trim().toLowerCase();
        if (!EMAIL_RE.test(mail)) return toast.error("กรอกอีเมลให้ถูกต้องก่อนนะครับ");
        try {
            await resetPassword(mail);
            setNeedsResetLink(false);
            setAuthNotice("ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว ✉️ ตั้งรหัสใหม่แล้วกลับมากรอกที่นี่ได้เลย");
        } catch {
            toast.error("ส่งลิงก์ไม่สำเร็จ ลองใหม่อีกครั้ง");
        }
    };

    // ทักท้วงอีเมลตั้งแต่ตอนพิมพ์เสร็จ — ไม่ใช่รอจนแนบสลิป (ตอนนั้นโอนเงินไปแล้ว)
    const checkEmailOnBlur = () => {
        const mail = email.trim().toLowerCase();
        if (!mail) return;
        if (!EMAIL_RE.test(mail)) { setAuthNotice("รูปแบบอีเมลยังไม่ถูกต้อง ลองตรวจอีกครั้งนะครับ"); return; }
        const suggestion = domainSuggestion(mail);
        if (suggestion) setAuthNotice(`ตรวจอีเมลอีกครั้งนะครับ — หมายถึง ${suggestion} หรือเปล่า? ไฟล์จะไปเก็บไว้ในบัญชีอีเมลนี้`);
    };

    const submit = async () => {
        if (authLoading) return toast("กำลังตรวจสอบบัญชี รอสักครู่นะครับ");
        // คนที่ยังไม่มีบัญชี: ตรวจอีเมล/รหัสก่อนเรื่องอื่น เพราะเป็นจุดที่ผิดแล้วแก้ยากที่สุด
        // (ไฟล์ไปผูกบัญชีที่พิมพ์ผิด = เจ้าตัวเข้าไม่ได้เลย) และช่องอยู่บนสุดของฟอร์มอยู่แล้ว
        if (!user) {
            const mail = email.trim().toLowerCase();
            if (!mail) { setAuthNotice("กรุณากรอกอีเมลครับ"); return; }
            if (!EMAIL_RE.test(mail)) { setAuthNotice("รูปแบบอีเมลยังไม่ถูกต้อง ลองตรวจอีกครั้งนะครับ"); return; }
            const suggestion = domainSuggestion(mail);
            if (suggestion && lastConfirmedEmail.current !== mail) {
                lastConfirmedEmail.current = mail;
                setAuthNotice(`ตรวจอีเมลอีกครั้งนะครับ — หมายถึง ${suggestion} หรือเปล่า? ถ้าถูกแล้วกดยืนยันสั่งซื้ออีกครั้งได้เลย`);
                return;
            }
            if (password.length < 6) { setAuthNotice("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษรครับ"); return; }
        }
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
                    // ลูกค้าอาจเพิ่งโอนเงินมารอบสอง — ต้องบอกช่องทางขอคืนแบบค้างอยู่บนหน้า
                    // (toast หายไปพร้อมหน้าถ้าเด้งออกทันที เพราะ Toaster อยู่ในคอมโพเนนต์นี้)
                    setDupNotice(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
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
            setDoneEmail(accountEmail || "");
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
            <div className="khps-wrap pb-24">
                <div className="max-w-xl mx-auto py-20 text-center">
                    <div
                        className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-7"
                        style={{ background: "var(--kp-accent-soft)" }}
                    >
                        <Check size={30} style={{ color: "var(--kp-accent)" }} />
                    </div>
                    <h1 className="khps-h2">ส่งคำสั่งซื้อแล้ว</h1>
                    <p className="khps-lead mt-5">
                        ครูฮีมกำลังตรวจสอบสลิปของคุณ เมื่ออนุมัติแล้วคุณจะดาวน์โหลดไฟล์ได้ที่หน้า “คอร์สเรียนของฉัน” ทันที
                    </p>
                    {doneEmail && (
                        // บอกบัญชีปลายทางให้ทวนตั้งแต่ตอนนี้ — ถ้าอีเมลพิมพ์ผิดจะได้ทักครูฮีมแก้ได้ทัน
                        <p className="khps-card-sm mt-8 px-6 py-5 text-[14px] font-light leading-relaxed" style={{ color: "var(--kp-ink-2)" }}>
                            ไฟล์จะเก็บไว้ในบัญชี <span className="font-semibold" style={{ color: "var(--kp-ink)" }}>{doneEmail}</span>
                            <br />ถ้าอีเมลนี้ไม่ถูกต้อง ทักไลน์ครูฮีมได้เลยครับ เดี๋ยวย้ายให้
                        </p>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
                        <Link href="/my-courses" className="khps-btn khps-btn-sm khps-btn-primary">
                            <Download size={17} /> ไปหน้าคอร์สเรียนของฉัน
                        </Link>
                        <Link href="/exam-papers" className="khps-btn khps-btn-sm khps-btn-ghost">
                            เลือกซื้อชุดอื่น
                        </Link>
                    </div>

                    {/* ช่องว่างระหว่าง "จ่ายเงินแล้ว" กับ "ได้ไฟล์" คือตอนที่ลูกค้าไม่มีอะไรทำ
                        และเป็นจังหวะเดียวที่ชวนไปคลังข้อสอบออนไลน์แล้วไม่แย่งปุ่มซื้อของหน้าขาย */}
                    <div className="khps-card mt-12 p-7 text-left">
                        <div className="text-[16px] font-medium">ระหว่างรอครูฮีมอนุมัติ</div>
                        <p className="text-[14.5px] font-light leading-relaxed mt-2" style={{ color: "var(--kp-ink-2)" }}>
                            ให้ลูกลองทำข้อสอบบนเว็บไปพลางๆ ได้เลยครับ ในคลังข้อสอบออนไลน์มีชุดให้ทำฟรี
                            ตรวจให้อัตโนมัติพร้อมเฉลยทุกข้อ จะได้ไม่เสียจังหวะซ้อม
                        </p>
                        <Link
                            href="/exam"
                            className="inline-flex items-center gap-1.5 mt-4 text-[14px] font-medium hover:underline"
                            style={{ color: "var(--kp-accent)" }}
                        >
                            ไปคลังข้อสอบออนไลน์ <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>
                <RelatedPapers items={related} />
            </div>
        );
    }

    // ปุ่มหลัก 4 สถานะ — ใช้ทั้งบล็อกราคาและแถบราคาลอย จึงต้องอยู่ที่เดียว
    // (เป็นฟังก์ชันคืน JSX ไม่ใช่คอมโพเนนต์ซ้อน — คอมโพเนนต์ที่นิยามในตัว render
    //  จะถูก unmount/mount ใหม่ทุกครั้งที่พิมพ์ในฟอร์ม)
    const buyCta = (compact = false) => {
        const size = compact ? "khps-btn khps-btn-sm" : "khps-btn khps-btn-block";
        if (paper.comingSoon) {
            // ชุดที่ยังทำไม่เสร็จ: ไม่มีไฟล์ให้ส่งมอบ จึงต้องไม่มีปุ่มรับเงิน
            return (
                <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className={`${size} khps-btn-primary`}>
                    <Clock size={18} /> {compact ? "ทักไลน์จองก่อน" : "ยังไม่เปิดขาย — ทักไลน์จองก่อนได้"}
                </a>
            );
        }
        if (ownStatus === "approved") {
            return (
                <Link href="/my-courses" className={`${size} khps-btn-accent`}>
                    <Download size={18} /> {compact ? "ไปดาวน์โหลด" : "ซื้อแล้ว — ไปหน้าดาวน์โหลด"}
                </Link>
            );
        }
        if (ownStatus === "pending") {
            return (
                <button disabled className={`${size} khps-btn-quiet`}>
                    <Clock size={18} /> ส่งสลิปแล้ว รอครูตรวจ
                </button>
            );
        }
        return (
            <button onClick={openCheckout} className={`${size} khps-btn-primary`}>
                {compact ? "ซื้อชุดนี้" : "ซื้อและดาวน์โหลด"}
            </button>
        );
    };

    // ตารางสเปก — ตัดแถวที่ไม่มีข้อมูลจริงทิ้ง ไม่เติมค่าให้ดูเต็ม
    const specs: { k: string; v: string }[] = [
        ...(paper.level ? [{ k: "ระดับชั้น", v: paper.level }] : []),
        ...(paper.category ? [{ k: "สนามสอบ", v: paper.category }] : []),
        ...(paper.questionCount ? [{ k: "จำนวนข้อ", v: `${paper.questionCount.toLocaleString()} ข้อ` }] : []),
        ...(paper.pageCount ? [{ k: "จำนวนหน้า", v: `${paper.pageCount.toLocaleString()} หน้า` }] : []),
        { k: "ไฟล์ที่ได้รับ", v: fileLabels.length > 0 ? fileLabels.join(" · ") : "ตัวข้อสอบ · เฉลย" },
    ];

    const previewButton = paper.previewUrl && (isInApp ? (
        <button onClick={openPreview} className="khps-btn khps-btn-block khps-btn-ghost">
            <Eye size={17} /> ดูตัวอย่างฟรี
        </button>
    ) : (
        <a href={paper.previewUrl} target="_blank" rel="noopener noreferrer" className="khps-btn khps-btn-block khps-btn-ghost">
            <Eye size={17} /> ดูตัวอย่างฟรี
        </a>
    ));

    return (
        <div className="pb-16">
            <Toaster position="top-center" />

            <div className="khps-wrap">
                <Link
                    href="/exam-papers"
                    className="inline-flex items-center gap-2 text-[13px] font-medium khps-muted hover:underline"
                >
                    <ArrowLeft size={15} /> กลับไปคลังข้อสอบ
                </Link>
            </div>

            {/* 1 — พาดหัว + คำอธิบายชุด */}
            <header className="khps-wrap mt-10 md:mt-14">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    {paper.level && <span className="khps-eyebrow">{paper.level}</span>}
                    {paper.level && paper.category && <span className="khps-eyebrow" aria-hidden>·</span>}
                    {paper.category && <span className="khps-eyebrow">{paper.category}</span>}
                    {paper.badge && !paper.comingSoon && <span className="khps-pill">{paper.badge}</span>}
                </div>
                <h1 className="khps-h1 mt-5" style={{ maxWidth: "18ch" }}>{paper.title}</h1>
                {paper.description && (
                    <p className="khps-lead mt-8" style={{ maxWidth: "62ch" }}>{paper.description}</p>
                )}
            </header>

            {/* 2 — แถบเครดิตครูฮีม (ความน่าเชื่อถือมาก่อนราคา) */}
            <div className="khps-wrap khps-sec">
                <StudioTrustStrip reviewCount={reviewCount} avgRating={avgRating} />
            </div>

            {/* 3 — ปก + ราคา + ปุ่มซื้อ + ตารางสเปก */}
            <div className="khps-wrap khps-sec">
                <div
                    className="grid gap-10 lg:gap-16 items-start"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))" }}
                >
                    <div className="khps-card p-6 md:p-8">
                        <div className="khps-slot khps-cover">
                            {paper.coverUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={paper.coverUrl} alt={paper.title} />
                            ) : (
                                <FileText size={56} style={{ color: "var(--kp-ink-4)", opacity: 0.35 }} />
                            )}
                        </div>
                        <p className="text-[12px] text-center mt-5 khps-muted">ปกชุดข้อสอบ — ไฟล์จริงขนาด A4 พิมพ์ได้</p>
                    </div>

                    {/* บล็อกราคา — ไม่ใส่กรอบ ปล่อยลอยบนพื้นหน้า */}
                    <div className="min-w-0">
                        {dupNotice && (
                            <div className="khps-card-sm p-5 mb-8">
                                <p className="text-[13.5px] font-light leading-relaxed" style={{ color: "var(--kp-ink-2)" }}>
                                    <span className="font-semibold" style={{ color: "var(--kp-ink)" }}>บัญชีนี้เคยสั่งซื้อชุดนี้ไว้แล้วครับ</span> จึงไม่ได้สร้างรายการใหม่ให้
                                    — ไปดาวน์โหลดได้ที่หน้า “คอร์สเรียนของฉัน” ได้เลย
                                    <br />ถ้าเพิ่งโอนเงินซ้ำ ทักไลน์ครูฮีมได้เลยครับ เดี๋ยวคืนให้
                                </p>
                                <div className="flex flex-wrap gap-2.5 mt-4">
                                    <Link href="/my-courses" className="khps-btn khps-btn-sm khps-btn-accent">
                                        <Download size={15} /> ไปหน้าดาวน์โหลด
                                    </Link>
                                    <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="khps-btn khps-btn-sm khps-btn-quiet">
                                        ทัก LINE ครูฮีม
                                    </a>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                            <span className="khps-price">฿{price.toLocaleString()}</span>
                            {hasDiscount && (
                                <>
                                    <span className="text-[19px] font-light line-through khps-muted">฿{fullPrice.toLocaleString()}</span>
                                    <span className="khps-pill">ประหยัด ฿{(fullPrice - price).toLocaleString()}</span>
                                </>
                            )}
                        </div>
                        <p className="mt-4 text-[14px] font-light khps-muted">จ่ายครั้งเดียว ดาวน์โหลดซ้ำได้ตลอดชีพ</p>

                        <div className="mt-8 flex flex-col gap-3">
                            {buyCta()}
                            {previewButton}
                        </div>

                        {ownStatus === "pending" && (
                            <p className="mt-4 text-[13px] font-light khps-muted">
                                ครูฮีมกำลังตรวจสลิปให้อยู่ครับ —{" "}
                                <Link href="/my-courses" className="font-medium underline" style={{ color: "var(--kp-accent)" }}>
                                    ดูสถานะได้ที่หน้าคอร์สเรียนของฉัน
                                </Link>
                            </p>
                        )}
                        {isInApp && previewHint && (
                            <p className="mt-4 text-[13px] font-light khps-muted">
                                ถ้าไฟล์ตัวอย่างไม่เด้งขึ้นมา ลองกดเมนู ⋯ มุมขวาบน แล้วเลือก “เปิดในเบราว์เซอร์” นะครับ
                            </p>
                        )}

                        <dl className="khps-spec mt-9">
                            {specs.map((s) => (
                                <Fragment key={s.k}>
                                    <dt>{s.k}</dt>
                                    <dd>{s.v}</dd>
                                </Fragment>
                            ))}
                        </dl>

                        <div className="mt-7 flex flex-col gap-2.5 text-[13.5px] font-light" style={{ color: "var(--kp-ink-2)" }}>
                            <span className="flex items-center gap-2.5">
                                <ShieldCheck size={15} className="shrink-0" style={{ color: "var(--kp-accent)" }} /> ไฟล์ PDF พร้อมเฉลยละเอียด
                            </span>
                            <span className="flex items-center gap-2.5">
                                <Check size={15} className="shrink-0" style={{ color: "var(--kp-accent)" }} /> โอนเงินแล้วแนบสลิป ครูฮีมตรวจและอนุมัติให้
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ตั้งแต่ตรงนี้ลงไปคือช่วงที่แถบราคาลอยทำงาน — .khps-dock เป็นลูกคนสุดท้าย
                ของกล่องนี้ จึงปักที่ก้นจอเฉพาะตอนที่เลื่อนพ้นบล็อกราคาไปแล้ว (CSS ล้วน) */}
            <div className="khps-dockwrap">
                <div className="khps-wrap">
                    {/* 4 — เปิดดูข้างในเล่ม (หลักฐานชิ้นที่แรงที่สุด) */}
                    <SamplePages samples={paper.samplePages} />

                    {/* 5 — วิเคราะห์แนวข้อสอบ (ขึ้นเฉพาะชุดที่กรอกข้อมูลไว้) */}
                    <ExamAnalysisSection analysis={paper.analysis} />
                    <ExamAnalysisArticle article={paper.analysis?.article} />

                    {/* 6 — เสียงจากผู้เรียน */}
                    <StudioReviews reviews={reviews} reviewCount={reviewCount} avgRating={avgRating} />

                    {/* 7 — คำถามที่ถามบ่อย */}
                    <Faq />

                    {/* 8 — ชุดอื่นในคลัง */}
                    <RelatedPapers items={related} />
                </div>

                <div className="khps-dock">
                    <div className="khps-dock-inner">
                        <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium truncate">{paper.title}</div>
                            <div className="text-[12px] khps-muted">
                                ฿{price.toLocaleString()}
                                {hasDiscount && <span className="line-through ml-1.5">฿{fullPrice.toLocaleString()}</span>}
                            </div>
                        </div>
                        {buyCta(true)}
                    </div>
                </div>
            </div>

            {/* ฟอร์มสั่งซื้อ */}
            {checkoutOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(23,24,26,0.5)", backdropFilter: "blur(6px)" }}
                    onClick={() => !submitting && !formDirty && setCheckoutOpen(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="checkout-title"
                        className="khps-modal max-h-[92vh] overflow-y-auto p-6 md:p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div className="min-w-0">
                                <h2 id="checkout-title" className="text-[26px] font-extralight leading-tight" style={{ letterSpacing: "-0.02em" }}>
                                    สั่งซื้อชุดข้อสอบ
                                </h2>
                                <p className="text-[13px] mt-1.5 khps-muted truncate">{paper.title}</p>
                            </div>
                            <button
                                onClick={() => !submitting && setCheckoutOpen(false)}
                                aria-label="ปิด"
                                className="khps-muted hover:opacity-70 shrink-0 mt-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div
                            className="grid gap-5 items-start"
                            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
                        >
                            {/* ขั้นที่ 1 — โอนเงิน */}
                            <div className="khps-card-sm p-6">
                                <div className="flex items-center gap-2.5">
                                    <span className="khps-step">1</span>
                                    <span className="text-[15px] font-medium">โอนเงิน</span>
                                </div>

                                <div className="mt-6 text-[12px] khps-muted">ยอดที่ต้องโอน</div>
                                <div
                                    className="tabular-nums"
                                    style={{ fontSize: 42, fontWeight: 200, letterSpacing: "-0.03em", lineHeight: 1.1 }}
                                >
                                    ฿{price.toLocaleString()}
                                </div>

                                <TransferBlock />

                                <dl className="khps-spec mt-6">
                                    <dt>สิ่งที่ได้รับ</dt>
                                    <dd>{fileLabels.length > 0 ? fileLabels.join(" · ") : "ตัวข้อสอบ · เฉลย"}</dd>
                                    <dt>สิทธิ์ดาวน์โหลด</dt>
                                    <dd>ตลอดชีพ</dd>
                                    <dt>อนุมัติโดย</dt>
                                    <dd>ครูฮีม (ตรวจสลิปเอง)</dd>
                                </dl>

                                <p className="mt-5 text-[12.5px] font-light khps-muted leading-relaxed">
                                    โอนแล้วติดปัญหา ทัก{" "}
                                    <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="font-medium underline" style={{ color: "var(--kp-accent)" }}>
                                        LINE ครูฮีม
                                    </a>{" "}
                                    ได้เลยครับ ครูตอบเองทุกข้อความ
                                </p>
                            </div>

                            {/* ขั้นที่ 2 — กรอกข้อมูล */}
                            <div className="khps-card-sm p-6">
                                <div className="flex items-center gap-2.5 mb-5">
                                    <span className="khps-step">2</span>
                                    <span className="text-[15px] font-medium">กรอกข้อมูล แล้วแนบสลิป</span>
                                </div>

                                <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
                                    {authLoading ? (
                                        // ระหว่างกู้เซสชันยังไม่รู้ว่าเป็นสมาชิกเดิมหรือคนใหม่ —
                                        // ห้ามเดา ไม่งั้นสมาชิกเดิมจะเห็นช่องสมัครวูบขึ้นมา
                                        <p className="flex items-center gap-2 text-[12.5px] khps-muted">
                                            <Loader2 size={14} className="animate-spin" /> กำลังตรวจสอบบัญชี...
                                        </p>
                                    ) : user ? (
                                        <div
                                            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl px-4 py-3"
                                            style={{ background: "var(--kp-bg)" }}
                                        >
                                            <p className="text-[12.5px] font-light" style={{ color: "var(--kp-ink-2)" }}>
                                                สั่งซื้อในบัญชี <span className="font-semibold" style={{ color: "var(--kp-ink)" }}>{user.email}</span>
                                            </p>
                                            {/* มือถือเครื่องเดียวใช้กันทั้งบ้าน — ต้องเปลี่ยนบัญชีได้จากตรงนี้ */}
                                            <button type="button" onClick={() => logOut()} className="text-[12px] font-medium underline" style={{ color: "var(--kp-accent)" }}>
                                                ไม่ใช่บัญชีคุณ? ใช้บัญชีอื่น
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl p-4 space-y-2.5" style={{ background: "var(--kp-accent-soft)" }}>
                                            <p className="flex items-start gap-2 text-[12.5px] font-light leading-relaxed" style={{ color: "var(--kp-accent)" }}>
                                                <UserPlus size={15} className="shrink-0 mt-0.5" />
                                                <span>ตั้งอีเมลกับรหัสผ่านไว้ด้วยนะครับ ระบบจะเก็บไฟล์ไว้ในบัญชีนี้ให้ กลับมาโหลดซ้ำได้ตลอด <strong className="font-semibold">ถ้ามีบัญชีอยู่แล้วกรอกอีเมลกับรหัสเดิมได้เลย</strong></span>
                                            </p>
                                            <input
                                                className="khps-input"
                                                style={{ background: "#FFFFFF" }}
                                                placeholder="อีเมล *"
                                                aria-label="อีเมลสำหรับเก็บไฟล์ข้อสอบ"
                                                type="email"
                                                inputMode="email"
                                                autoComplete="email"
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); setAuthNotice(""); setNeedsResetLink(false); }}
                                                onBlur={checkEmailOnBlur}
                                            />
                                            <div className="relative">
                                                <input
                                                    className="khps-input pr-12"
                                                    style={{ background: "#FFFFFF" }}
                                                    placeholder="รหัสผ่าน (บัญชีใหม่ตั้งอย่างน้อย 6 ตัว) *"
                                                    aria-label="รหัสผ่านของบัญชี"
                                                    type={showPassword ? "text" : "password"}
                                                    // current-password เพื่อให้ตัวจำรหัสผ่านของเครื่องเติมรหัสเดิมให้ลูกค้าเก่าได้
                                                    // (ช่องนี้ใช้ทั้งสมัครใหม่และเข้าสู่ระบบ) — new-password จะบล็อกการเติม
                                                    autoComplete="current-password"
                                                    value={password}
                                                    onChange={(e) => { setPassword(e.target.value); setAuthNotice(""); setNeedsResetLink(false); }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword((v) => !v)}
                                                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "ดูรหัสผ่าน"}
                                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 khps-muted hover:opacity-70"
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {authNotice && (
                                                <div aria-live="polite" className="text-[12.5px] font-light leading-relaxed" style={{ color: "var(--kp-ink-3)" }}>
                                                    {authNotice}
                                                    {needsResetLink && (
                                                        <button type="button" onClick={sendReset} className="ml-1.5 font-semibold underline" style={{ color: "var(--kp-accent)" }}>
                                                            ส่งลิงก์ตั้งรหัสใหม่
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <input className="khps-input" placeholder="ชื่อ-นามสกุล *" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                    <input className="khps-input" placeholder="เบอร์โทรศัพท์ *" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))} />
                                    <input className="khps-input" placeholder="LINE ID (ถ้ามี)" value={lineId} onChange={(e) => setLineId(e.target.value)} />

                                    <label className="block cursor-pointer">
                                        <div className="khps-drop">
                                            {slipBusy ? (
                                                <div className="py-3 khps-muted">
                                                    <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
                                                    <span className="text-[13.5px] font-medium">กำลังเตรียมรูปสลิป...</span>
                                                </div>
                                            ) : slipPreview ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={slipPreview} alt="สลิป" className="max-h-40 mx-auto rounded-lg" />
                                            ) : (
                                                <div className="khps-muted">
                                                    <UploadCloud size={24} className="mx-auto mb-2" />
                                                    <span className="text-[13.5px] font-medium">แนบสลิปโอนเงิน *</span>
                                                </div>
                                            )}
                                            {/* value reset → re-picking the SAME file after a rejection still fires onChange */}
                                            <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0] || null; e.target.value = ""; pickSlip(f); }} />
                                        </div>
                                    </label>

                                    <button type="submit" disabled={submitting || slipBusy || authLoading} className="khps-btn khps-btn-block khps-btn-primary !mt-5">
                                        {submitting
                                            ? <><Loader2 className="animate-spin" size={18} /> {progress > 0 ? `กำลังอัปโหลด ${progress}%` : "กำลังส่ง..."}</>
                                            // ปุ่มต้องบอกเองว่าทำไมกดไม่ได้ — ข้อความ "กำลังตรวจสอบบัญชี"
                                            // ด้านบนอยู่ไกลเกินกว่าจะเห็นตอนเลื่อนมาถึงปุ่มบนมือถือ
                                            : authLoading
                                                ? <><Loader2 className="animate-spin" size={18} /> กำลังตรวจสอบบัญชี...</>
                                                : <><Check size={18} /> ยืนยันสั่งซื้อ</>}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * QR + เลขบัญชี ในธีม Studio
 *
 * ตัวเลขทั้งหมดมาจาก PAYMENT_INFO ที่เดียวกับหน้าแจ้งโอนหลัก (lib/constants)
 * — แยกเป็นคอมโพเนนต์ของตัวเองเพราะหน้าตาต่างจาก PaymentTransferInfo คนละธีม
 * ถ้าเลขบัญชีเปลี่ยน ให้แก้ที่ PAYMENT_INFO จุดเดียว ทุกหน้าจะตามมาเอง
 */
function TransferBlock() {
    const [copied, setCopied] = useState<string | null>(null);

    const copy = (v: string) => {
        navigator.clipboard?.writeText(v).then(() => {
            setCopied(v);
            setTimeout(() => setCopied((c) => (c === v ? null : c)), 1500);
        });
    };

    return (
        <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <div className="w-[104px] h-[104px] rounded-xl bg-white p-2 shrink-0" style={{ boxShadow: "var(--kp-shadow-sm)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={PAYMENT_INFO.qrImage} alt="QR พร้อมเพย์" className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0">
                    <div className="khps-eyebrow">พร้อมเพย์ · PromptPay</div>
                    <div className="text-[14px] font-medium mt-1.5">{PAYMENT_INFO.accountName}</div>
                    <div className="text-[12px] khps-muted mt-1">สแกนด้วยแอปธนาคารได้ทุกธนาคาร</div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                {PAYMENT_INFO.accounts.map((acc) => (
                    <div key={acc.value} className="rounded-xl px-4 py-3" style={{ background: "var(--kp-bg)" }}>
                        <div className="text-[11.5px] khps-muted">{acc.label}</div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                            <span className="text-[16px] font-medium tabular-nums tracking-wide">{acc.value}</span>
                            <button
                                type="button"
                                onClick={() => copy(acc.value)}
                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium shrink-0"
                                style={{ background: "var(--kp-accent-soft)", color: "var(--kp-accent)" }}
                            >
                                {copied === acc.value ? <><Check size={12} /> คัดลอกแล้ว</> : <><Copy size={12} /> คัดลอก</>}
                            </button>
                        </div>
                        {acc.note && <div className="text-[11.5px] khps-muted mt-1">{acc.note}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// คำถามที่คุณพ่อคุณแม่ถามบ่อย
function Faq() {
    const items = [
        {
            q: "ซื้อแล้วได้ไฟล์เมื่อไร?",
            a: "หลังครูฮีมตรวจสลิปและอนุมัติ ปกติไม่เกินไม่กี่ชั่วโมง ไฟล์จะไปรออยู่ที่หน้า “คอร์สเรียนของฉัน” ให้ดาวน์โหลดได้เลยครับ",
        },
        {
            q: "ดาวน์โหลดซ้ำได้ไหม?",
            a: "ได้ตลอดชีพครับ ซื้อครั้งเดียว กลับมาโหลดใหม่เมื่อไรก็ได้",
        },
        {
            q: "พิมพ์ออกมาให้ลูกทำได้ไหม?",
            a: "ได้เลยครับ ไฟล์ทำไว้สำหรับปริ้นท์ให้ลูกฝึกทำบนกระดาษจริงเหมือนสอบจริง",
        },
        {
            q: "ติดปัญหาติดต่อที่ไหน?",
            a: "",
        },
    ];

    return (
        <section className="khps-sec">
            <div className="khps-eyebrow">คำถามที่ถามบ่อย</div>
            <h2 className="khps-h2 mt-3.5" style={{ maxWidth: "26ch" }}>
                คุณพ่อคุณแม่ถามครูฮีมมาแบบนี้
            </h2>

            <div
                className="grid gap-5 mt-9"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}
            >
                {items.map((it) => (
                    <div key={it.q} className="khps-card-sm p-7">
                        <div className="text-[16px] font-medium leading-snug">{it.q}</div>
                        <p className="text-[14.5px] font-light leading-relaxed mt-3" style={{ color: "var(--kp-ink-3)" }}>
                            {it.a || (
                                <>
                                    ทัก{" "}
                                    <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="font-medium underline" style={{ color: "var(--kp-accent)" }}>
                                        LINE ครูฮีม
                                    </a>{" "}
                                    ได้เลยครับ ครูตอบเองทุกข้อความ
                                </>
                            )}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

// การ์ดเล็ก "ชุดอื่นในคลัง" — ใช้ทั้งท้ายหน้าขายและใต้หน้า "สั่งซื้อสำเร็จ"
function RelatedPapers({ items }: { items: ExamPaper[] }) {
    if (!items.length) return null;
    return (
        <section className="khps-sec">
            <div className="khps-eyebrow">ชุดอื่นในคลัง</div>
            <h2 className="khps-h2 mt-3.5" style={{ maxWidth: "24ch" }}>
                ชุดที่คนซื้อชุดนี้มักดูต่อ
            </h2>

            {/* auto-fill (ไม่ใช่ auto-fit) — เหลือชุดเดียว/สองชุดก็ยังเป็นการ์ดขนาดปกติ
                ไม่ยืดเต็มแถวจนปก A4 สูงท่วมหน้า */}
            <div
                className="grid gap-5 mt-9"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}
            >
                {items.map((p) => {
                    const pr = Number(p.price || 0);
                    const full = Number(p.fullPrice || 0);
                    return (
                        <Link
                            key={p.id}
                            href={`/exam-papers/${p.id}`}
                            className="khps-card-sm group overflow-hidden transition hover:-translate-y-0.5"
                        >
                            <div className="khps-slot khps-cover" style={{ borderRadius: 0 }}>
                                {p.coverUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.coverUrl} alt={p.title} loading="lazy" />
                                ) : (
                                    <FileText size={34} style={{ color: "var(--kp-ink-4)", opacity: 0.35 }} />
                                )}
                            </div>
                            <div className="p-5">
                                <div className="khps-eyebrow">
                                    {[p.level, p.category].filter(Boolean).join(" · ")}
                                </div>
                                <h3 className="text-[15px] font-medium leading-snug mt-2.5 line-clamp-2">{p.title}</h3>
                                <div className="flex items-baseline gap-2 mt-3">
                                    <span className="text-[17px] font-medium tabular-nums">฿{pr.toLocaleString()}</span>
                                    {full > pr && <span className="text-[13px] khps-muted line-through">฿{full.toLocaleString()}</span>}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
