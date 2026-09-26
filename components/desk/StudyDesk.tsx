"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserAuth } from "@/context/AuthContext";
import { withTimeout } from "@/lib/netGuard";
import { fetchLessonsIndex } from "@/lib/lessonsIndex";
import { DEFAULT_COUNTDOWN } from "@/components/home/ExamCountdownHero";
import type { DeskHomeData } from "@/lib/deskHomeData";
import DeskLoader, { type DeskLoadStage } from "./DeskLoader";

// ตัวครอบหน้า "โต๊ะเรียน 3 มิติ" — ฉาก three.js โหลดฝั่งเครื่องผู้ใช้เท่านั้น (ssr:false)
// จึงไม่ลากไลบรารี 3 มิติเข้าหน้าอื่น ส่วนนี้เตรียมข้อมูลจริงให้ฉาก:
//   • ข้อมูลหน้าแรก (คอร์ส/รีวิว/รายการล่าสุด/วันสอบ) มาจากเซิร์ฟเวอร์ (lib/deskHomeData.ts)
//   • "คอร์สของฉัน" ของคนที่ล็อกอิน อ่านเฉพาะตอนเปิดแผงแล็ปท็อป (ไม่กินยอดอ่านทุกวิว)
const StudyDeskScene = dynamic(() => import("./StudyDeskScene"), {
  ssr: false,
  // พื้นสีเดียวกับผนังห้อง กันจอขาววาบระหว่างโหลดฉาก (หน้าจอกำลังโหลดจริงคือ DeskLoader ที่ทับอยู่ด้านบน)
  loading: () => <div style={{ position: "fixed", inset: 0, background: "#1d4f4a" }} />,
});

export type DeskCountdown = {
  enabled: boolean; kicker: string; examName: string; title: string;
  targetMs: number; startMs: number; showProgress: boolean; showQuote: boolean; quotes: string[];
};

export type DeskMy = {
  state: "loading" | "guest" | "fetching" | "ready" | "error";
  name?: string;
  resume?: { courseTitle: string; lessonTitle: string; href: string; done?: number; total?: number } | null;
  courses?: { title: string; href: string }[];
};

const DAY_MS = 86400000;

// เวลาในหลังบ้านไม่มีโซนเวลา = เวลาไทย (ตรงกับ lib/examCountdown.ts)
function parseThai(s: string): number {
  if (!s) return NaN;
  if (/(Z|[+-]\d{2}:\d{2})$/.test(s)) return Date.parse(s);
  const withSec = /T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
  return Date.parse(/T/.test(withSec) ? `${withSec}+07:00` : `${withSec}T00:00:00+07:00`);
}

// ปรับค่าจากหลังบ้านทับค่าเริ่มต้นทีละช่อง — กติกาเดียวกับการ์ดนับถอยหลังหน้าแรกเดิม
// (components/home/ExamCountdownHero.tsx) เพื่อให้ตัวเลขบนโต๊ะตรงกับหน้าเดิมเสมอ
function normalizeCountdown(raw: DeskHomeData["countdown"]): DeskCountdown {
  const d = raw || {};
  const b = DEFAULT_COUNTDOWN;
  const str = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v : fb);
  const examName = str(d.examName, b.examName);
  const targetDate = str(d.targetDate, b.targetDate);
  let targetMs = parseThai(targetDate);
  if (Number.isNaN(targetMs)) targetMs = parseThai(b.targetDate);
  const startDaysBefore = typeof d.startDaysBefore === "number" && d.startDaysBefore > 0 ? d.startDaysBefore : b.startDaysBefore;
  const sd = typeof d.startDate === "string" && d.startDate ? parseThai(d.startDate) : NaN;
  const quotes = Array.isArray(d.quotes) && d.quotes.filter(Boolean).length > 0 ? d.quotes.filter(Boolean) : b.quotes;
  return {
    enabled: typeof d.enabled === "boolean" ? d.enabled : b.enabled,
    kicker: str(d.kicker, b.kicker),
    examName,
    // ชื่อสนามบนปฏิทิน/หัวแผง — ตัดคำว่า "นับถอยหลัง" ที่ซ้ำกับหัวปฏิทินออก
    title: examName.replace(/^\s*นับถอยหลัง\s*/, "").trim() || examName,
    targetMs,
    startMs: Number.isNaN(sd) ? targetMs - startDaysBefore * DAY_MS : sd,
    showProgress: typeof d.showProgress === "boolean" ? d.showProgress : b.showProgress,
    showQuote: typeof d.showQuote === "boolean" ? d.showQuote : b.showQuote,
    quotes,
  };
}

