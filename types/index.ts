// TypeScript interfaces for the kruheem-course application
// These types help ensure type safety across components

import { Timestamp } from 'firebase/firestore';

// ========== User & Auth ==========
export interface User {
    id: string;
    email: string;
    displayName?: string;
    avatar?: string;
    isAdmin?: boolean;
    lastActive?: Timestamp | Date;
    sessionStart?: Timestamp | Date;
    createdAt?: Timestamp | Date;
}

// ========== Courses ==========
export interface Course {
    id: string;
    title: string;
    description?: string;
    thumbnail?: string;
    price: number;
    originalPrice?: number;
    level?: 'beginner' | 'intermediate' | 'advanced';
    category?: string;
    isPublished: boolean;
    createdAt: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export interface Lesson {
    id: string;
    courseId: string;
    title: string;
    description?: string;
    type: 'video' | 'summary' | 'exercise' | 'quiz';
    content?: string;
    videoUrl?: string;
    order: number;
    duration?: number; // in minutes
    isFree?: boolean;
    createdAt?: Timestamp | Date;
}

// ========== Enrollment ==========
export interface Enrollment {
    id: string;
    userId: string;
    userEmail: string;
    userName?: string;
    userTel?: string;
    lineId?: string;
    courseId: string;
    courseTitle: string;
    price: number;
    finalPrice?: number;
    discountAmount?: number;
    couponCode?: string;
    slipUrl?: string;
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
    accessType: 'limited' | 'lifetime';
    expiryDate?: Timestamp | Date;
    createdAt: Timestamp | Date;
    approvedAt?: Timestamp | Date;
    lastAccessedAt?: Timestamp | Date;
    // When this enrollment is the purchase of a downloadable PDF exam paper
    // (not a course), these mark it so the download API + "ข้อสอบของฉัน" page
    // can find it. Absent on ordinary course enrollments.
    productType?: 'course' | 'examPaper';
    paperId?: string;
}

// ========== Exam Papers (downloadable PDF products) ==========
// One downloadable file inside a paper. Each file is a complete, self-contained
// PDF set (cover + analysis + questions + full solutions in one). A product
// bundles several of these (e.g. "ชุดที่ 1", "ชุดที่ 2"). All live in the private
// `exam-pdfs/` folder; the buyer reaches each via its own short-lived signed URL.
export interface ExamPaperFile {
    id: string;      // stable id — the download API signs the file matching this
    label: string;   // buyer-facing name, e.g. "ชุดที่ 1"
    name: string;    // original uploaded filename (used for the download attachment)
    path: string;    // PRIVATE Storage path (never a public URL)
}

// "เก็งข้อสอบ" analysis shown on the sales page: which chapters appear how
// often (from analysing past papers), and how much of that this set covers.
export interface ExamAnalysisRow {
    name: string;     // chapter/topic, e.g. "เศษส่วน · ทศนิยม"
    percent: number;  // 0–100, how often it appears
}
export interface ExamPaperAnalysis {
    headline?: string;       // e.g. "สอบเข้า ม.1 บทไหนออกบ่อยที่สุด?"
    years?: number;          // number of past years analysed
    totalQuestions?: number; // total past questions analysed
    coverage?: number;       // 0–100, % of the common topics this set covers
    note?: string;           // one-line caption under the coverage number
    chapters?: ExamAnalysisRow[];
}

// A single sellable PDF exam product. Bundles one or more ExamPaperFile. Cover +
// preview are public; the master files are private (signed URLs only).
export interface ExamPaper {
    id: string;
    title: string;
    description?: string;
    price: number;
    level?: string;          // e.g. "ม.6", "ม.3" — free-form to match exam bank
    category?: string;       // e.g. "O-NET", "A-Level", "กลางภาค"
    tags?: string[];
    coverUrl?: string;       // public — shown on the shop cards
    coverPath?: string;      // Storage path of coverUrl — needed to delete it later
    previewUrl?: string;     // public — free sample (first 1–2 pages), optional
    previewPath?: string;    // Storage path of previewUrl — needed to delete it later
    files?: ExamPaperFile[]; // the sellable PDF set(s) — one or many
    // Legacy single-file fields (pre-multi-file). Read as a fallback so old
    // products keep working; new/edited products write `files` instead.
    pdfPath?: string;        // PRIVATE Storage path of the master file (not a URL)
    pdfName?: string;        // original filename, used for the download attachment
    pageCount?: number;      // shown as "X หน้า" on the shop card
    questionCount?: number;  // shown as "X ข้อ" on the "my exam papers" card
    analysis?: ExamPaperAnalysis; // optional "วิเคราะห์แนวข้อสอบ" sales section
    hidden?: boolean;        // draft / hidden from the public shop
    order?: number;          // manual sort (lower first)
    createdAt?: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

// ========== Progress Tracking ==========
export interface CourseProgress {
    courseId: string;
    userId: string;
    completed: string[]; // lessonIds that are completed
    lastUpdated?: Timestamp | Date;
    lastLessonId?: string;
}

export interface ProgressInfo {
    completed: number;
    total: number;
    percent: number;
    lastLessonId?: string;
}

// ========== Support Tickets ==========
export interface SupportTicket {
    id: string;
    userId: string;
    userEmail: string;
    userName?: string;
    subject: string;
    status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    priority?: 'low' | 'medium' | 'high';
    courseId?: string;
    courseTitle?: string;
    createdAt: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export interface TicketMessage {
    id: string;
    ticketId: string;
    senderId: string;
    senderName?: string;
    content: string;
    isAdmin: boolean;
    createdAt: Timestamp | Date;
    attachmentUrl?: string;
}

// ========== Reviews ==========
export interface Review {
    id: string;
    userId: string;
    userEmail: string;
    userName?: string;
    userAvatar?: string;
    courseId: string;
    courseTitle?: string;
    rating: number; // 1-5
    comment?: string;
    isApproved: boolean;
    isHidden: boolean;
    createdAt: Timestamp | Date;
    couponCode?: string;
    isCouponUsed?: boolean;
}

// ========== Notifications ==========
export interface Notification {
    id: string;
    type: 'general' | 'new_lesson' | 'promotion';
    message?: string;
    lessonTitle?: string;
    courseId?: string;
    courseTitle?: string;
    target: 'all' | 'specific_courses';
    targetCourseIds?: string[];
    createdAt: Timestamp | Date;
}

// ========== Activity Log ==========
export interface ActivityItem {
    id: string;
    type: 'lesson_complete' | 'course_start' | 'login' | 'enrollment' | 'exam_submit';
    userId: string;
    userName: string;
    userEmail: string;
    courseTitle?: string;
    lessonTitle?: string;
    examTitle?: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

// ========== Chat ==========
export interface ChatRoom {
    id: string;
    userId: string;
    userName?: string;
    userEmail: string;
    userTel?: string;
    lineId?: string;
    lastMessage?: string;
    lastUpdated: Timestamp | Date;
    unreadCount?: number;
}

export interface ChatMessage {
    id: string;
    chatId: string;
    senderId: string;
    senderName?: string;
    content: string;
    isAdmin: boolean;
    createdAt: Timestamp | Date;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'file';
}

// ========== Exams ==========
export interface Exam {
    id: string;
    title: string;
    description?: string;
    courseId?: string;
    questions: ExamQuestion[];
    timeLimit?: number; // in minutes
    timedMode?: boolean; // when true AND timeLimit>0: countdown + auto-submit (else count-up)
    recommendedSecondsPerQuestion?: number; // per-question pacing benchmark (seconds), default 90
    passingScore?: number;
    isPublished: boolean;
    createdAt: Timestamp | Date;
}

export interface ExamQuestion {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
    imageUrl?: string;
}

export interface ExamSubmission {
    id: string;
    examId: string;
    userId: string;
    userEmail: string;
    answers: number[]; // indices of selected answers
    score: number;
    totalQuestions: number;
    submittedAt: Timestamp | Date;
}

// ========== Coupons ==========
export interface Coupon {
    id: string;
    code: string;
    discountType: 'fixed' | 'percent';
    discountValue: number;
    minPurchase?: number;
    maxUses?: number;
    usedCount: number;
    isActive: boolean;
    expiryDate?: Timestamp | Date;
    applicableCourseIds?: string[];
    createdAt: Timestamp | Date;
}

// ========== Analytics ==========
export interface VisitorStats {
    total_visits: number;
    device_mobile: number;
    device_tablet: number;
    device_desktop: number;
    source_google?: number;
    source_facebook?: number;
    source_line?: number;
    source_direct?: number;
    source_other?: number;
}

export interface PageViewStats {
    [pagePath: string]: number;
}
