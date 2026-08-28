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
    full: 1900,
    sale: 990,
};

/** ส่วนลดที่โชว์บนป้าย (ปัดลง) — คำนวณให้ ไม่ต้องแก้มือเวลาราคาเปลี่ยน */
export const EXAM_BANK_DISCOUNT_PERCENT = Math.round(
    ((EXAM_BANK_PRICE.full - EXAM_BANK_PRICE.sale) / EXAM_BANK_PRICE.full) * 100
);

/** ปลายทางปุ่มสมัครคลังข้อสอบทุกจุด (คนยังไม่ล็อกอินจะถูกส่งไป /login แล้วเด้งกลับมาเอง) */
export const EXAM_BANK_BUY_HREF = "/payment?course=vip";