async function loadMyDesk(uid: string, coursesById: Map<string, { title: string }>): Promise<Pick<DeskMy, "resume" | "courses">> {
  // 1) บทที่เรียนค้างล่าสุด (1 read) · 2) คอร์สที่อนุมัติแล้ว (ใบแจ้งโอนของตัวเอง)
  const [st, en] = await Promise.all([
    withTimeout(getDocs(query(collection(db, "users", uid, "course_states"), orderBy("lastUpdated", "desc"), limit(1))), 12000, "desk:course_states"),
    withTimeout(getDocs(query(collection(db, "enrollments"), where("userId", "==", uid))), 12000, "desk:enrollments"),
  ]);
  const isBank = (title: string) => title.includes("คลังข้อสอบ");
  const seen = new Set<string>();
  const courses: { title: string; href: string }[] = [];
  for (const d of en.docs) {
    const e = d.data() as { courseId?: string; courseTitle?: string; status?: string };
    if (e.status !== "approved" || !e.courseId || seen.has(e.courseId)) continue;
    seen.add(e.courseId);
    const title = coursesById.get(e.courseId)?.title || e.courseTitle || "คอร์สเรียน";
    courses.push({ title, href: isBank(title) ? "/exam" : `/learn/${e.courseId}` });
  }
  let resume: DeskMy["resume"] = null;
  const last = st.docs[0];
  if (last) {
    const s = last.data() as { lessonId?: string; lessonTitle?: string; timestamp?: number; courseTitle?: string };
    const courseId = last.id;
    const courseTitle = coursesById.get(courseId)?.title || s.courseTitle || "คอร์สเรียน";
    const href = isBank(courseTitle)
      ? "/exam"
      : `/learn/${courseId}${s.lessonId ? `?lessonId=${encodeURIComponent(s.lessonId)}&t=${Math.floor(s.timestamp || 0)}` : ""}`;
    resume = { courseTitle, lessonTitle: s.lessonTitle || "", href };
    // ความคืบหน้า "เรียนแล้ว X จาก Y บท" — นับแบบเดียวกับ /my-courses (วิดีโอที่ไม่ซ่อน)
    try {
      const [pg, idx] = await Promise.all([
        withTimeout(getDoc(doc(db, "users", uid, "progress", courseId)), 12000, "desk:progress"),
        fetchLessonsIndex(courseId),
      ]);
      const vids = (idx || []).filter((l) => l.type === "video" && !l.isHidden);
      if (vids.length) {
        const done = new Set<string>(((pg.data()?.completed as string[]) || []));
        resume.done = vids.filter((v) => done.has(v.id)).length;
        resume.total = vids.length;
      }
    } catch { /* ไม่มีตัวเลขความคืบหน้าก็ยังพาไปเรียนต่อได้ */ }
  }
  return { resume, courses };
}

// ฉาก 3 มิติเรนเดอร์ฝั่งเครื่องผู้ใช้เท่านั้น → HTML จากเซิร์ฟเวอร์จะว่างเปล่า
// ชุดนี้เรนเดอร์จากเซิร์ฟเวอร์ (ซ่อนจากตา แต่โปรแกรมอ่านจอ/Google อ่านได้) ให้ครบเนื้อหาเดียวกับเมนูบนโต๊ะ
// + ข้อมูลโครงสร้างองค์กรเหมือนหน้าแรกเดิม — กันอันดับ Google ตกตอนสลับหน้าแรกเป็นโต๊ะเรียน
const SR_ONLY: CSSProperties = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 };
const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "KruHeem Course",
  url: "https://www.kruheemmath.com",
  logo: "https://www.kruheemmath.com/assets/kruheem_avatar.png",
  sameAs: ["https://www.facebook.com/kruheem", "https://www.youtube.com/kruheem"],
  description: "สถาบันกวดวิชาคณิตศาสตร์ออนไลน์ โดยครูฮีม เน้นความเข้าใจ เทคนิคคิดลัด และการนำไปใช้จริง",
  address: { "@type": "PostalAddress", addressLocality: "Bangkok", addressCountry: "TH" },
  offers: { "@type": "Offer", category: "Online Course" },
};

