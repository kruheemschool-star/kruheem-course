export interface ExamQuestion {
    id: number | string;
    question: string; // รองรับ LaTeX ในรูปแบบ \( ... \) หรือ $ ... $
    image?: string; // URL ของรูปประกอบโจทย์ (Optional)
    svg?: string; // Inline SVG code สำหรับรูปภาพที่สร้างด้วย SVG (Optional)
    // ชนิดคำถาม: 'choice' = ตัวเลือก (ค่าเริ่มต้น), 'fill' = เติมคำ (พิมพ์ตอบ)
    type?: 'choice' | 'fill';
    options?: string[]; // ตัวเลือก (เฉพาะ MCQ) — เติมคำไม่มี
    correctIndex?: number; // 0-based index ของตัวเลือกที่ถูก (เฉพาะ MCQ)
    answerIndex?: number; // 0-based (Preferred field if available)
    answers?: string[]; // คำตอบที่ยอมรับได้ (เฉพาะเติมคำ) — เทียบแบบไม่สนช่องว่าง/จุลภาค/ตัวพิมพ์
    explanation: string; // เฉลยละเอียด รองรับ LaTeX
    tags?: string[]; // คำค้นหา / หัวข้อเรื่อง
}

export interface ExamState {
    currentQuestionIndex: number;
    answers: Record<number, number>; // questionId -> selectedOptionIndex
    isSubmitted: boolean; // ส่งคำตอบทั้งหมดหรือยัง
    score: number;
}
