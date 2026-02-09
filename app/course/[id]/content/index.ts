// Content Index - Central export point for all course content
// This replaces the large conditional blocks in page.tsx

export type { CoursePageContent, ProblemItem, SolutionItem, CurriculumChapter, ImportanceItem } from './types';
export { m1Term1Content } from './m1-term1';
export { m2Term1Content } from './m2-term1';
export { m2Term2Content } from './m2-term2';
export { m3Term1Content } from './m3-term1';
export { m3Term2Content } from './m3-term2';
export { masteringEquationsContent } from './mastering-equations';
export { ruleOfThreeContent } from './rule-of-three';

import { CoursePageContent } from './types';
import { m1Term1Content } from './m1-term1';
import { m2Term1Content } from './m2-term1';
import { m2Term2Content } from './m2-term2';
import { m3Term1Content } from './m3-term1';
import { m3Term2Content } from './m3-term2';
import { masteringEquationsContent } from './mastering-equations';
import { ruleOfThreeContent } from './rule-of-three';

/**
 * Gets the course page content based on the course title.
 * This function replaces the large if-else conditional block in page.tsx.
 * 
 * @param courseTitle - The title of the course from Firebase
 * @returns CoursePageContent object or null if not found (falls back to default)
 */
export function getCoursePageContent(courseTitle: string): CoursePageContent | null {
    // Check for special courses first (these don't follow the term pattern)
    if (courseTitle.includes("สมการ")) {
        return masteringEquationsContent;
    }
    if (courseTitle.includes("บัญญัติไตรยางค์")) {
        return ruleOfThreeContent;
    }

    // Check for term-based courses
    const isM1Term1 = courseTitle.includes("ม.1") && courseTitle.includes("เทอม 1");
    const isM2Term1 = courseTitle.includes("ม.2") && courseTitle.includes("เทอม 1");
    const isM2Term2 = courseTitle.includes("ม.2") && courseTitle.includes("เทอม 2");
    const isM3Term1 = courseTitle.includes("ม.3") && courseTitle.includes("เทอม 1");
    const isM3Term2 = courseTitle.includes("ม.3") && courseTitle.includes("เทอม 2");

    if (isM2Term2) return m2Term2Content;
    if (isM2Term1) return m2Term1Content;
    if (isM3Term1) return m3Term1Content;
    if (isM3Term2) return m3Term2Content;

    // Default to M.1 Term 1 content
    return m1Term1Content;
}
