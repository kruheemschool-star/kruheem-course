"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, Lock } from 'lucide-react';
import MathRenderer from './MathRenderer';
import { sanitizeExamData, isFillQuestion } from '@/lib/exam-utils';
import { ExamQuestion } from '@/types/exam';

// ─────────────────────────────────────────────────────────────────────────────
// ExamPrintView — หน้า "พิมพ์ / บันทึกเป็น PDF" ของชุดข้อสอบ (จัดหน้าแบบข้อสอบกระดาษ)
//
// หัวใจของการแก้ปัญหา "ข้อโดนตัดกลางหน้า":
//   • .pq { break-inside: avoid }  →  1 ข้อ = 1 ก้อน ห้ามเบราว์เซอร์หั่นกลางข้อ
//     ข้อที่ไม่พอที่ท้ายหน้า จะถูกยกไปขึ้นหน้าใหม่ทั้งข้อ
//   • จำกัดความสูงรูป (SVG/รูปภาพ) ให้แต่ละก้อนไม่สูงเกิน 1 หน้า A4
//   • typography กระชับสำหรับกระดาษ + ตัวเลือกสั้นจัด 2 คอลัมน์ → ก้อนเล็กลง
//     ช่องว่างท้ายหน้าก็เล็กลงตาม
//   • ตอนพิมพ์ ซ่อนทุกอย่างที่ไม่ใช่ตัวข้อสอบ (แถบปุ่ม, chat bubble, toast ฯลฯ)
//     ด้วยเทคนิค visibility — เหลือเฉพาะ #print-root
//   • เฉลยแยกไปหน้าสุดท้าย (break-before: page) เปิด/ปิดได้ก่อนพิมพ์
// ─────────────────────────────────────────────────────────────────────────────

interface ExamPrintViewProps {
    examId: string;
    examTitle: string;
    category?: string;
    level?: string;
    questions: any[];
    isTrial?: boolean; // ฉีดโดย ExamAccessGuard — ทดลองฟรีห้ามพิมพ์ทั้งชุด
}

// ตัวเลือกสั้นทุกอัน → จัด 2 คอลัมน์ประหยัดพื้นที่ (ยาว/มี LaTeX ซับซ้อน → คอลัมน์เดียว)
const optionsFitTwoCols = (opts: unknown[]): boolean =>
    Array.isArray(opts) && opts.length > 0 && opts.every((o) => {
        if (typeof o !== 'string') return false;
        const plain = o.replace(/\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, 'xxxx');
        return plain.length <= 24 && !plain.includes('\n');
    });

