"use client";
import { useState, useEffect } from "react";
import type { VideoPreviewData, VideoPreviewItem } from "../types";
import { Play } from "lucide-react";

/* ─── Helpers ─── */
function extractYouTubeId(url: string): string | null {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

/* ─── Single video tile (thumbnail → click → inline iframe) ─── */
function VideoSlide({ video, isActive }: { video: VideoPreviewItem; isActive: boolean }) {
    const [playing, setPlaying] = useState(false);
    const videoId = extractYouTubeId(video.youtubeUrl);
    const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;

    useEffect(() => { if (!isActive) setPlaying(false); }, [isActive]);

    if (!videoId) {
        return (
            <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--kh-d1), var(--kh-d3))" }}
            >
                <div className="text-center" style={{ color: "var(--kh-onDmut)" }}>
                    <Play size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">ยังไม่ได้ตั้ง URL วิดีโอ</p>
                </div>
            </div>
        );
    }

    if (playing) {
        return (
            <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
            />
        );
    }

    return (
        <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full cursor-pointer group/play"
            aria-label={`Play ${video.title}`}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={thumb!}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/play:scale-[1.03]"
                loading="lazy"
                onError={(e) => {
                    e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }}
            />
            {/* Theme-dark scrim for legibility */}
            <div
                className="absolute inset-0 opacity-50 group-hover/play:opacity-30 transition-opacity duration-500"
                style={{ background: "linear-gradient(to top, var(--kh-d1), transparent 60%)" }}
            />
            {/* Free-sample chip */}
            <span
                className="kh-chip absolute top-3 left-3"
                style={{ background: "var(--kh-goodBg)", color: "var(--kh-goodText)", borderColor: "transparent" }}
            >
                ฟรี
            </span>
            {/* Play badge */}
            <span className="absolute inset-0 flex items-center justify-center">
                <span
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-transform duration-300 group-hover/play:scale-110"
                    style={{ background: "var(--kh-p)", color: "var(--kh-onD)", boxShadow: "var(--kh-shadow-sm)" }}
                >
                    <Play className="ml-1" size={26} fill="currentColor" />
                </span>
            </span>
        </button>
    );
}

/* ─── Main Section ─── */
export default function VideoPreviewSection({ data }: { data: VideoPreviewData }) {
    const validVideos = data.videos?.filter((v) => v.title || v.youtubeUrl) || [];

    if (validVideos.length === 0) return null;

    // Keep the grid balanced for small counts.
    const gridClass =
        validVideos.length === 1
            ? "max-w-md mx-auto"
            : validVideos.length === 2
                ? "sm:grid-cols-2 max-w-3xl mx-auto"
                : "sm:grid-cols-2 md:grid-cols-3";

    return (
        <section className="kh-sec">
            {/* Header */}
            <div className="kh-sec-head">
                <h2 className="kh-h2">
                    {data.title || "ตัวอย่างคอร์สเรียน"}{" "}
                    <span aria-hidden="true">🎬</span>
                </h2>
                {data.subtitle && <p className="kh-sub mt-3">{data.subtitle}</p>}
            </div>

            {/* Video card grid */}
            <div className={`grid gap-6 ${gridClass}`}>
                {validVideos.map((video, i) => (
                    <div key={i} className="kh-card kh-lift overflow-hidden flex flex-col">
                        {/* Thumbnail / player area */}
                        <div
                            className="relative w-full aspect-video overflow-hidden"
                            style={{ background: "var(--kh-d1)" }}
                        >
                            <VideoSlide video={video} isActive />
                        </div>

                        {/* Body */}
                        <div className="flex flex-col flex-1 p-5">
                            <h3 className="kh-h3 line-clamp-2" style={{ fontSize: 17 }}>
                                {video.title}
                            </h3>
                            {video.description && (
                                <p className="mt-1.5 text-sm leading-relaxed line-clamp-2" style={{ color: "var(--kh-mut)" }}>
                                    {video.description}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
