'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Check, Sparkles, GraduationCap, Shirt, BookOpen, Trophy, TrendingUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { getCoursesByTags, Course } from '@/services/courseService';

export default function CourseFinder() {
    const [step, setStep] = useState<'grade' | 'goal' | 'result'>('grade');
    const [grade, setGrade] = useState('');
    const [goal, setGoal] = useState('');
    const [loading, setLoading] = useState(false);
    const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
    const [animKey, setAnimKey] = useState(0);

    const handleGradeSelect = (selectedGrade: string) => {
        setGrade(selectedGrade);
        setStep('goal');
        setAnimKey(prev => prev + 1);
    };

    const handleGoalSelect = async (selectedGoal: string) => {
        setGoal(selectedGoal);
        setLoading(true);
        setStep('result');
        setAnimKey(prev => prev + 1);

        // Prepare tags based on selection (Mapping to Thai System)
        let searchTags: string[] = [];
        let requiredTag: string | null = null; // New: Strict filter

        // 1. Map Grade Selection to Tags
        // P.4 - P.6 (Primary)
        if (grade === 'p4' || grade.startsWith('p')) {
            searchTags.push('ระดับ:ป.4', 'ระดับ:ป.5', 'ระดับ:ป.6');
        }
        // M.1 - M.3 (Lower Secondary)
        else if (grade === 'm1' || grade.startsWith('m')) {
            searchTags.push('ระดับ:ม.1', 'ระดับ:ม.2', 'ระดับ:ม.3');
        }
        else if (grade === 'm4') {
            searchTags.push('ระดับ:ม.4', 'ระดับ:ม.5', 'ระดับ:ม.6');
        }

        // 2. Map Goal Selection to Tags & Set Required Tag
        if (selectedGoal === 'exam-m1') {
            const tag = 'เป้าหมาย:สอบเข้า'; // Standardized Tag
            searchTags.push(tag);
            requiredTag = tag;
        } else if (selectedGoal === 'exam-m4') {
            const tag = 'เป้าหมาย:สอบเข้า'; // Standardized Tag
            searchTags.push(tag);
            requiredTag = tag;
        } else if (selectedGoal === 'university') {
            const tag = 'เป้าหมาย:สอบเข้า'; // Standardized Tag
            searchTags.push(tag);
            requiredTag = tag;
        } else if (selectedGoal === 'increase-grade') {
            // User Request: "Increase Grade" relies only on Grade tags (e.g. ระดับ:ป.4).
            // No specific goal tag is added or required.
            requiredTag = null;
        } else if (selectedGoal === 'competition') {
            const tag = 'เป้าหมาย:สอบแข่งขัน';
            searchTags.push(tag);
            requiredTag = tag;
        }

        try {
            // Fetch courses that match ANY of these tags
            const courses = await getCoursesByTags(searchTags);

            // Filter & Score
            const scoredCourses = courses.filter(course => {
                // Strict Filter: If a specific goal is selected, the course MUST have that tag.
                if (requiredTag && !course.tags?.includes(requiredTag)) {
                    return false;
                }
                return true;
            }).map(course => {
                let score = 0;
                // Check if course has ANY of our search tags
                if (course.tags?.some(t => searchTags.includes(t))) score++;

                // Bonus for exact goal match (Important!)
                if (selectedGoal === 'exam-m1' && course.tags?.includes('เป้าหมาย:สอบเข้า ม.1')) score += 2;
                if (selectedGoal === 'exam-m4' && course.tags?.includes('เป้าหมาย:สอบเข้า ม.4')) score += 2;
                if (selectedGoal === 'university' && course.tags?.includes('เป้าหมาย:สอบเข้ามหาวิทยาลัย')) score += 2;
                if (selectedGoal === 'increase-grade' && course.tags?.includes('เป้าหมาย:เพิ่มเกรด')) score += 2;

                // Bonus for exact grade match (e.g. if we had specific grade selection UI later)
                // For broad selection, any matching grade tag adds to score
                if (grade.startsWith('p') && ['ระดับ:ป.4', 'ระดับ:ป.5', 'ระดับ:ป.6'].some(t => course.tags?.includes(t))) score++;
                if (grade.startsWith('m') && ['ระดับ:ม.1', 'ระดับ:ม.2', 'ระดับ:ม.3'].some(t => course.tags?.includes(t))) score++;
                if (grade === 'm4' && ['ระดับ:ม.4', 'ระดับ:ม.5', 'ระดับ:ม.6'].some(t => course.tags?.includes(t))) score++;

                return { ...course, score };
            });

            // Sort by score (descending)
            scoredCourses.sort((a, b) => b.score - a.score);

            // Return top results
            if (scoredCourses.length > 0) {
                setRecommendedCourses(scoredCourses);
            } else {
                setRecommendedCourses([]);
            }

        } catch (error) {
            console.error("Failed to recommend courses", error);
            setRecommendedCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const resetFinder = () => {
        setStep('grade');
        setGrade('');
        setGoal('');
        setRecommendedCourses([]);
        setAnimKey(prev => prev + 1);
    };

    // Helper to get color/icon based on tags or simple fallback
    const getCourseStyle = (course: Course) => {
        if (course.tags?.includes('level:gifted') || course.title.includes('Gifted')) {
            return { color: 'from-amber-500 to-orange-500', icon: <Trophy size={32} className="text-white" /> };
        }
        if (course.tags?.includes('goal:increase-grade') || course.category?.includes('เกรด')) {
            return { color: 'from-blue-500 to-cyan-500', icon: <TrendingUp size={32} className="text-white" /> };
        }
        return { color: 'from-indigo-500 to-purple-500', icon: <BookOpen size={32} className="text-white" /> };
    };

    return (
        <section id="course-finder" className="py-24 bg-white relative overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-3xl mx-auto text-center" data-aos="fade-up">

                    <div className="mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 text-sm font-bold mb-4 border border-indigo-100 shadow-sm hover:shadow-md transition-all cursor-default">
                            <Sparkles size={16} />
                            <span>ระบบค้นหาคอร์ส</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
                            ไม่รู้จะเริ่มตรงไหน?
                        </h2>
                        <p className="text-lg text-slate-500 md:text-xl">
                            ตอบคำถามสั้นๆ เพื่อให้เราแนะนำคอร์สที่เหมาะกับหนูๆ
                        </p>
                    </div>

                    <div className="mt-10 relative min-h-[400px]">
                        {/* Step 1: Grade Selection */}
                        {step === 'grade' && (
                            <div key={`step-1-${animKey}`} className="animate-fade-in">
                                <h3 className="text-2xl font-bold text-slate-700 mb-8">ตอนนี้ศึกษาอยู่ระดับชั้นไหนครับ?</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                                    <button onClick={() => handleGradeSelect('p4')} className="p-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-left shadow-sm hover:shadow-md h-full">
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Shirt size={24} />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-700 group-hover:text-indigo-700">ประถม (ป.4 - ป.6)</h4>
                                        <p className="text-sm text-slate-500 mt-1">เน้นปูพื้นฐานและเตรียมสอบเข้า</p>
                                    </button>
                                    <button onClick={() => handleGradeSelect('m1')} className="p-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 transition-all group text-left shadow-sm hover:shadow-md h-full">
                                        <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <GraduationCap size={24} />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-700 group-hover:text-purple-700">ม.ต้น (ม.1 - ม.3)</h4>
                                        <p className="text-sm text-slate-500 mt-1">เนื้อหาเข้มข้น เตรียมสอบแข่งขัน</p>
                                    </button>
                                    <button onClick={() => handleGradeSelect('m4')} className="p-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-pink-500 hover:bg-pink-50 transition-all group text-left shadow-sm hover:shadow-md h-full">
                                        <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <BookOpen size={24} />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-700 group-hover:text-pink-700">ม.ปลาย (ม.4 - ม.6)</h4>
                                        <p className="text-sm text-slate-500 mt-1">เตรียมสอบเข้ามหาวิทยาลัย</p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Goal Selection */}
                        {step === 'goal' && (
                            <div key={`step-2-${animKey}`} className="animate-fade-in">
                                <h3 className="text-2xl font-bold text-slate-700 mb-8 flex items-center justify-center gap-3">
                                    <button onClick={() => setStep('grade')} className="text-slate-400 hover:text-slate-600 text-sm font-normal absolute left-0 md:left-20 flex items-center hover:underline">
                                        ← ย้อนกลับ
                                    </button>
                                    เป้าหมายหลักคืออะไร?
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <button onClick={() => handleGoalSelect('increase-grade')} className="p-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-center shadow-sm hover:shadow-md">
                                        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <TrendingUp size={28} />
                                        </div>
                                        <h4 className="font-bold text-slate-700 mb-1">เพิ่มเกรดที่โรงเรียน</h4>
                                        <p className="text-xs text-slate-500">อยากเรียนให้เข้าใจ ทำเกรด 4.00</p>
                                    </button>

                                    {/* Exam Option based on Grade */}
                                    <button onClick={() => handleGoalSelect(grade === 'm4' ? 'university' : (grade.startsWith('p') ? 'exam-m1' : 'exam-m4'))} className="p-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-amber-500 hover:bg-amber-50 transition-all group text-center shadow-sm hover:shadow-md">
                                        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <Trophy size={28} />
                                        </div>
                                        <h4 className="font-bold text-slate-700 mb-1">
                                            {grade === 'm4' ? 'สอบเข้ามหาวิทยาลัย' : 'สอบเข้าโรงเรียนดัง'}
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            {grade === 'm4' ? 'A-Level, TGAT/TPAT' : (grade.startsWith('p') ? 'เข้า ม.1 โรงเรียนแข่งขันสูง' : 'เตรียมสอบเข้า ม.4 เตรียมอุดมฯ')}
                                        </p>
                                    </button>

                                    <button onClick={() => handleGoalSelect('competition')} className="p-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-pink-500 hover:bg-pink-50 transition-all group text-center shadow-sm hover:shadow-md">
                                        <div className="w-14 h-14 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <div className="relative">
                                                <Sparkles size={28} />
                                                <div className="absolute top-0 right-0 w-2 h-2 bg-pink-500 rounded-full animate-ping"></div>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-slate-700 mb-1">สอบแข่งขันสนามต่างๆ</h4>
                                        <p className="text-xs text-slate-500">สสวท., สพฐ., TEDET</p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Result */}
                        {step === 'result' && (
                            <div key={`step-3-${animKey}`} className="animate-fade-in text-center">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-64">
                                        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                        <p className="text-slate-500 font-medium">กำลังค้นหาคอร์สที่เหมาะที่สุด...</p>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-2xl font-bold text-slate-700 mb-2">คอร์สที่เราแนะนำสำหรับน้อง</h3>
                                        <p className="text-slate-500 mb-8">คลิกดูรายละเอียดเพื่อเริ่มเรียนได้เลย</p>

                                        {recommendedCourses.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                                                {recommendedCourses.map((course) => {
                                                    const style = getCourseStyle(course);
                                                    return (
                                                        <Link
                                                            key={course.id}
                                                            href={`/course/${course.id}`}
                                                            className="group flex flex-col h-full bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-100 dark:border-slate-800 hover:-translate-y-2"
                                                        >
                                                            {/* Image Header */}
                                                            {course.image ? (
                                                                <div className="relative w-full aspect-[4/3] overflow-hidden">
                                                                    <NextImage
                                                                        src={course.image}
                                                                        alt={course.title}
                                                                        fill
                                                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                                                    />
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                                                                    <div className="absolute bottom-4 left-4 right-4">
                                                                        <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs text-white font-bold border border-white/30">
                                                                            {course.category || "คอร์สเรียน"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className={`w-full aspect-[4/3] bg-gradient-to-br ${style.color} flex items-center justify-center p-6 relative overflow-hidden`}>
                                                                    {/* Decorative circles/blobs */}
                                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                                                                    <div className="relative z-10 transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                                                                        {style.icon}
                                                                    </div>
                                                                    <div className="absolute bottom-4 left-4">
                                                                        <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs text-white font-bold border border-white/30">
                                                                            {course.category || "คอร์สเรียน"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Content Body */}
                                                            <div className="p-6 flex flex-col flex-grow text-left">
                                                                <h4 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
                                                                    {course.title}
                                                                </h4>
                                                                <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-grow">
                                                                    {course.desc}
                                                                </p>

                                                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ราคาคอร์ส</span>
                                                                        <span className="text-lg font-black text-slate-800">
                                                                            {course.price ? `฿${course.price.toLocaleString()}` : "ฟรี"}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all bg-indigo-50 px-3 py-1.5 rounded-full group-hover:bg-indigo-600 group-hover:text-white">
                                                                        ดูรายละเอียด <ArrowRight size={16} />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="max-w-md mx-auto bg-slate-50 rounded-2xl p-8 border border-slate-200">
                                                <p className="text-slate-500 mb-4">ยังไม่พบคอร์สที่ตรงตามเงื่อนไขเป๊ะๆ ลองดูคอร์สพื้นฐานของเราไหมครับ?</p>
                                                <Link href="/#courses" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
                                                    ดูคอร์สทั้งหมด
                                                </Link>
                                            </div>
                                        )}

                                        <button onClick={resetFinder} className="mt-10 inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition font-medium">
                                            <RefreshCw size={16} /> ค้นหาใหม่
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-20 left-10 w-64 h-64 bg-indigo-100/50 rounded-full blur-3xl opacity-60 animate-blob"></div>
                    <div className="absolute bottom-20 right-10 w-64 h-64 bg-purple-100/50 rounded-full blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
                </div>
            </div>
        </section>
    );
}
