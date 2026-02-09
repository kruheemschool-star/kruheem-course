
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

export interface Course {
    id: string;
    title: string;
    desc?: string;
    category?: string;
    image?: string;
    price?: number;
    fullPrice?: number;
    tags?: string[];
    createdAt?: Date;
}

export const getCoursesByTags = async (tags: string[]): Promise<Course[]> => {
    if (!tags || tags.length === 0) return [];

    try {
        const coursesRef = collection(db, "courses");
        // 'array-contains-any' allows finding courses that match AT LEAST ONE of the tags
        const q = query(
            coursesRef,
            where("tags", "array-contains-any", tags),
            limit(10) // Limit to prevent fetching too many if tags are broad
        );

        const querySnapshot = await getDocs(q);
        const courses: Course[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            courses.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
            } as Course);
        });

        return courses;
    } catch (error) {
        console.error("Error fetching courses by tags:", error);
        return [];
    }
};

export const getAllCourses = async (): Promise<Course[]> => {
    try {
        const coursesRef = collection(db, "courses");
        const q = query(coursesRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()
        } as Course));
    } catch (error) {
        console.error("Error fetching all courses:", error);
        return [];
    }
};
