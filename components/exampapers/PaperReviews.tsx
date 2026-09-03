import Link from "next/link";
import { Star, Quote } from "lucide-react";
import type { TrustReview } from "@/lib/paperTrust";

function Avatar({ photo, name }: { photo?: string; name: string }) {
    const initial = name?.[0]?.toUpperCase() || "?";
    // รูปโปรไฟล์ในคลังมี 3 แบบปนกัน: URL, path ในเว็บ (/avatars/...) และอิโมจิ
    const isImage = !!photo && (photo.startsWith("http") || photo.startsWith("/"));
    return (
        <span className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 shrink-0 flex items-center justify-center overflow-hidden text-teal-700 dark:text-teal-200 font-bold">
            {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={name} loading="lazy" className="w-full h-full object-cover" />
            ) : photo ? (
                <span className="text-xl" role="img" aria-label="avatar">{photo}</span>
            ) : (
                initial
            )}
        </span>
    );
}

/**
 * เสียงจากผู้เรียนกับครูฮีม (รีวิวจริงจาก collection `reviews`)
 *
 * พาดหัวจงใจไม่พูดว่า "รีวิวชุดนี้" และการ์ดทุกใบติดชื่อคอร์สที่คนนั้นรีวิวจริง
 * เพราะยังไม่มีระบบรีวิวรายไฟล์ PDF — ต้องไม่ทำให้ผู้ปกครองเข้าใจผิด
 */
export default function PaperReviews({
    reviews,
    reviewCount,
    avgRating,
}: {
    reviews: TrustReview[];
    reviewCount?: number;
    avgRating?: number;
}) {
    if (!reviews?.length) return null;
    const showStats = !!(reviewCount && reviewCount >= 5 && avgRating);

    return (
        <div className="mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">เสียงจากผู้เรียนกับครูฮีม</h2>
                {showStats && (
                    <Link href="/reviews" className="text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                        ดูรีวิวทั้งหมด {reviewCount!.toLocaleString()} รายการ
                    </Link>
                )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                รีวิวจริงจากคอร์สและคลังข้อสอบของครูฮีม
                {showStats ? ` — เฉลี่ย ${avgRating!.toFixed(1)} จาก 5 ดาว` : ""}
            </p>

            <div className="grid gap-4 md:grid-cols-3 mt-5">
                {reviews.map((r) => (
                    <figure
                        key={r.id}
                        className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
                    >
                        <Quote size={30} className="absolute top-4 right-4 text-slate-100 dark:text-slate-800" aria-hidden />
                        <div className="flex items-center gap-0.5 mb-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    size={14}
                                    className={i < r.rating ? "text-amber-400 fill-amber-400" : "text-slate-200 dark:text-slate-700"}
                                />
                            ))}
                        </div>
                        <blockquote className="relative text-[13.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {r.comment}
                        </blockquote>
                        <figcaption className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Avatar photo={r.userPhoto} name={r.userName} />
                            <span className="min-w-0">
                                <span className="block text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{r.userName}</span>
                                {r.courseName && (
                                    <span className="block text-[11.5px] text-slate-400 dark:text-slate-500 truncate">
                                        รีวิว{r.courseName}
                                    </span>
                                )}
                            </span>
                        </figcaption>
                    </figure>
                ))}
            </div>
        </div>
    );
}
