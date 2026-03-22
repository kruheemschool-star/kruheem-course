export interface ExamQuestion {
    id: number | string;
    question: string; // รองรับ LaTeX ในรูปแบบ \( ... \) หรือ $ ... $
    image?: string; // URL ของรูปประกอบโจทย์ (Optional)
    svg?: string; // Inline SVG code สำหรับรูปภาพที่สร้างด้วย SVG (Optional)
    options: string[]; // 4 ตัวเลือก
    correctIndex: number; // 0-3 (Legacy field, may be incorrect)
    answerIndex?: number; // 0-3 (Preferred field if available)
    explanation: string; // เฉลยละเอียด รองรับ LaTeX
    tags?: string[]; // คำค้นหา / หัวข้อเรื่อง
}

export interface ExamState {
    currentQuestionIndex: number;
    answers: Record<number, number>; // questionId -> selectedOptionIndex
    isSubmitted: boolean; // ส่งคำตอบทั้งหมดหรือยัง
    score: number;
}

export interface Exam {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    difficulty: string;
    questions: ExamQuestion[] | string; // array or JSON string
    questionCount?: number;
    timeLimit?: number;
    isFree?: boolean;
    hidden?: boolean;
    showAnswerChecking?: boolean;
    themeColor?: string;
    coverImage?: string;
    tags?: string[];
    order?: number;
    createdAt?: any; // Firestore Timestamp
}

export interface ExamCategory {
    id: string;
    name: string;
    order?: number;
    createdAt?: any;
}

export interface ExamConfig {
    showExamDashboard: boolean;
    enableResultTracking: boolean;
}

export interface ExamListItem {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    difficulty: string;
    questionCount: number;
    isFree?: boolean;
    hidden?: boolean;
    themeColor?: string;
    coverImage?: string;
    tags?: string[];
}
