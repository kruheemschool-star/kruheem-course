"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { useUserAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { user } = useUserAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", desc: "", image: "", videoId: "" });

  // ระบบป้องกัน: ถ้าไม่ได้ Login ให้เด้งกลับหน้าแรก (เปิดใช้งานได้เมื่อต้องการ)
  // useEffect(() => {
  //   if (!user) router.push("/");
  // }, [user, router]);

  // ฟังก์ชัน 1: ดึงข้อมูลคอร์สทั้งหมดมาแสดง (ทำงานตลอดเวลา Real-time)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "courses"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(list);
    });
    return () => unsubscribe();
  }, []);

  // ฟังก์ชัน 2: บันทึกคอร์สใหม่
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.title || !form.desc) return alert("กรุณากรอกชื่อและรายละเอียด");
    
    try {
      // ส่งข้อมูลไปเก็บใน Firebase Database
      await addDoc(collection(db, "courses"), {
        ...form,
        price: 0, // ใส่ราคาไว้ก่อน (เผื่ออนาคต)
        createdAt: new Date()
      });
      setForm({ title: "", desc: "", image: "", videoId: "" }); // ล้างฟอร์ม
      alert("✅ เพิ่มคอร์สสำเร็จ!");
    } catch (error: any) {
      console.error(error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  // ฟังก์ชัน 3: ลบคอร์ส
  const handleDelete = async (id: string) => {
    if (confirm("ต้องการลบคอร์สนี้ใช่ไหม?")) {
      await deleteDoc(doc(db, "courses", id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-slate-800 flex items-center gap-2">
          🛠️ ระบบหลังบ้าน (Admin)
        </h1>
        
        {/* ส่วนฟอร์มเพิ่มข้อมูล */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-10 border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-blue-600">เพิ่มคอร์สใหม่</h2>
            <form onSubmit={handleSubmit} className="grid gap-4">
                <input 
                  type="text" placeholder="ชื่อคอร์ส (เช่น ตะลุยโจทย์คณิต ม.1)" 
                  className="border p-3 rounded-lg focus:outline-blue-500"
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})}
                />
                <textarea 
                  placeholder="รายละเอียดคอร์สแบบย่อ" 
                  className="border p-3 rounded-lg focus:outline-blue-500 h-24"
                  value={form.desc} 
                  onChange={e => setForm({...form, desc: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="text" placeholder="ลิงก์รูปปก (Image URL)" 
                    className="border p-3 rounded-lg focus:outline-blue-500 text-sm"
                    value={form.image} 
                    onChange={e => setForm({...form, image: e.target.value})}
                  />
                  <input 
                    type="text" placeholder="YouTube ID (เช่น dQw4w9WgXcQ)" 
                    className="border p-3 rounded-lg focus:outline-blue-500 text-sm"
                    value={form.videoId} 
                    onChange={e => setForm({...form, videoId: e.target.value})}
                  />
                </div>
                <button type="submit" className="bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-700 font-bold transition">
                    + บันทึกคอร์ส
                </button>
            </form>
        </div>

        {/* ส่วนแสดงรายการคอร์สที่มีอยู่ */}
        <h2 className="text-xl font-bold mb-4 text-gray-700">คอร์สทั้งหมด ({courses.length})</h2>
        <div className="grid gap-4">
            {courses.length === 0 && <p className="text-gray-400 text-center py-10">ยังไม่มีข้อมูลคอร์ส</p>}
            
            {courses.map((course) => (
                <div key={course.id} className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex gap-4 items-center">
                        {/* รูปตัวอย่าง */}
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {course.image ? <img src={course.image} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center">🖼️</div>}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{course.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-1">{course.desc}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => handleDelete(course.id)}
                        className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition text-sm border border-transparent hover:border-red-200"
                    >
                        ลบออก
                    </button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}