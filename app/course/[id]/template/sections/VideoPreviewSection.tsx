"use client";
import { useState, useRef, useEffect } from "react";
import type { VideoPreviewData, VideoPreviewItem } from "../types";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

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

/* ─── Single video slide ─── */
function VideoSlide({ video, isActive }: { video: VideoPreviewItem; isActive: boolean }) {
    const [playing, setPlaying] = useState(false);
    const videoId = extractYouTubeId(video.youtubeUrl);
    const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;

    useEffect(() => { if (!isActive) setPlaying(false); }, [isActive]);

    if (!videoId) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                <div className="text-center text-slate-500">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20 group-hover/play:from-black/40 group-hover/play:via-transparent group-hover/play:to-black/10 transition-all duration-500" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl shadow-black/30 group-hover/play:scale-110 group-hover/play:bg-white transition-all duration-300">
                    <Play className="text-red-600 ml-1.5" size={36} fill="currentColor" />
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
                <p className="text-white font-bold text-base md:text-lg drop-shadow-lg truncate">{video.title}</p>
                {video.description && (
                    <p className="text-white/70 text-sm mt-0.5 line-clamp-1 drop-shadow">{video.description}</p>
                )}
            </div>
        </button>
    );
}

/* ─── MacBook Frame ─── */
function MacBookFrame({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative mx-auto" style={{ maxWidth: 860 }}>
            {/* ── Screen lid ── */}
            <div
                className="relative rounded-t-[1rem] md:rounded-t-[1.2rem] overflow-hidden"
                style={{
                    background: "linear-gradient(180deg, #1d1d1f 0%, #0d0d0f 100%)",
                    padding: "8px 8px 0 8px",
                }}
            >
                {/* Notch / Camera */}
                <div className="relative flex justify-center" style={{ marginBottom: "-1px" }}>
                    <div
                        className="relative z-20 flex items-center justify-center"
                        style={{
                            width: 80,
                            height: 16,
                            background: "#0d0d0f",
                            borderRadius: "0 0 10px 10px",
                        }}
                    >
                        <div className="w-[5px] h-[5px] rounded-full bg-[#1e1e20] border border-[#2a2a2c] shadow-inner" />
                    </div>
                </div>

                {/* Screen */}
                <div
                    className="relative w-full bg-black overflow-hidden"
                    style={{ aspectRatio: "16 / 10", borderRadius: "2px" }}
                >
                    {children}

                    {/* Glass reflection */}
                    <div
                        className="absolute inset-0 pointer-events-none z-10"
                        style={{
                            background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 35%, transparent 65%, rgba(255,255,255,0.02) 100%)",
                        }}
                    />
                </div>
            </div>

            {/* ── Bottom chin / hinge ── */}
            <div
                className="relative mx-auto"
                style={{
                    width: "100%",
                    height: 14,
                    background: "linear-gradient(180deg, #2a2a2c 0%, #3a3a3c 40%, #4a4a4c 100%)",
                    borderRadius: "0 0 2px 2px",
                }}
            />
            {/* Base / keyboard deck */}
            <div
                className="relative mx-auto"
                style={{
                    width: "108%",
                    marginLeft: "-4%",
                    height: 10,
                    background: "linear-gradient(180deg, #c0c0c2 0%, #d4d4d6 50%, #b8b8ba 100%)",
                    borderRadius: "0 0 8px 8px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)",
                }}
            >
                {/* Trackpad indent hint */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2"
                    style={{
                        width: 60,
                        height: 4,
                        background: "linear-gradient(180deg, #a8a8aa, #b8b8ba)",
                        borderRadius: "0 0 4px 4px",
                    }}
                />
            </div>

            {/* Shadow under laptop */}
            <div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 -z-10"
                style={{
                    width: "90%",
                    height: 20,
                    background: "radial-gradient(ellipse, rgba(0,0,0,0.18) 0%, transparent 70%)",
                    filter: "blur(6px)",
                }}
            />
        </div>
    );
}

