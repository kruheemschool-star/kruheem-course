"use client";
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, where, orderBy, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import Link from "next/link";

import { useUserAuth } from "@/context/AuthContext";
import { X, Plus, Edit2, Trash2, Save, Settings } from "lucide-react";

export default function CourseManagerPage() {
  const { user, logOut } = useUserAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [videoId, setVideoId] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [price, setPrice] = useState("");
  const [fullPrice, setFullPrice] = useState("");
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  // Category Management State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ id: string, name: string } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchCourses();
    fetchCategories();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleLogout = async () => {
    if (confirm("ต้องการออกจากระบบใช่ไหม?")) {
      await logOut();
    }
  };

  const fetchCourses = async () => {
    try {
      const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const courseList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(courseList);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, "categories"), orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      let categoryList = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));

      if (categoryList.length === 0) {
        // Seed default categories if empty
        const defaultCategories = ["ประถม (ป.4-6)", "สอบเข้า ม.1", "ม.ต้น (ม.1-3)", "ม.ปลาย (ม.4-6)", "คอร์สเรียนทั่วไป"];
        for (const cat of defaultCategories) {
          await addDoc(collection(db, "categories"), { name: cat, createdAt: new Date() });
        }
        // Re-fetch
        const newSnapshot = await getDocs(query(collection(db, "categories"), orderBy("createdAt", "asc")));
        categoryList = newSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      }

      setCategories(categoryList);
      if (!category && categoryList.length > 0) {
        setCategory(categoryList[0].name);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleEditClick = (course: any) => {
    setEditId(course.id);
    setTitle(course.title);
    setDesc(course.desc);
    setCategory(course.category || (categories[0]?.name || ""));
    setVideoId(course.videoId);
    setDocUrl(course.docUrl || "");
    setPrice(course.price || "");
    setFullPrice(course.fullPrice || "");
    setCurrentImageUrl(course.image);
    setImagePreview(course.image);
    setImageFile(null);
    setKeywords(course.keywords || []);
    setNewKeyword("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setTitle("");
    setDesc("");
    setCategory(categories[0]?.name || "");
    setVideoId("");
    setDocUrl("");
    setPrice("");
    setFullPrice("");
    setCurrentImageUrl("");
    setImagePreview("");
    setImageFile(null);
    setKeywords([]);
    setNewKeyword("");
  };

  const deleteCourseWithAllData = async (courseId: string, imageUrl: string) => {
    const lessonsRef = collection(db, "courses", courseId, "lessons");
    const lessonsSnapshot = await getDocs(lessonsRef);
    const deletePromises = lessonsSnapshot.docs.map(doc => deleteDoc(doc.ref));

    const enrollmentsQuery = query(collection(db, "enrollments"), where("courseId", "==", courseId));
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    enrollmentsSnapshot.docs.forEach(doc => deletePromises.push(deleteDoc(doc.ref)));

    if (imageUrl) {
      try {
        const imagePath = imageUrl.split(/\/o\/(.+)\?alt/)[1];
        if (imagePath) {
          await deleteObject(ref(storage, decodeURIComponent(imagePath)));
        }
      } catch (e) {
        console.warn("Could not delete image from storage.", e);
      }
    }

    await Promise.all(deletePromises);
    await deleteDoc(doc(db, "courses", courseId));
  };

  const handleDelete = async (course: any) => {
    if (confirm(`ต้องการลบ ${course.title} พร้อมข้อมูลทั้งหมดใช่ไหม? \n\n(ไม่สามารถกู้คืนได้!)`)) {
      try {
        await deleteCourseWithAllData(course.id, course.image);
        showToast(`✅ ลบสำเร็จ!`, 'success');
        fetchCourses();
      } catch (e: any) {
        showToast(`❌ Error: ${e.message}`, 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return showToast("กรุณาใส่ชื่อคอร์ส", "error");

    setSubmitting(true);
    try {
      let downloadURL = currentImageUrl;
      if (imageFile) {
        const storageRef = ref(storage, `course-images/${Date.now()}-${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        downloadURL = await getDownloadURL(snapshot.ref);
      }

      const courseData = {
        title,
        desc,
        category,
        price: Number(price) || 0,
        fullPrice: Number(fullPrice) || 0,
        image: downloadURL,
        videoId,
        docUrl,
        keywords,
        updatedAt: new Date()
      };

      if (editId) {
        await updateDoc(doc(db, "courses", editId), courseData);
        showToast("✏️ แก้ไขข้อมูลเรียบร้อย!");
      } else {
        await addDoc(collection(db, "courses"), {
          ...courseData,
          price: Number(price) || 0,
          fullPrice: Number(fullPrice) || 0,
          createdAt: new Date()
        });
        showToast("✅ เพิ่มคอร์สใหม่เรียบร้อย!");
      }
      handleCancelEdit();
      fetchCourses();
    } catch (error: any) {
      showToast("Error: " + error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Category Management Functions ---

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      if (editingCategory) {
        // Update category name
        await updateDoc(doc(db, "categories", editingCategory.id), { name: newCategoryName });

        // Update all courses that use this category
        const batch = writeBatch(db);
        const coursesToUpdate = courses.filter(c => c.category === editingCategory.name);
        coursesToUpdate.forEach(c => {
          const courseRef = doc(db, "courses", c.id);
          batch.update(courseRef, { category: newCategoryName });
        });
        await batch.commit();

        showToast("✏️ แก้ไขหมวดหมู่เรียบร้อย!");
      } else {
        // Add new category
        await addDoc(collection(db, "categories"), {
          name: newCategoryName,
          createdAt: new Date()
        });
        showToast("✅ เพิ่มหมวดหมู่เรียบร้อย!");
      }

      setNewCategoryName("");
      setEditingCategory(null);
      fetchCategories();
      fetchCourses(); // Refresh courses to reflect category name changes
    } catch (error: any) {
      showToast("Error: " + error.message, "error");
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`ต้องการลบหมวดหมู่ "${name}" ใช่ไหม?`)) {
      try {
        await deleteDoc(doc(db, "categories", id));
        showToast("🗑️ ลบหมวดหมู่เรียบร้อย!");
        fetchCategories();
      } catch (error: any) {
        showToast("Error: " + error.message, "error");
      }
    }
  };

  // Group courses for display in the list below
  const groupedCourses = courses.reduce((acc, course) => {
    const cat = course.category || "คอร์สเรียนทั่วไป";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(course);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort categories based on the order in the database (or just use the fetched order)
  // We use the `categories` state to determine the display order of groups
  const sortedCategoryNames = categories.map(c => c.name);
  // Also include any categories that might be in courses but not in the list (legacy data)
  const allCategoryKeys = Object.keys(groupedCourses);
  const finalSortedCategories = Array.from(new Set([...sortedCategoryNames, ...allCategoryKeys]));

  return (

    <div className="min-h-screen bg-[#F7F6F3] p-6 md:p-10 font-sans text-stone-800 relative">

      {toast && (
        <div className={`fixed bottom-5 right-5 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-bounce transition-all duration-500 z-50 ${toast.type === 'success' ? 'bg-white border-l-4 border-green-500 text-stone-700' : 'bg-red-50 border-l-4 border-red-500 text-red-700'}`}>
          <span className="text-xl">{toast.type === 'success' ? '🎉' : '⚠️'}</span>
          <p className="font-medium text-lg">{toast.msg}</p>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings size={24} /> จัดการหมวดหมู่
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-white/80 hover:text-white transition">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="ชื่อหมวดหมู่..."
                  className="flex-1 p-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 outline-none transition"
                />
                <button
                  onClick={handleSaveCategory}
                  disabled={!newCategoryName.trim()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {editingCategory ? <Save size={18} /> : <Plus size={18} />}
                  {editingCategory ? "บันทึก" : "เพิ่ม"}
                </button>
                {editingCategory && (
                  <button
                    onClick={() => { setEditingCategory(null); setNewCategoryName(""); }}
                    className="bg-gray-100 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-200 transition"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition group">
                    <span className="font-medium text-gray-700">{cat.name}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingCategory(cat); setNewCategoryName(cat.name); }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="แก้ไข"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-center text-gray-400 py-4">ไม่มีหมวดหมู่</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center px-4 py-2 text-stone-500 hover:text-stone-800 transition text-lg font-medium border rounded-lg bg-white hover:bg-gray-100 shadow-sm">
              ← กลับ Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-stone-800 flex items-center gap-3">
              <span className="text-4xl">📚</span> จัดการคอร์สเรียน
            </h1>
          </div>
          <button onClick={handleLogout} className="px-6 py-3 text-base text-red-500 bg-white border border-red-200 rounded-xl hover:bg-red-50 shadow-sm transition font-medium">ออกจากระบบ</button>
        </div>

        {/* Form Section */}
        <div className={`bg-white p-10 rounded-3xl shadow-sm border mb-12 transition-all duration-300 ${editId ? 'border-yellow-400 ring-4 ring-yellow-50' : 'border-stone-200'}`}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-stone-700 flex items-center gap-3">
              <span className={`w-3 h-8 rounded-full ${editId ? 'bg-yellow-400' : 'bg-blue-500'}`}></span>
              {editId ? 'แก้ไขข้อมูลคอร์ส' : 'เพิ่มคอร์สใหม่'}
            </h2>
            {editId && <button onClick={handleCancelEdit} className="text-base text-stone-400 hover:text-stone-600 underline">ยกเลิกการแก้ไข</button>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ✅ หมวดหมู่ */}
            <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-100 relative">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold text-indigo-600 uppercase tracking-wider">📂 เลือกหมวดหมู่ (Category)</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-xs font-bold text-indigo-500 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-indigo-100 hover:bg-indigo-500 hover:text-white transition flex items-center gap-1"
                >
                  <Settings size={14} /> จัดการหมวดหมู่
                </button>
              </div>
              <select
                className="w-full p-4 bg-white border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none transition font-bold text-indigo-900 text-lg shadow-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-base font-bold text-stone-600">ชื่อวิชา</label>
              <input type="text" className="w-full p-4 bg-[#F7F6F3] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition text-lg" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น คณิตศาสตร์ ม.1 เทอม 1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-base font-bold text-stone-600">ราคาเต็ม (บาท)</label>
                <input type="number" className="w-full p-4 bg-[#F7F6F3] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition font-bold text-slate-500 text-lg line-through" value={fullPrice} onChange={(e) => setFullPrice(e.target.value)} placeholder="เช่น 2500" />
              </div>
              <div className="space-y-2">
                <label className="text-base font-bold text-stone-600">ราคาขายจริง (บาท)</label>
                <input type="number" className="w-full p-4 bg-[#F7F6F3] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition font-bold text-blue-600 text-lg" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="เช่น 1500" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-base font-bold text-stone-600">YouTube Intro (Video ID)</label>
              <input type="text" className="w-full p-4 bg-[#F7F6F3] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition text-lg" value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder="เช่น dQw4w9WgXcQ" />
            </div>

            <div className="space-y-2">
              <label className="text-base font-bold text-stone-600">คำอธิบายสั้นๆ</label>
              <textarea className="w-full p-4 bg-[#F7F6F3] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition min-h-[100px] text-lg" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-base font-bold text-blue-600">ลิงก์ Google Drive (รวมเอกสารทั้งคอร์ส)</label>
              <input type="text" className="w-full p-4 bg-blue-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition font-mono text-base text-blue-700" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
            </div>

            {/* Keywords Field */}
            <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100 space-y-3">
              <label className="block text-sm font-bold text-emerald-600 uppercase tracking-wider">🏷️ คำสำคัญ (Keywords) - สำหรับแนะนำคอร์สที่เกี่ยวข้อง</label>

              {/* Display existing keywords */}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {keywords.map((kw, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-full text-sm font-medium">
                      {kw}
                      <button
                        type="button"
                        onClick={() => setKeywords(keywords.filter((_, i) => i !== idx))}
                        className="ml-1 text-emerald-400 hover:text-red-500 transition"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add new keyword */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
                        setKeywords([...keywords, newKeyword.trim()]);
                        setNewKeyword("");
                      }
                    }
                  }}
                  placeholder="พิมพ์คำสำคัญ แล้วกด Enter หรือกดปุ่มเพิ่ม"
                  className="flex-1 p-3 bg-white border-2 border-emerald-200 rounded-xl focus:border-emerald-500 outline-none transition text-emerald-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
                      setKeywords([...keywords, newKeyword.trim()]);
                      setNewKeyword("");
                    }
                  }}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition flex items-center gap-2"
                >
                  <Plus size={18} /> เพิ่ม
                </button>
              </div>
              <p className="text-xs text-emerald-500">ตัวอย่าง: จำนวนจริง, สมการ, แคลคูลัส, ลำดับ ฯลฯ</p>
            </div>

            <div className="space-y-2">
              <label className="text-base font-bold text-stone-600">รูปปก <span className="text-stone-400 font-normal text-sm ml-2">(แนะนำขนาด 16:9 หรือ 1280x720 px)</span></label>
              <div className="relative">
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="w-full p-4 bg-[#F7F6F3] border-2 border-dashed border-stone-300 rounded-xl flex items-center justify-center gap-3 cursor-pointer hover:bg-stone-100 transition text-stone-500 text-lg font-medium">
                  <span className="text-2xl">🖼️</span> คลิกเพื่อเลือกรูปภาพ
                </label>
              </div>
              {imagePreview && <img src={imagePreview} className="mt-4 h-48 w-full object-cover rounded-xl shadow-sm border border-stone-200" alt="Preview" />}
            </div>

            <button type="submit" disabled={submitting} className={`w-full py-4 rounded-xl font-bold text-xl shadow-lg transition transform hover:-translate-y-1 ${submitting ? 'bg-stone-400' : editId ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-stone-800 hover:bg-stone-900 text-white'}`}>
              {submitting ? '⏳ กำลังบันทึก...' : editId ? '✏️ บันทึกการแก้ไข' : '+ บันทึกคอร์สเรียน'}
            </button>
          </form>
        </div>

        {/* Course List Section (Grouped) */}
        <div className="space-y-12">
          {finalSortedCategories.map((catName) => {
            const catCourses = groupedCourses[catName];
            if (!catCourses || catCourses.length === 0) return null;

            return (
              <div key={catName} className="bg-white/50 p-8 rounded-[2.5rem] border border-stone-200">
                <h3 className="text-2xl font-black text-stone-700 mb-6 flex items-center gap-3 pl-2">
                  <span className="w-2 h-8 bg-stone-400 rounded-full"></span> {catName}
                </h3>
                <div className="space-y-4">
                  {catCourses.map((c: any) => (
                    <div key={c.id} className={`flex flex-col md:flex-row md:items-center justify-between bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition gap-4 ${editId === c.id ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-stone-200'}`}>
                      <div className="flex items-center gap-5 overflow-hidden w-full">
                        <div className="w-24 h-16 rounded-xl bg-stone-100 flex-shrink-0 overflow-hidden border border-stone-100 relative group">
                          {c.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={c.image} alt={c.title} className="w-full h-full object-cover absolute inset-0 group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-stone-800 truncate text-lg md:text-xl">{c.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {c.fullPrice > 0 && (
                              <span className="text-sm font-bold text-slate-400 line-through">฿{c.fullPrice.toLocaleString()}</span>
                            )}
                            <p className="text-sm font-bold text-blue-600">{c.price ? `฿${c.price.toLocaleString()}` : "ฟรี"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto justify-end">
                        <Link href={`/admin/course/${c.id}`} className="px-4 py-2 text-sm font-bold text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition border border-purple-100 flex items-center gap-2 whitespace-nowrap">
                          📺 บทเรียน
                        </Link>
                        <button onClick={() => handleEditClick(c)} className="px-4 py-2 text-sm font-bold text-yellow-600 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition border border-yellow-100 whitespace-nowrap">แก้ไข</button>
                        <button onClick={() => handleDelete(c)} className="px-4 py-2 text-sm font-bold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition border border-red-100 whitespace-nowrap">ลบ</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {courses.length === 0 && !loading && (
            <div className="text-center py-20 text-stone-400 italic">ยังไม่มีคอร์สเรียน เริ่มสร้างคอร์สแรกกันเลย!</div>
          )}
        </div>
      </div>
    </div>

  );
}