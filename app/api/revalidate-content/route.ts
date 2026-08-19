import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { verifyAdminToken } from "@/lib/verifyAdminToken";

// On-demand ISR invalidation สำหรับเนื้อหาสาธารณะที่ไม่ใช่ข้อสอบ
// (ข้อสอบมี /api/revalidate-exams ของตัวเองอยู่แล้ว — ไฟล์นี้ใช้แพตเทิร์นเดียวกัน)
//
// ทำไมต้องมี: แคชฝั่งเซิร์ฟเวอร์ของหน้าแรก/สรุป/บทความถูกยืดจาก 30 วิ–5 นาที
// เป็น 1 ชม. เพื่อตัด reads ทิ้งเปล่า (audit 2026-08-19) — ความสดจึงย้ายมาอยู่ที่
// endpoint นี้แทน: หน้าแอดมินบันทึกเสร็จจะ POST มาที่นี่ (ผ่าน lib/bustContentCache)
// แล้วแคชที่เกี่ยวถูกบัสต์ทันที ผู้ชมเห็นของใหม่เหมือนตอน TTL สั้นทุกประการ
//
// body: { targets: ("settings" | "summaries" | "posts")[], slug?: string }
//   settings  → settings/homepage_promotion (โปรโมชัน/นับถอยหลัง/สวิตช์คลังข้อสอบ)
//   summaries → /summary + /api/summary-toc + ฟีดหน้าแรก (+ /summary/[slug])
//   posts     → /blog + ฟีดหน้าแรก (+ /blog/[slug])
//   slug      → ถ้าระบุ จะบัสต์เฉพาะหน้าบทความนั้น แทนการบัสต์ทุก [slug] พร้อมกัน
//               (แก้ 1 บทความไม่ควรบังคับให้ทุกบทความ re-render ใหม่ทั้งเว็บ)

export const runtime = "nodejs";

const VALID_TARGETS = new Set(["settings", "summaries", "posts"]);

export async function POST(request: NextRequest) {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // อ่าน/ตรวจ body ก่อนยิงตรวจ token — คำขอเปล่าจะได้ 400 ฟรีๆ
    // ไม่ต้องเสีย round-trip ไป Identity Toolkit ทิ้ง
    let targets: string[] = [];
    let slug = "";
    try {
        const body = (await request.json()) as { targets?: string[]; slug?: string };
        targets = (body.targets || []).filter((t) => VALID_TARGETS.has(t));
        // slug ใช้ประกอบ path ตรงๆ — รับเฉพาะรูปแบบ slug ปกติกันของแปลกปน
        if (typeof body.slug === "string" && /^[a-z0-9ก-๙_-]{1,200}$/i.test(body.slug)) {
            slug = body.slug;
        }
    } catch {
        /* no body → 400 below */
    }
    if (targets.length === 0) {
        return NextResponse.json({ error: "No valid targets" }, { status: 400 });
    }

    const ok = await verifyAdminToken(token);
    if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    for (const target of targets) {
        if (target === "settings") {
            // ทุก fetch ของ settings/homepage_promotion ติด tag นี้ (lib/publicSettings.ts)
            revalidateTag("public-settings", { expire: 0 });
            revalidatePath("/");        // หน้าแรก (โปรโมชัน + การ์ดนับถอยหลัง)
            revalidatePath("/exam");    // สวิตช์ examConfig มีผลกับหน้าคลังข้อสอบ
        } else if (target === "summaries") {
            revalidateTag("summaries-feed", { expire: 0 });
            revalidatePath("/summary");
            revalidatePath("/api/feature-summaries"); // ฟีดหน้าแรก (FeatureCarousel)
            if (slug) revalidatePath(`/summary/${slug}`);
            else revalidatePath("/summary/[slug]", "page");
        } else if (target === "posts") {
            revalidateTag("posts-feed", { expire: 0 });
            revalidatePath("/blog");
            revalidatePath("/api/feature-posts"); // ฟีดหน้าแรก (FeatureCarousel)
            if (slug) revalidatePath(`/blog/${slug}`);
            else revalidatePath("/blog/[slug]", "page");
        }
    }

    return NextResponse.json({ revalidated: true, targets, ...(slug ? { slug } : {}) });
}
