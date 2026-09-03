import { ShieldCheck, MessageCircle, Star, Users } from "lucide-react";

const LINE_URL = "https://line.me/ti/p/~kruheemschool";

/**
 * แถบ "ซื้อจากใคร" ของร้านข้อสอบ PDF
 *
 * ปัญหาที่แก้: คนที่หลุดเข้าร้านมาจากโฆษณาเห็นแค่การ์ดสินค้ากับปุ่มโอนเงิน
 * ไม่มีอะไรบอกว่าปลายทางเป็นใคร — ซึ่งเป็นด่านแรกที่ผู้ปกครองใช้ตัดสินใจ
 *
 * ตัวเลขรีวิวรับมาจากฝั่งเซิร์ฟเวอร์ (นับจาก collection จริง) ไม่ฮาร์ดโค้ด —
 * ถ้าส่งมาไม่ครบก็ซ่อนช่องนั้นไปเลย ดีกว่าโชว์เลขที่ยืนยันไม่ได้
 */
export default function KruheemTrustStrip({
    reviewCount,
    avgRating,
    compact = false,
}: {
    reviewCount?: number;
    avgRating?: number;
    compact?: boolean;
}) {
    const showRating = !!(reviewCount && reviewCount >= 5 && avgRating);

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 md:px-7 md:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="flex items-center gap-4 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/assets/kruheem_avatar.png"
                        alt="ครูฮีม"
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-2xl object-cover bg-teal-50 dark:bg-teal-950 shrink-0"
                    />
                    <div className="min-w-0">
                        <div className="font-black text-slate-900 dark:text-white leading-tight">ครูฮีม</div>
                        <div className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                            ครูคณิตศาสตร์ ม.1–ม.6 · ประสบการณ์ 20 ปี
                        </div>
                    </div>
                </div>

                <div className="hidden sm:block w-px self-stretch bg-slate-100 dark:bg-slate-800" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5 text-[13px] flex-1">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Users size={15} className="text-teal-500 shrink-0" />
                        ผู้ติดตามเพจ 140,000 คน
                    </div>
                    {showRating && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <Star size={15} className="text-amber-400 fill-amber-400 shrink-0" />
                            {avgRating!.toFixed(1)} จาก {reviewCount!.toLocaleString()} รีวิว
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <ShieldCheck size={15} className="text-teal-500 shrink-0" />
                        ครูฮีมตรวจสลิปและอนุมัติเอง
                    </div>
                    {!compact && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <MessageCircle size={15} className="text-teal-500 shrink-0" />
                            <a
                                href={LINE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                            >
                                ทักถามก่อนซื้อได้ทาง LINE
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
