// ไฟล์: app/course/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { db, auth } from "../../../lib/firebase";
// ✅ import setDoc เพื่อบันทึกข้อมูลความคืบหน้า
import { doc, getDoc, collection, getDocs, query, orderBy, setDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function CoursePlayer() {
  const { id } = useParams();
  const courseId = typeof id === 'string' ? id : "";

  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  
  // ✨ State เก็บรายการ ID บทเรียนที่เรียนจบแล้ว
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);

  // 1. โหลดข้อมูลคอร์สและบทเรียน
  useEffect(() => {
    if (!courseId) return;

    const fetchData = async () => {
      try {
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
            setCourse(courseDoc.data());
        }

        const q = query(collection(db, "courses", courseId, "lessons"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        const lessonList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLessons(lessonList);
        
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  // 2. โหลดข้อมูลความคืบหน้าของ User (Real-time)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser && courseId) {
            // ฟังเสียงจาก Database: ถ้ามีการบันทึก ให้ดึงข้อมูลใหม่ทันที
            const progressRef = doc(db, "users", currentUser.uid, "progress", courseId);
            const unsubscribeSnapshot = onSnapshot(progressRef, (docSnap) => {
                if (docSnap.exists()) {
                    setCompletedLessons(docSnap.data().completed || []);
                }
            });
            return () => unsubscribeSnapshot();
        }
    });
    return () => unsubscribeAuth();
  }, [courseId]);

  // ✨ ฟังก์ชันกดปุ่ม "เรียนจบแล้ว"
  const toggleComplete = async (lessonId: string) => {
    if (!user) return alert("กรุณาล็อกอินเพื่อบันทึกการเรียน");

    let newCompleted = [...completedLessons];
    if (newCompleted.includes(lessonId)) {
        // ถ้ามีอยู่แล้ว -> เอาออก (Uncheck)
        newCompleted = newCompleted.filter(id => id !== lessonId);
    } else {
        // ถ้ายังไม่มี -> ใส่เพิ่ม (Check)
        newCompleted.push(lessonId);
    }

    // บันทึกลง Database
    // โครงสร้าง: users -> [userId] -> progress -> [courseId] -> { completed: [...] }
    await setDoc(doc(db, "users", user.uid, "progress", courseId), {
        completed: newCompleted,
        lastUpdated: new Date()
    });
    // ไม่ต้อง setCompletedLessons เอง เพราะ onSnapshot จะทำงานให้
  };

  if (loading) return <div className="p-10 text-center text-white">กำลังโหลดห้องเรียน...</div>;
  if (!course) return <div className="p-10 text-center text-white">ไม่พบคอร์สเรียนนี้</div>;

  const currentVideoId = activeLesson ? activeLesson.videoId : course.videoId;
  const currentTitle = activeLesson ? activeLesson.title : "บทนำ: " + course.title;
  const currentContent = activeLesson ? activeLesson.content : course.desc;
  
  // คำนวณเปอร์เซ็นต์
  const totalLessons = lessons.length;
  const finishedCount = completedLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((finishedCount / totalLessons) * 100) : 0;

  // เช็คว่าตอนนี้เรียนจบยัง
  const isCurrentLessonCompleted = activeLesson ? completedLessons.includes(activeLesson.id) : false;

  return (
    <div className="min-h-screen bg-[#1a1d21] text-white font-sans flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-[#23272e] border-r border-gray-700 flex flex-col h-auto md:h-screen overflow-y-auto order-2 md:order-1 flex-shrink-0">
        <div className="p-5 border-b border-gray-700 sticky top-0 bg-[#23272e] z-10">
            <Link href="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-2 mb-4">
                ← กลับหน้าแรก
            </Link>
            <h2 className="font-bold text-lg leading-tight mb-3">{course.title}</h2>
            
            {/* ✨ แถบความคืบหน้า (Progress Bar) */}
            <div className="mb-1 flex justify-between text-xs text-gray-400">
                <span>ความคืบหน้าของคุณ</span>
                <span>{progressPercent}% ({finishedCount}/{totalLessons})</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                ></div>
            </div>
        </div>

        <div className="flex-1 p-2 space-y-1">
            <button 
                onClick={() => setActiveLesson(null)}
                className={`w-full text-left p-3 rounded-lg text-sm flex items-center gap-3 transition ${activeLesson === null ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
            >
                <span className="text-lg">🏠</span>
                <span className="font-medium truncate">บทนำคอร์สเรียน</span>
            </button>

            <div className="my-2 border-t border-gray-700"></div>
            
            {lessons.map((lesson, index) => {
                const isCompleted = completedLessons.includes(lesson.id);
                return (
                    <button 
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson)}
                        className={`w-full text-left p-3 rounded-lg text-sm flex items-center gap-3 transition group relative ${activeLesson?.id === lesson.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                    >
                        {/* ไอคอนเลขข้อ หรือ เครื่องหมายถูก */}
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold 
                            ${isCompleted 
                                ? 'bg-green-500 text-white' // เรียนจบแล้วสีเขียว
                                : activeLesson?.id === lesson.id ? 'bg-white text-blue-600' : 'bg-gray-600 text-gray-300'
                            }`}>
                            {isCompleted ? '✓' : index + 1}
                        </span>
                        
                        <span className="truncate font-medium flex-1">{lesson.title}</span>
                        
                        {activeLesson?.id === lesson.id && <span className="text-xs animate-pulse">▶</span>}
                    </button>
                )
            })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto order-1 md:order-2">
        {/* Video Area */}
        <div className="bg-black w-full aspect-video relative shadow-xl flex-shrink-0">
             {currentVideoId ? (
                <iframe 
                    src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=0&rel=0`} 
                    title="Video Player"
                    className="absolute top-0 left-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                ></iframe>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">ไม่พบวิดีโอ</div>
            )}
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
            <div className="mb-6 pb-6 border-b border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold">{currentTitle}</h1>
                
                {/* ✨ ปุ่มกด Mark as Complete */}
                {activeLesson && (
                    <button 
                        onClick={() => toggleComplete(activeLesson.id)}
                        className={`px-6 py-2 rounded-full font-bold text-sm transition flex items-center gap-2 ${isCurrentLessonCompleted ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-500'}`}
                    >
                        {isCurrentLessonCompleted ? (
                            <>✅ เรียนจบบทนี้แล้ว</>
                        ) : (
                            <>⭕️ ทำเครื่องหมายว่าเรียนจบ</>
                        )}
                    </button>
                )}
            </div>
            
            <div className="prose prose-invert max-w-none">
                {currentContent ? (
                    <div className="bg-[#23272e] p-6 rounded-xl border border-gray-700 text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {currentContent}
                    </div>
                ) : (
                    <p className="text-gray-500 italic">ไม่มีเนื้อหาเพิ่มเติมสำหรับตอนนี้</p>
                )}
            </div>
        </div>
      </main>
    </div>
  );
}