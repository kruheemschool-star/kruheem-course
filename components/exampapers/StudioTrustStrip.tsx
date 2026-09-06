import { ShieldCheck, MessageCircle, Star, Users } from "lucide-react";

const LINE_URL = "https://line.me/ti/p/~kruheemschool";

/**
 * แถบเครดิตครูฮีม — ธีม Studio ของหน้าขายชุดข้อสอบ PDF (/exam-papers/[id])
 *
 * อยู่ "เหนือปกและราคา" ตามสเปก เพราะผู้ปกครองต้องรู้ก่อนว่ากำลังจะโอนเงิน
 * ให้ใคร แล้วค่อยเห็นตัวเลข
 *
 * ตัวเลขรีวิวมาจากฝั่งเซิร์ฟเวอร์ (นับจาก collection จริง) ไม่ฮาร์ดโค้ด —
 * ถ้าส่งมาไม่ครบก็ตัดช่องนั้นทิ้ง ดีกว่าโชว์เลขที่ยืนยันไม่ได้
 *
 * หมายเหตุ: ตัวนี้แยกจาก KruheemTrustStrip ที่หน้าร้าน (/exam-papers) ใช้อยู่
 * โดยตั้งใจ — คนละธีม ถ้าแก้ข้อความตรงนี้ ให้ไปดูอีกไฟล์ด้วย
 */
export default function StudioTrustStrip({
    reviewCount,
    avgRating,
}: {
    reviewCount?: number;
    avgRating?: number;
}) {
    const showRating = !!(reviewCount && reviewCount >= 5 && avgRating);

    const facts: { icon: typeof Star; text: string; href?: string }[] = [
        ...(showRating
            ? [{ icon: Star, text: `${avgRating!.toFixed(1)} จาก ${reviewCount!.toLocaleString()} รีวิว` }]
            : []),
        { icon: Users, text: "ผู้ติดตามเพจ 140,000 คน" },
        { icon: ShieldCheck, text: "ครูฮีมตรวจสลิปและอนุมัติเอง" },
        { icon: MessageCircle, text: "ทักถามก่อนซื้อได้ทาง LINE", href: LINE_URL },
    ];

    return (
        <div className="khps-card p-7 md:px-9 md:py-8">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:gap-10">
                <div className="flex items-center gap-4 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/assets/kruheem_avatar.png"
                        alt="ครูฮีม"
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full object-cover shrink-0"
                        style={{ background: "var(--kp-slot)" }}
                    />
                    <div className="min-w-0">
                        <div className="text-[19px] font-semibold leading-tight">ครูฮีม</div>
                        <div className="text-[13px] mt-1 khps-muted">
                            ครูคณิตศาสตร์ ม.1–ม.6 · ประสบการณ์ 20 ปี
                        </div>
                    </div>
                </div>

                {/* 4 ช่องความน่าเชื่อถือ — บังคับ 2 คอลัมน์ให้ลงตัว 2×2
                    (auto-fit ทำให้ได้ 3+1 ซึ่งดูขาดๆ) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 flex-1">
                    {facts.map((f) => {
                        const Icon = f.icon;
                        const body = (
                            <>
                                <Icon size={15} className="shrink-0" style={{ color: "var(--kp-accent)" }} />
                                <span>{f.text}</span>
                            </>
                        );
                        return f.href ? (
                            <a
                                key={f.text}
                                href={f.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 text-[14px] font-light hover:underline"
                                style={{ color: "var(--kp-ink-2)" }}
                            >
                                {body}
                            </a>
                        ) : (
                            <div
                                key={f.text}
                                className="flex items-center gap-2.5 text-[14px] font-light"
                                style={{ color: "var(--kp-ink-2)" }}
                            >
                                {body}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
