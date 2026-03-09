"use client";

import React, { useState, useCallback } from 'react';
import ConfirmModal from '@/components/admin/ConfirmModal';

interface ConfirmConfig {
    title: string;
    message: React.ReactNode;
    isDanger?: boolean;
    onConfirm: () => void;
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
        isDanger: boolean = false
    ) => {
        setConfig({ title, message, onConfirm, isDanger });
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
        />
    );

    return { confirm, ConfirmDialog };
}
