import Link from "next/link";
import { Star } from "lucide-react";
import type { TrustReview } from "@/lib/paperTrust";

function Avatar({ photo, name }: { photo?: string; name: string }) {
    const initial = name?.[0]?.toUpperCase() || "?";
    // รูปโปรไฟล์ในคลังมี 3 แบบปนกัน: URL, path ในเว็บ (/avatars/...) และอิโมจิ
    const isImage = !!photo && (photo.startsWith("http") || photo.startsWith("/"));
    return (
        <span
            className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden font-semibold text-[15px]"
            style={{ background: "var(--kp-accent-soft)", color: "var(--kp-accent)" }}
        >
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
 * เสียงจากผู้เรียนกับครูฮีม — ธีม Studio (รีวิวจริงจาก collection `reviews`)
 *
 * พาดหัวจงใจไม่พูดว่า "รีวิวชุดนี้" และการ์ดทุกใบติดชื่อคอร์สที่คนนั้นรีวิวจริง
 * เพราะยังไม่มีระบบรีวิวรายไฟล์ PDF — ต้องไม่ทำให้ผู้ปกครองเข้าใจผิด
 */
export default function StudioReviews({
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
        <section className="khps-sec">
            <div className="khps-eyebrow">เสียงจากผู้เรียน</div>
            <h2 className="khps-h2 mt-3.5" style={{ maxWidth: "26ch" }}>
                คนที่เรียนกับครูฮีมพูดว่าอย่างไร
            </h2>
            <p className="mt-4 text-[15px] font-light khps-muted" style={{ maxWidth: "62ch" }}>
                รีวิวจริงจากคอร์สและคลังข้อสอบของครูฮีม
                {showStats ? ` — เฉลี่ย ${avgRating!.toFixed(1)} จาก 5 ดาว` : ""}
            </p>
            {showStats && (
                <Link
                    href="/reviews"
                    className="inline-block mt-3 text-[13.5px] font-medium hover:underline"
                    style={{ color: "var(--kp-accent)" }}
                >
                    ดูรีวิวทั้งหมด {reviewCount!.toLocaleString()} รายการ
                </Link>
            )}

            <div
                className="grid gap-5 mt-9"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
            >
                {reviews.map((r) => (
                    <figure key={r.id} className="khps-card-sm p-7 flex flex-col">
                        <div className="flex items-center gap-1 mb-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    size={14}
                                    style={{
                                        color: i < r.rating ? "var(--kp-accent)" : "var(--kp-track)",
                                        fill: i < r.rating ? "var(--kp-accent)" : "var(--kp-track)",
                                    }}
                                />
                            ))}
                        </div>
                        <blockquote
                            className="text-[18px] font-light leading-[1.75] flex-1"
                            style={{ color: "var(--kp-ink-2)", textWrap: "pretty" }}
                        >
                            {r.comment}
                        </blockquote>
                        <figcaption className="flex items-center gap-3 mt-6">
                            <Avatar photo={r.userPhoto} name={r.userName} />
                            <span className="min-w-0">
                                <span className="block text-[14px] font-medium truncate">{r.userName}</span>
                                {r.courseName && (
                                    <span className="block text-[12px] khps-muted truncate">
                                        รีวิว{r.courseName}
                                    </span>
                                )}
                            </span>
                        </figcaption>
                    </figure>
                ))}
            </div>
        </section>
    );
}
