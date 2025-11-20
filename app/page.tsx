"use client";
import { useState, useEffect } from "react";
import { useUserAuth } from "../context/AuthContext";
import { db } from "../lib/firebase"; // เรียกใช้ Database
import { collection, onSnapshot } from "firebase/firestore"; // คำสั่งดึงข้อมูล

export default function Home() {
  const { user, googleSignIn, logOut } = useUserAuth();
  const [courses, setCourses] = useState<any[]>([]); // ตัวแปรเก็บรายชื่อคอร์ส

  // ฟังก์ชันดึงข้อมูลคอร์สจาก Firebase (ทำงานอัตโนมัติ Real-time)
  useEffect(() => {
    // สั่งให้ไปเฝ้าดูที่ห้อง "courses" ถ้ามีข้อมูลใหม่ ให้ดึงมาทันที
    const unsubscribe = onSnapshot(collection(db, "courses"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(list);
    });
    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      
      {/* ส่วนหัว: แสดงโปรไฟล์และปุ่ม Logout */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            🎓 KruHeem Math
          </h1>
          
          {!user ? (
             <button onClick={googleSignIn} className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-slate-700 transition shadow-lg">
               Login เข้าสู่ระบบ
             </button>
          ) : (
            <div className="flex items-center gap-4">
               <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-800">{user.displayName}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
               </div>
               {/* รูปโปรไฟล์ (ถ้ามี) */}
               {user.photoURL && <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border border-gray-200" />}
               <button onClick={logOut} className="text-red-500 border border-red-100 px-3 py-1 rounded hover:bg-red-50 text-sm">
                 ออก
               </button>
            </div>
          )}
        </div>
      </header>

      {/* เนื้อหาหลัก */}
      <div className="max-w-5xl mx-auto p-6">
        
        {/* Banner ต้อนรับ */}
        <div className="text-center py-10 mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">คอร์สเรียนคณิตศาสตร์ออนไลน์</h2>
          <p className="text-gray-500 text-lg">เรียนสนุก เข้าใจง่าย สไตล์ครูฮีม</p>
        </div>

        {/* เช็คว่า Login หรือยัง? */}
        {!user ? (
          // 🔒 ยังไม่ Login
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
             <div className="text-5xl mb-4">🔒</div>
             <h3 className="text-xl font-bold text-gray-800 mb-2">เนื้อหานี้สำหรับสมาชิก</h3>
             <p className="text-gray-500 mb-6">กรุณาเข้าสู่ระบบเพื่อเลือกเรียนคอร์สต่างๆ</p>
             <button onClick={googleSignIn} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-blue-200 shadow-lg">
               เข้าสู่ระบบด้วย Google
             </button>
          </div>
        ) : (
          // ✅ Login แล้ว -> โชว์คอร์ส
          <>
            {courses.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                ยังไม่มีคอร์สเรียน (รอครูฮีมมาเพิ่มอยู่นะ...)
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div key={course.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition duration-300 border border-gray-100 overflow-hidden flex flex-col group">
                     {/* รูปปก */}
                     <div className="h-48 bg-slate-100 relative overflow-hidden">
                        {course.image ? (
                          <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">📚</div>
                        )}
                     </div>
                     
                     {/* เนื้อหา */}
                     <div className="p-6 flex-1 flex flex-col">
                        <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">{course.title}</h3>
                        <p className="text-gray-500 mb-4 line-clamp-3 text-sm flex-1">{course.desc}</p>
                        <button className="w-full bg-slate-900 text-white py-3 rounded-xl hover:bg-blue-600 transition font-bold mt-auto flex items-center justify-center gap-2">
                           ▶ เริ่มเรียน
                        </button>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}