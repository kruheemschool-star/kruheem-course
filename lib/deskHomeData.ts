import { listCollection, type FsDoc } from "@/lib/firestoreRest";
import { getHomeCountdown } from "@/lib/homeCountdown";
import type { CountdownConfig } from "@/components/home/ExamCountdownHero";

// ข้อมูลจริงของหน้า "โต๊ะเรียน 3 มิติ" (components/desk) — ต้นแบบจากครูฮีมใส่ข้อมูลสมมติ
// (คอร์ส ราคา รีวิวชื่อสมมติ วันสอบ) ไว้ในโค้ด ที่นี่แทนด้วยของจริงทั้งหมด
//
// อ่านฝั่งเซิร์ฟเวอร์ผ่าน REST (lib/firestoreRest) ด้วย field list + revalidate + tag
// "ชุดเดียวกับหน้าที่มีอยู่แล้ว" ทุกตัว — URL ของ fetch ตรงกัน = ใช้แคชร่วมกัน
// จึงแทบไม่เพิ่มยอดอ่าน Firestore (ลำดับ field มีผล ห้ามสลับ):
//   courses   ↔ app/api/home-courses   · reviews ↔ app/api/home-reviews
//   exams     ↔ app/exam/page.tsx      · summaries ↔ app/summary/page.tsx
//   posts     ↔ app/blog/page.tsx      · countdown ↔ lib/homeCountdown (settings)

export type DeskCourse = { id: string; title: string; desc: string; price: number; fullPrice: number; href: string };
export type DeskReview = { id: string; q: string; t: string; n: string; nShort: string; c: string; stars: number };
export type DeskFeatItem = { t: string; href: string };
export type DeskHomeData = {
  cats: string[];
  coursesByCat: Record<string, DeskCourse[]>;
  reviews: DeskReview[];
  feat: { exams: DeskFeatItem[]; summary: DeskFeatItem[]; tips: DeskFeatItem[] };
  countdown: Partial<CountdownConfig> | null;
};

// ลำดับหมวดเดียวกับ HomeClient (+ หมวดที่หน้าแจ้งโอนรู้จัก) หมวดที่ไม่อยู่ในรายการต่อท้ายตามตัวอักษร
const CAT_ORDER = [
  "คอร์สสอบเข้า", "สอบเข้า ม.1", "ป.6 สอบเข้า ม.1", "ประถม (ป.4-6)", "ม.ต้น (ม.1-3)",
  "ม.ปลาย (ม.4-6)", "ม.ปลาย (คณิตเพิ่มเติม)", "คลังข้อสอบ", "คอร์สเรียนทั่วไป",
];

const oneLine = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();
const timeMs = (s: unknown) => (s ? new Date(String(s)).getTime() || 0 : 0);
const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max).trimEnd() + "…" : s);

