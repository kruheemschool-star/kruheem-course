// ไฟล์: app/page.js
"use client";
import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase"; // เรียกกุญแจ
import { collection, getDocs } from "firebase/firestore"; // เรียกคำสั่งดึงข้อมูล
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth"; // เรียกระบบล็อกอิน

export default function Home() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. เช็คสถานะล็อกอิน + ดึงข้อมูลคอร์ส
  useEffect(() => {
    // ตัวฟังเสียง: ใครล็อกอินอยู่ไหม?
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // ดึงข้อมูลคอร์สจาก Database
    const fetchCourses = async () => {
      const querySnapshot = await getDocs(collection(db, "courses"));
      const courseList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(courseList);
    };

    fetchCourses();
    return () => unsubscribe();
  }, []);

  // ฟังก์ชันล็อกอิน
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  // ฟังก์ชันล็อกเอาท์
  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) return <div className="p-10 text-center">กำลังโหลด...</div>;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ส่วนหัว (Navbar) */}
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">📚 คอร์สเรียนครูฮีม</h1>
        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">สวัสดี, {user.displayName}</span>
              <button onClick={handleLogout} className="text-red-500 text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50">
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
              เข้าสู่ระบบด้วย Google
            </button>
          )}
        </div>
      </nav>

      {/* เนื้อหาหลัก */}
      <div className="max-w-5xl mx-auto p-10">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">คอร์สเรียนทั้งหมด</h2>

        {/* ตารางแสดงคอร์ส (Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition border border-gray-100">
              {/* รูปปก */}
              <div className="h-40 bg-slate-200 relative">
                {course.image && course.image !== "-" ? (
                   <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-400">ไม่มีรูปปก</div>
                )}
              </div>
              
              {/* ข้อมูลคอร์ส */}
              <div className="p-5">
                <h3 className="font-bold text-lg mb-2 text-slate-900">{course.title}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{course.desc}</p>
                
                {user ? (
                  <button className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 transition">
                    เข้าเรียนทันที
                  </button>
                ) : (
                  <button onClick={handleLogin} className="w-full bg-slate-800 text-white py-2 rounded font-medium hover:bg-slate-900 transition">
                    ล็อกอินเพื่อเข้าเรียน
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            ยังไม่มีคอร์สเรียน (ต้องไปเพิ่มในหน้า Admin ก่อน)
          </div>
        )}
      </div>
    </main>
  );
}