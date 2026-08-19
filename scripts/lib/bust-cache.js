// บัสต์แคช ISR ของเว็บโปรดักชันจากสคริปต์ Admin SDK ในเครื่อง
//
// ทำไมต้องมี (audit 2026-08-19): แคชข้อสอบฝั่งเซิร์ฟเวอร์ยืดเป็น 24 ชม. โดยพึ่ง
// การบัสต์ตอน "แอดมินกดบันทึกบนเว็บ" — แต่เวิร์กโฟลว์จริงของเราแก้ข้อสอบผ่าน
// สคริปต์ (replace-*-exam.js / import-*.js) ซึ่งเขียน Firestore ตรงๆ ไม่ผ่านเว็บ
// ถ้าไม่บัสต์ นักเรียนจะเห็นข้อสอบชุดเก่าค้างได้ถึง 24 ชม.
//
// วิธี auth โดยไม่ต้องรู้รหัสผ่านใคร: Admin SDK มี service account อยู่แล้ว →
// mint custom token ให้บัญชีแอดมิน → แลกเป็น ID token ผ่าน Identity Toolkit
// (public API key) → POST ไป /api/revalidate-* ซึ่งตรวจอีเมลกับ allow-list
//
// ใช้ยังไง (ท้ายสคริปต์ import/replace ทุกตัว):
//   const { bustCaches } = require("./lib/bust-cache");   // ปรับ path ตามที่อยู่ไฟล์
//   await bustCaches(["exams"]);                          // หรือ ["posts"], ["summaries"], ["settings"]
//
// หรือรันเดี่ยวหลังทำงาน manual เสร็จ:
//   node scripts/bust-caches.js exams

const SITE = process.env.KRUHEEM_SITE_URL || "https://www.kruheemmath.com";

/** อีเมลแอดมินที่ใช้ mint token — ต้องอยู่ใน ADMIN_EMAILS ของเว็บ */
const ADMIN_EMAIL = process.env.KRUHEEM_ADMIN_EMAIL || "kruheemschool@gmail.com";

function loadEnvLocal() {
    // ดึง NEXT_PUBLIC_FIREBASE_API_KEY จาก .env.local ของโปรเจกต์ (ไม่พึ่ง dotenv)
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const fs = require("fs");
    const path = require("path");
    let dir = __dirname;
    for (let i = 0; i < 4; i++) {
        const f = path.join(dir, ".env.local");
        if (fs.existsSync(f)) {
            const m = fs.readFileSync(f, "utf8").match(/NEXT_PUBLIC_FIREBASE_API_KEY=(.+)/);
            if (m) return m[1].trim();
        }
        dir = path.dirname(dir);
    }
    throw new Error("หา NEXT_PUBLIC_FIREBASE_API_KEY ไม่เจอ (.env.local)");
}

/** ขอ ID token ของบัญชีแอดมินด้วย custom token จาก Admin SDK */
async function getAdminIdToken(adminApp) {
    const apiKey = loadEnvLocal();
    const user = await adminApp.auth().getUserByEmail(ADMIN_EMAIL);
    const customToken = await adminApp.auth().createCustomToken(user.uid);
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: customToken, returnSecureToken: true }),
        }
    );
    if (!res.ok) throw new Error(`แลก custom token ไม่สำเร็จ: HTTP ${res.status}`);
    const data = await res.json();
    return data.idToken;
}

/**
 * บัสต์แคชตามชนิดเนื้อหา
 * @param {Array<"exams"|"exam-papers"|"posts"|"summaries"|"settings">} targets
 * @param {object} [adminApp] instance ของ firebase-admin ที่ initialize แล้ว
 *                            (ไม่ส่งมาจะ require("firebase-admin") ใช้ default app)
 */
async function bustCaches(targets, adminApp) {
    const admin = adminApp || require("firebase-admin");
    const idToken = await getAdminIdToken(admin);
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` };

    const results = [];
    if (targets.includes("exams")) {
        const res = await fetch(`${SITE}/api/revalidate-exams`, { method: "POST", headers });
        results.push(`exams: ${res.status}`);
    }
    if (targets.includes("exam-papers")) {
        const res = await fetch(`${SITE}/api/revalidate-exam-papers`, { method: "POST", headers });
        results.push(`exam-papers: ${res.status}`);
    }
    const contentTargets = targets.filter((t) => ["posts", "summaries", "settings"].includes(t));
    if (contentTargets.length > 0) {
        const res = await fetch(`${SITE}/api/revalidate-content`, {
            method: "POST",
            headers,
            body: JSON.stringify({ targets: contentTargets }),
        });
        results.push(`content(${contentTargets.join(",")}): ${res.status}`);
    }
    console.log(`[bust-cache] ${results.join(" | ")}`);
    const failed = results.filter((r) => !/: 200$/.test(r));
    if (failed.length > 0) {
        console.warn("[bust-cache] ⚠️ บางรายการไม่สำเร็จ — เว็บจะอัปเดตเองเมื่อแคชหมดอายุ (สูงสุด 24 ชม.)");
    }
    return results;
}

module.exports = { bustCaches };
