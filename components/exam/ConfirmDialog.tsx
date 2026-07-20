"use client";

import React, { useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmDialog — in-page confirmation modal replacing window.confirm on the
// exam submit path. Native confirm() is silently suppressed in several real
// environments (Facebook/LINE in-app browsers, Chrome after "prevent this page
// from creating additional dialogs", sandboxed webviews) which made the submit
// button a dead end: confirm() returned false and nothing happened. An in-page
// modal cannot be blocked, so submission always gets an explicit yes/no.
// Shared by the exam bank (ExamSystem) and the in-course runner (ExamRunner).
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    detail?: string;
    confirmLabel: string;
    cancelLabel?: string;
    tone?: 'primary' | 'danger';
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    title,
    detail,
    confirmLabel,
    cancelLabel = 'กลับไปทำต่อ',
    tone = 'primary',
    onConfirm,
    onCancel,
}) => {
    // Escape closes (same affordance as a native dialog's cancel)
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onCancel]);

    if (!open) return null;

    const confirmCls = tone === 'danger'
        ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
        : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20';

    return (
        <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in"
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-100 dark:border-slate-700 px-7 py-8 text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">{title}</h2>
                {detail && <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{detail}</p>}
                {!detail && <div className="mb-4" />}
                <div className="flex flex-col gap-2.5">
                    <button
                        onClick={onConfirm}
                        className={`w-full rounded-2xl text-white text-lg font-black py-3.5 transition-colors shadow-lg ${confirmCls}`}
                    >
                        {confirmLabel}
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
