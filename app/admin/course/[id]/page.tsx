// ไฟล์: app/admin/course/[id]/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { db, auth } from "../../../../lib/firebase"; 
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, getDoc, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ManageLessonsPage() {
  const { id } = useParams();
  const courseId = typeof id === 'string' ? id : "";
  
  const [courseTitle, setCourseTitle] = useState("กำลังโหลด...");
  const [lessons, setLessons] = useState<any[]>([]);
  
  // Form State
  const [lessonTitle, setLessonTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  // ✨ เพิ่ม state สำหรับเนื้อหา
  const [lessonContent, setLessonContent] = useState(""); 
  
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

  const fetchCourseInfo = useCallback(async () => {
    if (!courseId) return;
    try {
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) setCourseTitle(courseDoc.data().title);

        const q = query(collection(db, "courses", courseId, "lessons"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        const lessonList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLessons(lessonList);
    } catch (error) {
        console.error("Error:", error);
    }
  }, [courseId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/"); 
        return;
      }
      fetchCourseInfo();
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, fetchCourseInfo]);

  const handleEditClick = (lesson: any) => {
    setEditId(lesson.id);
    setLessonTitle(lesson.title);
    setVideoUrl(`https://youtu.be/${lesson.videoId}`);
    setLessonContent(lesson.content || ""); // ดึงเนื้อหาเดิมมาโชว์
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setLessonTitle("");
    setVideoUrl("");
    setLessonContent("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle || !videoUrl) return showToast("กรุณากรอกข้อมูลให้ครบ", "error");

    setSubmitting(true);
    try {
        const cleanVideoId = extractVideoId(videoUrl);
        const dataToSave = {
            title: lessonTitle,
            videoId: cleanVideoId,
            content: lessonContent, // ✅ บันทึกเนื้อหาลง Database
        };
        
        if (editId) {
            await updateDoc(doc(db, "courses", courseId, "lessons", editId), dataToSave);
            showToast("✏️ แก้ไขบทเรียนแล้ว!");
        } else {
            await addDoc(collection(db, "courses", courseId, "lessons"), {
                ...dataToSave,
                createdAt: new Date()
            });
            showToast("✅ เพิ่มตอนใหม่สำเร็จ!");
        }

        handleCancelEdit();
        fetchCourseInfo();
    } catch (error: any) {
        showToast("Error: " + error.message, "error");
    } finally {
        setSubmitting(false);
    }
  };

  const handleDelete = async (lessonId: string) => {
    if (confirm("ต้องการลบบทเรียนนี้ใช่ไหม?")) {
      await deleteDoc(doc(db, "courses", courseId, "lessons", lessonId));
      showToast("ลบเรียบร้อย");
      fetchCourseInfo();
    }
  };

  if (loading) return <div className="p-10 text-center text-stone-500">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen bg-[#F7F6F3] p-6 md:p-10 font-sans text-stone-800 relative">
      {toast && (
        <div className={`fixed bottom-5 right-5 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-bounce transition-all duration-500 z-50 ${toast.type === 'success' ? 'bg-white border-l-4 border-green-500 text-stone-700' : 'bg-red-50 border-l-4 border-red-500 text-red-700'}`}>
            <span className="text-xl">{toast.type === 'success' ? '🎉' : '⚠️'}</span>
            <p className="font-medium">{toast.msg}</p>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
            <Link href="/admin" className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-4 transition">
                ← กลับไปหน้าจัดการคอร์สหลัก
            </Link>
            <div className="flex items-center gap-3">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-stone-200">
                    <span className="text-2xl">📺</span>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-stone-700">จัดการบทเรียน</h1>
                    <h2 className="text-2xl font-bold text-blue-600">{courseTitle}</h2>
                </div>
            </div>
        </div>

        <div className={`bg-white p-6 rounded-2xl shadow-sm border mb-8 transition-all ${editId ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-stone-200'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-stone-700 flex items-center gap-2">
                    <span className={`w-2 h-6 rounded-full ${editId ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                    {editId ? 'แก้ไขข้อมูลตอน' : `เพิ่มตอนใหม่ (EP.${lessons.length + 1})`}
                </h3>
                {editId && <button onClick={handleCancelEdit} className="text-xs text-stone-400 underline">ยกเลิก</button>}
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input 
                    type="text" 
                    placeholder="ชื่อตอน (เช่น EP.1 การบวกเลข)"
                    className="w-full p-3 bg-[#F7F6F3] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-green-200 outline-none transition"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                />
                <input 
                    type="text" 
                    placeholder="วางลิงก์ YouTube ที่นี่..."
                    className="w-full p-3 bg-[#F7F6F3] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-green-200 outline-none transition font-mono text-sm"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                />
                
                {/* ✨ ช่องกรอกเนื้อหาเพิ่มเติม */}
                <textarea 
                    placeholder="เนื้อหาประกอบบทเรียน (เช่น สรุปสูตร, โจทย์การบ้าน, คำอธิบายเพิ่มเติม)..."
                    className="w-full p-3 bg-[#F7F6F3] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-green-200 outline-none transition min-h-[120px]"
                    value={lessonContent}
                    onChange={(e) => setLessonContent(e.target.value)}
                />

                <button 
                    type="submit"
                    disabled={submitting}
                    className={`px-6 py-3 rounded-xl font-bold text-white shadow-md transition ${submitting ? 'bg-stone-400' : editId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-stone-800 hover:bg-stone-900'}`}
                >
                    {submitting ? '...' : editId ? 'บันทึกแก้ไข' : '+ เพิ่ม'}
                </button>
            </form>
        </div>

        <div className="space-y-3">
            <h3 className="font-bold text-stone-500 pl-1">รายการบทเรียน ({lessons.length})</h3>
            {lessons.map((lesson, index) => (
                <div key={lesson.id} className={`flex items-center justify-between bg-white p-4 rounded-xl border hover:shadow-md transition group ${editId === lesson.id ? 'border-yellow-400 bg-yellow-50' : 'border-stone-200'}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold">
                            {index + 1}
                        </div>
                        <div>
                            <h4 className="font-bold text-stone-800">{lesson.title}</h4>
                            <p className="text-xs text-stone-400 truncate w-64">{lesson.content ? "📝 มีเนื้อหาประกอบ" : "ไม่มีเนื้อหา"}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleEditClick(lesson)} className="px-3 py-1 text-xs font-medium text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 border border-yellow-100">แก้ไข</button>
                        <button onClick={() => handleDelete(lesson.id)} className="px-3 py-1 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 border border-red-100">ลบ</button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}