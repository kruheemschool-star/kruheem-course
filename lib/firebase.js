import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// กุญแจบ้านของครูฮีม (ของจริง)
const firebaseConfig = {
  apiKey: "AIzaSyD4JfVbIpBvh-TIwJgkG31ArNem99DV3FE",
  authDomain: "kruheem-course-45088.firebaseapp.com",
  projectId: "kruheem-course-45088",
  storageBucket: "kruheem-course-45088.firebasestorage.app",
  messagingSenderId: "660185150968",
  appId: "1:660185150968:web:328126dbd72a32d4f5120d"
};

// ตรวจสอบว่ามีการเชื่อมต่ออยู่แล้วหรือยัง? (ป้องกัน Error เวลาแก้โค้ดแล้วหน้าเว็บรีเฟรช)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ส่งออกระบบ Login (auth) และฐานข้อมูล (db) ให้ไฟล์อื่นเรียกใช้ได้
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };