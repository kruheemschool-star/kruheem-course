"use client";

import { useState, useEffect, useRef } from "react";
import {
    FileText, BookOpen, Calculator, Lightbulb, StickyNote,
    Image as ImageIcon, Plus, Trash2, Edit3, GripVertical,
    ChevronUp, ChevronDown, Loader2
} from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Block type definition
interface ContentBlock {
    type: 'header' | 'definition' | 'formula' | 'example' | 'note' | 'image';
    title?: string;
    content?: string;
    url?: string;
    caption?: string;
}

interface SummaryBlockEditorProps {
    content: string;
    onChange: (content: string) => void;
}

// Block type icons and colors
const blockConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    header: { icon: <FileText size={18} />, label: "หัวข้อ", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    definition: { icon: <BookOpen size={18} />, label: "คำนิยาม", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    formula: { icon: <Calculator size={18} />, label: "สูตร", color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
    example: { icon: <Lightbulb size={18} />, label: "ตัวอย่าง", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    note: { icon: <StickyNote size={18} />, label: "หมายเหตุ", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
    image: { icon: <ImageIcon size={18} />, label: "รูปภาพ", color: "text-teal-600", bg: "bg-teal-50 border-teal-200" },
};

// Small Image with Loading for Admin Preview
const ImageWithLoadingSmall = ({ src, alt }: { src: string; alt: string }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    return (
        <div className="relative max-h-32 w-fit">
            {/* Skeleton */}
            {isLoading && !hasError && (
                <div className="h-24 w-40 bg-slate-200 rounded-lg animate-pulse flex items-center justify-center">
                    <ImageIcon size={24} className="text-slate-300" />
                </div>
            )}

            {/* Error */}
            {hasError && (
                <div className="h-24 w-40 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                    <span className="text-xs">โหลดไม่สำเร็จ</span>
                </div>
            )}

            {/* Image */}
            {!hasError && (
                <img
                    src={src}
                    alt={alt}
                    className={`max-h-32 rounded-lg transition-all duration-300 ${isLoading ? 'opacity-0 absolute' : 'opacity-100'
                        }`}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                />
            )}
        </div>
    );
};

export default function SummaryBlockEditor({ content, onChange }: SummaryBlockEditorProps) {
    const [blocks, setBlocks] = useState<ContentBlock[]>([]);
    const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [uploadingAt, setUploadingAt] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const insertIndexRef = useRef<number>(0);

    // Parse JSON content on mount or when content changes externally
    useEffect(() => {
        if (!content) {
            setBlocks([]);
            setMetadata(null);
            return;
        }

        try {
            const parsed = JSON.parse(content);

            if (Array.isArray(parsed)) {
                // Filter valid blocks
                const validBlocks = parsed.filter((item: ContentBlock) =>
                    item && item.type && ['header', 'definition', 'formula', 'example', 'note', 'image'].includes(item.type)
                );
                setBlocks(validBlocks);
                setMetadata(null);
            } else if (parsed && typeof parsed === 'object') {
                // Handle { metadata: {...}, content: [...] } structure
                if (parsed.metadata) {
                    setMetadata(parsed.metadata);
                }
                if (parsed.content && Array.isArray(parsed.content)) {
                    const validBlocks = parsed.content.filter((item: ContentBlock) =>
                        item && item.type && ['header', 'definition', 'formula', 'example', 'note', 'image'].includes(item.type)
                    );
                    setBlocks(validBlocks);
                }
            }
        } catch (e) {
            console.error("Failed to parse JSON:", e);
            setBlocks([]);
        }
    }, []); // Only on mount - we don't want to reset while editing

    // Serialize blocks back to JSON and call onChange
    const saveBlocks = (newBlocks: ContentBlock[]) => {
        setBlocks(newBlocks);

        let output: string;
        if (metadata) {
            output = JSON.stringify({ metadata, content: newBlocks }, null, 2);
        } else {
            output = JSON.stringify(newBlocks, null, 2);
        }
        onChange(output);
    };

    // Insert image at specific index
    const handleInsertImage = (index: number) => {
        insertIndexRef.current = index;
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const index = insertIndexRef.current;
        setUploadingAt(index);

        try {
            const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
            const storageRef = ref(storage, `summaries/images/${filename}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);

            const newBlock: ContentBlock = {
                type: 'image',
                url,
                caption: ''
            };

            const newBlocks = [...blocks];
            newBlocks.splice(index, 0, newBlock);
            saveBlocks(newBlocks);

        } catch (error) {
            console.error("Upload failed:", error);
            alert("อัปโหลดรูปภาพล้มเหลว");
        } finally {
            setUploadingAt(null);
            e.target.value = "";
        }
    };

    // Delete block
    const handleDelete = (index: number) => {
        if (!confirm("ต้องการลบบล็อกนี้ใช่ไหม?")) return;
        const newBlocks = blocks.filter((_, i) => i !== index);
        saveBlocks(newBlocks);
    };

    // Move block up/down
    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= blocks.length) return;

        const newBlocks = [...blocks];
        [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
        saveBlocks(newBlocks);
    };

    // Edit block
    const handleEdit = (index: number) => {
        setEditingIndex(index);
    };

    const handleSaveEdit = (index: number, updatedBlock: ContentBlock) => {
        const newBlocks = [...blocks];
        newBlocks[index] = updatedBlock;
        saveBlocks(newBlocks);
        setEditingIndex(null);
    };

    // Insert button component
    const InsertButton = ({ index, isFirst = false }: { index: number; isFirst?: boolean }) => (
        <div className={`flex items-center justify-center ${isFirst ? 'mb-2' : 'my-2'}`}>
            <button
                type="button"
                onClick={() => handleInsertImage(index)}
                disabled={uploadingAt !== null}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-full border border-dashed border-slate-300 hover:border-teal-400 transition-all"
            >
                {uploadingAt === index ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        กำลังอัปโหลด...
                    </>
                ) : (
                    <>
                        <Plus size={16} />
                        แทรกรูปภาพตรงนี้
                    </>
                )}
            </button>
        </div>
    );

    // Block card component
    const BlockCard = ({ block, index }: { block: ContentBlock; index: number }) => {
        const config = blockConfig[block.type] || blockConfig.note;
        const isEditing = editingIndex === index;

        if (isEditing) {
            return (
                <div className={`p-4 rounded-xl border-2 ${config.bg} shadow-sm`}>
                    <div className="space-y-3">
                        {block.type !== 'image' && (
                            <>
                                {block.title !== undefined && (
                                    <input
                                        type="text"
                                        value={block.title || ''}
                                        onChange={(e) => {
                                            const updated = { ...block, title: e.target.value };
                                            const newBlocks = [...blocks];
                                            newBlocks[index] = updated;
                                            setBlocks(newBlocks);
                                        }}
                                        placeholder="หัวข้อ"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                    />
                                )}
                                <textarea
                                    value={block.content || ''}
                                    onChange={(e) => {
                                        const updated = { ...block, content: e.target.value };
                                        const newBlocks = [...blocks];
                                        newBlocks[index] = updated;
                                        setBlocks(newBlocks);
                                    }}
                                    placeholder="เนื้อหา"
                                    rows={4}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                                />
                            </>
                        )}
                        {block.type === 'image' && (
                            <>
                                {block.url && (
                                    <img src={block.url} alt="" className="max-h-40 rounded-lg" />
                                )}
                                <input
                                    type="text"
                                    value={block.caption || ''}
                                    onChange={(e) => {
                                        const updated = { ...block, caption: e.target.value };
                                        const newBlocks = [...blocks];
                                        newBlocks[index] = updated;
                                        setBlocks(newBlocks);
                                    }}
                                    placeholder="คำอธิบายรูป (ถ้ามี)"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                />
                            </>
                        )}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleSaveEdit(index, blocks[index])}
                                className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-bold hover:bg-teal-600"
                            >
                                บันทึก
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditingIndex(null)}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className={`group p-4 rounded-xl border ${config.bg} hover:shadow-md transition-all`}>
                <div className="flex items-start gap-3">
                    {/* Drag handle & move buttons */}
                    <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={() => handleMove(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                            <ChevronUp size={16} />
                        </button>
                        <GripVertical size={16} className="text-slate-300" />
                        <button
                            type="button"
                            onClick={() => handleMove(index, 'down')}
                            disabled={index === blocks.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                            <ChevronDown size={16} />
                        </button>
                    </div>

                    {/* Block content */}
                    <div className="flex-1 min-w-0">
                        <div className={`flex items-center gap-2 mb-2 ${config.color}`}>
                            {config.icon}
                            <span className="text-sm font-bold">{config.label}</span>
                            {block.title && (
                                <span className="text-slate-600 font-normal">: {block.title}</span>
                            )}
                        </div>

                        {block.type === 'image' ? (
                            <div>
                                {block.url && (
                                    <ImageWithLoadingSmall src={block.url} alt={block.caption || ''} />
                                )}
                                {block.caption && (
                                    <p className="text-sm text-slate-500 mt-1">{block.caption}</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-600 line-clamp-2">
                                {block.content?.substring(0, 150)}
                                {(block.content?.length || 0) > 150 && '...'}
                            </p>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={() => handleEdit(index)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="แก้ไข"
                        >
                            <Edit3 size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDelete(index)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="ลบ"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 min-h-[500px]">
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-600">
                    📦 Blocks ({blocks.length})
                </h3>
            </div>

            {/* Blocks list */}
            <div className="space-y-1">
                {/* Insert at beginning */}
                <InsertButton index={0} isFirst />

                {blocks.map((block, index) => (
                    <div key={index}>
                        <BlockCard block={block} index={index} />
                        <InsertButton index={index + 1} />
                    </div>
                ))}

                {blocks.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <ImageIcon size={48} className="mx-auto mb-3 opacity-50" />
                        <p>ยังไม่มีเนื้อหา</p>
                        <p className="text-sm">กดปุ่มด้านบนเพื่อเพิ่มรูปภาพ</p>
                    </div>
                )}
            </div>
        </div>
    );
}
