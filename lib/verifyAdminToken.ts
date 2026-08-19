import { ADMIN_EMAILS } from "@/lib/constants";

// ตรวจว่า ID token ที่แนบมาเป็นของแอดมินจริง — ใช้ร่วมกันทุก route ฝั่งเซิร์ฟเวอร์
// (revalidate-exams / revalidate-exam-papers / revalidate-content)
//
// ทำไมไม่ใช้ Admin SDK: service-account creds ไม่ได้ตั้งไว้ใน prod (เหตุเดียวกับ
// /api/exam-averages ที่เคย 500) — จึงยืนยัน token ผ่าน Identity Toolkit REST
// ด้วย public web API key แบบเดียวกับที่ฝั่งอ่านข้อมูลใช้ endpoint นี้ปฏิเสธ
// token ปลอม/หมดอายุ แล้วคืนอีเมลของผู้ล็อกอิน ให้เช็คกับ allow-list; fail closed
//
// เดิม logic นี้ถูกก๊อปไว้ 3 route แล้วเริ่ม drift (timeout/cache ไม่ตรงกัน) —
// รวมเป็น helper เดียว การแก้เรื่องความปลอดภัยจะได้ครบทุก route ในที่เดียว
export async function verifyAdminToken(idToken: string): Promise<boolean> {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) return false;
    try {
        const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
                cache: "no-store",
                signal: AbortSignal.timeout(8000),
            }
        );
        if (!res.ok) return false;
        const data = (await res.json()) as { users?: { email?: string }[] };
        const email = (data.users?.[0]?.email || "").toLowerCase();
        return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email);
    } catch {
        return false;
    }
}
