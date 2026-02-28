"use client";

import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { useState, useEffect, useRef } from 'react';
import {
    Bold, Italic, List, Heading1, Heading2, Heading3,
    Image as ImageIcon, Link as LinkIcon, Code,
    AlignLeft, AlignCenter, AlignRight, Underline as UnderlineIcon,
    Undo, Redo, Quote, Trash2, Sigma, Loader2, X,
    Highlighter, ChevronDown
} from 'lucide-react';
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Custom Image Node View with delete button
const ImageNodeView = ({ node, deleteNode }: any) => {
    return (
        <NodeViewWrapper className="relative inline-block group my-4 max-w-full">
            <img
                src={node.attrs.src}
                alt={node.attrs.alt || ''}
                className="rounded-xl shadow-md max-w-full block"
            />
            <button
                type="button"
                onClick={deleteNode}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
                title="ลบรูปภาพ"
            >
                <X size={14} />
            </button>
        </NodeViewWrapper>
    );
};

// Extended Image extension with custom node view
const ImageWithDelete = Image.extend({
    addNodeView() {
        return ReactNodeViewRenderer(ImageNodeView);
    },
});

// Highlight colors
const HIGHLIGHT_COLORS = [
    { name: 'เหลือง', color: '#fef08a' },
    { name: 'เขียว', color: '#bbf7d0' },
    { name: 'ฟ้า', color: '#bfdbfe' },
    { name: 'ชมพู', color: '#fecdd3' },
    { name: 'ม่วง', color: '#e9d5ff' },
    { name: 'ส้ม', color: '#fed7aa' },
];

interface TiptapEditorProps {
    content: string;
    onChange: (content: string) => void;
}

const MenuButton = ({ onClick, isActive, disabled, children, title, isLoading }: any) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        title={title}
        className={`p-1.5 rounded-lg transition-colors relative ${isActive
            ? 'bg-teal-100 text-teal-700'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30'
            }`}
    >
        {isLoading ? <Loader2 size={16} className="animate-spin text-teal-600" /> : children}
    </button>
);

