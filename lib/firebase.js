// ไฟล์: lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // ✅ 1. ต้อง import ตัวนี้เข้ามา

const firebaseConfig = {
  apiKey: "AIzaSyD4JfVbIpBvh-TIwJgkG31ArNem99DV3FE",
  authDomain: "kruheem-course-45088.firebaseapp.com",
  projectId: "kruheem-course-45088",
  storageBucket: "kruheem-course-45088.firebasestorage.app",
  messagingSenderId: "660185150968",
  appId: "1:660185150968:web:328126dbd72a32d4f5120d"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // ✅ 2. ต้องส่งออกตัวนี้ออกไปใช้