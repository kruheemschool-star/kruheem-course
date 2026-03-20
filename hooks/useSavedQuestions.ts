"use client";

import { useState, useEffect, useCallback } from "react";
import { useUserAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc, onSnapshot, collection, serverTimestamp } from "firebase/firestore";

export interface SavedQuestion {
    id: string; // doc ID: {examId}_q{questionIndex}
    examId: string;
    examTitle: string;
    questionIndex: number;
    questionText: string;
    questionData: any;
    savedAt: any;
    category?: string;
    level?: string;
    tags?: string[];
}

/**
 * Hook สำหรับจัดการบันทึกข้อสอบแต่ละข้อ
 * เก็บใน Firestore: users/{uid}/savedQuestions/{examId}_q{questionIndex}
 */
export function useSavedQuestions() {
    const { user } = useUserAuth();
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
    const [loading, setLoading] = useState(true);

    // Listen to savedQuestions collection in real-time
    useEffect(() => {
        if (!user) {
            setSavedIds(new Set());
            setSavedQuestions([]);
            setLoading(false);
            return;
        }

        const colRef = collection(db, "users", user.uid, "savedQuestions");
        const unsub = onSnapshot(colRef, (snapshot) => {
            const ids = new Set<string>();
            const questions: SavedQuestion[] = [];
            snapshot.docs.forEach(d => {
                ids.add(d.id);
                questions.push({ id: d.id, ...d.data() } as SavedQuestion);
            });
            // Sort by savedAt desc
            questions.sort((a, b) => {
                const tA = a.savedAt?.seconds || 0;
                const tB = b.savedAt?.seconds || 0;
                return tB - tA;
            });
            setSavedIds(ids);
            setSavedQuestions(questions);
            setLoading(false);
        }, (error) => {
            console.error("Error listening to savedQuestions:", error);
            setLoading(false);
        });

        return () => unsub();
    }, [user]);

    const getQuestionId = (examId: string, questionIndex: number) => `${examId}_q${questionIndex}`;

    const isSaved = useCallback((examId: string, questionIndex: number) => {
        return savedIds.has(getQuestionId(examId, questionIndex));
    }, [savedIds]);

    const saveQuestion = useCallback(async (
        examId: string,
        examTitle: string,
        questionIndex: number,
        questionData: any,
        category?: string,
        level?: string,
    ) => {
        if (!user) return;

        const questionId = getQuestionId(examId, questionIndex);
        const docRef = doc(db, "users", user.uid, "savedQuestions", questionId);

        // Optimistic update
        setSavedIds(prev => new Set(prev).add(questionId));

        try {
            // Truncate questionText for preview
            const questionText = (questionData.question || "").substring(0, 200);

            await setDoc(docRef, {
                examId,
                examTitle,
                questionIndex,
                questionText,
                questionData,
                category: category || "",
                level: level || "",
                tags: questionData.tags || [],
                savedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error saving question:", error);
            // Revert on error
            setSavedIds(prev => {
                const next = new Set(prev);
                next.delete(questionId);
                return next;
            });
        }
    }, [user]);

    const unsaveQuestion = useCallback(async (examId: string, questionIndex: number) => {
        if (!user) return;

        const questionId = getQuestionId(examId, questionIndex);
        const docRef = doc(db, "users", user.uid, "savedQuestions", questionId);

        // Optimistic update
        setSavedIds(prev => {
            const next = new Set(prev);
            next.delete(questionId);
            return next;
        });

        try {
            await deleteDoc(docRef);
        } catch (error) {
            console.error("Error removing saved question:", error);
            // Revert on error
            setSavedIds(prev => new Set(prev).add(questionId));
        }
    }, [user]);

    const toggleSaveQuestion = useCallback(async (
        examId: string,
        examTitle: string,
        questionIndex: number,
        questionData: any,
        category?: string,
        level?: string,
    ) => {
        if (isSaved(examId, questionIndex)) {
            await unsaveQuestion(examId, questionIndex);
        } else {
            await saveQuestion(examId, examTitle, questionIndex, questionData, category, level);
        }
    }, [isSaved, saveQuestion, unsaveQuestion]);

    return {
        savedIds,
        savedQuestions,
        isSaved,
        saveQuestion,
        unsaveQuestion,
        toggleSaveQuestion,
        loading,
        isLoggedIn: !!user,
    };
}