function DeskSeo({ data }: { data: DeskHomeData }) {
  const feat: [string, string, { t: string; href: string }[]][] = [
    ["คลังข้อสอบ", "/exam", data.feat.exams],
    ["สรุปเนื้อหา", "/summary", data.feat.summary],
    ["เทคนิคการเรียน", "/blog", data.feat.tips],
  ];
  return (
    <div style={SR_ONLY}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }} />
      <h1>คอร์สเรียนคณิตศาสตร์ออนไลน์ ติวสอบเข้า ม.1 ม.4 โดยครูฮีม สอนเทคนิคคิดลัด เข้าใจง่าย</h1>
      <nav aria-label="เมนูหลัก">
        <h2>คอร์สเรียน</h2>
        {data.cats.map((cat) => (
          <section key={cat}>
            <h3>{cat}</h3>
            <ul>{(data.coursesByCat[cat] || []).map((c) => <li key={c.id}><a tabIndex={-1} href={c.href}>{c.title}</a></li>)}</ul>
          </section>
        ))}
        {feat.map(([title, href, items]) => (
          <section key={href}>
            <h2><a tabIndex={-1} href={href}>{title}</a></h2>
            <ul>{items.map((it) => <li key={it.href}><a tabIndex={-1} href={it.href}>{it.t}</a></li>)}</ul>
          </section>
        ))}
        <ul>
          <li><a tabIndex={-1} href="/my-courses">คอร์สของฉัน</a></li>
          <li><a tabIndex={-1} href="/reviews">รีวิวจากผู้เรียน</a></li>
          <li><a tabIndex={-1} href="/how-to-apply">วิธีสมัครเรียน</a></li>
          <li><a tabIndex={-1} href="/payment">แจ้งโอน</a></li>
          <li><a tabIndex={-1} href="/faq">คำถามที่พบบ่อย</a></li>
          <li><a tabIndex={-1} href="/game">เกมพักสมอง ครูฮีม หนีซอมบี้!</a></li>
          <li><a tabIndex={-1} href="https://line.me/ti/p/~kruheemschool">ติดต่อครูฮีมทาง LINE</a></li>
        </ul>
      </nav>
    </div>
  );
}

