// ไฟล์: app/page.tsx
"use client";
import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import Link from "next/link"; // ✅ เพิ่มบรรทัดนี้: เพื่อให้สร้างลิ้งค์ได้

interface Course {
  id: string;
  title: string;
  desc: string;
  image: string;
  videoId?: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    const fetchCourses = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "courses"));
        const courseList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Course[];
        setCourses(courseList);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchCourses();
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) return <div className="p-10 text-center">กำลังโหลด...</div>;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold text-blue-600">📚 คอร์สเรียนครูฮีม</h1>
        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden md:inline">สวัสดี, {user.displayName}</span>
              <button 
                onClick={handleLogout} 
                className="text-red-500 text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50"
              >
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6 md:p-10">
        <div className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-800">คอร์สเรียนทั้งหมด</h2>
            <p className="text-gray-500">เลือกเรียนวิชาที่สนใจได้เลยครับ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition border border-gray-100 flex flex-col h-full">
              <div className="h-48 bg-slate-200 relative w-full">
                {course.image && course.image !== "-" ? (
                   /* eslint-disable-next-line @next/next/no-img-element */
                   <img 
                    src={course.image} 
                    alt={course.title} 
                    className="w-full h-full object-cover" 
                   />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                     ไม่มีรูปปก
                   </div>
                )}
              </div>
              
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-bold text-lg mb-2 text-slate-900 line-clamp-1">{course.title}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-grow">{course.desc}</p>
                
                {user ? (
                  // ✅ จุดที่แก้ไข: ครอบปุ่มด้วย Link เพื่อให้กดแล้วไปหน้านั่งเรียน
                  <Link href={`/course/${course.id}`} className="w-full mt-auto">
                    <button className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 transition">
                      เข้าเรียนทันที
                    </button>
                  </Link>
                ) : (
                  <button onClick={handleLogin} className="w-full bg-slate-800 text-white py-2 rounded font-medium hover:bg-slate-900 transition mt-auto">
                    ล็อกอินเพื่อเข้าเรียน
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}