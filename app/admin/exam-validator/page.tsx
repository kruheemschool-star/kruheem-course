"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle2, Loader2, Wrench } from "lucide-react";

interface Mismatch {
    examId: string;
    examTitle: string;
    questionIdx: number;
    questionText: string;
    storedAnswer: number;
    explainedAnswer: number;
}

// Extract stated correct answer from explanation text (returns 0-based index or null)
function extractAnswerFromExplanation(explanation: string): number | null {
    if (!explanation || typeof explanation !== 'string') return null;
    const clean = explanation
        .replace(/\\\[[\s\S]*?\\\]/g, '')
        .replace(/\$\$[\s\S]*?\$\$/g, '')
        .replace(/\\\([\s\S]*?\\\)/g, '')
        .replace(/\$[^$]+\$/g, '')
        .replace(/\*\*/g, '');

    const numberPatterns = [
        /คำตอบ\s*:?\s*ข้อ\s*(\d)/,
        /คำตอบคือ\s*ข้อ\s*(\d)/,
        /คำตอบที่ถูกต้อง\s*(?:คือ)?\s*:?\s*ข้อ\s*(\d)/,
        /เฉลย\s*:?\s*ข้อ\s*(\d)/,
        /ตอบ\s*ข้อ\s*(\d)/,
        /ข้อที่ถูกต้อง\s*(?:คือ)?\s*:?\s*(?:ข้อ\s*)?(\d)/,
        /ดังนั้น\s*ข้อ\s*(\d)/,
        /ตอบข้อ\s*(\d)/,
    ];
    for (const pattern of numberPatterns) {
        const match = clean.match(pattern);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= 1 && num <= 4) return num - 1;
        }
    }

    // Thai letter patterns — avoid capturing ข in ข้อ
    const thaiMap: Record<string, number> = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
    const thaiPatterns = [
        /คำตอบ\s*:?\s*ข้อ\s*([กคง])/,
        /เฉลย\s*:?\s*ข้อ\s*([กคง])/,
        /คำตอบ\s*:?\s*([กขคง])(?!้)/,
        /เฉลย\s*:?\s*([กขคง])(?!้)/,
    ];
    for (const pattern of thaiPatterns) {
        const match = clean.match(pattern);
        if (match && thaiMap[match[1]] !== undefined) {
            return thaiMap[match[1]];
        }
    }
    return null;
}

