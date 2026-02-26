"use client";
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useUserAuth } from "@/context/AuthContext";
import { ArrowLeft } from "lucide-react";

export default function EditPaymentPage() {

  const { user, loading: authLoading } = useUserAuth();

  // State ข้อมูล
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [lineId, setLineId] = useState("");
  const [currentSlip, setCurrentSlip] = useState(""); // สลิปเดิม
  const [enrollmentId, setEnrollmentId] = useState(""); // ID เอกสารจริงใน Firestore

  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionInfo, setCompressionInfo] = useState<{ original: number; compressed: number } | null>(null);

  const router = useRouter();

  // 1. เช็ค Login และดึงข้อมูลเก่า
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }

    if (user) {
      const fetchData = async () => {
        try {
          // ดึงข้อมูลการสมัครล่าสุดของคนนี้ (สถานะ pending)
          const q = query(
            collection(db, "enrollments"),
            where("userId", "==", user.uid),
            where("status", "==", "pending")
          );
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const docData = snapshot.docs[0]; // เอาใบแรกที่เจอ
            const data = docData.data();

            setEnrollmentId(docData.id); // เก็บ ID ไว้ใช้อัปเดต
            setFullName(data.userName || "");
            setPhoneNumber(data.userTel || "");
            setLineId(data.lineId || "");
            setCurrentSlip(data.slipUrl || "");
          } else {
            alert("ไม่พบรายการที่ต้องแก้ไข");
            router.push("/my-courses");
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user, authLoading, router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const originalSize = file.size;
    setCompressionInfo(null);

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
        initialQuality: 0.8
      };

      const compressedFile = await imageCompression(file, options);
      console.log(`Slip edit: ${(originalSize / 1024).toFixed(0)}KB \u2192 ${(compressedFile.size / 1024).toFixed(0)}KB`);

      setSlipFile(compressedFile as File);
      setSlipPreview(URL.createObjectURL(compressedFile));
      setCompressionInfo({ original: originalSize, compressed: compressedFile.size });
    } catch (err) {
      console.error('Compression error, using original:', err);
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
      setCompressionInfo({ original: originalSize, compressed: originalSize });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentId) return;

    // Validation
    if (!fullName.trim().includes(" ")) return alert("กรุณากรอกทั้ง 'ชื่อ' และ 'นามสกุล' (เว้นวรรค)");
    if (!phoneNumber.trim()) return alert("กรุณากรอกเบอร์โทรศัพท์");
    if (!lineId.trim()) return alert("กรุณากรอก LINE ID");

    setIsSubmitting(true);
    try {
      let downloadURL = currentSlip;

      // ถ้ามีการเลือกรูปใหม่ ให้อัปโหลดใหม่ (file already compressed in handleFileChange)
      if (slipFile) {
        const storageRef = ref(storage, `slips/${user?.uid}_${Date.now()}_edited`);
        downloadURL = await new Promise<string>((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, slipFile);
          const timer = setTimeout(() => { task.cancel(); reject(new Error('UPLOAD_TIMEOUT')); }, 60_000);
          task.on(
            'state_changed',
            (snap) => { setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)); },
            (err) => { clearTimeout(timer); reject(err); },
            async () => {
              clearTimeout(timer);
              try { const url = await getDownloadURL(task.snapshot.ref); resolve(url); }
              catch (e) { reject(e); }
            }
          );
        });
      }

      // ✅ อัปเดตข้อมูลทับอันเดิม (UpdateDoc)
      await updateDoc(doc(db, "enrollments", enrollmentId), {
        userName: fullName,
        userTel: phoneNumber,
        lineId: lineId,
        slipUrl: downloadURL,
        lastUpdated: new Date() // เก็บเวลาแก้ไขล่าสุด
      });

      alert("✅ แก้ไขข้อมูลเรียบร้อย!");
      router.push("/my-courses");

    } catch (error) {
      console.error("Update Error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-[#F8F9FD] font-sans flex flex-col">
      <Navbar />
      <div className="flex-grow flex justify-center items-center p-6 pt-24 pb-24">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-xl border border-slate-100">
          <div className="mb-4">
            <Link href="/my-courses" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-teal-600 transition-colors group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              กลับคอร์สของฉัน
            </Link>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-800 mb-2">✏️ แก้ไขข้อมูล / ส่งสลิปใหม่</h1>
            <p className="text-slate-500 text-sm">ปรับปรุงข้อมูลให้ถูกต้องเพื่อให้เจ้าหน้าที่ตรวจสอบได้ง่ายขึ้น</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ✅ 1. ชื่อ-นามสกุล (เน้นย้ำ) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อ - นามสกุล (ภาษาไทย)</label>
              <input
                type="text"
                placeholder="เช่น ด.ช. สมชาย ใจดี (กรุณาใส่ชื่อจริง)"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition font-bold text-slate-700"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">LINE ID</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition"
                  value={lineId}
                  onChange={e => setLineId(e.target.value)}
                />
              </div>
            </div>

            {/* 2. อัปโหลดสลิปใหม่ */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">หลักฐานการโอนเงิน (ถ้าต้องการเปลี่ยน)</label>

              {/* รูปเก่า (ถ้ามี) */}
              {!slipPreview && currentSlip && (
                <div className="mb-3 p-2 border rounded-xl bg-slate-50 text-center">
                  <p className="text-xs text-slate-400 mb-2">รูปปัจจุบัน:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentSlip} alt="Current Slip" className="h-32 mx-auto object-contain rounded-lg" />
                </div>
              )}

              <div className="relative">
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="slip-upload-edit" />
                <label htmlFor="slip-upload-edit" className="w-full h-32 bg-white border-2 border-dashed border-indigo-300 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-indigo-50 transition text-indigo-500">
                  {slipPreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={slipPreview} alt="New Preview" className="h-full w-full object-contain rounded-xl" />
                  ) : (
                    <>
                      <span className="text-2xl">📸</span>
                      <span className="font-bold text-sm">กดเพื่อเปลี่ยนรูปสลิป</span>
                    </>
                  )}
                </label>
              </div>

              {/* Compression Info */}
              {compressionInfo && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-2">
                  <p className="text-xs font-bold text-emerald-700 mb-1">✅ บีบอัดรูปภาพสำเร็จ</p>
                  <div className="flex items-center justify-between text-xs text-emerald-600">
                    <span>ต้นฉบับ: <span className="font-semibold">{(compressionInfo.original / 1024).toFixed(0)} KB</span></span>
                    <span>→</span>
                    <span>หลังบีบอัด: <span className="font-semibold">{(compressionInfo.compressed / 1024).toFixed(0)} KB</span></span>
                  </div>
                  {compressionInfo.original > compressionInfo.compressed && (
                    <p className="text-xs text-emerald-500 mt-1">ประหยัด: {((1 - compressionInfo.compressed / compressionInfo.original) * 100).toFixed(0)}% — อัปโหลดเร็วขึ้น!</p>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex gap-3">
              <Link href="/my-courses" className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-xl text-center transition">
                ยกเลิก
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:bg-slate-300 relative overflow-hidden"
              >
                {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                )}
                <span className="relative">
                  {isSubmitting
                    ? `กำลังบันทึก...${uploadProgress > 0 && uploadProgress < 100 ? ` (${uploadProgress}%)` : ''}`
                    : 'บันทึกการแก้ไข'}
                </span>
              </button>
            </div>

          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}