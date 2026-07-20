// ─────────────────────────────────────────────────────────────────────────────
// stat-honesty — เครื่องมือสถิติ "ซื่อสัตย์" ใช้ร่วมกันทุกการ์ดวิเคราะห์
//
// หลักการ: ตัวเลขที่เด็ก/ผู้ปกครองเห็นต้องไม่แม่นเกินข้อมูลจริง
//   • ทำ 2 ข้อถูก 2 ≠ เก่ง 100%  → ใช้ shrinkage ดึงเข้าหาค่ากลางเมื่อ n น้อย
//   • ค่าประมาณแสดงเป็น "ช่วง" (Wilson interval) ไม่ใช่ตัวเลขเดี่ยว
//   • เวลาใช้ median ไม่ใช่ mean (เด็กลุกไปห้องน้ำครั้งเดียวทำ mean พังทั้งชุด)
//   • สถานะ "ยังวัดไม่พอ" เป็นผลลัพธ์ปกติ ไม่ใช่ error — UI ควรแสดงพร้อมปุ่ม
//     พาไปทำสิ่งที่จะปลดล็อกการ์ดนั้น
// ทุกฟังก์ชันเป็น pure function — ใช้ได้ทั้งคลังข้อสอบและคอร์ส
// ─────────────────────────────────────────────────────────────────────────────

/** ช่วงความเชื่อมั่น Wilson (95%) ของสัดส่วนตอบถูก — คืนค่าเป็น % (0-100) */
export function wilsonInterval(correct: number, total: number): { low: number; high: number; mid: number } {
    if (total <= 0) return { low: 0, high: 100, mid: 50 };
    const z = 1.96;
    const p = correct / total;
    const denom = 1 + (z * z) / total;
    const center = (p + (z * z) / (2 * total)) / denom;
    const half = (z / denom) * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
    return {
        low: Math.max(0, Math.round((center - half) * 100)),
        high: Math.min(100, Math.round((center + half) * 100)),
        mid: Math.round(p * 100),
    };
}

/**
 * Shrinkage: ประมาณ % ความชำนาญโดยดึงเข้าหาค่า prior เมื่อข้อมูลน้อย
 * (n น้อย → เชื่อค่ากลางมากกว่า; n มาก → เชื่อข้อมูลจริง)
 */
export function shrunkPercent(correct: number, total: number, priorPercent = 50, priorWeight = 4): number {
    if (total <= 0) return priorPercent;
    return Math.round(((correct + (priorPercent / 100) * priorWeight) / (total + priorWeight)) * 100);
}

/** median ของ array ตัวเลข (คืน 0 เมื่อว่าง) */
export function medianOf(nums: number[]): number {
    if (!nums.length) return 0;
    const s = [...nums].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * สถานะความพอเพียงของข้อมูล — ใช้ตัดสินว่าการ์ดควรแสดงผลจริง แสดงแบบจาง
 * หรือแสดงคำเชิญ "ทำอีก X ข้อเพื่อปลดล็อก"
 */
export function sampleStatus(n: number, minN: number): { ok: boolean; need: number } {
    return { ok: n >= minN, need: Math.max(0, minN - n) };
}

/** ปัดเปอร์เซ็นไทล์เป็นขั้น (ใช้เมื่อจำนวนเพื่อนยังน้อย — กันความแม่นปลอม) */
export function roundPercentileForN(percentile: number, peerCount: number): number {
    if (peerCount >= 100) return Math.round(percentile);
    return Math.round(percentile / 5) * 5; // n < 100 → ขั้นละ 5
}
