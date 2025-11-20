// ไฟล์: app/admin/page.tsx
"use client";
import { useState, useEffect } from "react";
import { db, auth } from "../../lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link"; // ✅ เพิ่มการเชื่อมโยงหน้า

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", desc: "", image: "", videoId: "" });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ระบบตรวจบัตรผ่าน
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        alert("⛔️ กรุณาล็อกอินก่อนเข้าใช้งานครับ");
        router.push("/"); 
        return;
      }
      setUser(currentUser);
      fetchCourses();
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // ฟังก์ชันออกจากระบบ (เพิ่มใหม่)
  const handleLogout = async () => {
    if(confirm("ต้องการออกจากระบบใช่ไหม?")) {
        await signOut(auth);
        router.push("/"); // ดีดกลับหน้าแรกทันที
    }
  };

  // ดึงข้อมูลคอร์ส
  const fetchCourses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "courses"));
      const courseList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(courseList);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // เพิ่มคอร์ส
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return alert("กรุณาใส่ชื่อคอร์ส");
    
    if(confirm("ยืนยันการเพิ่มคอร์ส?")) {
        await addDoc(collection(db, "courses"), {
          ...form,
          price: 0,
          createdAt: new Date()
        });
        setForm({ title: "", desc: "", image: "", videoId: "" });
        alert("✅ เพิ่มคอร์สสำเร็จ!");
        fetchCourses();
    }
  };

  // ลบคอร์ส
  const handleDelete = async (id: string) => {
    if (confirm("ต้องการลบคอร์สนี้ใช่ไหม?")) {
      await deleteDoc(doc(db, "courses", id));
      fetchCourses();
    }
  };

  if (loading) return <div className="p-10 text-center">กำลังตรวจสอบสิทธิ์...</div>;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto min-h-screen bg-gray-50">
      
      {/* ✅ ส่วนหัวที่ปรับปรุงใหม่: มีปุ่มกลับหน้าแรก และ Logout */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">🛠️ จัดการคอร์สเรียน</h1>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{user?.email}</span>
        </div>
        
        <div className="flex gap-3">
            {/* ปุ่มกลับหน้าแรก */}
            <Link href="/" className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition flex items-center gap-2">
                ← หน้าแรก
            </Link>
            
            {/* ปุ่ม Logout */}
            <button 
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition flex items-center gap-2"
            >
                ออกจากระบบ
            </button>
        </div>
      </div>

      {/* ฟอร์มเพิ่มคอร์ส */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-10">
        <h2 className="text-xl font-semibold mb-4 text-slate-700">เพิ่มคอร์สใหม่</h2>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <input 
             type="text" placeholder="ชื่อคอร์ส" className="border p-2 rounded w-full"
             value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required
          />
          <textarea 
             placeholder="คำอธิบาย" className="border p-2 rounded w-full" rows={3}
             value={form.desc} onChange={(e) => setForm({...form, desc: e.target.value})}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
               type="text" placeholder="URL รูปปก" className="border p-2 rounded w-full"
               value={form.image} onChange={(e) => setForm({...form, image: e.target.value})}
            />
            <input 
               type="text" placeholder="YouTube ID (เช่น dQw4w9WgXcQ)" className="border p-2 rounded w-full"
               value={form.videoId} onChange={(e) => setForm({...form, videoId: e.target.value})}
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 mt-2">
            + บันทึกข้อมูล
          </button>
        </form>
      </div>

      {/* รายการคอร์ส */}
      <div className="grid gap-4">
        {courses.map((c) => (
          <div key={c.id} className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-4">
                 {c.image && <img src={c.image} className="w-12 h-12 rounded object-cover bg-gray-100" />}
                 <h3 className="font-bold text-slate-800">{c.title}</h3>
            </div>
            <button onClick={() => handleDelete(c.id)} className="text-red-500 border border-red-200 px-3 py-1 rounded hover:bg-red-50 text-sm">
              ลบ
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}