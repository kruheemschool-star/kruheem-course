export interface Lesson {
    id: string;
    title: string;
    type: 'video' | 'header' | 'quiz' | 'text' | 'exercise' | 'html' | 'flashcard';
    videoId?: string;
    content?: string;
    htmlCode?: string;
    image?: string;
    isFree?: boolean;
    options?: string[];
    correctAnswer?: number;
    docUrl?: string;
    headerId?: string;
    isHidden?: boolean;
    order?: number;
    flashcardData?: any[];
}
