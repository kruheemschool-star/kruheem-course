// ไฟล์: lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ⚠️ จุดสำคัญ: ตรงนี้คือที่ใส่กุญแจของครู (เดี๋ยวเราค่อยมาแก้ทีหลัง)
const firebaseConfig = {
  apiKey: "AIzaSy...", 
  authDomain: "kruheem-course.firebaseapp.com",
  projectId: "kruheem-course",
  storageBucket: "kruheem-course.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

// เช็คว่ามีการเชื่อมต่อหรือยัง? ถ้ายังให้เชื่อมต่อใหม่ (ป้องกัน Error เชื่อมซ้ำซ้อน)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ส่งออกระบบล็อกอิน (auth) และฐานข้อมูล (db) ไปใช้ที่อื่น
export const auth = getAuth(app);
export const db = getFirestore(app);