"use client";
import { useUserAuth } from "../context/AuthContext";

export default function Home() {
  // ดึงค่าจากยามเฝ้าประตู (AuthContext) มาใช้
  const { user, googleSignIn, logOut } = useUserAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-gray-200">
        
        {/* กรณีที่ 1: ถ้ามีคนล็อกอินอยู่ (มี User) */}
        {user ? (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center text-3xl">
              👨‍🏫
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">ยินดีต้อนรับ!</h2>
              <p className="text-blue-600 font-medium mt-1">{user.displayName}</p>
              <p className="text-gray-400 text-sm">{user.email}</p>
            </div>
            <button
              onClick={logOut}
              className="w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              ออกจากระบบ (Logout)
            </button>
          </div>
        ) : (
          
          // กรณีที่ 2: ถ้ายังไม่ได้ล็อกอิน (ไม่มี User)
          <div className="space-y-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center text-3xl">
              🔒
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">เข้าสู่ระบบเรียนออนไลน์</h2>
              <p className="text-gray-500 mt-2">กรุณาล็อกอินเพื่อเข้าถึงคอร์สเรียน</p>
            </div>
            <button
              onClick={googleSignIn}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <span>G</span> เข้าสู่ระบบด้วย Google
            </button>
          </div>
        )}

      </div>
    </main>
  );
}