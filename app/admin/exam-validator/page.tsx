"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, CheckCircle2, Loader2, Wrench } from "lucide-react";

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
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="kh-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="kh-eyebrow">
                            <ShieldCheck size={14} />
                            ตรวจสอบคำตอบข้อสอบ
                        </div>
                        <p className="kh-ink3 text-sm mt-1.5">
                            สแกนทุกชุดข้อสอบเพื่อตรวจหาคำตอบที่ไม่ตรงกันระหว่าง correctIndex กับเฉลยในข้อความ
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={scanAllExams}
                            disabled={loading}
                            className="kh-btn"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                            {loading ? 'กำลังสแกน...' : 'สแกนข้อสอบทั้งหมด'}
                        </button>

                        {mismatches.length > 0 && (
                            <button
                                onClick={fixAllMismatches}
                                disabled={fixing}
                                className="kh-btn-ghost"
                                style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}
                            >
                                {fixing ? <Loader2 size={18} className="animate-spin" /> : <Wrench size={18} />}
                                {fixing ? 'กำลังแก้ไข...' : `แก้ไขทั้งหมด (${mismatches.length} ข้อ)`}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            {scanned && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="kh-card p-4 text-center">
                        <div className="kh-ink kh-num text-2xl font-bold">{stats.totalExams}</div>
                        <div className="kh-ink3 text-sm mt-0.5">ชุดข้อสอบ</div>
                    </div>
                    <div className="kh-card p-4 text-center">
                        <div className="kh-ink kh-num text-2xl font-bold">{stats.totalQuestions}</div>
                        <div className="kh-ink3 text-sm mt-0.5">ข้อทั้งหมด</div>
                    </div>
                    <div className="kh-card p-4 text-center">
                        <div className="kh-num text-2xl font-bold" style={{ color: 'var(--good)' }}>{stats.checked}</div>
                        <div className="kh-ink3 text-sm mt-0.5">ตรวจสอบได้</div>
                    </div>
                    <div
                        className="kh-card p-4 text-center"
                        style={mismatches.length > 0 ? { borderColor: 'var(--danger)', background: 'var(--danger-soft)' } : undefined}
                    >
                        <div className="kh-num text-2xl font-bold" style={{ color: mismatches.length > 0 ? 'var(--danger)' : 'var(--good)' }}>
                            {mismatches.length}
                        </div>
                        <div className="kh-ink3 text-sm mt-0.5">คำตอบไม่ตรง</div>
                    </div>
                </div>
            )}

            {/* Results */}
            {scanned && mismatches.length === 0 && (
                <div className="kh-card p-8 text-center" style={{ borderColor: 'var(--good)', background: 'var(--good-soft)' }}>
                    <CheckCircle2 size={48} className="mx-auto mb-3" style={{ color: 'var(--good)' }} />
                    <h3 className="text-lg font-bold" style={{ color: 'var(--good)' }}>ผ่านการตรวจสอบทั้งหมด!</h3>
                    <p className="kh-ink2 text-sm mt-1">ไม่พบคำตอบที่ไม่ตรงกันในข้อสอบใดเลย</p>
                </div>
            )}

            {mismatches.length > 0 && (
                <div className="kh-card overflow-hidden">
                    <div
                        className="px-6 py-4 flex items-center gap-2"
                        style={{ background: 'var(--danger-soft)', borderBottom: '1px solid var(--line)' }}
                    >
                        <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
                        <h3 className="font-bold" style={{ color: 'var(--danger)' }}>พบคำตอบไม่ตรงกัน {mismatches.length} ข้อ</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="kh-table">
                            <thead>
                                <tr>
                                    <th>ชุดข้อสอบ</th>
                                    <th>ข้อที่</th>
                                    <th>โจทย์</th>
                                    <th className="text-center">ระบบ</th>
                                    <th className="text-center">เฉลย</th>
                                    <th className="text-center">แก้ไข</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mismatches.map((m, i) => (
                                    <tr key={i}>
                                        <td className="font-medium">
                                            <Link href={`/admin/exams/${m.examId}`} className="hover:underline" style={{ color: 'var(--accent-ink)' }}>
                                                {m.examTitle}
                                            </Link>
                                        </td>
                                        <td className="kh-num">{m.questionIdx + 1}</td>
                                        <td className="kh-ink3 max-w-xs truncate">{m.questionText}...</td>
                                        <td className="text-center">
                                            <span className="kh-pill kh-pill-danger no-dot">ข้อ {m.storedAnswer + 1}</span>
                                        </td>
                                        <td className="text-center">
                                            <span className="kh-pill kh-pill-good no-dot">ข้อ {m.explainedAnswer + 1}</span>
                                        </td>
                                        <td className="text-center">
                                            <span className="font-bold" style={{ color: 'var(--warn)' }}>→ ข้อ {m.explainedAnswer + 1}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
