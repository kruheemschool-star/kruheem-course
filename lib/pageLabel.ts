// Maps a URL pathname → a friendly Thai phrase for the admin "online users" list.
// Static and synchronous. Specific item titles (which course classroom / which
// exam set) are resolved only when the caller passes in id→title maps — the
// admin online-users hook builds those once from the cached /api/home-courses
// and /api/feature-exams feeds, so there are still zero per-user Firestore reads.

const EXACT: Record<string, string> = {
    "/": "อยู่ที่หน้าแรก",
    "/exam": "ดูคลังข้อสอบ",
    "/exam/dashboard": "ดูสรุปผลการสอบ",
    "/exam/search": "ค้นหาข้อสอบ",
    "/exam/practice": "ฝึกทำข้อสอบ",
    "/exam/saved-questions": "ดูข้อสอบที่บันทึกไว้",
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

export interface PageTitleMaps {
    // courseId → course title (for /learn/[id])
    courseTitles?: Record<string, string>;
    // examId → exam title (for /exam/[id])
    examTitles?: Record<string, string>;
}

export function pageLabel(path?: string | null, titles?: PageTitleMaps): string {
    if (!path) return "เยี่ยมชมเว็บไซต์";
    // strip query/hash + trailing slash
    let p = path.split("?")[0].split("#")[0];
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);

    // Exact pages (incl. /exam, /exam/dashboard, ...) win before the dynamic
    // /exam/[id] and /learn/[id] resolution below.
    if (EXACT[p]) return EXACT[p];

    // Dynamic item routes — name the specific exam set / course when we can.
    const examId = p.match(/^\/exam\/([^/]+)$/)?.[1];
    if (examId) {
        const t = titles?.examTitles?.[examId];
        return t ? `ทำข้อสอบ: ${t}` : "กำลังทำข้อสอบ";
    }
    const courseId = p.match(/^\/learn\/([^/]+)$/)?.[1];
    if (courseId) {
        const t = titles?.courseTitles?.[courseId];
        return t ? `อยู่ในห้องเรียน: ${t}` : "อยู่ในห้องเรียน";
    }

    for (const [prefix, label] of PREFIX) {
        if (p.startsWith(prefix)) return label;
    }
    return `ดูหน้า ${p}`;
}
