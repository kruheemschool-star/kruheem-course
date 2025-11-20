// ไฟล์: app/admin/page.tsx
"use client";
import { useState, useEffect } from "react";
import { db, auth, storage } from "../../lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  
  // Form State
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [videoId, setVideoId] = useState("");
  // เก็บ URL รูปปัจจุบัน (เผื่อกรณีแก้ไขแล้วไม่เปลี่ยนรูป)
  const [currentImageUrl, setCurrentImageUrl] = useState(""); 
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  
  // ✨ State สำหรับโหมดแก้ไข
  const [editId, setEditId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const router = useRouter();

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/"); 
        return;
      }
      setUser(currentUser);
      fetchCourses();
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleLogout = async () => {
    if(confirm("ต้องการออกจากระบบใช่ไหม?")) {
        await signOut(auth);
        router.push("/");
    }
  };

  const fetchCourses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "courses"));
      // เรียงลำดับตามวันที่สร้าง (ใหม่สุดอยู่บน)
      const courseList = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a:any, b:any) => b.createdAt?.seconds - a.createdAt?.seconds);
        
      setCourses(courseList);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // ✨ ฟังก์ชันกดปุ่ม "แก้ไข" (ดึงข้อมูลขึ้นฟอร์ม)
  const handleEditClick = (course: any) => {
    setEditId(course.id); // จำไว้ว่ากำลังแก้ ID ไหน
    setTitle(course.title);
    setDesc(course.desc);
    setVideoId(course.videoId);
    setCurrentImageUrl(course.image); // จำ URL รูปเดิม
    setImagePreview(course.image); // โชว์รูปเดิม
    setImageFile(null); // เคลียร์ไฟล์ใหม่ (เพราะยังไม่ได้เลือกเปลี่ยน)
    
    // เลื่อนหน้าจอขึ้นไปหาฟอร์ม
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✨ ฟังก์ชันยกเลิกการแก้ไข
  const handleCancelEdit = () => {
    setEditId(null);
    setTitle("");
    setDesc("");
    setVideoId("");
    setCurrentImageUrl("");
    setImagePreview("");
    setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return showToast("กรุณาใส่ชื่อคอร์สก่อนนะครับ", "error");
    
    // ถ้าเป็นการเพิ่มใหม่ ต้องบังคับใส่รูป แต่ถ้าแก้ไข ไม่ต้องบังคับ (เพราะใช้รูปเดิมได้)
    if (!editId && !imageFile) return showToast("กรุณาเลือกรูปปกด้วยนะครับ", "error");
    
    setSubmitting(true);
    
    try {
        let downloadURL = currentImageUrl; // เริ่มต้นด้วยรูปเดิม

        // 1. ถ้ามีการเลือกรูปใหม่ -> อัปโหลดขึ้นโกดัง
        if (imageFile) {
            const storageRef = ref(storage, `course-images/${Date.now()}-${imageFile.name}`);
            const snapshot = await uploadBytes(storageRef, imageFile);
            downloadURL = await getDownloadURL(snapshot.ref);
        }

        // 2. แปลงลิงก์ YouTube
        const cleanVideoId = extractVideoId(videoId);

        const courseData = {
          title,
          desc,
          image: downloadURL,
          videoId: cleanVideoId,
          updatedAt: new Date()
        };

        // 3. ตรวจสอบว่าเป็น "เพิ่มใหม่" หรือ "แก้ไข"
        if (editId) {
            // 🟡 โหมดแก้ไข (Update)
            await updateDoc(doc(db, "courses", editId), courseData);
            showToast("✏️ แก้ไขข้อมูลเรียบร้อยแล้วครับ!");
        } else {
            // 🟢 โหมดเพิ่มใหม่ (Create)
            await addDoc(collection(db, "courses"), {
                ...courseData,
                price: 0,
                createdAt: new Date()
            });
            showToast("✅ เพิ่มคอร์สใหม่เรียบร้อย!");
        }
        
        // 4. รีเซ็ตฟอร์มทั้งหมด
        handleCancelEdit();
        fetchCourses();

    } catch (error: any) {
        console.error(error);
        showToast("เกิดข้อผิดพลาด: " + error.message, "error");
    } finally {
        setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("ต้องการลบคอร์สนี้ใช่ไหม?")) {
      await deleteDoc(doc(db, "courses", id));
      showToast("ลบคอร์สออกแล้วครับ");
      fetchCourses();
    }
  };

  if (loading) return <div className="p-10 text-center text-stone-500">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-[#F7F6F3] p-6 md:p-10 font-sans text-stone-800 relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-bounce transition-all duration-500 z-50 ${toast.type === 'success' ? 'bg-white border-l-4 border-green-500 text-stone-700' : 'bg-red-50 border-l-4 border-red-500 text-red-700'}`}>
            <span className="text-xl">{toast.type === 'success' ? '🎉' : '⚠️'}</span>
            <p className="font-medium">{toast.msg}</p>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-stone-200">
                <span className="text-2xl">🛠️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-stone-700">จัดการคอร์สเรียน</h1>
                <p className="text-xs text-stone-500">{user?.email}</p>
              </div>
          </div>
          <div className="flex gap-3">
              <Link href="/" className="px-4 py-2 text-sm text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 shadow-sm transition">
                  ← หน้าแรก
              </Link>
              <button onClick={handleLogout} className="px-4 py-2 text-sm text-red-500 bg-white border border-red-100 rounded-lg hover:bg-red-50 shadow-sm transition">
                  ออกจากระบบ
              </button>
          </div>
        </div>

        {/* Form Card */}
        <div className={`bg-white p-8 rounded-2xl shadow-sm border mb-10 transition-all duration-300 ${editId ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-stone-200'}`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-stone-700 flex items-center gap-2">
                <span className={`w-2 h-6 rounded-full ${editId ? 'bg-yellow-400' : 'bg-blue-400'}`}></span>
                {editId ? 'แก้ไขข้อมูลคอร์ส' : 'เพิ่มคอร์สใหม่'}
            </h2>
            {editId && (
                <button onClick={handleCancelEdit} className="text-sm text-stone-400 hover:text-stone-600 underline">
                    ยกเลิกการแก้ไข
                </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
                <label className="text-sm font-medium text-stone-600">ชื่อวิชา</label>
                <input 
                   type="text" placeholder="เช่น คณิตศาสตร์ ม.1 เรื่องสมการ" 
                   className="w-full p-3 bg-[#F7F6F3] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none transition placeholder-stone-400 text-stone-800 font-medium"
                   value={title} onChange={(e) => setTitle(e.target.value)} 
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-stone-600">คำอธิบายสั้นๆ</label>
                <textarea 
                   placeholder="รายละเอียดคอร์สที่นักเรียนจะเห็น..." 
                   className="w-full p-3 bg-[#F7F6F3] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none transition placeholder-stone-400 text-stone-800 min-h-[100px]"
                   value={desc} onChange={(e) => setDesc(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                  <label className="text-sm font-medium text-stone-600 flex justify-between">
                    รูปปก (1280x720 px)
                    {editId && <span className="text-xs text-yellow-600 bg-yellow-50 px-2">ไม่ต้องเลือกใหม่ถ้าใช้รูปเดิม</span>}
                  </label>
                  
                  <div className="relative">
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden" 
                        id="file-upload"
                    />
                    <label 
                        htmlFor="file-upload"
                        className="w-full p-3 bg-[#F7F6F3] border-2 border-dashed border-stone-300 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-stone-100 transition text-stone-500 hover:text-stone-700"
                    >
                        {imagePreview ? '🔄 เปลี่ยนรูปภาพ' : '📁 คลิกเพื่อเลือกรูปภาพ'}
                    </label>
                  </div>

                  {imagePreview && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-stone-200 h-32 w-full bg-stone-100 relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}
              </div>

              <div className="space-y-1">
                  <label className="text-sm font-medium text-stone-600">YouTube Link</label>
                  <input 
                     type="text" placeholder="วางลิงก์ YouTube เต็มๆ ได้เลย..." 
                     className="w-full p-3 bg-[#F7F6F3] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none transition placeholder-stone-400 text-stone-800 font-medium"
                     value={videoId} onChange={(e) => setVideoId(e.target.value)}
                  />
              </div>
            </div>

            <button 
                type="submit" 
                disabled={submitting}
                className={`w-full py-3 rounded-xl font-semibold shadow-lg transition transform flex items-center justify-center gap-2 mt-2 
                ${submitting ? 'bg-stone-400 cursor-not-allowed' : 
                  editId ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-stone-800 hover:bg-stone-900 text-white'}`}
            >
              {submitting ? (
                  <>⏳ กำลังบันทึก...</>
              ) : (
                  editId ? <>✏️ บันทึกการแก้ไข</> : <>+ บันทึกคอร์สเรียน</>
              )}
            </button>
            
            {/* ปุ่มยกเลิก (แสดงเฉพาะตอนแก้ไข) */}
            {editId && (
                <button 
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full py-3 text-stone-500 hover:bg-stone-100 rounded-xl font-medium transition"
                >
                    ยกเลิก
                </button>
            )}
          </form>
        </div>

        {/* List Card */}
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-stone-700 pl-1">คอร์สทั้งหมด ({courses.length})</h2>
            {courses.map((c) => (
            <div key={c.id} className={`flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition ${editId === c.id ? 'border-yellow-400 ring-1 ring-yellow-200' : 'border-stone-200'}`}>
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-16 h-16 rounded-lg bg-stone-100 flex-shrink-0 overflow-hidden border border-stone-100">
                        {c.image ? (
                             <img src={c.image} className="w-full h-full object-cover" />
                        ) : (
                             <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-800 truncate">{c.title}</h3>
                        <p className="text-xs text-stone-400 font-mono truncate max-w-[200px]">Video: {c.videoId || "-"}</p>
                    </div>
                </div>
                <div className="flex gap-2 ml-4">
                    {/* ✅ ปุ่มจัดการบทเรียนที่ครูต้องการ */}
                    <Link href={`/admin/course/${c.id}`}>
                        <button className="px-3 py-2 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition border border-purple-100 flex items-center gap-1 whitespace-nowrap">
                            📺 จัดการบทเรียน
                        </button>
                    </Link>
                    
                    {/* ปุ่มแก้ไข */}
                    <button 
                        onClick={() => handleEditClick(c)} 
                        className="px-3 py-2 text-xs font-medium text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition border border-yellow-100 whitespace-nowrap"
                    >
                        แก้ไข
                    </button>
                    
                    {/* ปุ่มลบ */}
                    <button 
                        onClick={() => handleDelete(c.id)} 
                        className="px-3 py-2 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition border border-red-100 whitespace-nowrap"
                    >
                        ลบ
                    </button>
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
}