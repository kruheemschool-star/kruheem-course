"use client"; // บรรทัดนี้สำคัญมาก! บอกให้รู้ว่าไฟล์นี้ทำงานบนหน้าเว็บ (Client)

import { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  GoogleAuthProvider 
} from "firebase/auth";
import { auth } from "../lib/firebase"; // เรียกใช้กุญแจที่เราทำไว้เมื่อกี้

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null); // เก็บข้อมูลคนล็อกอิน

  // ฟังก์ชัน 1: ล็อกอินด้วย Google
  const googleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  // ฟังก์ชัน 2: ออกจากระบบ
  const logOut = () => {
    signOut(auth);
  };

  // ฟังก์ชัน 3: คอยจับตาดูว่าล็อกอินอยู่ไหม (ทำงานตลอดเวลา)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // ถ้ามีคนล็อกอิน ก็จำค่าไว้
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, googleSignIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// ฟังก์ชันพิเศษ: ให้ไฟล์อื่นเรียกใช้ รปภ. ได้ง่ายๆ
export const useUserAuth = () => {
  return useContext(AuthContext);
};