export default function TiptapEditor({ content, onChange }: TiptapEditorProps) {
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);

    // Close highlight picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (highlightRef.current && !highlightRef.current.contains(e.target as Node)) {
                setShowHighlightPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                blockquote: {
                    HTMLAttributes: {
                        class: 'border-l-4 border-teal-400 bg-teal-50/50 pl-4 py-2 my-4 italic text-slate-600',
                    },
                },
            }),
            Underline,
            Highlight.configure({
                multicolor: true,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-teal-600 underline cursor-pointer',
                },
            }),
            ImageWithDelete.configure({
                HTMLAttributes: {
                    class: 'rounded-xl shadow-md max-w-full my-4',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-lg prose-slate max-w-none focus:outline-none min-h-[400px] prose-blockquote:border-l-4 prose-blockquote:border-teal-400 prose-blockquote:bg-teal-50/50 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:my-4 prose-blockquote:italic prose-blockquote:text-slate-600 prose-blockquote:not-italic prose-h1:text-3xl prose-h1:font-black prose-h1:text-slate-900 prose-h2:text-2xl prose-h2:font-bold prose-h2:text-slate-800 prose-h3:text-xl prose-h3:font-semibold prose-h3:text-slate-700',
            },
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items) return false;

                // Check if clipboard contains an image
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        event.preventDefault();
                        const file = items[i].getAsFile();
                        if (file) {
                            handlePastedImage(file);
                        }
                        return true;
                    }
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => {
            if (!isHtmlMode) {
                onChange(editor.getHTML());
            }
        },
    });

    // Sync content
    useEffect(() => {
        if (editor && content !== editor.getHTML() && !editor.isFocused) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    const setLink = () => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const triggerImageUpload = () => {
        fileInputRef.current?.click();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        setIsUploading(true);
        try {
            // Upload to Firebase Storage: blog-content/{timestamp}_{filename}
            const storageRef = ref(storage, `blog-content/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Insert image
            editor.chain().focus().setImage({ src: downloadURL }).run();
        } catch (error) {
            console.error("Image upload failed:", error);
            alert("อัปโหลดรูปภาพล้มเหลว กรุณาลองใหม่");
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handlePastedImage = async (file: File) => {
        if (!editor) return;

        setIsUploading(true);
        try {
            // Upload to Firebase Storage with timestamp
            const storageRef = ref(storage, `blog-content/${Date.now()}_pasted_${file.name || 'image.png'}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Insert image at current cursor position
            editor.chain().focus().setImage({ src: downloadURL }).run();
        } catch (error) {
            console.error("Pasted image upload failed:", error);
            alert("อัปโหลดรูปภาพที่วางล้มเหลว กรุณาลองใหม่");
        } finally {
            setIsUploading(false);
        }
    };

    const addEquation = () => {
        if (!editor) return;
        // Insert a LaTeX placeholder with $...$
        editor.chain().focus().insertContent(' $ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $ ').run();
    };

    const applyHighlight = (color: string) => {
        if (!editor) return;
        editor.chain().focus().toggleHighlight({ color }).run();
        setShowHighlightPicker(false);
    };

    const removeHighlight = () => {
        if (!editor) return;
        editor.chain().focus().unsetHighlight().run();
        setShowHighlightPicker(false);
    };

    if (!editor) {
        return null;
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col min-h-[600px]">
            {/* Floating Sticky Toolbar */}
            <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 rounded-t-3xl shadow-sm">
                <div className="p-2 flex flex-wrap gap-1 items-center justify-between">
                    <div className="flex flex-wrap gap-0.5 items-center">
                        {/* Visual Mode Tools - Hide in HTML Mode */}
                        {!isHtmlMode && (
                            <>
                                {/* Undo / Redo */}
                                <div className="flex gap-0.5 pr-2 border-r border-slate-200 mr-1">
                                    <MenuButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="ย้อนกลับ (Undo)">
                                        <Undo size={16} />
                                    </MenuButton>
                                    <MenuButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="ทำซ้ำ (Redo)">
                                        <Redo size={16} />
                                    </MenuButton>
                                </div>

                                {/* Text Formatting */}
                                <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="ตัวหนา (Bold)">
                                    <Bold size={16} />
                                </MenuButton>
                                <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="ตัวเอียง (Italic)">
                                    <Italic size={16} />
                                </MenuButton>
                                <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="ขีดเส้นใต้ (Underline)">
                                    <UnderlineIcon size={16} />
                                </MenuButton>

                                {/* Highlight with Color Picker */}
                                <div className="relative" ref={highlightRef}>
                                    <MenuButton
                                        onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                                        isActive={editor.isActive('highlight')}
                                        title="ไฮไลท์ (Highlight)"
                                    >
                                        <div className="flex items-center gap-0.5">
                                            <Highlighter size={16} />
                                            <ChevronDown size={10} />
                                        </div>
                                    </MenuButton>
                                    {showHighlightPicker && (
                                        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 min-w-[160px]">
                                            <div className="text-xs font-bold text-slate-500 mb-1.5 px-1">เลือกสีไฮไลท์</div>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {HIGHLIGHT_COLORS.map((c) => (
                                                    <button
                                                        key={c.color}
                                                        type="button"
                                                        onClick={() => applyHighlight(c.color)}
                                                        className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                                        title={c.name}
                                                    >
                                                        <div
                                                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                                            style={{ backgroundColor: c.color }}
                                                        />
                                                        <span className="text-[10px] text-slate-500">{c.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeHighlight}
                                                className="w-full mt-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg py-1 transition-colors font-medium"
                                            >
                                                ลบไฮไลท์
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="w-px h-5 bg-slate-200 mx-0.5"></div>

                                {/* Headings - 3 levels */}
                                <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="หัวข้อใหญ่ (H1)">
                                    <Heading1 size={16} />
                                </MenuButton>
                                <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="หัวข้อกลาง (H2)">
                                    <Heading2 size={16} />
                                </MenuButton>
                                <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="หัวข้อเล็ก (H3)">
                                    <Heading3 size={16} />
                                </MenuButton>

                                <div className="w-px h-5 bg-slate-200 mx-0.5"></div>

                                {/* Alignment */}
                                <MenuButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="ชิดซ้าย">
                                    <AlignLeft size={16} />
                                </MenuButton>
                                <MenuButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="กึ่งกลาง">
                                    <AlignCenter size={16} />
                                </MenuButton>
                                <MenuButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="ชิดขวา">
                                    <AlignRight size={16} />
                                </MenuButton>

                                <div className="w-px h-5 bg-slate-200 mx-0.5"></div>

                                {/* List & Blockquote */}
                                <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="รายการ (Bullet List)">
                                    <List size={16} />
                                </MenuButton>
                                <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="คำพูด (Blockquote)">
                                    <Quote size={16} />
                                </MenuButton>

                                <div className="w-px h-5 bg-slate-200 mx-0.5"></div>

                                {/* Link, Image, Equation */}
                                <MenuButton onClick={setLink} isActive={editor.isActive('link')} title="ใส่ลิงก์ (Link)">
                                    <LinkIcon size={16} />
                                </MenuButton>

                                <MenuButton onClick={triggerImageUpload} title="อัปโหลดรูปภาพ" isLoading={isUploading}>
                                    <ImageIcon size={16} />
                                </MenuButton>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />

                                <MenuButton onClick={addEquation} title="แทรกสมการ (LaTeX)">
                                    <Sigma size={16} />
                                </MenuButton>
                            </>
                        )}
                        {isHtmlMode && (
                            <span className="text-sm font-bold text-slate-500 px-2">HTML Source Code Mode</span>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm('ล้างเนื้อหาทั้งหมด?')) {
                                    onChange('');
                                    editor.commands.setContent('');
                                }
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                            title="ล้างเนื้อหา"
                        >
                            <Trash2 size={16} />
                        </button>
                        <div className="w-px h-5 bg-slate-200 mx-0.5"></div>
                        <button
                            type="button"
                            onClick={() => {
                                setIsHtmlMode(!isHtmlMode);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${isHtmlMode
                                ? 'bg-slate-800 text-white shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <Code size={14} />
                            {isHtmlMode ? 'กลับ Editor' : '<> HTML'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 bg-slate-50/50 relative">
                {isHtmlMode ? (
                    <textarea
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full h-full min-h-[600px] p-6 font-mono text-sm text-slate-700 focus:outline-none resize-none bg-transparent"
                        placeholder="<!-- Enter raw HTML here -->"
                    />
                ) : (
                    <div className="p-6 md:p-8 min-h-[600px]" onClick={() => editor.chain().focus().run()}>
                        <EditorContent editor={editor} />
                    </div>
                )}
            </div>
        </div>
    );
}
