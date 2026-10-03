// วันสอบรายชุดของร้าน PDF (ExamPaper.examDate → components/exampapers/PaperCountdown)
// เดิมไฟล์นี้อ่านวันสอบรวมจาก /admin/countdown มาทำแถบบนหน้าร้าน — เลิกใช้ 2026-10-03
// เพราะแต่ละชุดสอบคนละสนามคนละวัน
//
// ครูฮีมกรอกวันสอบเป็น datetime-local ("2026-11-08T10:29") ซึ่งหมายถึงเวลาไทย
// เซิร์ฟเวอร์ Vercel รันเป็น UTC — ถ้าปล่อยให้ new Date() เดาเอง เซิร์ฟเวอร์กับ
// เครื่องผู้ใช้จะได้คนละค่า (ต่างกัน 7 ชม. = พลาดได้ 1 วัน) จึงตรึงโซนเวลาไว้
const BANGKOK = "+07:00";
export const parseThai = (s: string): number => {
    const hasZone = /(Z|[+-]\d{2}:\d{2})$/.test(s);
    const withSeconds = /T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
    return new Date(hasZone ? s : `${withSeconds}${BANGKOK}`).getTime();
};
