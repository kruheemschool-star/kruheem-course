"use client";

import { useState, KeyboardEvent } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';

interface TagInputProps {
    tags: string[];
    onTagsChange: (newTags: string[]) => void;
    placeholder?: string;
}

export default function TagInput({ tags = [], onTagsChange, placeholder = "เพิ่มแท็ก..." }: TagInputProps) {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const addTag = () => {
        const trimmed = inputValue.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onTagsChange([...tags, trimmed]);
            setInputValue("");
        }
    };

    const removeTag = (index: number) => {
        onTagsChange(tags.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-wrap gap-2 p-2 bg-[#3d3d3d] border border-[#555] rounded-lg focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
            {tags.map((tag, index) => (
                <span key={index} className="flex items-center gap-1 px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs font-medium border border-indigo-500/30 animate-in zoom-in duration-200">
                    <TagIcon size={10} />
                    {tag}
                    <button onClick={() => removeTag(index)} className="hover:text-white ml-1">
                        <X size={12} />
                    </button>
                </span>
            ))}
            <div className="flex-grow min-w-[120px] flex items-center gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addTag}
                    placeholder={tags.length === 0 ? placeholder : ""}
                    className="flex-grow bg-transparent text-slate-200 text-sm outline-none placeholder:text-slate-500"
                />
                <button
                    onClick={addTag}
                    disabled={!inputValue.trim()}
                    className={`p-1 rounded-full transition-colors ${inputValue.trim() ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'text-slate-600 cursor-not-allowed'}`}
                >
                    <Plus size={14} />
                </button>
            </div>

        </div>
    );
}
