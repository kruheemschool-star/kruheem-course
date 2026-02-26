"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

interface ContentItem {
    id: string;
    title: string;
    coverImage?: string;
}

interface CardConfig {
    key: string;
    heading: string;
    href: string;
    ctaText: string;
    overlayGradient: string;
    dotActive: string;
    placeholderBg: string;
    badgeBg: string;
}

const CARDS: CardConfig[] = [
    {
        key: "exams",
        heading: "คลังข้อสอบ",
        href: "/exam",
        ctaText: "เริ่มทำข้อสอบ",
        overlayGradient: "from-black/70 via-black/30 to-transparent",
        dotActive: "bg-amber-400",
        placeholderBg: "bg-gradient-to-br from-amber-200 via-orange-100 to-amber-50",
        badgeBg: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    },
    {
        key: "summaries",
        heading: "สรุปเนื้อหา",
        href: "/summary",
        ctaText: "อ่านสรุป",
        overlayGradient: "from-black/70 via-black/30 to-transparent",
        dotActive: "bg-teal-400",
        placeholderBg: "bg-gradient-to-br from-teal-200 via-cyan-100 to-teal-50",
        badgeBg: "bg-teal-500/20 text-teal-200 border-teal-400/30",
    },
    {
        key: "posts",
        heading: "เทคนิคการเรียน",
        href: "/blog",
        ctaText: "อ่านบทความ",
        overlayGradient: "from-black/70 via-black/30 to-transparent",
        dotActive: "bg-emerald-400",
        placeholderBg: "bg-gradient-to-br from-emerald-200 via-green-100 to-emerald-50",
        badgeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    },
];

function shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function FeatureCard({ config, items }: { config: CardConfig; items: ContentItem[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const showSlideshow = items.length > 1;

    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!showSlideshow) return;
        timerRef.current = setInterval(() => {
            setNextIndex(prev => {
                const curr = prev !== null ? prev : 0;
                return curr;
            });
            setCurrentIndex(prev => (prev + 1) % items.length);
        }, 4500);
    }, [showSlideshow, items.length]);

    useEffect(() => {
        startTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [startTimer]);

    // Reset nextIndex after transition
    useEffect(() => {
        if (nextIndex !== null) {
            const t = setTimeout(() => setNextIndex(null), 50);
            return () => clearTimeout(t);
        }
    }, [nextIndex]);

    const currentItem = items.length > 0 ? items[currentIndex] : null;

    return (
        <Link href={config.href} className="block group">
            <div className="relative overflow-hidden rounded-3xl aspect-[3/4.4] shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">

                {/* Slideshow Images - stacked absolutely */}
                {items.map((item, i) => (
                    <div
                        key={item.id}
                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                            i === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                        }`}
                    >
                        {item.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.coverImage}
                                alt={item.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className={`w-full h-full ${config.placeholderBg}`} />
                        )}
                    </div>
                ))}

                {/* Fallback when no items */}
                {items.length === 0 && (
                    <div className={`absolute inset-0 ${config.placeholderBg}`} />
                )}

                {/* Bottom gradient overlay */}
                <div className={`absolute inset-0 z-20 bg-gradient-to-t ${config.overlayGradient}`} />

                {/* Content overlay - positioned at bottom */}
                <div className="absolute inset-x-0 bottom-0 z-30 p-6 md:p-7 flex flex-col items-start">
                    {/* Category badge */}
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide border backdrop-blur-sm mb-3 ${config.badgeBg}`}>
                        {config.heading}
                    </span>

                    {/* Content title */}
                    <h3 className={`text-white font-bold text-base md:text-lg lg:text-xl leading-snug line-clamp-2 mb-4 transition-opacity duration-700 ${currentItem ? 'opacity-100' : 'opacity-0'}`}>
                        {currentItem?.title || ""}
                    </h3>

                    {/* Bottom row: CTA + dots */}
                    <div className="flex items-center justify-between w-full">
                        {/* Glass CTA button */}
                        <button className="group/btn flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/30 text-white text-sm md:text-base font-bold hover:bg-white/20 transition-all shadow-lg">
                            {config.ctaText}
                            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>

                        {/* Slideshow dots */}
                        {showSlideshow && (
                            <div className="flex items-center gap-2">
                                {items.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`rounded-full transition-all duration-300 ${
                                            i === currentIndex
                                                ? `w-7 h-2 md:w-8 md:h-2.5 ${config.dotActive}`
                                                : 'w-2 h-2 md:w-2.5 md:h-2.5 bg-white/40'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default function FeatureCarousel() {
    const [examItems, setExamItems] = useState<ContentItem[]>([]);
    const [summaryItems, setSummaryItems] = useState<ContentItem[]>([]);
    const [postItems, setPostItems] = useState<ContentItem[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const examSnap = await getDocs(query(collection(db, "exams"), orderBy("createdAt", "asc")));
                const exams = examSnap.docs.map(d => ({
                    id: d.id,
                    title: d.data().title || "",
                    coverImage: d.data().coverImage || "",
                }));
                setExamItems(shuffleArray(exams).slice(0, 6));

                const sumSnap = await getDocs(query(collection(db, "summaries")));
                const sums = sumSnap.docs
                    .map(d => ({
                        id: d.id,
                        title: d.data().title || "",
                        coverImage: d.data().coverImage || "",
                        status: d.data().status || "",
                    }))
                    .filter(s => s.status === "published" || !s.status);
                setSummaryItems(shuffleArray(sums).slice(0, 6));

                const postSnap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
                const posts = postSnap.docs
                    .map(d => ({
                        id: d.id,
                        title: d.data().title || "",
                        coverImage: d.data().coverImage || "",
                        status: d.data().status || "published",
                    }))
                    .filter(p => p.status === "published");
                setPostItems(shuffleArray(posts).slice(0, 6));
            } catch (error) {
                console.error("Error fetching feature content:", error);
            }
        };

        fetchData();
    }, []);

    const dataMap: Record<string, ContentItem[]> = {
        exams: examItems,
        summaries: summaryItems,
        posts: postItems,
    };

    return (
        <section className="py-12 px-6 relative z-10">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CARDS.map((card) => (
                    <FeatureCard
                        key={card.key}
                        config={card}
                        items={dataMap[card.key]}
                    />
                ))}
            </div>
        </section>
    );
}