export default function ExamValidatorPage() {
    const [loading, setLoading] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [mismatches, setMismatches] = useState<Mismatch[]>([]);
    const [stats, setStats] = useState({ totalExams: 0, totalQuestions: 0, checked: 0, noExplanation: 0 });

    const scanAllExams = async () => {
        setLoading(true);
        setScanned(false);
        setMismatches([]);

        try {
            const snapshot = await getDocs(collection(db, "exams"));
            const found: Mismatch[] = [];
            let totalQuestions = 0;
            let checked = 0;
            let noExplanation = 0;

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                const questions = data.questions || [];
                if (!Array.isArray(questions)) return;

                questions.forEach((q: any, idx: number) => {
                    totalQuestions++;
                    if (!q.explanation) {
                        noExplanation++;
                        return;
                    }

                    const explAnswer = extractAnswerFromExplanation(q.explanation);
                    if (explAnswer === null) {
                        noExplanation++;
                        return;
                    }

                    checked++;
                    const storedAnswer = q.correctIndex ?? 0;
                    if (explAnswer !== storedAnswer) {
                        found.push({
                            examId: docSnap.id,
                            examTitle: data.title || docSnap.id,
                            questionIdx: idx,
                            questionText: (q.question || '').substring(0, 80),
                            storedAnswer,
                            explainedAnswer: explAnswer,
                        });
                    }
                });
            });

            setMismatches(found);
            setStats({
                totalExams: snapshot.docs.length,
                totalQuestions,
                checked,
                noExplanation,
            });
            setScanned(true);
        } catch (error) {
            console.error("Error scanning exams:", error);
            alert("เกิดข้อผิดพลาดในการสแกน");
        } finally {
            setLoading(false);
        }
    };

    const fixAllMismatches = async () => {
        if (mismatches.length === 0) return;
        const ok = confirm(`ยืนยันแก้ไขคำตอบ ${mismatches.length} ข้อ?\n\nระบบจะเปลี่ยน correctIndex ให้ตรงกับที่ระบุในเฉลย`);
        if (!ok) return;

        setFixing(true);
        try {
            // Group mismatches by examId
            const grouped: Record<string, Mismatch[]> = {};
            mismatches.forEach(m => {
                if (!grouped[m.examId]) grouped[m.examId] = [];
                grouped[m.examId].push(m);
            });

            let fixedCount = 0;
            for (const [examId, items] of Object.entries(grouped)) {
                const docRef = doc(db, "exams", examId);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) continue;

                const data = docSnap.data();
                const questions = [...(data.questions || [])];

                items.forEach(m => {
                    if (questions[m.questionIdx]) {
                        questions[m.questionIdx] = {
                            ...questions[m.questionIdx],
                            correctIndex: m.explainedAnswer,
                        };
                        fixedCount++;
                    }
                });

                await updateDoc(docRef, { questions });
            }

            alert(`✅ แก้ไขเรียบร้อย ${fixedCount} ข้อ`);
            setMismatches([]);
            // Re-scan to verify
            await scanAllExams();
        } catch (error) {
            console.error("Error fixing:", error);
            alert("เกิดข้อผิดพลาดในการแก้ไข");
        } finally {
            setFixing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin/exams" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <ShieldCheck size={28} className="text-indigo-600" />
                            ตรวจสอบคำตอบข้อสอบ
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            สแกนทุกชุดข้อสอบเพื่อตรวจหาคำตอบที่ไม่ตรงกันระหว่าง correctIndex กับเฉลยในข้อความ
                        </p>
                    </div>
                </div>

                {/* Action Button */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={scanAllExams}
                            disabled={loading}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                            {loading ? 'กำลังสแกน...' : 'สแกนข้อสอบทั้งหมด'}
                        </button>

                        {mismatches.length > 0 && (
                            <button
                                onClick={fixAllMismatches}
                                disabled={fixing}
                                className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {fixing ? <Loader2 size={20} className="animate-spin" /> : <Wrench size={20} />}
                                {fixing ? 'กำลังแก้ไข...' : `แก้ไขทั้งหมด (${mismatches.length} ข้อ)`}
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats */}
                {scanned && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
                            <div className="text-2xl font-bold text-slate-800">{stats.totalExams}</div>
                            <div className="text-sm text-slate-500">ชุดข้อสอบ</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
                            <div className="text-2xl font-bold text-slate-800">{stats.totalQuestions}</div>
                            <div className="text-sm text-slate-500">ข้อทั้งหมด</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
                            <div className="text-2xl font-bold text-emerald-600">{stats.checked}</div>
                            <div className="text-sm text-slate-500">ตรวจสอบได้</div>
                        </div>
                        <div className={`bg-white rounded-xl p-4 border shadow-sm text-center ${mismatches.length > 0 ? 'border-rose-200 bg-rose-50' : 'border-slate-100'}`}>
                            <div className={`text-2xl font-bold ${mismatches.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {mismatches.length}
                            </div>
                            <div className="text-sm text-slate-500">คำตอบไม่ตรง</div>
                        </div>
                    </div>
                )}

                {/* Results */}
                {scanned && mismatches.length === 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
                        <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                        <h3 className="text-lg font-bold text-emerald-700">ผ่านการตรวจสอบทั้งหมด!</h3>
                        <p className="text-emerald-600 text-sm mt-1">ไม่พบคำตอบที่ไม่ตรงกันในข้อสอบใดเลย</p>
                    </div>
                )}

                {mismatches.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex items-center gap-2">
                            <AlertTriangle size={20} className="text-rose-600" />
                            <h3 className="font-bold text-rose-800">พบคำตอบไม่ตรงกัน {mismatches.length} ข้อ</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-left">
                                        <th className="px-4 py-3 font-medium">ชุดข้อสอบ</th>
                                        <th className="px-4 py-3 font-medium">ข้อที่</th>
                                        <th className="px-4 py-3 font-medium">โจทย์</th>
                                        <th className="px-4 py-3 font-medium text-center">ระบบ</th>
                                        <th className="px-4 py-3 font-medium text-center">เฉลย</th>
                                        <th className="px-4 py-3 font-medium text-center">แก้ไข</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mismatches.map((m, i) => (
                                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-700">
                                                <Link href={`/admin/exams/${m.examId}`} className="text-indigo-600 hover:underline">
                                                    {m.examTitle}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{m.questionIdx + 1}</td>
                                            <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{m.questionText}...</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded font-bold">ข้อ {m.storedAnswer + 1}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-bold">ข้อ {m.explainedAnswer + 1}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-amber-600 font-bold">→ ข้อ {m.explainedAnswer + 1}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
