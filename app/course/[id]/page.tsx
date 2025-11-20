// ไฟล์: app/course/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function CoursePlayer() {
  const { id } = useParams(); // รับรหัสคอร์สจาก URL
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchCourse = async () => {
      // ดึงข้อมูลจากตู้เซฟ โดยใช้รหัสคอร์ส (id)
      const docRef = doc(db, "courses", id as string);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setCourse(docSnap.data());
      }
      setLoading(false);
    };
    fetchCourse();
  }, [id]);

  if (loading) return <div className="p-10 text-center">กำลังโหลดวิดีโอ...</div>;
  if (!course) return <div className="p-10 text-center">ไม่พบคอร์สเรียนนี้</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ปุ่มย้อนกลับ */}
      <div className="p-4">
        <Link href="/" className="text-gray-300 hover:text-white flex items-center gap-2">
          ← กลับไปหน้าแรก
        </Link>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* จอวิดีโอ (YouTube Embed) */}
        <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl mb-6 border border-slate-700">
            {course.videoId ? (
                <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${course.videoId}`} 
                    title="YouTube video player" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                ></iframe>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                    ไม่มีวิดีโอ
                </div>
            )}
        </div>

        {/* ชื่อคอร์สและรายละเอียด */}
        <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-xl font-semibold mb-2">รายละเอียดบทเรียน</h3>
            <p className="text-gray-300 leading-relaxed">{course.desc}</p>
        </div>
      </div>
    </div>
  );
}