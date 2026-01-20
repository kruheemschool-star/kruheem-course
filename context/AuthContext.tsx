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
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { ADMIN_EMAILS } from "@/lib/constants";

interface UserProfile {
    displayName?: string;
    avatar?: string;
    role?: string;
    lastActive?: any;
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    isAdmin: boolean;
    loading: boolean;
    daysSinceLastActive: number | null;
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
    const [daysSinceLastActive, setDaysSinceLastActive] = useState<number | null>(null);
    const [hasCheckedActivity, setHasCheckedActivity] = useState(false);

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
            setDaysSinceLastActive(null);
            setHasCheckedActivity(false);
            // Clear admin session flag from localStorage
            if (typeof window !== 'undefined') {
                localStorage.removeItem('isAdminSession');
            }
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

    // 1. Auth Listener
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                if (currentUser.email) {
                    const adminEmails = ADMIN_EMAILS.map(email => email.toLowerCase());
                    setIsAdmin(adminEmails.includes(currentUser.email.toLowerCase()));
                }
            } else {
                setIsAdmin(false);
                setUserProfile(null);
                setDaysSinceLastActive(null);
                setHasCheckedActivity(false);
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // 2. Profile Listener & Activity Logic
    useEffect(() => {
        if (!user) return;

        let isActivityChecked = false; // Local flag to ensure we only check once per connection

        // Real-time listener for user profile
        const unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                setUserProfile(data);

                // Calculate Days Since Last Active (Only once per session)
                if (!isActivityChecked) {
                    const now = new Date();
                    // Days calculation
                    if (data.lastActive?.toDate) {
                        const last = data.lastActive.toDate();
                        const diffDays = now.getTime() - last.getTime();
                        const days = Math.floor(diffDays / (1000 * 60 * 60 * 24));
                        setDaysSinceLastActive(days);
                    } else {
                        setDaysSinceLastActive(0);
                    }

                    isActivityChecked = true;
                    setHasCheckedActivity(true);

                    // Calculate time difference for 'Online' status
                    let lastActiveTime = 0;
                    if (data.lastActive?.toDate) {
                        lastActiveTime = data.lastActive.toDate().getTime();
                    }

                    const diff = now.getTime() - lastActiveTime;
                    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
                    const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes (Throttle writes)

                    const updateData: any = {};
                    let shouldUpdate = false;

                    // Logic: 
                    // 1. If inactive > 30 mins -> New Session (Update sessionStart & lastActive)
                    // 2. If inactive > 5 mins -> Heartbeat (Update lastActive only)

                    if (lastActiveTime === 0 || diff > SESSION_TIMEOUT) {
                        // New Session
                        updateData.sessionStart = serverTimestamp();
                        updateData.lastActive = serverTimestamp();
                        shouldUpdate = true;
                    } else if (diff > HEARTBEAT_INTERVAL) {
                        // Within session, just heartbeat
                        updateData.lastActive = serverTimestamp();
                        shouldUpdate = true;
                    }

                    if (shouldUpdate) {
                        setDoc(doc(db, "users", user.uid), updateData, { merge: true })
                            .catch(err => console.error("Update activity failed", err));
                    }
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribeProfile();
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, userProfile, isAdmin, loading, daysSinceLastActive, googleSignIn, emailSignIn, emailSignUp, resetPassword, logOut, updateProfile }}>
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
