"use client";

import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ExamCapabilities — a compact "what you can do in this exam room" explainer for
// the start screen. Spells out every mode/feature up front (pause, ส่งเท่าที่ทำ,
// redo-wrong, mistake notebook, resume, detailed explanations) so students know
// what's available before committing. Shared; `variant` swaps a couple of
// surface-specific items (cloud resume = bank; topic drill = course).
// ─────────────────────────────────────────────────────────────────────────────

interface ExamCapabilitiesProps {
    variant?: 'bank' | 'course';
    className?: string;
}

const COMMON = [
    { icon: '⏸️', title: 'พักเวลาได้', desc: 'กดพักไปเข้าห้องน้ำ/ดื่มน้ำ เวลาไม่เดิน' },
    { icon: '📊', title: 'ส่งเท่าที่ทำ', desc: 'ทำแค่ 5 ข้อก็กดดูผล+จุดอ่อนได้ ไม่ต้องรอครบ' },
    { icon: '🔁', title: 'ทำซ้ำข้อที่ผิด', desc: 'ดริลล์เฉพาะข้อที่ตอบผิดจนแม่น' },
    { icon: '✍️', title: 'สมุดข้อผิด', desc: 'ระบบจดข้อที่ผิดสะสมข้ามครั้งให้เก็บให้หมด' },
    { icon: '💡', title: 'เฉลยละเอียดทุกข้อ', desc: 'อธิบายวิธีคิดเป็นขั้น สไตล์ครูฮีม' },
];

const EXTRA = {
    bank: { icon: '☁️', title: 'ทำต่ออุปกรณ์อื่น', desc: 'บันทึกไว้ทำต่อบนมือถือ/คอมเครื่องอื่นได้' },
    course: { icon: '🎯', title: 'ฝึกหัวข้อที่อ่อน', desc: 'กดฝึกเพิ่มเฉพาะหัวข้อที่ยังไม่แม่นได้เลย' },
} as const;

export const ExamCapabilities: React.FC<ExamCapabilitiesProps> = ({ variant = 'bank', className = '' }) => {
    const items = [...COMMON.slice(0, 4), EXTRA[variant], COMMON[4]];
    return (
        <div className={`rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 md:p-6 ${className}`}>
            <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 mb-1">ในห้องสอบนี้ทำอะไรได้บ้าง</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">ไม่ใช่แค่ทำแล้วจบ — มีเครื่องมือช่วยให้เก่งขึ้นจริง</p>
            <div className="grid sm:grid-cols-2 gap-3">
                {items.map((it) => (
                    <div key={it.title} className="flex items-start gap-3 rounded-2xl bg-slate-50 dark:bg-slate-900/30 px-3.5 py-3">
                        <span className="text-2xl flex-shrink-0 leading-none">{it.icon}</span>
                        <div className="min-w-0">
                            <div className="text-sm font-black text-slate-800 dark:text-slate-100">{it.title}</div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{it.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExamCapabilities;
