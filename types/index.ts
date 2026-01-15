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
