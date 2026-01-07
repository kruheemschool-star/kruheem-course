export interface ExamQuestion {
    id: number | string;
    question: string; // รองรับ LaTeX ในรูปแบบ \( ... \) หรือ $ ... $
    image?: string; // URL ของรูปประกอบโจทย์ (Optional)
    options: string[]; // 4 ตัวเลือก
    correctIndex: number; // 0-3
    explanation: string; // เฉลยละเอียด รองรับ LaTeX
    tags?: string[]; // คำค้นหา / หัวข้อเรื่อง
}

export interface ExamState {
    currentQuestionIndex: number;
    answers: Record<number, number>; // questionId -> selectedOptionIndex
    isSubmitted: boolean; // ส่งคำตอบทั้งหมดหรือยัง
    score: number;
}
