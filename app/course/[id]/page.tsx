"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase"; // ✅ แก้เป็นถอย 3 ก้าวแล้ว
import Link from "next/link";

export default function CoursePage() {
  const { id } = useParams(); // ดึงรหัสคอร์สจาก URL อัตโนมัติ
  const [course, setCourse] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const fetchCourse = async () => {
      const docRef = doc(db, "courses", id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCourse(docSnap.data());
      }
    };
    fetchCourse();
  }, [id]);

  if (!course) return <div className="p-20 text-center text-white bg-slate-900 min-h-screen">กำลังโหลดห้องเรียน...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      
      {/* แถบด้านบน */}
      <div className="bg-slate-800 p-4 shadow-md flex items-center gap-4 sticky top-0 z-10">
        <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-bold">
          ← กลับหน้าแรก
        </Link>
        <div className="w-px h-6 bg-slate-600 mx-2"></div>
        <h1 className="text-lg font-bold truncate">{course.title}</h1>
      </div>

      {/* จอวิดีโอ */}
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl mb-8 border border-slate-700 relative group">
           {course.videoId ? (
             <iframe
               width="100%" height="100%"
               src={`https://www.youtube.com/embed/${course.videoId}`}
               title="YouTube video player"
               frameBorder="0"
               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
               allowFullScreen
             ></iframe>
           ) : (
             <div className="flex items-center justify-center h-full text-slate-500">
               🚫 ไม่พบวิดีโอ (กรุณาตรวจสอบ YouTube ID ในหน้า Admin)
             </div>
           )}
        </div>

        {/* รายละเอียดคอร์ส */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="text-xl font-bold mb-4 text-blue-400 flex items-center gap-2">
            📝 รายละเอียดบทเรียน
          </h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{course.desc}</p>
        </div>
      </div>
    </div>
  );
}