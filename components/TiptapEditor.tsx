"use client";

import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { useState, useEffect, useRef } from 'react';
import {
    Bold, Italic, List, Heading1, Heading2,
    Image as ImageIcon, Link as LinkIcon, Code,
    AlignLeft, AlignCenter, AlignRight, Underline as UnderlineIcon,
    Undo, Redo, Quote, Trash2, Sigma, Loader2, X
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
        className={`p-2 rounded-lg transition-colors relative ${isActive
            ? 'bg-teal-100 text-teal-700'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30'
            }`}
    >
        {isLoading ? <Loader2 size={18} className="animate-spin text-teal-600" /> : children}
    </button>
);

export default function TiptapEditor({ content, onChange }: TiptapEditorProps) {
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Underline,
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
                class: 'prose prose-lg prose-slate max-w-none focus:outline-none min-h-[400px]',
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

    const addEquation = () => {
        if (!editor) return;
        // Insert a LaTeX placeholder with $...$
        // You can adjust this to standard LaTeX behavior
        editor.chain().focus().insertContent(' $ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $ ').run();
    };

    if (!editor) {
        return null;
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-100 p-2 flex flex-wrap gap-1 sticky top-0 z-10 items-center justify-between">
                <div className="flex flex-wrap gap-1 items-center">
                    {/* Visual Mode Tools - Hide in HTML Mode */}
                    {!isHtmlMode && (
                        <>
                            <div className="flex gap-1 pr-2 border-r border-slate-200 mr-1">
                                <MenuButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
                                    <Undo size={18} />
                                </MenuButton>
                                <MenuButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
                                    <Redo size={18} />
                                </MenuButton>
                            </div>

                            <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
                                <Bold size={18} />
                            </MenuButton>
                            <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
                                <Italic size={18} />
                            </MenuButton>
                            <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">
                                <UnderlineIcon size={18} />
                            </MenuButton>

                            <div className="w-px h-6 bg-slate-200 mx-1"></div>

                            <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 1">
                                <Heading1 size={18} />
                            </MenuButton>
                            <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Heading 2">
                                <Heading2 size={18} />
                            </MenuButton>

                            <div className="w-px h-6 bg-slate-200 mx-1"></div>

                            <MenuButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
                                <AlignLeft size={18} />
                            </MenuButton>
                            <MenuButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">
                                <AlignCenter size={18} />
                            </MenuButton>
                            <MenuButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
                                <AlignRight size={18} />
                            </MenuButton>

                            <div className="w-px h-6 bg-slate-200 mx-1"></div>

                            <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
                                <List size={18} />
                            </MenuButton>
                            <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Quote">
                                <Quote size={18} />
                            </MenuButton>

                            <div className="w-px h-6 bg-slate-200 mx-1"></div>

                            <MenuButton onClick={setLink} isActive={editor.isActive('link')} title="Insert Link">
                                <LinkIcon size={18} />
                            </MenuButton>

                            {/* Image Upload Button */}
                            <MenuButton onClick={triggerImageUpload} title="Upload Image" isLoading={isUploading}>
                                <ImageIcon size={18} />
                            </MenuButton>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />

                            {/* Math / Equation Button */}
                            <MenuButton onClick={addEquation} title="Insert Equation (LaTeX)">
                                <Sigma size={18} />
                            </MenuButton>
                        </>
                    )}
                    {isHtmlMode && (
                        <span className="text-sm font-bold text-slate-500 px-2">HTML Source Code Mode</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (confirm('Clear all content?')) {
                                onChange('');
                                editor.commands.setContent('');
                            }
                        }}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                        title="Clear Content"
                    >
                        <Trash2 size={18} />
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsHtmlMode(!isHtmlMode);
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition ${isHtmlMode
                            ? 'bg-slate-800 text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <Code size={16} />
                        {isHtmlMode ? 'Back to Editor' : 'HTML Mode'}
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 relative">
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
