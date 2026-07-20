"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, Lock, Loader2 } from 'lucide-react';
import MathRenderer from './MathRenderer';
import { sanitizeExamData, isFillQuestion } from '@/lib/exam-utils';
import { ExamQuestion } from '@/types/exam';

// ─────────────────────────────────────────────────────────────────────────────
// ExamPrintView v2 — จัดหน้าเป็น "แผ่น A4 จริง" ก่อนพิมพ์ (measured pagination)
//
// v1 พึ่ง break-inside: avoid ให้เบราว์เซอร์หั่นหน้าตอนกดพิมพ์ → ผลไม่นิ่ง
// (ระยะขอบ/จุดขึ้นหน้าใหม่เพี้ยนตามเครื่อง) v2 กลับด้านตามไอเดียครูฮีม:
//   1. เรนเดอร์ทุกข้อในกล่องวัดขนาดที่ซ่อนไว้ (กว้างเท่าพื้นที่ A4 จริง)
//   2. รอฟอนต์/สูตรคณิต/รูปโหลดเสร็จ แล้ววัดความสูงจริงของแต่ละข้อ
//   3. บรรจุลง "แผ่น" ทีละข้อ — ข้อไหนไม่พอที่เหลือ → ยกไปแผ่นถัดไปทั้งข้อ
//   4. เรนเดอร์เป็น <section class="page"> ขนาด 210×297mm เป๊ะ ทีละแผ่น
//      + break-after: page และ @page { size: A4; margin: 0 }
// สิ่งที่เห็นบนจอ = สิ่งที่ออกกระดาษ ทุกเครื่อง ทุกเบราว์เซอร์ (WYSIWYG)
// แถม: เลขหน้ามุมล่างขวาของทุกแผ่น
// ─────────────────────────────────────────────────────────────────────────────

interface ExamPrintViewProps {
    examId: string;
    examTitle: string;
    category?: string;
    level?: string;
    questions: any[];
    isTrial?: boolean; // ฉีดโดย ExamAccessGuard — ทดลองฟรีห้ามพิมพ์ทั้งชุด
}

// ตัวเลือกสั้นทุกอัน → จัด 2 คอลัมน์ประหยัดพื้นที่
const optionsFitTwoCols = (opts: unknown[]): boolean =>
    Array.isArray(opts) && opts.length > 0 && opts.every((o) => {
        if (typeof o !== 'string') return false;
        const plain = o.replace(/\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, 'xxxx');
        return plain.length <= 24 && !plain.includes('\n');
    });