export const ExamPrintView: React.FC<ExamPrintViewProps> = ({ examId, examTitle, category, level, questions, isTrial = false }) => {
    const [showAnswers, setShowAnswers] = useState(true);
    const sanitized = useMemo(() => sanitizeExamData(questions as ExamQuestion[]), [questions]);
    const total = sanitized.length;
    const suggestedMinutes = Math.max(1, Math.ceil((total * 180) / 60)); // 3 นาที/ข้อ ตามมาตรฐานตัวรันข้อสอบ

    // 🔒 ทดลองฟรี: ไม่ให้พิมพ์ทั้งชุด (ไฟล์ PDF = เนื้อหาเต็มหลุดออกนอกระบบ)
    if (isTrial) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
                <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-6"><Lock size={36} /></div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 mb-3">การพิมพ์ชุดข้อสอบสำหรับสมาชิกคลังข้อสอบ</h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 font-medium">สมัครสมาชิกคลังข้อสอบเพื่อดาวน์โหลด/พิมพ์ชุดข้อสอบเป็น PDF ได้ทุกชุด พร้อมเฉลยละเอียดครับ</p>
                <div className="flex flex-wrap gap-3 justify-center">
                    <a href="/payment?course=vip" className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-black shadow-lg hover:scale-105 transition">สมัครคลังข้อสอบ</a>
                    <Link href={`/exam/${examId}`} className="px-8 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition">← กลับไปทำข้อสอบ</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="khprint-screen">
            {/* ── แถบควบคุม (ซ่อนตอนพิมพ์) ── */}
            <div className="khprint-controls no-print">
                <div className="khprint-controls-inner">
                    <Link href={`/exam/${examId}`} className="khp-back"><ArrowLeft size={16} /> กลับไปทำข้อสอบ</Link>
                    <label className="khp-toggle">
                        <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} />
                        แนบเฉลยไว้หน้าสุดท้าย
                    </label>
                    <button onClick={() => window.print()} className="khp-print-btn">
                        <Printer size={18} /> พิมพ์ / บันทึกเป็น PDF
                    </button>
                </div>
                <p className="khp-hint">กดปุ่มแล้วเลือกเครื่องพิมพ์ หรือเลือก “บันทึกเป็น PDF” (Save as PDF) ในหน้าต่างพิมพ์ · ระบบจัดหน้าไม่ให้ข้อโดนตัดกลางหน้าให้อัตโนมัติ</p>
            </div>

            {/* ── ตัวกระดาษข้อสอบ ── */}
            <div id="print-root">
                <div className="khp-sheet">
                    {/* หัวกระดาษ */}
                    <header className="khp-head">
                        <div className="khp-brand">คลังข้อสอบครูฮีม · kruheemmath.com</div>
                        <h1 className="khp-title">{examTitle}</h1>
                        <div className="khp-meta">
                            จำนวน {total} ข้อ{level ? ` · ระดับ ${level}` : ''}{category ? ` · ${category}` : ''} · เวลาแนะนำ {suggestedMinutes} นาที
                        </div>
                        <div className="khp-fields">
                            <span>ชื่อ-นามสกุล ................................................................</span>
                            <span>ชั้น ..................</span>
                            <span>เลขที่ ..................</span>
                        </div>
                        <div className="khp-rule" />
                    </header>

                    {/* รายการข้อ — .pq = ก้อนที่ห้ามตัดกลาง */}
                    <main>
                        {sanitized.map((q, idx) => {
                            const fill = isFillQuestion(q);
                            const twoCol = !fill && optionsFitTwoCols(q.options as unknown[]);
                            return (
                                <article key={q.id ?? idx} className="pq">
                                    <div className="pq-q">
                                        <span className="pq-no">{idx + 1}.</span>
                                        <div className="pq-text"><MathRenderer text={typeof q.question === 'string' ? q.question : ''} /></div>
                                    </div>
                                    {q.svg && typeof q.svg === 'string' && q.svg.trim().startsWith('<svg') && (
                                        <div className="pq-fig" dangerouslySetInnerHTML={{ __html: q.svg }} />
                                    )}
                                    {(q as any).image && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <div className="pq-fig"><img src={(q as any).image} alt="" /></div>
                                    )}
                                    {fill ? (
                                        <div className="pq-fill">ตอบ ..............................................................</div>
                                    ) : (
                                        <ol className={`pq-options${twoCol ? ' two-col' : ''}`}>
                                            {(q.options as string[]).map((opt, oi) => (
                                                <li key={oi}>
                                                    <span className="pq-opt-no">{oi + 1})</span>
                                                    <div className="pq-opt-text"><MathRenderer text={typeof opt === 'string' ? opt.replace(/^\s*(?:[1-4][\.\)]\s*|[กขคง][\.\)\s]\s*)/, '') : String(opt ?? '')} /></div>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </article>
                            );
                        })}
                    </main>

                    {/* เฉลย — ขึ้นหน้าใหม่เสมอ ฉีกเก็บแยกได้ */}
                    {showAnswers && (
                        <section className="khp-answers">
                            <h2>เฉลย — {examTitle}</h2>
                            <div className="khp-answer-grid">
                                {sanitized.map((q, idx) => (
                                    <span key={q.id ?? idx} className="khp-ans">
                                        <b>{idx + 1}.</b> {isFillQuestion(q)
                                            ? String(((q as any).answers?.[0] ?? '')).slice(0, 12)
                                            : (q.correctIndex ?? 0) + 1}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            <style jsx global>{`
                /* ── จอ: พรีวิวเป็นแผ่นกระดาษ ── */
                .khprint-screen { min-height: 100vh; background: #eef1f4; padding-bottom: 60px; }
                :global(.dark) .khprint-screen { background: #0f172a; }
                .khprint-controls { position: sticky; top: 0; z-index: 40; background: rgba(255,255,255,.92); backdrop-filter: blur(8px); border-bottom: 1px solid #e2e8f0; padding: 10px 16px 8px; }
                :global(.dark) .khprint-controls { background: rgba(15,23,42,.92); border-color: #334155; }
                .khprint-controls-inner { max-width: 860px; margin: 0 auto; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
                .khp-back { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; color: #475569; }
                :global(.dark) .khp-back { color: #cbd5e1; }
                .khp-toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #475569; cursor: pointer; margin-left: auto; }
                :global(.dark) .khp-toggle { color: #cbd5e1; }
                .khp-toggle input { width: 16px; height: 16px; accent-color: #059669; }
                .khp-print-btn { display: inline-flex; align-items: center; gap: 8px; background: #059669; color: #fff; font-weight: 800; font-size: 15px; padding: 10px 22px; border-radius: 999px; box-shadow: 0 8px 20px -8px rgba(5,150,105,.5); transition: transform .15s; }
                .khp-print-btn:hover { transform: translateY(-1px); }
                .khp-hint { max-width: 860px; margin: 6px auto 0; font-size: 12px; color: #94a3b8; }
                .khp-sheet { max-width: 860px; margin: 24px auto 0; background: #fff; color: #111; box-shadow: 0 24px 60px -30px rgba(15,23,42,.35); border-radius: 6px; padding: 48px 56px; }

                /* ── โครงข้อสอบ ── */
                .khp-head { text-align: center; break-inside: avoid; page-break-inside: avoid; }
                .khp-brand { font-size: 11px; letter-spacing: 1px; color: #999; }
                .khp-title { font-size: 22px; font-weight: 800; margin: 6px 0 2px; color: #111; }
                .khp-meta { font-size: 13px; color: #555; }
                .khp-fields { display: flex; justify-content: center; gap: 18px; flex-wrap: wrap; font-size: 13px; color: #333; margin-top: 14px; }
                .khp-rule { border-bottom: 2px solid #111; margin-top: 14px; }

                /* 🔑 หัวใจ: 1 ข้อ = 1 ก้อน ห้ามตัดกลางหน้า */
                .pq { break-inside: avoid; page-break-inside: avoid; padding: 13px 0 3px; border-bottom: 1px dashed #e5e5e5; }
                .pq:last-of-type { border-bottom: none; }
                .pq-q { display: flex; gap: 8px; align-items: baseline; font-size: 15px; line-height: 1.65; color: #111; }
                .pq-no { font-weight: 800; flex-shrink: 0; min-width: 26px; }
                .pq-text { flex: 1; min-width: 0; }
                .pq-fig { margin: 8px 0 4px 34px; }
                .pq-fig svg { max-width: 340px; max-height: 200px; width: auto; height: auto; display: block; }
                .pq-fig img { max-width: 340px; max-height: 220px; display: block; }
                .pq-options { margin: 6px 0 8px 34px; padding: 0; list-style: none; }
                .pq-options li { display: flex; gap: 6px; align-items: baseline; font-size: 14.5px; line-height: 1.6; padding: 2.5px 0; break-inside: avoid; color: #222; }
                .pq-options.two-col { display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; }
                .pq-opt-no { font-weight: 700; flex-shrink: 0; }
                .pq-opt-text { flex: 1; min-width: 0; }
                .pq-fill { margin: 10px 0 8px 34px; font-size: 14.5px; color: #333; }

                /* ── เฉลยหน้าสุดท้าย ── */
                .khp-answers { break-before: page; page-break-before: always; padding-top: 8px; }
                .khp-answers h2 { font-size: 18px; font-weight: 800; text-align: center; margin-bottom: 14px; color: #111; border-bottom: 2px solid #111; padding-bottom: 10px; }
                .khp-answer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(86px, 1fr)); gap: 6px 10px; font-size: 13.5px; color: #111; }
                .khp-ans b { margin-right: 4px; }

                /* ── โหมดพิมพ์จริง ── */
                @page { size: A4; margin: 13mm 14mm; }
                @media print {
                    /* เหลือเฉพาะตัวข้อสอบ — ซ่อน chrome/ปุ่ม/แชท/ทุกอย่างอื่น */
                    body * { visibility: hidden !important; }
                    #print-root, #print-root * { visibility: visible !important; }
                    #print-root { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    .khprint-screen { background: #fff !important; padding: 0 !important; min-height: 0; }
                    .khp-sheet { max-width: none; margin: 0; box-shadow: none; border-radius: 0; padding: 0; }
                    .pq { border-bottom-color: #eee; }
                    a { text-decoration: none; color: inherit; }
                }
            `}</style>
        </div>
    );
};

export default ExamPrintView;
