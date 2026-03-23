"use client";

import { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback, ReactNode } from "react";
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
import { doc, onSnapshot, setDoc, serverTimestamp, collection, query, where, getDocs, getCountFromServer } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { ADMIN_EMAILS } from "@/lib/constants";

interface UserProfile {
    displayName?: string;
    avatar?: string;
    role?: string;
    lastActive?: any;
    caption?: string;
    authProvider?: 'google' | 'email';
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    setUserProfile: (profile: UserProfile | null) => void; // Added setter
    isAdmin: boolean;
    loading: boolean;
    daysSinceLastActive: number | null;
    googleSignIn: () => Promise<void>;
    emailSignIn: (email: string, password: string) => Promise<void>;
    emailSignUp: (email: string, password: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    logOut: () => Promise<void>;
    updateProfile: (data: UserProfile) => Promise<void>;
    pendingCount: number; // ✅
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [daysSinceLastActive, setDaysSinceLastActive] = useState<number | null>(null);
    const [pendingCount, setPendingCount] = useState(0); // ✅
    const [hasCheckedActivity, setHasCheckedActivity] = useState(false);
    const lastProfileStr = useRef<string>("");

    const googleSignIn = useCallback(async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            const result = await signInWithPopup(auth, provider);
            if (result.user) {
                await setDoc(doc(db, "users", result.user.uid), {
                    authProvider: 'google',
                    email: result.user.email || '',
                    displayName: result.user.displayName || '',
                }, { merge: true });
            }
        } catch (error) {
            console.error("Google Sign In Error:", error);
            throw error;
        }
    }, []);

    const emailSignIn = useCallback(async (email: string, password: string) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            if (result.user) {
                await setDoc(doc(db, "users", result.user.uid), {
                    authProvider: 'email',
                    email: result.user.email || '',
                }, { merge: true });
            }
        } catch (error) {
            throw error;
        }
    }, []);

    const emailSignUp = useCallback(async (email: string, password: string) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            if (result.user) {
                await setDoc(doc(db, "users", result.user.uid), {
                    authProvider: 'email',
                    email: result.user.email || '',
                }, { merge: true });
            }
        } catch (error) {
            console.error("Email Sign Up Error:", error);
            throw error;
        }
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            throw error;
        }
    }, []);

    const logOut = useCallback(async () => {
        try {
            await signOut(auth);
            setUserProfile(null);
            setDaysSinceLastActive(null);
            setHasCheckedActivity(false);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('isAdminSession');
            }
        } catch (error) {
            console.error("Logout Error:", error);
        }
    }, []);

    const updateProfile = useCallback(async (data: UserProfile) => {
        if (!user) return;
        try {
            await setDoc(doc(db, "users", user.uid), data, { merge: true });
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    }, [user]);

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
        let heartbeatInterval: NodeJS.Timeout;

        // Real-time listener for user profile
        const unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;

                // Optimization: Deep compare to prevent redundant updates
                const dataStr = JSON.stringify(data);
                if (lastProfileStr.current === dataStr) return;
                lastProfileStr.current = dataStr;

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
                    const HEARTBEAT_CHECK_THRESHOLD = 5 * 60 * 1000; // 5 minutes

                    const updateData: any = {
                        lastActive: serverTimestamp(),
                        email: user.email || '',
                    };

                    // If inactive > 30 mins -> Start New Session (also set sessionStart)
                    if (lastActiveTime === 0 || diff > SESSION_TIMEOUT) {
                        updateData.sessionStart = serverTimestamp();
                        updateData.displayName = user.displayName || '';
                    }

                    // Always update on initial load so user appears online immediately
                    setDoc(doc(db, "users", user.uid), updateData, { merge: true })
                        .catch(err => console.error("Update activity failed", err));

                    // Start Continuous Heartbeat
                    // This sets lastActive periodically while user has the app open
                    heartbeatInterval = setInterval(() => {
                        setDoc(doc(db, "users", user.uid), {
                            lastActive: serverTimestamp(),
                            email: user.email || '',
                        }, { merge: true }).catch(err => console.error("Interval heartbeat failed", err));
                    }, 3 * 60 * 1000); // 3 minutes heartbeat
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => {
            unsubscribeProfile();
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [user?.uid]);

    // 3. Admin Pending Count (polling every 5 min instead of real-time listener)
    useEffect(() => {
        if (!isAdmin) {
            setPendingCount(0);
            return;
        }

        let interval: NodeJS.Timeout;
        const fetchPendingCount = async () => {
            try {
                const q = query(collection(db, "enrollments"), where("status", "==", "pending"));
                const snapshot = await getCountFromServer(q);
                setPendingCount(snapshot.data().count);
            } catch (error) {
                console.error("Error fetching pending count:", error);
            }
        };

        fetchPendingCount();
        interval = setInterval(fetchPendingCount, 5 * 60 * 1000); // Poll every 5 min

        return () => clearInterval(interval);
    }, [isAdmin]);

    const contextValue = useMemo(() => ({
        user,
        userProfile,
        setUserProfile,
        isAdmin,
        loading,
        daysSinceLastActive,
        pendingCount, // ✅ Exposed
        googleSignIn,
        emailSignIn,
        emailSignUp,
        resetPassword,
        logOut,
        updateProfile
    }), [user, userProfile, isAdmin, loading, daysSinceLastActive, pendingCount]);

    return (
        <AuthContext.Provider value={contextValue}>
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
