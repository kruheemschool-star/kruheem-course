"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { getCachedData } from "@/lib/dataCache";
import { ChevronRight, Sparkles, Zap } from "lucide-react";

interface RelatedCoursesProps {
    summaryTitle: string;
    summaryKeywords?: string[];
    summaryTags?: string[];
}

interface Course {
    id: string;
    title: string;
    price?: number;
    keywords?: string[];
}

// Marketing headlines - สุ่มแสดง
const marketingHeadlines = [
    { emoji: "🚀", text: "อยากเข้าใจลึกกว่านี้? เรียนเพิ่มได้เลย!" },
    { emoji: "💡", text: "ติดปัญหาเรื่องนี้? คอร์สนี้ช่วยได้!" },
    { emoji: "🎯", text: "อยากทำโจทย์ได้คล่อง? เริ่มเรียนวันนี้!" },
    { emoji: "⭐", text: "เรียนเพิ่มเติม เก็บคะแนนเต็ม!" },
    { emoji: "🔥", text: "พร้อมพิชิตข้อสอบ? คอร์สนี้เหมาะกับคุณ!" },
];

// Find matching courses based on keywords
function findMatchingCourses(
    courses: Course[],
    summaryTitle: string,
    summaryKeywords?: string[],
    summaryTags?: string[]
): Course[] {
    const searchTerms = [
        summaryTitle.toLowerCase(),
        ...(summaryKeywords || []).map(k => k.toLowerCase()),
        ...(summaryTags || []).map(t => t.toLowerCase())
    ];

    const scoredCourses = courses.map(course => {
        let score = 0;
        const courseKeywords = course.keywords || [];

        for (const keyword of courseKeywords) {
            const lowerKeyword = keyword.toLowerCase();
            for (const term of searchTerms) {
                if (term.includes(lowerKeyword) || lowerKeyword.includes(term)) {
                    score += 10;
                }
            }
            if (summaryTitle.toLowerCase().includes(lowerKeyword)) {
                score += 5;
            }
        }


        return { course, score };
    });

    return scoredCourses
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.course);
}

export default function RelatedCourses({ summaryTitle, summaryKeywords, summaryTags }: RelatedCoursesProps) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [headline, setHeadline] = useState(marketingHeadlines[0]);

    useEffect(() => {
        // Random headline
        setHeadline(marketingHeadlines[Math.floor(Math.random() * marketingHeadlines.length)]);

        const fetchCourses = async () => {
            try {
                const allCourses = await getCachedData("all_courses_related", async () => {
                    const snapshot = await getDocs(collection(db, "courses"));
                    return snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Course[];
                });

                const matchedCourses = findMatchingCourses(
                    allCourses,
                    summaryTitle,
                    summaryKeywords,
                    summaryTags
                );

                setCourses(matchedCourses);
            } catch (error) {
                console.error("Error fetching related courses:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [summaryTitle, summaryKeywords, summaryTags]);

    if (loading) {
        return (
            <div className="mt-12 py-6 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-48 mb-4"></div>
                <div className="h-12 bg-slate-50 rounded"></div>
            </div>
        );
    }

    if (courses.length === 0) {
        return null;
    }

    return (
        <div className="mt-12 py-8 border-t border-slate-100">
            {/* Marketing Headline */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Zap size={18} className="text-amber-500" />
                    <span className="text-lg font-bold text-slate-800">
                        {headline.emoji} {headline.text}
                    </span>
                </div>
                <p className="text-sm text-slate-400">
                    คอร์สเหล่านี้มีเนื้อหาที่เกี่ยวข้องกับบทความที่คุณกำลังอ่าน
                </p>
            </div>

            {/* Course List - Ultra Clean */}
            <div className="space-y-1">
                {courses.map((course, index) => (
                    <Link
                        key={course.id}
                        href={`/course/${course.id}`}
                        prefetch={false}
                        className="group flex items-center justify-between py-3 px-4 -mx-4 rounded-xl hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-300 w-5">
                                {index + 1}.
                            </span>
                            <span className="font-medium text-slate-700 group-hover:text-teal-600 transition-colors">
                                {course.title}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {course.price !== undefined && course.price > 0 ? (
                                <span className="text-sm font-bold text-teal-600">
                                    ฿{course.price.toLocaleString()}
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    ฟรี
                                </span>
                            )}
                            <ChevronRight
                                size={16}
                                className="text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all"
                            />
                        </div>
                    </Link>
                ))}
            </div>

            {/* CTA Button */}
            <div className="mt-6 flex items-center justify-between">
                <Link
                    href="/"
                    className="text-sm text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1"
                >
                    ดูคอร์สเรียนทั้งหมด <ChevronRight size={14} />
                </Link>

                {courses.length > 0 && (
                    <Link
                        href={`/course/${courses[0].id}`}
                        prefetch={false}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-bold rounded-full shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 hover:-translate-y-0.5 transition-all"
                    >
                        <Sparkles size={16} />
                        สมัครเรียนเลย
                    </Link>
                )}
            </div>
        </div>
    );
}
