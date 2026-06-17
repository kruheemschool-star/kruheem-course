"use client";
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, where, orderBy, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { uploadImageToStorage } from "@/lib/upload";
import Link from "next/link";

import { useUserAuth } from "@/context/AuthContext";
import {
  X, Plus, Edit2, Trash2, Save, Settings, Palette, BookOpen,
  Library, FolderTree, BadgeCheck, Wallet, ChevronDown, Image as ImageIcon,
  Tag, KeyRound, Users, LogOut,
} from "lucide-react";
import { useConfirmModal } from "@/hooks/useConfirmModal";

export default function CourseManagerPage() {
  const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
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

  // Tags State (for Recommendation System)
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Allowed exam level (for exam-bank courses only): 'none' | 'primary' | 'lower' | 'upper'
  const [allowedExamLevel, setAllowedExamLevel] = useState<"none" | "primary" | "lower" | "upper">("none");

  const [formOpen, setFormOpen] = useState(false);
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
    confirmModal("ยืนยันการออกจากระบบ", "ต้องการออกจากระบบใช่ไหม?", async () => {
      await logOut();
    }, true);
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
      // Fetch WITHOUT orderBy so documents missing a `createdAt` field are still returned.
      // (Firestore silently drops docs when orderBy field is absent — this was the bug
      //  that made "old" categories appear to disappear.)
      const querySnapshot = await getDocs(collection(db, "categories"));
      const categoryList = querySnapshot.docs
        .map(doc => {
          const data = doc.data() as { name?: string; createdAt?: any };
          return {
            id: doc.id,
            name: data.name || "",
            createdAt: data.createdAt,
          };
        })
        .filter(c => c.name)
        // Sort client-side: docs with createdAt by time; docs without go to the end, alphabetically.
        .sort((a, b) => {
          const toMs = (v: any): number => {
            if (!v) return NaN;
            if (typeof v.toMillis === "function") return v.toMillis();
            if (typeof v.seconds === "number") return v.seconds * 1000;
            if (v instanceof Date) return v.getTime();
            return NaN;
          };
          const ta = toMs(a.createdAt);
          const tb = toMs(b.createdAt);
          if (!isNaN(ta) && !isNaN(tb)) return ta - tb;
          if (!isNaN(ta)) return -1;
          if (!isNaN(tb)) return 1;
          return a.name.localeCompare(b.name, "th");
        })
        .map(({ id, name }) => ({ id, name }));

      setCategories(categoryList);
      if (!category && categoryList.length > 0) {
        setCategory(categoryList[0].name);
      }
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      showToast(
        "โหลดหมวดหมู่ไม่สำเร็จ: " + (error?.code === "permission-denied"
          ? "ไม่มีสิทธิ์อ่าน (ตรวจ firestore rules)"
          : error?.message || "unknown"),
        "error"
      );
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
    setTags(course.tags || []);
    setNewTag("");
    setAllowedExamLevel(course.allowedExamLevel || "none");
    setFormOpen(true);
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
    setTags([]);
    setNewTag("");
    setAllowedExamLevel("none");
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
    confirmModal("ยืนยันการลบคอร์สเรียน", `ต้องการลบ ${course.title} พร้อมข้อมูลทั้งหมดใช่ไหม? \n\n(ไม่สามารถกู้คืนได้!)`, async () => {
      try {
        await deleteCourseWithAllData(course.id, course.image);
        showToast(`✅ ลบสำเร็จ!`, 'success');
        fetchCourses();
      } catch (e: any) {
        showToast(`❌ Error: ${e.message}`, 'error');
      }
    }, true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return showToast("กรุณาใส่ชื่อคอร์ส", "error");

    setSubmitting(true);
    try {
      let downloadURL = currentImageUrl;
      if (imageFile) {
        downloadURL = await uploadImageToStorage(imageFile, `course-images/${Date.now()}-${imageFile.name}`);
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
        tags, // Add tags to saving data
        allowedExamLevel: allowedExamLevel === "none" ? null : allowedExamLevel,
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
    confirmModal("ยืนยันการลบหมวดหมู่", `ต้องการลบหมวดหมู่ "${name}" ใช่ไหม?`, async () => {
      try {
        await deleteDoc(doc(db, "categories", id));
        showToast("🗑️ ลบหมวดหมู่เรียบร้อย!", "success");
        fetchCategories();
      } catch (error: any) {
        showToast("Error: " + error.message, "error");
      }
    }, true);
  };

  // Helper function to extract grade and term from course title
  const extractGradeAndTerm = (title: string) => {
    // Extract grade: ม.1, ม.2, ม.3, ม.4, ม.5, ม.6, ป.4, ป.5, ป.6
    const gradeMatch = title.match(/[มป]\.(\d)/);
    const grade = gradeMatch ? parseInt(gradeMatch[1]) : 0;

    // Extract term: เทอม 1, เทอม 2, เทอมหนึ่ง, เทอมสอง
    let term = 0;
    if (title.includes('เทอม 1') || title.includes('เทอมหนึ่ง') || title.includes('เทอม1')) {
      term = 1;
    } else if (title.includes('เทอม 2') || title.includes('เทอมสอง') || title.includes('เทอม2')) {
      term = 2;
    }

    return { grade, term };
  };

  // Extract the human-readable grade label (e.g. "ม.1", "ป.6") from a title.
  const extractGradeLabel = (title: string) => {
    const m = (title || "").match(/[มป]\.\d/);
    return m ? m[0] : "ทั่วไป";
  };

  // Group courses for display in the list below
  const groupedCourses = courses.reduce((acc, course) => {
    const cat = course.category || "คอร์สเรียนทั่วไป";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(course);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort courses within each category by grade and term
  Object.keys(groupedCourses).forEach(catName => {
    groupedCourses[catName].sort((a: any, b: any) => {
      const aInfo = extractGradeAndTerm(a.title);
      const bInfo = extractGradeAndTerm(b.title);

      // First sort by grade (ม.1 before ม.2, etc.)
      if (aInfo.grade !== bInfo.grade) {
        return aInfo.grade - bInfo.grade;
      }

      // Then sort by term (เทอม 1 before เทอม 2)
      if (aInfo.term !== bInfo.term) {
        return aInfo.term - bInfo.term;
      }

      // If same grade and term, sort alphabetically
      return a.title.localeCompare(b.title, 'th');
    });
  });

  // Sort categories based on the order in the database (or just use the fetched order)
  // We use the `categories` state to determine the display order of groups
  const sortedCategoryNames = categories.map(c => c.name);
  // Also include any categories that might be in courses but not in the list (legacy data)
  const allCategoryKeys = Object.keys(groupedCourses);
  const finalSortedCategories = Array.from(new Set([...sortedCategoryNames, ...allCategoryKeys]));

  // ---- derived stats (only from data already in the component) ----
  const publishedCount = courses.filter((c) => c.image && c.videoId).length;
  const catalogueValue = courses.reduce((sum, c) => sum + (Number(c.price) || 0), 0);
  const stats = [
    { label: "คอร์สทั้งหมด", value: courses.length.toLocaleString(), icon: Library },
    { label: "หมวดหมู่", value: categories.length.toLocaleString(), icon: FolderTree },
    { label: "เผยแพร่แล้ว", value: publishedCount.toLocaleString(), icon: BadgeCheck },
    { label: "มูลค่ารวม", value: "฿" + catalogueValue.toLocaleString(), icon: Wallet },
  ];

  return (

    <div className="space-y-6">

      {toast && (
        <div
          className="fixed bottom-5 right-5 px-5 py-3 rounded-xl flex items-center gap-3 z-50 kh-card"
          style={{ borderLeft: `4px solid ${toast.type === 'success' ? 'var(--good)' : 'var(--danger)'}` }}
        >
          <span className="text-xl">{toast.type === 'success' ? '🎉' : '⚠️'}</span>
          <p className="font-medium" style={{ color: toast.type === 'success' ? 'var(--ink)' : 'var(--danger)' }}>{toast.msg}</p>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="kh-card w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-5" style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-ink))" }}>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings size={20} /> จัดการหมวดหมู่
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-white/80 hover:text-white transition">
                <X size={22} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="ชื่อหมวดหมู่..."
                  className="kh-input flex-1"
                />
                <button
                  onClick={handleSaveCategory}
                  disabled={!newCategoryName.trim()}
                  className="kh-btn whitespace-nowrap"
                >
                  {editingCategory ? <Save size={16} /> : <Plus size={16} />}
                  {editingCategory ? "บันทึก" : "เพิ่ม"}
                </button>
                {editingCategory && (
                  <button
                    onClick={() => { setEditingCategory(null); setNewCategoryName(""); }}
                    className="kh-btn-ghost whitespace-nowrap"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-xl group"
                    style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}
                  >
                    <span className="font-medium kh-ink2">{cat.name}</span>
                    <div className="flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingCategory(cat); setNewCategoryName(cat.name); }}
                        className="p-2 rounded-lg transition kh-ink2 hover:bg-[var(--accent-soft)]"
                        style={{ color: "var(--accent-ink)" }}
                        title="แก้ไข"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-2 rounded-lg transition"
                        style={{ color: "var(--danger)" }}
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-center kh-ink3 py-4">ไม่มีหมวดหมู่</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="kh-eyebrow"><Library size={15} strokeWidth={1.9} /> คลังคอร์สเรียน</div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setIsCategoryModalOpen(true)} className="kh-btn-ghost">
            <Settings size={15} /> จัดการหมวดหมู่
          </button>
          <button
            onClick={() => { if (editId) handleCancelEdit(); setFormOpen((v) => !v); }}
            className="kh-btn"
          >
            <Plus size={15} /> {editId ? "แก้ไขคอร์ส" : "เพิ่มคอร์ส"}
          </button>
          <button onClick={handleLogout} className="kh-btn-ghost" style={{ color: "var(--danger)" }}>
            <LogOut size={15} /> ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="kh-card p-4 flex items-center justify-between">
              <div>
                <div className="text-[12px] font-medium kh-ink2">{s.label}</div>
                <div className="kh-num kh-display mt-2 text-[24px] font-semibold leading-none kh-ink">{s.value}</div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                <Icon size={18} strokeWidth={1.8} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Section */}
      <div className="kh-card overflow-hidden" style={editId ? { borderColor: "var(--warn)", boxShadow: "0 0 0 3px var(--warn-soft)" } : undefined}>
        {/* Collapsible header — always visible */}
        <button
          type="button"
          onClick={() => setFormOpen(!formOpen)}
          className="w-full flex justify-between items-center px-5 py-4 text-left"
        >
          <h2 className="text-lg font-bold kh-ink flex items-center gap-3">
            <span className="w-2.5 h-7 rounded-full" style={{ background: editId ? "var(--warn)" : "var(--accent)" }}></span>
            {editId ? 'แก้ไขข้อมูลคอร์ส' : 'เพิ่มคอร์สใหม่'}
          </h2>
          <div className="flex items-center gap-3">
            {editId && (
              <span
                onClick={(e) => { e.stopPropagation(); handleCancelEdit(); setFormOpen(false); }}
                className="text-sm kh-ink3 hover:underline cursor-pointer"
              >
                ยกเลิกการแก้ไข
              </span>
            )}
            <ChevronDown size={20} className={`kh-ink3 transition-transform duration-300 ${formOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {formOpen && (
        <div className="px-5 pb-5">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ✅ หมวดหมู่ */}
          <div className="p-4 rounded-xl" style={{ background: "var(--accent-soft)", border: "1px solid var(--line)" }}>
            <div className="flex justify-between items-center mb-3">
              <label className="kh-eyebrow"><FolderTree size={14} /> เลือกหมวดหมู่ (Category)</label>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="kh-btn-ghost"
                style={{ padding: "5px 11px", fontSize: "12px" }}
              >
                <Settings size={13} /> จัดการหมวดหมู่
              </button>
            </div>
            <select
              className="kh-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="" disabled>-- เลือกหมวดหมู่ --</option>
              {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
          </div>

          {/* 🔐 Exam Bank Level — Controls exam access permission for this course */}
          <div className="p-4 rounded-xl space-y-2" style={{ background: "var(--warn-soft)", border: "1px solid var(--line)" }}>
            <label className="kh-eyebrow" style={{ color: "var(--warn)" }}><KeyRound size={14} /> ระดับข้อสอบที่เข้าถึงได้ (คลังข้อสอบ)</label>
            <p className="text-xs mb-2" style={{ color: "var(--warn)" }}>ใช้เฉพาะคอร์ส "คลังข้อสอบ" เท่านั้น คอร์สเรียนวิดีโอปกติ ให้เลือก "ไม่ใช่คอร์สคลังข้อสอบ"</p>
            <select
              className="kh-select"
              value={allowedExamLevel}
              onChange={(e) => setAllowedExamLevel(e.target.value as any)}
            >
              <option value="none">ไม่ใช่คอร์สคลังข้อสอบ (คอร์สวิดีโอปกติ)</option>
              <option value="primary">คลังข้อสอบประถม / สอบเข้า ม.1</option>
              <option value="lower">คลังข้อสอบมัธยมต้น (ม.1-ม.3)</option>
              <option value="upper">คลังข้อสอบมัธยมปลาย (ม.4-ม.6)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold kh-ink2">ชื่อวิชา</label>
            <input type="text" className="kh-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น คณิตศาสตร์ ม.1 เทอม 1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-bold kh-ink2">ราคาเต็ม (บาท)</label>
              <input type="number" className="kh-input line-through" style={{ color: "var(--ink-3)" }} value={fullPrice} onChange={(e) => setFullPrice(e.target.value)} placeholder="เช่น 2500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold kh-ink2">ราคาขายจริง (บาท)</label>
              <input type="number" className="kh-input font-bold" style={{ color: "var(--accent-ink)" }} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="เช่น 1500" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold kh-ink2">YouTube Intro (Video ID)</label>
            <input type="text" className="kh-input" value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder="เช่น dQw4w9WgXcQ" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold kh-ink2">คำอธิบายสั้นๆ</label>
            <textarea className="kh-textarea min-h-[100px]" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold" style={{ color: "var(--accent-ink)" }}>ลิงก์ Google Drive (รวมเอกสารทั้งคอร์ส)</label>
            <input type="text" className="kh-input font-mono" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
          </div>

          {/* ✅ Tags Field (System Filtering) */}
          <div className="p-4 rounded-xl space-y-3" style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>
            <label className="kh-eyebrow"><Tag size={14} /> Tags (ระบบค้นหา) - สำหรับ Course Finder e.g. ระดับ:ป.6, เป้าหมาย:สอบเข้า ม.1</label>

            {/* Display existing tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1">
                {tags.map((tag, idx) => (
                  <span key={idx} className="kh-pill kh-pill-accent no-dot">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                      className="ml-1 hover:opacity-70 transition"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add new tag */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTag.trim() && !tags.includes(newTag.trim())) {
                      setTags([...tags, newTag.trim()]);
                      setNewTag("");
                    }
                  }
                }}
                placeholder="พิมพ์ Tag e.g. ระดับ:ป.6 แล้วกด Enter"
                className="kh-input flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  if (newTag.trim() && !tags.includes(newTag.trim())) {
                    setTags([...tags, newTag.trim()]);
                    setNewTag("");
                  }
                }}
                className="kh-btn whitespace-nowrap"
              >
                <Plus size={16} /> เพิ่ม
              </button>
            </div>
            <div className="flex gap-2 mt-2 items-start">
              <p className="text-xs font-bold kh-ink3 whitespace-nowrap pt-1">แนะนำ:</p>
              <div className="flex flex-wrap gap-1">
                {['ระดับ:ป.4', 'ระดับ:ป.5', 'ระดับ:ป.6', 'ระดับ:ม.1', 'ระดับ:ม.2', 'ระดับ:ม.3', 'ระดับ:ม.4', 'ระดับ:ม.5', 'ระดับ:ม.6', 'เป้าหมาย:เพิ่มเกรด', 'เป้าหมาย:สอบเข้า ม.1', 'เป้าหมาย:สอบเข้า ม.4', 'เป้าหมาย:สอบเข้ามหาวิทยาลัย'].map(t => (
                  <button key={t} type="button" onClick={() => !tags.includes(t) && setTags([...tags, t])} className="kh-tab" style={{ fontSize: "12px", padding: "4px 9px", border: "1px solid var(--line)" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Keywords Field */}
          <div className="p-4 rounded-xl space-y-3" style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>
            <label className="kh-eyebrow"><Tag size={14} /> คำสำคัญ (Keywords) - สำหรับแนะนำคอร์สที่เกี่ยวข้อง</label>

            {/* Display existing keywords */}
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1">
                {keywords.map((kw, idx) => (
                  <span key={idx} className="kh-pill kh-pill-good no-dot">
                    {kw}
                    <button
                      type="button"
                      onClick={() => setKeywords(keywords.filter((_, i) => i !== idx))}
                      className="ml-1 hover:opacity-70 transition"
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
                className="kh-input flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
                    setKeywords([...keywords, newKeyword.trim()]);
                    setNewKeyword("");
                  }
                }}
                className="kh-btn whitespace-nowrap"
              >
                <Plus size={16} /> เพิ่ม
              </button>
            </div>
            <p className="text-xs kh-ink3">ตัวอย่าง: จำนวนจริง, สมการ, แคลคูลัส, ลำดับ ฯลฯ</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold kh-ink2">รูปปก <span className="kh-ink3 font-normal text-xs ml-2">(แนะนำขนาด 16:9 หรือ 1280x720 px)</span></label>
            <div className="relative">
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="w-full p-4 rounded-xl flex items-center justify-center gap-3 cursor-pointer transition kh-ink2 hover:bg-[var(--card-2)]" style={{ background: "var(--card-2)", border: "2px dashed var(--line-2)" }}>
                <ImageIcon size={20} /> คลิกเพื่อเลือกรูปภาพ
              </label>
            </div>
            {imagePreview && <img src={imagePreview} className="mt-4 h-48 w-full object-cover rounded-xl" style={{ border: "1px solid var(--line)" }} alt="Preview" />}
          </div>

          <button type="submit" disabled={submitting} className="kh-btn w-full" style={{ padding: "13px", fontSize: "16px", ...(editId && !submitting ? { background: "linear-gradient(135deg,var(--warn),#9c6512)" } : {}) }}>
            {submitting ? '⏳ กำลังบันทึก...' : editId ? '✏️ บันทึกการแก้ไข' : '+ บันทึกคอร์สเรียน'}
          </button>
        </form>
        </div>
        )}
      </div>

      {/* Course List Section (Grouped) */}
      <div className="space-y-8">
        {finalSortedCategories.map((catName) => {
          const catCourses = groupedCourses[catName];
          if (!catCourses || catCourses.length === 0) return null;

          return (
            <div key={catName}>
              <h3 className="text-lg font-bold kh-ink mb-4 flex items-center gap-3">
                <span className="w-2 h-7 rounded-full" style={{ background: "var(--accent)" }}></span> {catName}
                <span className="kh-pill kh-pill-ink no-dot">{catCourses.length}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {catCourses.map((c: any) => {
                  const published = !!(c.image && c.videoId);
                  return (
                    <div key={c.id} className="kh-card kh-card-h overflow-hidden flex flex-col" style={editId === c.id ? { borderColor: "var(--warn)", boxShadow: "0 0 0 3px var(--warn-soft)" } : undefined}>
                      {/* cover */}
                      <div className="relative h-36 w-full overflow-hidden" style={{ background: "linear-gradient(135deg, var(--accent-2), var(--accent-ink))" }}>
                        {c.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={c.image} alt={c.title} className="w-full h-full object-cover absolute inset-0" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/80">
                            <BookOpen size={40} strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5">
                          <span className="kh-pill no-dot" style={{ background: "rgba(255,255,255,.92)", color: "var(--accent-ink)" }}>{extractGradeLabel(c.title)}</span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span className={`kh-pill no-dot ${published ? 'kh-pill-good' : 'kh-pill-ink'}`}>{published ? 'เผยแพร่' : 'ร่าง'}</span>
                        </div>
                      </div>

                      {/* body */}
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold kh-ink text-base leading-snug line-clamp-2">{c.title}</h3>
                        <p className="text-xs kh-ink3 mt-1">{catName}</p>

                        <div className="flex items-center gap-2 mt-3">
                          {c.fullPrice > 0 && (
                            <span className="text-sm font-bold line-through kh-ink3">฿{c.fullPrice.toLocaleString()}</span>
                          )}
                          <p className="text-base font-bold" style={{ color: "var(--accent-ink)" }}>{c.price ? `฿${c.price.toLocaleString()}` : "ฟรี"}</p>
                        </div>

                        <div className="mt-4 pt-3 flex items-center gap-1.5 flex-wrap" style={{ borderTop: "1px solid var(--line)" }}>
                          <Link
                            href={`/admin/course/${c.id}/sales-page`}
                            className="kh-btn-ghost"
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                          >
                            <Palette size={13} /> Sales
                          </Link>
                          <Link
                            href={`/admin/course/${c.id}`}
                            className="kh-btn-ghost"
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                          >
                            <BookOpen size={13} /> บทเรียน
                          </Link>
                          <div className="flex-1" />
                          <button
                            onClick={() => handleEditClick(c)}
                            className="kh-btn-ghost"
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                          >
                            <Edit2 size={13} /> แก้ไข
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="kh-btn-ghost"
                            style={{ padding: "6px 10px", fontSize: "12px", color: "var(--danger)" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {courses.length === 0 && !loading && (
          <div className="kh-card p-12 text-center kh-ink3">ยังไม่มีคอร์สเรียน เริ่มสร้างคอร์สแรกกันเลย!</div>
        )}
      </div>
      <ConfirmDialog />
    </div>

  );
}
