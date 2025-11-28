"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { ADMIN_EMAILS } from "@/lib/constants";

interface UserProfile {
    displayName?: string;
    avatar?: string;
    role?: string;
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    isAdmin: boolean;
    loading: boolean;
    googleSignIn: () => Promise<void>;
    emailSignIn: (email: string, password: string) => Promise<void>;
    emailSignUp: (email: string, password: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    logOut: () => Promise<void>;
    updateProfile: (data: UserProfile) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const googleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Google Sign In Error:", error);
            throw error;
        }
    };

    const emailSignIn = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            throw error;
        }
    };

    const emailSignUp = async (email: string, password: string) => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Email Sign Up Error:", error);
            throw error;
        }
    };

    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            throw error;
        }
    };

    const logOut = async () => {
        try {
            await signOut(auth);
            setUserProfile(null);
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    const updateProfile = async (data: UserProfile) => {
        if (!user) return;
        try {
            await setDoc(doc(db, "users", user.uid), data, { merge: true });
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                if (currentUser.email) {
                    const adminEmails = ADMIN_EMAILS.map(email => email.toLowerCase());
                    setIsAdmin(adminEmails.includes(currentUser.email.toLowerCase()));
                }

                // Real-time listener for user profile
                const unsubscribeProfile = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        setUserProfile(docSnap.data() as UserProfile);
                    } else {
                        setUserProfile(null);
                    }
                    setLoading(false);
                });

                return () => unsubscribeProfile();
            } else {
                setIsAdmin(false);
                setUserProfile(null);
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, userProfile, isAdmin, loading, googleSignIn, emailSignIn, emailSignUp, resetPassword, logOut, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useUserAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useUserAuth must be used within an AuthContextProvider");
    }
    return context;
};
