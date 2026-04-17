import type { Section, SectionType } from "./types";

export const SECTION_META: Record<SectionType, { label: string; icon: string; desc: string }> = {
    hero: { label: "Hero", icon: "🎯", desc: "หัวเรื่อง + CTA + รูป/วิดีโอ" },
    painPoint: { label: "Pain Point / Solution", icon: "🔥", desc: "ปัญหา + ทางแก้" },
    solution: { label: "Solution Cards", icon: "💡", desc: "สิ่งที่จะได้รับ (cards)" },
    curriculum: { label: "Curriculum", icon: "📚", desc: "เนื้อหาในคอร์ส (accordion)" },
    reviews: { label: "Reviews (รูปรีวิว)", icon: "⭐", desc: "รูปรีวิวแบบ marquee" },
    testimonial: { label: "Testimonials", icon: "💬", desc: "เรื่องจริงจากนักเรียน + Before/After" },
    trustBadges: { label: "Trust Badges (สถิติ)", icon: "🏆", desc: "ตัวเลขน่าเชื่อถือ" },
    priceStack: { label: "Price Stack", icon: "💰", desc: "มูลค่ารวม + ราคาพิเศษ" },
    guarantee: { label: "Guarantee", icon: "🛡️", desc: "การันตี / คืนเงิน" },
    comparison: { label: "Comparison Table", icon: "📊", desc: "เทียบเรา vs ที่อื่น" },
    faq: { label: "FAQ", icon: "❓", desc: "คำถามที่พบบ่อย" },
    cta: { label: "Final CTA", icon: "🚀", desc: "ปิดการขายครั้งสุดท้าย" },
    countdown: { label: "Countdown Timer", icon: "⏰", desc: "นับถอยหลังโปรโมชั่น" },
};

export function createDefaultSection(type: SectionType, order: number): Section {
    const id = `${type}-${Date.now()}`;
    const base = { id, order, enabled: true };

    switch (type) {
        case "hero":
            return {
                ...base,
                type: "hero",
                data: {
                    badgeText: "คอร์สยอดนิยม",
                    title: "คอร์สของคุณ",
                    subtitle: "คำอธิบายสั้นๆ",
                    ctaText: "สมัครเรียนทันที",
                    ctaPriceText: "฿2,900",
                    secondaryCtaText: "ทดลองเรียน",
                    pricePerDayText: "เฉลี่ยวันละ 7.95 บาท",
                    blobColors: ["bg-indigo-200/40", "bg-rose-200/40"],
                },
            };
        case "painPoint":
            return {
                ...base,
                type: "painPoint",
                data: {
                    title: "ปัญหาเหล่านี้... เป็นกันอยู่ไหม?",
                    subtitle: "ถ้าใช่ คอร์สนี้สำหรับคุณ",
                    problemTitle: "ปัญหาที่พบบ่อย",
                    problemIcon: "😰",
                    problems: [
                        { icon: "😵", text: "ปัญหาข้อที่ 1" },
                        { icon: "📉", text: "ปัญหาข้อที่ 2" },
                    ],
                    solutionTitle: "สิ่งที่จะเปลี่ยนไป",
                    solutionIcon: "✨",
                    solutionDesc: "คำอธิบายสั้นๆ",
                    solutions: [
                        { icon: "✅", text: "ประโยชน์ข้อที่ 1" },
                        { icon: "✅", text: "ประโยชน์ข้อที่ 2" },
                    ],
                },
            };
        case "solution":
            return {
                ...base,
                type: "solution",
                data: {
                    title: "สิ่งที่จะได้รับ",
                    subtitle: "ครบในคอร์สเดียว",
                    items: [
                        { icon: "🎬", title: "หัวข้อ 1", desc: "คำอธิบาย" },
                        { icon: "📚", title: "หัวข้อ 2", desc: "คำอธิบาย" },
                        { icon: "💬", title: "หัวข้อ 3", desc: "คำอธิบาย" },
                    ],
                },
            };
        case "curriculum":
            return {
                ...base,
                type: "curriculum",
                data: {
                    title: "เนื้อหาในคอร์ส",
                    subtitle: "ครอบคลุมตามมาตรฐาน",
                    chapters: [
                        { id: 1, title: "บทที่ 1", desc: "คำอธิบาย", content: ["หัวข้อย่อย 1", "หัวข้อย่อย 2"] },
                    ],
                },
            };
        case "reviews":
            return {
                ...base,
                type: "reviews",
                data: {
                    title: "รีวิวจากผู้เรียน",
                    subtitle: "",
                    images: [],
                },
            };
        case "testimonial":
            return {
                ...base,
                type: "testimonial",
                data: {
                    title: "เรื่องจริงจากนักเรียน",
                    stories: [
                        { name: "น้อง A", role: "ม.3", quote: "คำพูดของนักเรียน", beforeScore: "45", afterScore: "85" },
                    ],
                },
            };
        case "trustBadges":
            return {
                ...base,
                type: "trustBadges",
                data: {
                    stats: [
                        { icon: "👨‍🎓", number: "1,500+", label: "นักเรียน" },
                        { icon: "⭐", number: "4.9", label: "รีวิว" },
                    ],
                },
            };
        case "priceStack":
            return {
                ...base,
                type: "priceStack",
                data: {
                    title: "คุ้มทุกบาท",
                    items: [
                        { name: "รายการ 1", value: 1000 },
                        { name: "รายการ 2", value: 500 },
                    ],
                    regularPrice: 4900,
                    finalPrice: 2900,
                    ctaText: "สมัครเลย",
                },
            };
        case "guarantee":
            return {
                ...base,
                type: "guarantee",
                data: {
                    badgeText: "รับประกัน",
                    title: "คืนเงิน 100% ภายใน 7 วัน",
                    desc: "ไม่พอใจคืนเงินเต็มจำนวน",
                    features: ["ไม่มีคำถามยุ่งยาก"],
                },
            };
        case "comparison":
            return {
                ...base,
                type: "comparison",
                data: {
                    title: "เปรียบเทียบ",
                    columns: [
                        { title: "เรียนเอง", features: [{ text: "ประหยัด", included: true }] },
                        { title: "ของเรา", highlight: true, features: [{ text: "ครบทุกอย่าง", included: true }] },
                        { title: "ที่อื่น", features: [{ text: "แพง", included: false }] },
                    ],
                },
            };
        case "faq":
            return {
                ...base,
                type: "faq",
                data: {
                    title: "คำถามที่พบบ่อย",
                    faqs: [{ q: "คำถาม?", a: "คำตอบ" }],
                },
            };
        case "cta":
            return {
                ...base,
                type: "cta",
                data: {
                    urgencyText: "🔥 เวลาจำกัด",
                    title: "พร้อมเริ่มเรียนแล้วหรือยัง?",
                    subtitle: "สมัครวันนี้ เริ่มเรียนทันที",
                    ctaText: "สมัครเรียนเลย",
                    priceText: "฿2,900",
                },
            };
        case "countdown": {
            // default: 7 days from now
            const end = new Date();
            end.setDate(end.getDate() + 7);
            return {
                ...base,
                type: "countdown",
                data: {
                    title: "🔥 โปรโมชั่นพิเศษ!",
                    subtitle: "ราคานี้เหลือเวลาอีกเพียง...",
                    endDate: end.toISOString(),
                    expiredMessage: "โปรโมชั่นหมดแล้ว — ติดต่อสอบถามราคาปกติ",
                    style: "inline",
                },
            };
        }
    }
}