export default function StudyDesk({ data, classicUrl }: { data: DeskHomeData; classicUrl: string }) {
  const { user, userProfile, loading, isAdmin, pendingCount } = useUserAuth();
  // หน้าจอกำลังโหลด: boot (HTML จากเซิร์ฟเวอร์) → engine (สคริปต์หน้านี้ทำงานแล้ว รอโหลดชุดภาพ 3 มิติ)
  // → build (ฉากกำลังสร้างของบนโต๊ะ) → ready (วาดเฟรมแรกแล้ว) แล้วค่อยๆ จางหาย
  const [loadStage, setLoadStage] = useState<DeskLoadStage>("boot");
  const [loaderGone, setLoaderGone] = useState(false);
  useEffect(() => { setLoadStage((s) => (s === "boot" ? "engine" : s)); }, []);
  const onStage = useCallback((s: DeskLoadStage) => setLoadStage((cur) => (cur === "ready" ? cur : s)), []);
  const onReady = useCallback(() => {
    // ตอนพัฒนา: ?loader_hold=1 ค้างหน้าจอกำลังโหลดไว้ดูหน้าตา
    if (process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("loader_hold")) return;
    setLoadStage("ready");
  }, []);
  useEffect(() => {
    if (loadStage !== "ready") return;
    const t = window.setTimeout(() => setLoaderGone(true), 900);
    return () => window.clearTimeout(t);
  }, [loadStage]);
  // กันค้าง: ฉากพังหรือไม่ส่งสัญญาณ → ปิดหน้าจอโหลดเองหลัง 30 วินาที (ลิงก์หน้าคลาสสิกขึ้นตั้งแต่วินาทีที่ 10)
  useEffect(() => { const t = window.setTimeout(() => onReady(), 30000); return () => window.clearTimeout(t); }, [onReady]);
  // แจ้งเตือนเฉพาะแอดมิน: จำนวนสลิปแจ้งโอนที่รอตรวจ (AuthContext ฟังแบบ realtime อยู่แล้ว เฉพาะบัญชีแอดมิน)
  // ตอนพัฒนา: ?admin_demo=3 จำลองมุมมองแอดมินโดยไม่ต้องล็อกอิน
  const admin = useMemo(() => {
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      const demo = new URLSearchParams(window.location.search).get("admin_demo");
      if (demo !== null) return { on: true, pending: Math.max(0, parseInt(demo, 10) || 0) };
    }
    return { on: !!isAdmin, pending: isAdmin ? pendingCount : 0 };
  }, [isAdmin, pendingCount]);
  const countdown = useMemo(() => normalizeCountdown(data.countdown), [data.countdown]);
  const coursesById = useMemo(() => {
    const m = new Map<string, { title: string }>();
    Object.values(data.coursesByCat).forEach((l) => l.forEach((c) => m.set(c.id, { title: c.title })));
    return m;
  }, [data.coursesByCat]);

  // ผลลัพธ์ผูกกับ uid เสมอ — สลับบัญชีกลางทางจะไม่เอาคอร์สของคนก่อนมาโชว์
  const [mine, setMine] = useState<{ uid: string; ok: boolean; data?: Pick<DeskMy, "resume" | "courses"> } | null>(null);
  const wantMy = useRef(false);
  const inflight = useRef<string | null>(null);
  const uid = user?.uid;
  const uidRef = useRef(uid);
  uidRef.current = uid;
  const mineRef = useRef(mine);
  mineRef.current = mine;

  // retry=true เฉพาะตอนผู้ใช้เปิดแผงเอง — โหลดพลาดแล้วจะไม่ลองซ้ำอัตโนมัติ (กันวนอ่าน Firestore)
  const fetchMy = useCallback(async (retry: boolean) => {
    const u = uidRef.current;
    if (!u || inflight.current === u) return;
    const m = mineRef.current;
    if (m && m.uid === u && (m.ok || !retry)) return;
    inflight.current = u;
    setMine((prev) => (prev && prev.uid === u && !prev.ok ? null : prev)); // ลองใหม่ → กลับไปสถานะกำลังโหลด
    try {
      const data = await loadMyDesk(u, coursesById);
      if (uidRef.current === u) setMine({ uid: u, ok: true, data });
    } catch (e) {
      console.error("desk: load my courses failed", e);
      if (uidRef.current === u) setMine({ uid: u, ok: false });
    } finally {
      if (inflight.current === u) inflight.current = null;
    }
  }, [coursesById]);

  // ฉากเรียกเมื่อเปิดแผง "คอร์สของฉัน" — ถ้าสถานะล็อกอินยังไม่มา จะดึงให้ทันทีที่รู้
  const onNeedMy = useCallback(() => { wantMy.current = true; void fetchMy(true); }, [fetchMy]);
  // แตะเครื่องเกมบนโต๊ะ → หน้าเกม "ครูฮีม หนีซอมบี้!" (เปลี่ยนหน้าแบบไม่รีโหลด ปุ่ม "หน้าแรก" ในเกมพากลับมาที่โต๊ะ)
  const router = useRouter();
  const onGame = useCallback(() => router.push("/game"), [router]);
  useEffect(() => { if (wantMy.current && uid && !loading) void fetchMy(false); }, [uid, loading, fetchMy]);

  const own = mine && uid && mine.uid === uid ? mine : null;
  const my: DeskMy = loading
    ? { state: "loading" }
    : !user
      ? { state: "guest" }
      : {
        state: own ? (own.ok ? "ready" : "error") : "fetching",
        name: userProfile?.displayName || user.displayName || "",
        ...(own?.data || {}),
      };

  return (
    <>
      {/* ลายเกรนทั้งเว็บ (layout) ทับฉาก WebGL + กินแรงการ์ดจอบนมือถือ — ปิดเฉพาะหน้านี้ */}
      <style>{".noise-overlay{display:none!important}"}</style>
      <DeskSeo data={data} />
      <StudyDeskScene data={data} countdown={countdown} my={my} admin={admin} onNeedMy={onNeedMy} onGame={onGame} classicUrl={classicUrl} onStage={onStage} onReady={onReady} />
      {!loaderGone && <DeskLoader stage={loadStage} leaving={loadStage === "ready"} classicUrl={classicUrl} />}
    </>
  );
}
