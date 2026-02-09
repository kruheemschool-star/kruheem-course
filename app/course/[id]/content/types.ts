// Course Page Content Types
// For the standard course sale pages (non-Grand Slam)

export interface ProblemItem {
    icon: string;
    text: string;
}

export interface SolutionItem {
    icon: string;
    text: string;
}

export interface CurriculumChapter {
    id: number;
    title: string;
    desc: string;
    color: string;
    iconColor: string;
    content: string[];
}

export interface ImportanceItem {
    title: string;
    desc: string;
    color: string;
    icon?: string;
}

export interface CoursePageContent {
    hero: {
        blobs: string[];
    };
    painPoint: {
        title: string;
        subtitle: string;
        blobs: string[];
        problemBox: {
            title: string;
            icon: string;
            items: ProblemItem[];
            bg: string;
        };
        solutionBox: {
            title: string;
            icon: string;
            desc: string;
            items: SolutionItem[];
            bg: string;
            border: string;
        };
    };
    curriculum: CurriculumChapter[];
    importance?: ImportanceItem[];
    choices: {
        oldPath: string;
        newPath: string;
        colors: {
            old: string;
            new: string;
            button: string;
        };
    };
}
