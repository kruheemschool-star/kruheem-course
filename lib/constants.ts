export const ADMIN_EMAILS = ["kruheemschool@gmail.com"];

export const SITE_CONFIG = {
    name: "KruHeem Course",
    description: "เรียนคณิตศาสตร์ออนไลน์กับครูฮีม",
    links: {
        facebook: "https://m.me/kruheemschool",
    }
};

// Single source of truth for where students transfer money. Used by the main
// checkout (/payment) AND the PDF-exam checkout so both show identical details.
// Change the account here → it updates everywhere.
export const PAYMENT_INFO = {
    accountName: "นายสุเทพ โชติมานิต",
    qrImage: "/qrcode.png",
    accounts: [
        { label: "พร้อมเพย์", value: "082-705-7440" },
        { label: "กสิกรไทย (ออมทรัพย์)", value: "391-2-78364-1", note: "สาขา เซ็นทรัลรัตนาธิเบศร์" },
    ] as { label: string; value: string; note?: string }[],
};

// ราคา "คลังข้อสอบ" ที่โชว์บนปุ่มชวนสมัครในห้องสอบ — จุดเดียวในโค้ดที่เก็บตัวเลขนี้
// (ราคาจริงตอนจ่ายอยู่ใน Firestore: courses/<คลังข้อสอบ>.price / .fullPrice และ
//  salesPage.hero/countdown/priceStack — ถ้าครูฮีมเปลี่ยนราคา ต้องแก้ที่นี่ด้วย
//  ไม่งั้นปุ่มในห้องสอบจะโชว์ราคาเก่า)
export const EXAM_BANK_PRICE = {
    full: 3900,
    sale: 1500,
};

/** ส่วนลดที่โชว์บนป้าย (ปัดลง) — คำนวณให้ ไม่ต้องแก้มือเวลาราคาเปลี่ยน */
export const EXAM_BANK_DISCOUNT_PERCENT = Math.round(
    ((EXAM_BANK_PRICE.full - EXAM_BANK_PRICE.sale) / EXAM_BANK_PRICE.full) * 100
);

/**
 * สวิตช์เปิด/ปิด "ทางเข้าร้านข้อสอบ PDF" ทุกจุดบนเว็บ
 * false = ซ่อนทางเข้าทั้งหมด (เซกชันหน้าแรก · เมนูบนสุดทั้งจอใหญ่และมือถือ ·
 *         ลิงก์ในฟุตเตอร์ · แบนเนอร์ท้ายหน้าคลังข้อสอบ · sitemap)
 * หน้า /exam-papers เองยังเปิดด้วย URL ตรงได้ (ครูฮีมเข้าไปตรวจงานต่อได้)
 * 2026-09-18: ครูฮีมสั่งซ่อนไว้ก่อน ร้านยังทำไม่เสร็จ — พร้อมเมื่อไหร่เปลี่ยนเป็น true จุดเดียว
 */
export const SHOW_EXAM_PAPERS_SHOP = false;

/**
 * สวิตช์หน้าแรก "โต๊ะเรียน 3 มิติ" (components/desk — สเปก KruHeem-Study-Desk-SPEC.md)
 * false = หน้าแรก "/" เป็นหน้าเลื่อนยาวแบบเดิม · ดูโต๊ะเรียนได้ที่ /desk-preview (ไม่ขึ้น Google)
 * true  = "/" เป็นโต๊ะเรียน · หน้าเดิมย้ายไป /classic (ปุ่ม "เวอร์ชันคลาสสิก" มุมขวาบนของฉาก)
 * 2026-09-25: ครูฮีมสั่งเปิดเป็นหน้าแรกจริง (ปิดกลับ = เปลี่ยนเป็น false จุดเดียว)
 */
export const SHOW_DESK_HOME = true;

/** ลิงก์ "ดูคอร์สทั้งหมด" ในหน้าอื่น (Footer · FAQ · รีวิว) — รายการคอร์สแบบเลื่อนยาวอยู่ในหน้าแรกเวอร์ชันคลาสสิก */
export const HOME_COURSES_HREF = SHOW_DESK_HOME ? "/classic#courses" : "/#courses";

/** ปลายทางปุ่มสมัครคลังข้อสอบทุกจุด (คนยังไม่ล็อกอินจะถูกส่งไป /login แล้วเด้งกลับมาเอง) */
export const EXAM_BANK_BUY_HREF = "/payment?course=vip";