// คำอธิบายคอร์สจริงมักเป็นข้อความยาวสไตล์โพสต์เฟซบุ๊ก (อีโมจิ / +++++ / หลายบรรทัด)
// การ์ดในแผงต้องการบรรทัดเดียวสั้นๆ → เอาบรรทัดแรกที่มีเนื้อหา ตัดอีโมจิและขีดตกแต่งออก
function shortDesc(desc: unknown, title = ""): string {
  const lines = String(desc ?? "").split(/\r?\n/);
  const bare = (x: string) => x.replace(/[^\p{L}\p{N}]/gu, "");
  const t = bare(title);
  for (const raw of lines) {
    const s = raw
      .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
      .replace(/[+*=_#~|]{2,}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const b = bare(s);
    // บรรทัดแรกของหลายคอร์สคือชื่อคอร์สซ้ำ (เช่น "🔥 คอร์สเก่งสมการ 🔥") → ข้ามไปบรรทัดถัดไป
    if (b.length >= 4 && !(t && (b === t || t.includes(b)))) return clip(s, 64);
  }
  return "";
}

async function safeList(id: string, fields: string[], opts: { revalidate: number; tags?: string[] }): Promise<FsDoc[]> {
  // พลาดครั้งแรกลองซ้ำหนึ่งครั้ง (แบบเดียวกับหน้า /blog /summary) — กันเน็ตสะดุดชั่วคราว
  // แล้วหน้าถูกแคชไปพร้อมแผงว่างทั้งรอบ ISR
  try {
    return await listCollection(id, fields, opts);
  } catch {
    await new Promise((r) => setTimeout(r, 600));
    try {
      return await listCollection(id, fields, opts);
    } catch (error) {
      console.error(`desk-home: read ${id} failed`, error);
      return [];
    }
  }
}

// ----- รีวิว -----
// รีวิวจริงไม่มี "พาดหัวสั้น" และไม่มีฟิลด์บอกว่าเป็นนักเรียนหรือผู้ปกครอง
// → พาดหัว = ท่อนแรกของความเห็นเอง (ตัดที่ช่องว่าง/เครื่องหมาย) ไม่แต่งคำขึ้นใหม่
//   และไม่ติดป้าย "น้องๆ/ผู้ปกครอง" (เดาผิด = ป้ายโกหก) ใช้ชื่อคอร์สแทน
function splitHeadline(comment: string): { q: string; t: string } {
  const c = oneLine(comment);
  if (c.length <= 30) return { q: c, t: "" };
  let cut = -1;
  for (let i = 8; i <= 30 && i < c.length; i++) {
    if (c[i] === " ") cut = i;
    else if ("!?".includes(c[i])) cut = i + 1;
  }
  if (cut > 0) return { q: c.slice(0, cut).trim(), t: c.slice(cut).trim() };
  // ไม่มีจุดตัดธรรมชาติ — ตัดตามขอบคำไทย ท่อนล่างเป็นส่วนที่เหลือ (อ่านต่อกันได้ ไม่ซ้ำท่อนบน)
  let q = "";
  try {
    const seg = new Intl.Segmenter("th", { granularity: "word" });
    for (const { segment } of seg.segment(c)) {
      if ((q + segment).length > 24) break;
      q += segment;
    }
  } catch {
    q = c.slice(0, 24);
  }
  if (!q) q = c.slice(0, 24);
  return { q: q.trim() + "…", t: "…" + c.slice(q.length).trim() };
}

function shortName(name: string): string {
  const parts = oneLine(name).split(" ").filter(Boolean);
  if (!parts.length) return "";
  let n = parts[0];
  if (/^(คุณ|น้อง|ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง)$/.test(n) && parts[1]) n += " " + parts[1];
  return clip(n, 16);
}

function pickReviews(docs: FsDoc[]): DeskReview[] {
  const seen = new Set<string>();
  const ok = docs
    .filter((d) => d.isHidden !== true)
    .map((d) => ({
      id: d.id,
      name: oneLine(d.userName),
      rating: (d.rating as number | undefined) ?? 0,
      comment: oneLine(d.comment),
      course: oneLine(d.courseName),
      at: timeMs(d.createdAt),
    }))
    .filter((r) =>
      r.rating >= 5 &&
      /[฀-๿]/.test(r.comment) &&
      !/(.)\1{4,}/u.test(r.comment) &&
      r.comment.length >= 20 && r.comment.length <= 160 &&
      r.name,
    )
    .sort((a, b) => b.at - a.at)
    .filter((r) => (seen.has(r.name) ? false : (seen.add(r.name), true)))
    .slice(0, 24);
  if (!ok.length) return [];
  // หมุนชุดที่โชว์ทุกวัน (กระดานมีโพสต์อิท 6 ใบ) — หน้าเป็น ISR จึงเปลี่ยนเองเมื่อข้ามวัน
  const day = Math.floor((Date.now() + 7 * 3600e3) / 86400000);
  const start = (day * 6) % ok.length;
  const six = Array.from({ length: Math.min(6, ok.length) }, (_, i) => ok[(start + i) % ok.length]);
  return six.map((r) => {
    const { q, t } = splitHeadline(r.comment);
    return { id: r.id, q, t, n: r.name, nShort: shortName(r.name), c: r.course, stars: Math.round(r.rating) };
  });
}

export async function getDeskHomeData(): Promise<DeskHomeData> {
  const [courseDocs, reviewDocs, examDocs, summaryDocs, postDocs, countdown] = await Promise.all([
    safeList("courses", ["title", "desc", "category", "image", "price", "fullPrice", "keywords"], { revalidate: 900 }),
    safeList("reviews", ["userName", "userPhoto", "rating", "comment", "courseName", "isHidden", "createdAt"], { revalidate: 900 }),
    safeList("exams", [
      "title", "description", "level", "category", "difficulty",
      "themeColor", "coverImage", "tags", "isFree", "questionCount",
      "order", "createdAt", "updatedAt", "hidden",
    ], { revalidate: 86400, tags: ["exams-feed"] }),
    safeList("summaries", [
      "title", "slug", "order", "status", "excerpt", "meta_description",
      "coverImage", "category", "readingTime", "viewCount",
    ], { revalidate: 3600, tags: ["summaries-feed"] }),
    safeList("posts", ["title", "slug", "coverImage", "status", "createdAt"], { revalidate: 3600, tags: ["posts-feed"] }),
    getHomeCountdown(),
  ]);

  // ----- คอร์ส (จัดกลุ่ม/เรียงแบบเดียวกับ HomeClient) -----
  const coursesByCat: Record<string, DeskCourse[]> = {};
  for (const d of courseDocs) {
    const cat = oneLine(d.category) || "คอร์สเรียนทั่วไป";
    (coursesByCat[cat] ||= []).push({
      id: d.id,
      title: oneLine(d.title),
      desc: shortDesc(d.desc, oneLine(d.title)),
      price: (d.price as number | undefined) ?? 0,
      fullPrice: (d.fullPrice as number | undefined) ?? 0,
      href: `/course/${d.id}`,
    });
  }
  Object.values(coursesByCat).forEach((list) => list.sort((a, b) => a.title.localeCompare(b.title, "th")));
  const cats = Object.keys(coursesByCat).sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b, "th");
  });

  // ----- รายการล่าสุดในแผงคลังข้อสอบ / สรุป / เทคนิค — ลิงก์ไปรายการจริงทีละชิ้น -----
  const exams = examDocs
    .filter((d) => !d.hidden && d.createdAt && oneLine(d.title))
    .sort((a, b) => timeMs(b.createdAt) - timeMs(a.createdAt))
    .slice(0, 3)
    .map((d) => ({ t: oneLine(d.title), href: `/exam/${d.id}` }));
  const summary = summaryDocs
    .filter((d) => d.status === "published" && d.slug && oneLine(d.title))
    .sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0))
    .slice(0, 3)
    .map((d) => ({ t: oneLine(d.title), href: `/summary/${d.slug}` }));
  const tips = postDocs
    .filter((d) => (d.status === "published" || !d.status) && d.createdAt && d.slug && oneLine(d.title))
    .sort((a, b) => timeMs(b.createdAt) - timeMs(a.createdAt))
    .slice(0, 3)
    .map((d) => ({ t: oneLine(d.title), href: `/blog/${d.slug}` }));

  return { cats, coursesByCat, reviews: pickReviews(reviewDocs), feat: { exams, summary, tips }, countdown };
}
