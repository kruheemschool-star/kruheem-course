// Maps a URL pathname → a friendly Thai phrase for the admin "online users" list.
// Static, zero extra Firestore reads. (Specific item titles like an exam name are
// intentionally not resolved here to avoid per-user lookups.)

const EXACT: Record<string, string> = {
    "/": "อยู่ที่หน้าแรก",
    "/exam": "ดูคลังข้อสอบ",
    "/exam/dashboard": "ดูสรุปผลการสอบ",
    "/exam/search": "ค้นหาข้อสอบ",
    "/courses": "ดูหน้ารวมคอร์ส",
    "/my-courses": "ดูคอร์สของฉัน",
    "/reviews": "ดูรีวิว",
    "/summary": "ดูสรุปเนื้อหา",
    "/blog": "ดูบทความ",
    "/practice": "ฝึกทำโจทย์",
    "/payment": "อยู่หน้าชำระเงิน",
    "/profile": "ดูโปรไฟล์",
    "/guide": "ดูคู่มือการใช้งาน",
    "/login": "หน้าเข้าสู่ระบบ",
    "/register": "หน้าสมัครสมาชิก",
    "/set-password": "ตั้งรหัสผ่าน",
};

// order matters: check longer/more-specific prefixes first
const PREFIX: [string, string][] = [
    ["/exam/", "กำลังทำข้อสอบ"],
    ["/learn/", "อยู่ในห้องเรียน"],
    ["/course/", "ดูรายละเอียดคอร์ส"],
    ["/summary/", "อ่านสรุปเนื้อหา"],
    ["/blog/", "อ่านบทความ"],
    ["/practice/", "ฝึกทำโจทย์"],
    ["/parent-dashboard", "ดูแดชบอร์ดผู้ปกครอง"],
    ["/payment", "อยู่หน้าชำระเงิน"],
];

export function pageLabel(path?: string | null): string {
    if (!path) return "เยี่ยมชมเว็บไซต์";
    // strip query/hash + trailing slash
    let p = path.split("?")[0].split("#")[0];
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);

    if (EXACT[p]) return EXACT[p];
    for (const [prefix, label] of PREFIX) {
        if (p.startsWith(prefix)) return label;
    }
    return `ดูหน้า ${p}`;
}
