"use client";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from 'react';

interface SortableLessonItemProps {
    id: string;
    children: React.ReactNode;
}

export function SortableLessonItem({ id, children }: SortableLessonItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 group/drag">
            {/* Drag Handle - Always Visible */}
            <button
                {...attributes}
                {...listeners}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition"
                aria-label="ลากเพื่อเรียงลำดับ"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="5" r="1.5"></circle>
                    <circle cx="9" cy="12" r="1.5"></circle>
                    <circle cx="9" cy="19" r="1.5"></circle>
                    <circle cx="15" cy="5" r="1.5"></circle>
                    <circle cx="15" cy="12" r="1.5"></circle>
                    <circle cx="15" cy="19" r="1.5"></circle>
                </svg>
            </button>
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
}