// ── ก้อนเนื้อหาที่ใช้ร่วมกันระหว่าง "กล่องวัดขนาด" และ "แผ่นจริง" ──────────
// ต้องเป็น markup เดียวกันเป๊ะ ไม่งั้นความสูงที่วัดจะไม่ตรงกับของจริง
const QuestionBlock: React.FC<{ q: ExamQuestion; idx: number }> = ({ q, idx }) => {
    const fill = isFillQuestion(q);
    const twoCol = !fill && optionsFitTwoCols(q.options as unknown[]);
    return (
        <article className="pq">
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
};

// ป้ายระดับ/หมวด: บางชุด level = category (เช่น "ม.1" ทั้งคู่) — ไม่แสดงซ้ำ
const levelCategoryLabel = (level?: string, category?: string): string => {
    const parts: string[] = [];
    if (level) parts.push(level);
    if (category && category !== level) parts.push(category);
    return parts.length ? ` · ${parts.join(' · ')}` : '';
};

// "750 นาที" อ่านยาก — เกิน 2 ชม. แปลงเป็น ชม.+นาที (ชุดใหญ่ 250 ข้อไม่ได้นั่งทำรวดเดียว)
const fmtMinutes = (m: number): string => {
    if (m < 120) return `${m} นาที`;
    const h = Math.floor(m / 60), r = m % 60;
    return r > 0 ? `${h} ชม. ${r} นาที` : `${h} ชม.`;
};

const SheetHeader: React.FC<{ examTitle: string; total: number; level?: string; category?: string; minutes: number }> = ({ examTitle, total, level, category, minutes }) => (
    <header className="khp-head">
        <div className="khp-brand">คลังข้อสอบครูฮีม · kruheemmath.com</div>
        <h1 className="khp-title">{examTitle}</h1>
        <div className="khp-meta">จำนวน {total} ข้อ{levelCategoryLabel(level, category)} · เวลาแนะนำ {fmtMinutes(minutes)}</div>
        <div className="khp-fields">
            <span>ชื่อ-นามสกุล ................................................................</span>
            <span>ชั้น ..................</span>
            <span>เลขที่ ..................</span>
        </div>
        <div className="khp-rule" />
    </header>
);

export const ExamPrintView: React.FC<ExamPrintViewProps> = ({ examId, examTitle, category, level, questions, isTrial = false }) => {
    const [showAnswers, setShowAnswers] = useState(true);
    const sanitized = useMemo(() => sanitizeExamData(questions as ExamQuestion[]), [questions]);
    const total = sanitized.length;
    const suggestedMinutes = Math.max(1, Math.ceil((total * 180) / 60));

    // ผลการจัดหน้า: pages = ลำดับ index ของข้อในแต่ละแผ่น (+ธงแผ่นสูงเกิน) / ansChunks = เฉลยต่อแผ่น
    const [pages, setPages] = useState<{ items: number[]; oversize: boolean }[] | null>(null);
    const [ansChunks, setAnsChunks] = useState<number[][]>([]);
    const measureRef = useRef<HTMLDivElement>(null);

    // ── เฟสวัดขนาด → บรรจุลงแผ่น ──
    useEffect(() => {
        if (isTrial || total === 0) return;
        let cancelled = false;
        (async () => {
            // รอฟอนต์ (รวมฟอนต์สูตรคณิต KaTeX) พร้อมก่อน — ความสูงถึงจะนิ่ง
            try { await (document as any).fonts?.ready; } catch { /* เบราว์เซอร์เก่า */ }
            const root = measureRef.current;
            if (!root || cancelled) return;
            // รอรูปทุกรูปในกล่องวัดโหลดเสร็จ (รูปโหลดช้า = ความสูงเปลี่ยน)
            const imgs = Array.from(root.querySelectorAll('img'));
            await Promise.all(imgs.map((im) => (im as HTMLImageElement).complete
                ? Promise.resolve()
                : new Promise<void>((res) => { im.addEventListener('load', () => res(), { once: true }); im.addEventListener('error', () => res(), { once: true }); })));
            await new Promise((r) => setTimeout(r, 60)); // ให้ layout นิ่ง
            // ฟอนต์ KaTeX ถูก "ขอโหลด" ตอนกล่องวัดเรนเดอร์ — await รอบสองถึงจะรอมันจริง
            try { await (document as any).fonts?.ready; } catch { /* ok */ }
            if (cancelled || !measureRef.current) return;

            const probe = root.querySelector<HTMLElement>('.khp-probe');
            const headEl = root.querySelector<HTMLElement>('.khp-head');
            const qEls = Array.from(root.querySelectorAll<HTMLElement>('.pq'));
            if (!probe || !headEl || qEls.length === 0) return;

            // วัดซ้ำจนความสูงนิ่ง (กันฟอนต์มาช้าแล้วความสูงเลื่อนหลังวัด)
            // หมายเหตุ: ห้ามใช้ requestAnimationFrame ตรงนี้ — แท็บที่ไม่โฟกัส/ซ่อนอยู่
            // จะไม่ยิง rAF เลย ทำให้จัดหน้าค้างถาวร (setTimeout ยังเดินเสมอ)
            const readHeights = () => qEls.map((el) => el.offsetHeight);
            let heights = readHeights();
            for (let pass = 0; pass < 3; pass++) {
                await new Promise((r) => setTimeout(r, 90));
                if (cancelled || !measureRef.current) return;
                const again = readHeights();
                const stable = again.length === heights.length && again.every((h, i) => Math.abs(h - heights[i]) <= 1);
                heights = again;
                if (stable) break;
            }

            const contentH = probe.offsetHeight;              // ความสูงพื้นที่ใช้ได้ของ A4 (273mm เป็น px)
            const headerH = headEl.offsetHeight + 8;          // หัวกระดาษ (เฉพาะแผ่นแรก)
            const SAFETY = 4;                                  // กันเศษ px ปัดขึ้นตอนพิมพ์

            // บรรจุข้อลงแผ่น: แผ่นแรกหักที่ให้หัวกระดาษ ข้อไหนเกินที่เหลือ → แผ่นใหม่
            const bins: { items: number[]; oversize: boolean }[] = [];
            let cur: number[] = [];
            let used = headerH;
            const cap = contentH - SAFETY;
            heights.forEach((h, i) => {
                if (cur.length > 0 && used + h > cap) {
                    bins.push({ items: cur, oversize: false }); cur = []; used = 0;
                }
                cur.push(i); used += h;
            });
            if (cur.length > 0) bins.push({ items: cur, oversize: false });
            // แผ่นที่มีข้อเดียวสูงเกินพื้นที่ทั้งแผ่น → ตีธง oversize: ปล่อยให้ไหล
            // ต่อแผ่นถัดไปตอนพิมพ์ (เนื้อหาไม่หาย) แทนการโดน overflow ตัดทิ้ง
            bins.forEach((b, bi) => {
                const h = b.items.reduce((s, qi) => s + heights[qi], 0) + (bi === 0 ? headerH : 0);
                if (h > cap) {
                    b.oversize = true;
                    console.warn(`[ExamPrint] แผ่นที่ ${bi + 1} สูงเกิน A4 (ข้อ ${b.items.map((x) => x + 1).join(',')}) — ปล่อยให้ไหลต่อแผ่นถัดไป`);
                }
            });

            // เฉลย: วัดทั้งก้อน แล้วแบ่งเป็นก้อนละแผ่นแบบเฉลี่ย (โครงสร้าง grid สม่ำเสมอ)
            const ansEl = root.querySelector<HTMLElement>('.khp-answers');
            const chunks: number[][] = [];
            if (ansEl) {
                const ansH = ansEl.offsetHeight;
                const nPages = Math.max(1, Math.ceil(ansH / (cap * 0.95)));
                const per = Math.ceil(total / nPages);
                for (let i = 0; i < total; i += per) chunks.push(Array.from({ length: Math.min(per, total - i) }, (_, k) => i + k));
            }

            if (!cancelled) { setPages(bins); setAnsChunks(chunks); }
        })();
        return () => { cancelled = true; };
    }, [sanitized, total, isTrial]);

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

    // ชุดที่ข้อมูลเสียทั้งชุด (sanitize แล้วเหลือ 0 ข้อ) — บอกตรงๆ ไม่ค้าง spinner
    if (total === 0) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
                <div className="text-5xl mb-4">📄</div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">ชุดนี้ยังไม่มีข้อสอบที่พิมพ์ได้</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8">ข้อมูลชุดนี้อาจอยู่ระหว่างปรับปรุง ลองกลับไปทำบนเว็บ หรือเลือกชุดอื่นก่อนครับ</p>
                <Link href={`/exam/${examId}`} className="px-8 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition">← กลับไปหน้าข้อสอบ</Link>
            </div>
        );
    }

    const totalPages = (pages?.length ?? 0) + (showAnswers ? ansChunks.length : 0);

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
                    <button onClick={() => window.print()} disabled={!pages} className="khp-print-btn">
                        <Printer size={18} /> พิมพ์ / บันทึกเป็น PDF
                    </button>
                </div>
                <p className="khp-hint">
                    {pages
                        ? <>จัดหน้าเสร็จแล้ว {totalPages} หน้า A4 — สิ่งที่เห็นด้านล่างคือหน้ากระดาษจริงทีละแผ่น · กดปุ่มแล้วเลือก “บันทึกเป็น PDF” (Save as PDF) ได้เลย</>
                        : 'กำลังวัดขนาดทุกข้อและจัดลงหน้ากระดาษ A4...'}
                </p>
            </div>

            {/* ── กล่องวัดขนาด (ซ่อน) — markup เดียวกับแผ่นจริงเป๊ะ ── */}
            {!pages && (
                <div ref={measureRef} className="khp-measure" aria-hidden>
                    <div className="khp-probe" />
                    <div className="khp-content">
                        <SheetHeader examTitle={examTitle} total={total} level={level} category={category} minutes={suggestedMinutes} />
                        {sanitized.map((q, idx) => <QuestionBlock key={q.id ?? idx} q={q} idx={idx} />)}
                        <section className="khp-answers">
                            <h2>เฉลย — {examTitle}</h2>
                            <div className="khp-answer-grid">
                                {sanitized.map((q, idx) => (
                                    <span key={idx} className="khp-ans"><b>{idx + 1}.</b> {isFillQuestion(q) ? String(((q as any).answers?.[0] ?? '')).slice(0, 12) : (q.correctIndex ?? 0) + 1}</span>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {/* ── สถานะกำลังจัดหน้า + ใบแจ้งกันพิมพ์กลางคัน (Cmd+P ระหว่างวัด) ── */}
            {!pages && (
                <>
                    <div className="khp-loading no-print">
                        <Loader2 className="animate-spin" size={28} />
                        <span>กำลังจัดหน้ากระดาษ A4... (ชุดใหญ่อาจใช้เวลาหลายวินาที)</span>
                    </div>
                    <div id="print-root" className="khp-preroot">
                        ระบบกำลังจัดหน้ากระดาษอยู่ครับ — กรุณารอสักครู่ให้ขึ้นตัวอย่างหน้ากระดาษก่อน แล้วค่อยกดพิมพ์อีกครั้ง
                    </div>
                </>
            )}

            {/* ── แผ่น A4 จริงทีละแผ่น ── */}
            {pages && (
                <div className="khp-scroll">
                <div id="print-root">
                    {pages.map((bin, pi) => (
                        <section key={pi} className={`page${bin.oversize ? ' oversize' : ''}`}>
                            {/* หัวกระดาษประจำแผ่น (แผ่น 2+ — แผ่นแรกมีหัวใหญ่อยู่แล้ว): ชุด+ระดับ / เว็บ */}
                            {pi > 0 && (
                                <div className="khp-runhead">
                                    <span className="khp-runhead-title">{examTitle}{levelCategoryLabel(level, category)}</span>
                                    <span>kruheemmath.com</span>
                                </div>
                            )}
                            {/* ลายน้ำทแยงทุกแผ่น — เป็นตัวหนังสือจริง (ไม่ใช่ภาพพื้นหลัง) พิมพ์ติดเสมอ */}
                            <div className="khp-watermark" aria-hidden>คลังข้อสอบครูฮีม · kruheemmath.com</div>
                            <div className="khp-content">
                                {pi === 0 && <SheetHeader examTitle={examTitle} total={total} level={level} category={category} minutes={suggestedMinutes} />}
                                {bin.items.map((qi) => <QuestionBlock key={sanitized[qi].id ?? qi} q={sanitized[qi]} idx={qi} />)}
                            </div>
                            <div className="khp-foot">
                                <span>© คลังข้อสอบครูฮีม · kruheemmath.com · สำหรับสมาชิกเท่านั้น ห้ามคัดลอก ดัดแปลง หรือจำหน่ายต่อ</span>
                                <span className="khp-foot-no">หน้า {pi + 1} / {totalPages}</span>
                            </div>
                        </section>
                    ))}
                    {showAnswers && ansChunks.map((chunk, ci) => (
                        <section key={`ans-${ci}`} className="page">
                            <div className="khp-runhead">
                                <span className="khp-runhead-title">{examTitle}{levelCategoryLabel(level, category)}</span>
                                <span>kruheemmath.com</span>
                            </div>
                            <div className="khp-watermark" aria-hidden>คลังข้อสอบครูฮีม · kruheemmath.com</div>
                            <div className="khp-content">
                                <section className="khp-answers">
                                    <h2>เฉลย — {examTitle}{ansChunks.length > 1 ? ` (${ci + 1}/${ansChunks.length})` : ''}</h2>
                                    <div className="khp-answer-grid">
                                        {chunk.map((idx) => (
                                            <span key={idx} className="khp-ans"><b>{idx + 1}.</b> {isFillQuestion(sanitized[idx]) ? String(((sanitized[idx] as any).answers?.[0] ?? '')).slice(0, 12) : (sanitized[idx].correctIndex ?? 0) + 1}</span>
                                        ))}
                                    </div>
                                </section>
                            </div>
                            <div className="khp-foot">
                                <span>© คลังข้อสอบครูฮีม · kruheemmath.com · สำหรับสมาชิกเท่านั้น ห้ามคัดลอก ดัดแปลง หรือจำหน่ายต่อ</span>
                                <span className="khp-foot-no">หน้า {(pages?.length ?? 0) + ci + 1} / {totalPages}</span>
                            </div>
                        </section>
                    ))}
                </div>
                </div>
            )}

            <style jsx global>{`
                /* ── จอ: พรีวิวเป็นแผ่น A4 ทีละแผ่น ── */
                .khprint-screen { min-height: 100vh; background: #545961; padding-bottom: 60px; }
                .khprint-controls { position: sticky; top: 0; z-index: 40; background: rgba(255,255,255,.95); backdrop-filter: blur(8px); border-bottom: 1px solid #e2e8f0; padding: 10px 16px 8px; }
                .khprint-controls-inner { max-width: 860px; margin: 0 auto; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
                .khp-back { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; color: #475569; }
                .khp-toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #475569; cursor: pointer; margin-left: auto; }
                .khp-toggle input { width: 16px; height: 16px; accent-color: #059669; }
                .khp-print-btn { display: inline-flex; align-items: center; gap: 8px; background: #059669; color: #fff; font-weight: 800; font-size: 15px; padding: 10px 22px; border-radius: 999px; box-shadow: 0 8px 20px -8px rgba(5,150,105,.5); transition: transform .15s; }
                .khp-print-btn:hover { transform: translateY(-1px); }
                .khp-print-btn:disabled { opacity: .5; cursor: wait; }
                .khp-hint { max-width: 860px; margin: 6px auto 0; font-size: 12px; color: #64748b; }
                .khp-loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 80px 20px; color: #e2e8f0; font-weight: 600; }

                /* ── แผ่น A4: ขนาดจริงทั้งบนจอและบนกระดาษ ── */
                .page {
                    width: 210mm; height: 297mm; box-sizing: border-box;
                    padding: 17mm 14mm 15mm; /* บน/ล่างเผื่อที่ให้หัว-ท้ายกระดาษหายใจ ไม่ชิดขอบ */
                    background: #fff; color: #111; position: relative; overflow: hidden;
                    margin: 18px auto; box-shadow: 0 10px 40px -12px rgba(0,0,0,.5);
                }
                /* แผ่นที่มีข้อเดียวสูงเกิน A4: ยอมสูงกว่าแผ่น (ตอนพิมพ์เนื้อไหลต่อแผ่นถัดไป
                   ดีกว่าโดน overflow ตัดเนื้อหาทิ้ง) */
                .page.oversize { height: auto; min-height: 297mm; overflow: visible; }
                .khp-content { width: 100%; position: relative; z-index: 1; } /* เนื้อหาลอยเหนือลายน้ำ */

                /* ── สัญลักษณ์ครูฮีมทุกแผ่น: หัวกระดาษ / ท้ายกระดาษ / ลายน้ำ ──
                   ทั้งหมดวางแบบ absolute ในโซนขอบกระดาษ (padding 13/11mm)
                   จึงไม่กินพื้นที่เนื้อหาและไม่กระทบการจัดหน้าที่วัดไว้ */
                .khp-runhead {
                    position: absolute; top: 8mm; left: 14mm; right: 14mm;
                    display: flex; justify-content: space-between; gap: 12px;
                    font-size: 10px; color: #999; letter-spacing: .3px;
                }
                .khp-runhead-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
                .khp-foot {
                    position: absolute; bottom: 7mm; left: 14mm; right: 14mm;
                    display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
                    font-size: 9.5px; color: #aaa;
                }
                .khp-foot-no { flex-shrink: 0; color: #999; }
                .khp-watermark {
                    position: absolute; inset: 0; z-index: 0;
                    display: flex; align-items: center; justify-content: center;
                    transform: rotate(-32deg);
                    font-size: 38px; font-weight: 700; letter-spacing: 4px;
                    color: rgba(0, 0, 0, 0.05);
                    pointer-events: none; user-select: none; white-space: nowrap;
                }
                /* จอเล็ก/มือถือ: แผ่น A4 กว้างกว่าจอ — เลื่อนดูเฉพาะโซนแผ่น (แถบปุ่มไม่เลื่อนตาม) */
                .khp-scroll { overflow-x: auto; }
                /* ใบแจ้งตอนกำลังจัดหน้า: ซ่อนบนจอ โผล่เฉพาะถ้าใครดันกดพิมพ์กลางคัน */
                .khp-preroot { display: none; padding: 40mm 20mm; font-size: 18px; text-align: center; color: #111; background: #fff; }

                /* กล่องวัดขนาด: กว้างเท่าพื้นที่เนื้อหา A4 เป๊ะ (210-28mm) ซ่อนนอกจอ */
                .khp-measure { position: absolute; left: -9999px; top: 0; width: 182mm; background: #fff; }
                .khp-probe { position: absolute; height: 265mm; width: 1px; } /* 297 - 17 - 15 มม. = พื้นที่ใช้ได้ (ต้องตรงกับ padding ของ .page เสมอ) */

                /* ── โครงข้อสอบ (ใช้ทั้งกล่องวัดและแผ่นจริง) ── */
                .khp-head { text-align: center; }
                .khp-brand { font-size: 11px; letter-spacing: 1px; color: #999; }
                .khp-title { font-size: 21px; font-weight: 800; margin: 5px 0 2px; color: #111; }
                .khp-meta { font-size: 12.5px; color: #555; }
                .khp-fields { display: flex; justify-content: center; gap: 18px; flex-wrap: wrap; font-size: 12.5px; color: #333; margin-top: 12px; }
                .khp-rule { border-bottom: 2px solid #111; margin-top: 12px; }

                .pq { padding: 10px 0 6px; border-bottom: 1px dashed #e8e8e8; }
                .pq-q { display: flex; gap: 8px; align-items: baseline; font-size: 14.5px; line-height: 1.62; color: #111; }
                .pq-no { font-weight: 800; flex-shrink: 0; min-width: 26px; }
                .pq-text { flex: 1; min-width: 0; }
                .pq-fig { margin: 7px 0 3px 34px; }
                .pq-fig svg { max-width: 330px; max-height: 190px; width: auto; height: auto; display: block; }
                .pq-fig img { max-width: 330px; max-height: 200px; display: block; }
                .pq-options { margin: 5px 0 2px 34px; padding: 0; list-style: none; }
                .pq-options li { display: flex; gap: 6px; align-items: baseline; font-size: 14px; line-height: 1.58; padding: 2px 0; color: #222; }
                .pq-options.two-col { display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; }
                .pq-opt-no { font-weight: 700; flex-shrink: 0; }
                .pq-opt-text { flex: 1; min-width: 0; }
                .pq-fill { margin: 8px 0 6px 34px; font-size: 14px; color: #333; }

                .khp-answers { padding-top: 4px; }
                .khp-answers h2 { font-size: 17px; font-weight: 800; text-align: center; margin-bottom: 12px; color: #111; border-bottom: 2px solid #111; padding-bottom: 9px; }
                .khp-answer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 5px 10px; font-size: 13px; color: #111; }
                .khp-ans b { margin-right: 4px; }

                /* ── โหมดพิมพ์จริง: กระดาษ = แผ่นบนจอเป๊ะ ── */
                @page { size: A4; margin: 0; }
                @media print {
                    body * { visibility: hidden !important; }
                    #print-root, #print-root * { visibility: visible !important; }
                    /* ห้ามใช้ position:absolute ตรงนี้ — Firefox ไม่แบ่งหน้ากล่อง
                       ที่หลุด flow (abspos) → พิมพ์ออกแค่แผ่นแรก (Gecko bug 154892) */
                    #print-root { position: static; width: 100%; }
                    .no-print { display: none !important; }
                    .khprint-screen { background: #fff !important; padding: 0 !important; min-height: 0; }
                    .khp-scroll { overflow: visible; }
                    .khp-preroot { display: block; }
                    .page { margin: 0; box-shadow: none; break-after: page; page-break-after: always; }
                    .page:last-of-type { break-after: auto; page-break-after: auto; }
                    a { text-decoration: none; color: inherit; }
                }
            `}</style>
        </div>
    );
};

export default ExamPrintView;
