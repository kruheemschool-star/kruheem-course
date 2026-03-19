"use client";

import { useState, useEffect, useCallback } from "react";
import { useUserAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc, onSnapshot, collection, serverTimestamp } from "firebase/firestore";

/**
 * Hook สำหรับจัดการ Bookmark/Favorite ข้อสอบ
 * เก็บใน Firestore: users/{uid}/bookmarks/{examId}
 */
export function useBookmarks() {
    const { user } = useUserAuth();
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Listen to bookmarks collection in real-time
    useEffect(() => {
        if (!user) {
            setBookmarkedIds(new Set());
            setLoading(false);
            return;
        }

        const colRef = collection(db, "users", user.uid, "bookmarks");
        const unsub = onSnapshot(colRef, (snapshot) => {
            const ids = new Set<string>();
            snapshot.docs.forEach(doc => ids.add(doc.id));
            setBookmarkedIds(ids);
            setLoading(false);
        }, (error) => {
            console.error("Error listening to bookmarks:", error);
            setLoading(false);
        });

        return () => unsub();
    }, [user]);

    const toggleBookmark = useCallback(async (examId: string) => {
        if (!user) return;

        const docRef = doc(db, "users", user.uid, "bookmarks", examId);

        if (bookmarkedIds.has(examId)) {
            // Remove bookmark (optimistic update)
            setBookmarkedIds(prev => {
                const next = new Set(prev);
                next.delete(examId);
                return next;
            });
            try {
                await deleteDoc(docRef);
            } catch (error) {
                console.error("Error removing bookmark:", error);
                // Revert on error
                setBookmarkedIds(prev => new Set(prev).add(examId));
            }
        } else {
            // Add bookmark (optimistic update)
            setBookmarkedIds(prev => new Set(prev).add(examId));
            try {
                await setDoc(docRef, { createdAt: serverTimestamp() });
            } catch (error) {
                console.error("Error adding bookmark:", error);
                // Revert on error
                setBookmarkedIds(prev => {
                    const next = new Set(prev);
                    next.delete(examId);
                    return next;
                });
            }
        }
    }, [user, bookmarkedIds]);

    const isBookmarked = useCallback((examId: string) => {
        return bookmarkedIds.has(examId);
    }, [bookmarkedIds]);

    return {
        bookmarkedIds,
        isBookmarked,
        toggleBookmark,
        loading,
        isLoggedIn: !!user,
    };
}
