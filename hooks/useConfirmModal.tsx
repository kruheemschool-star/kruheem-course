"use client";

import React, { useState, useCallback } from 'react';
import ConfirmModal from '@/components/admin/ConfirmModal';

interface ConfirmConfig {
    title: string;
    message: React.ReactNode;
    isDanger?: boolean;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
}

export function useConfirmModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<ConfirmConfig>({
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const confirm = useCallback((
        title: string,
        message: React.ReactNode,
        onConfirm: () => void,
        isDanger: boolean = false,
        // ป้ายปุ่ม (ไม่ใส่ = "ยืนยัน"/"ยกเลิก" ตามเดิม) — ใช้กับกล่องแจ้งเตือนที่ไม่มีอะไรให้ยืนยัน
        labels?: { confirmText?: string; cancelText?: string }
    ) => {
        setConfig({ title, message, onConfirm, isDanger, ...labels });
        setIsOpen(true);
    }, []);

    const handleConfirm = useCallback(() => {
        setIsOpen(false);
        config.onConfirm();
    }, [config]);

    const handleCancel = useCallback(() => {
        setIsOpen(false);
    }, []);

    const ConfirmDialog = () => (
        <ConfirmModal
            isOpen={isOpen}
            title={config.title}
            message={config.message}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            isDanger={config.isDanger}
            confirmText={config.confirmText}
            cancelText={config.cancelText}
        />
    );

    return { confirm, ConfirmDialog };
}