/* ─── Main Section ─── */
export default function VideoPreviewSection({ data }: { data: VideoPreviewData }) {
    const validVideos = data.videos?.filter((v) => v.title || v.youtubeUrl) || [];
    const [current, setCurrent] = useState(0);
    const touchStartX = useRef(0);
    const touchDeltaX = useRef(0);

    if (validVideos.length === 0) return null;

    const count = validVideos.length;
    const hasPrev = current > 0;
    const hasNext = current < count - 1;

    const goTo = (idx: number) => setCurrent(Math.max(0, Math.min(count - 1, idx)));
    const prev = () => goTo(current - 1);
    const next = () => goTo(current + 1);

    const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchDeltaX.current = 0; };
    const onTouchMove = (e: React.TouchEvent) => { touchDeltaX.current = e.touches[0].clientX - touchStartX.current; };
    const onTouchEnd = () => {
        if (touchDeltaX.current > 50 && hasPrev) prev();
        else if (touchDeltaX.current < -50 && hasNext) next();
    };

    return (
        <section className="w-full py-16 md:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-hidden">
            {/* Header */}
            <div className="text-center mb-12 md:mb-16 px-4">
                <h2 className="text-3xl md:text-5xl font-extrabold text-slate-800 mb-4 tracking-tight">
                    {data.title || "ตัวอย่างคอร์สเรียน"}{" "}
                    <span className="text-indigo-600">🎬</span>
                </h2>
                {data.subtitle && (
                    <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto">{data.subtitle}</p>
                )}
                <div className="w-24 h-1.5 bg-indigo-600 mx-auto rounded-full opacity-20 mt-5" />
            </div>

            {/* MacBook + Carousel */}
            <div className="max-w-4xl mx-auto px-4 md:px-8">
                <div className="relative group">
                    <MacBookFrame>
                        {/* Slides */}
                        <div
                            className="absolute inset-0 flex transition-transform duration-500 ease-out"
                            style={{
                                width: `${count * 100}%`,
                                transform: `translateX(-${(current * 100) / count}%)`,
                            }}
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        >
                            {validVideos.map((video, i) => (
                                <div key={i} className="relative h-full" style={{ width: `${100 / count}%` }}>
                                    <VideoSlide video={video} isActive={i === current} />
                                </div>
                            ))}
                        </div>
                    </MacBookFrame>

                    {/* Navigation arrows */}
                    {count > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={prev}
                                disabled={!hasPrev}
                                className={`absolute left-0 md:-left-6 top-[45%] -translate-y-1/2 z-20 w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    hasPrev
                                        ? "bg-white shadow-lg shadow-slate-200/60 hover:shadow-xl hover:scale-110 text-slate-700 hover:text-indigo-600 border border-slate-200"
                                        : "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-100"
                                }`}
                                aria-label="Previous video"
                            >
                                <ChevronLeft size={22} />
                            </button>
                            <button
                                type="button"
                                onClick={next}
                                disabled={!hasNext}
                                className={`absolute right-0 md:-right-6 top-[45%] -translate-y-1/2 z-20 w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    hasNext
                                        ? "bg-white shadow-lg shadow-slate-200/60 hover:shadow-xl hover:scale-110 text-slate-700 hover:text-indigo-600 border border-slate-200"
                                        : "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-100"
                                }`}
                                aria-label="Next video"
                            >
                                <ChevronRight size={22} />
                            </button>
                        </>
                    )}
                </div>

                {/* Title + dots below MacBook */}
                <div className="text-center mt-8 md:mt-10">
                    <div className="min-h-[3.5rem]">
                        <h3 className="font-bold text-slate-800 text-lg md:text-xl transition-all duration-300">
                            {validVideos[current]?.title}
                        </h3>
                        {validVideos[current]?.description && (
                            <p className="text-sm md:text-base text-slate-500 mt-1.5 max-w-lg mx-auto leading-relaxed">
                                {validVideos[current].description}
                            </p>
                        )}
                    </div>

                    {count > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-5">
                            {validVideos.map((v, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => goTo(i)}
                                    className={`rounded-full transition-all duration-300 ${
                                        i === current
                                            ? "w-8 h-2.5 bg-indigo-600"
                                            : "w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400"
                                    }`}
                                    aria-label={`Go to video ${i + 1}: ${v.title}`}
                                />
                            ))}
                        </div>
                    )}

                    {count > 1 && (
                        <p className="text-xs text-slate-400 font-medium mt-3">
                            {current + 1} / {count}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
