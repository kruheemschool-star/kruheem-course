"use client";

import { useState } from "react";
import { Copy, Image as ImageIcon, Loader2, UploadCloud } from "lucide-react";
import { storage } from "@/lib/firebase"; // Ensure you export storage from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ImageUploadHelper({ onUploadComplete }: { onUploadComplete?: (url: string) => void }) {
    const [uploading, setUploading] = useState(false);
    const [lastUploadedUrl, setLastUploadedUrl] = useState("");

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // Create a unique filename
            const filename = `exam-images/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filename);

            // Upload
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            setLastUploadedUrl(downloadURL);
            if (onUploadComplete) {
                onUploadComplete(downloadURL);
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert("อัปโหลดรูปภาพไม่สำเร็จ");
        } finally {
            setUploading(false);
        }
    };

    const copyToClipboard = () => {
        if (lastUploadedUrl) {
            navigator.clipboard.writeText(lastUploadedUrl);
            alert("คัดลอก URL เรียบร้อยแล้ว! นำไปวางในช่อง 'image' ได้เลย");
        }
    };

    return (
        <div className="bg-[#252526] p-4 border-b border-[#3d3d3d] flex flex-col gap-3">
            <h4 className="text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <ImageIcon size={14} className="text-amber-500" />
                เครื่องมือฝากรูป
            </h4>

            <div className="flex items-center gap-3">
                <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#333] hover:bg-[#444] rounded-lg cursor-pointer border border-[#444] hover:border-amber-500/50 transition-all group ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                    {uploading ? <Loader2 size={16} className="animate-spin text-amber-500" /> : <UploadCloud size={16} className="text-slate-400 group-hover:text-amber-500" />}
                    <span className="text-xs text-slate-300 group-hover:text-white font-medium">
                        {uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูปลง Cloud"}
                    </span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
            </div>

            {lastUploadedUrl && (
                <div className="bg-[#1e1e1e] p-2 rounded border border-green-900/50 relative group">
                    <p className="text-[10px] text-green-400 font-mono break-all pr-8 line-clamp-1">
                        {lastUploadedUrl}
                    </p>
                    <button
                        onClick={copyToClipboard}
                        className="absolute right-1 top-1 p-1 hover:bg-[#333] rounded text-slate-400 hover:text-white transition-colors"
                        title="Copy URL"
                    >
                        <Copy size={12} />
                    </button>
                    {/* Thumbnail Preview on Hover */}
                    <div className="hidden group-hover:block absolute top-full left-0 z-50 mt-2 p-1 bg-white rounded shadow-xl border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={lastUploadedUrl} alt="Preview" className="max-w-[150px] max-h-[150px] object-contain rounded" />
                    </div>
                </div>
            )}
        </div>
    );
}
