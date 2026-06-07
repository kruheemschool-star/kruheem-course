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
    videoPreview: { label: "Video Preview", icon: "🎬", desc: "วิดีโอตัวอย่างคอร์สเรียน" },
    articles: { label: "บทความ", icon: "📰", desc: "การ์ดลิงก์บทความ (blog / ลิงก์ภายนอก)" },
    howItWorks: { label: "วิธีเรียน (3 ขั้นตอน)", icon: "🪜", desc: "อธิบายขั้นตอนการเรียน ลดความกังวล" },
    quiz: { label: "แบบทดสอบประเมิน", icon: "🧭", desc: "quiz โต้ตอบ ประเมินความพร้อม + ผลลัพธ์" },
    features: { label: "ฟีเจอร์เด่นในคอร์ส", icon: "✨", desc: "การ์ดจุดเด่น/สิ่งที่มีในคอร์ส (ใส่รูปได้)" },
    statsTable: { label: "ตารางสถิติ", icon: "📋", desc: "ตาราง 2 คอลัมน์ (ตัวเลข | ความหมาย)" },
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
                    secondaryCtaText: "ดูเนื้อหาทั้งหมด",
                    pricePerDayText: "เฉลี่ยวันละ 1.59 บาท",
                    blobColors: ["bg-indigo-200/40", "bg-rose-200/40"],
                    // Rich course card is the standard cover for this template.
                    // (Set coverType: "image" on a course to use a plain image cover instead.)
                    coverType: "courseCard",
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
        case "statsTable":
            return {
                ...base,
                type: "statsTable",
                data: {
                    title: "",
                    leftHeader: "ตัวเลข",
                    rightHeader: "ความหมาย",
                    rows: [
                        { left: "100+", right: "รายละเอียด" },
                        { left: "5 ปี", right: "รายละเอียด" },
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
        case "videoPreview":
            return {
                ...base,
                type: "videoPreview",
                data: {
                    title: "ตัวอย่างคอร์สเรียน",
                    subtitle: "ลองชมบรรยากาศการสอนจริง",
                    videos: [
                        { title: "บทเรียนตัวอย่าง", youtubeUrl: "", description: "" },
                    ],
                },
            };
        case "articles":
            return {
                ...base,
                type: "articles",
                data: {
                    title: "บทความน่าอ่าน",
                    subtitle: "เจาะลึกเทคนิคและแนวข้อสอบ — อ่านเพิ่มก่อนตัดสินใจ",
                    items: [],
                },
            };
        case "howItWorks":
            return {
                ...base,
                type: "howItWorks",
                data: {
                    title: "เรียนยังไง? ง่ายแค่ 3 ขั้นตอน",
                    subtitle: "สมัครแล้วเริ่มเรียนได้ทันที ไม่ยุ่งยาก",
                    steps: [
                        { icon: "📝", title: "สมัครเรียน", desc: "สมัครและชำระเงิน เปิดสิทธิ์เข้าเรียนได้ทันที" },
                        { icon: "💻", title: "เรียนได้ทุกที่ทุกเวลา", desc: "ดูคลิปย้อนหลังได้ไม่จำกัด เรียนตามจังหวะของตัวเอง" },
                        { icon: "✅", title: "ฝึกโจทย์ + มีเฉลย", desc: "แบบฝึกหัดพร้อมเฉลยละเอียด สงสัยตรงไหนถามได้" },
                    ],
                    ctaText: "",
                },
            };
        case "features":
            return {
                ...base,
                type: "features",
                data: {
                    title: "ในคอร์สมีอะไรบ้าง?",
                    subtitle: "เครื่องมือครบ ช่วยให้เข้าใจ ฝึกจริง และจำได้นาน",
                    items: [
                        { icon: "📝", title: "ข้อสอบฝึกทำ + เฉลยละเอียด", desc: "โจทย์หลากหลายแนว พร้อมเฉลยอธิบายทีละขั้นตอน ฝึกจนคล่องมือ", badgeText: "จัดเต็ม", imageUrl: "" },
                        { icon: "🧠", title: "Mindmap สรุปเนื้อหา", desc: "สรุปแต่ละบทเป็นแผนภาพ เห็นภาพรวม เชื่อมโยงความรู้ เข้าใจง่าย", badgeText: "", imageUrl: "" },
                        { icon: "🎴", title: "Flashcard ทบทวน", desc: "บัตรคำช่วยทบทวนสูตรและนิยาม ทวนซ้ำก่อนสอบได้ทุกที่ทุกเวลา", badgeText: "", imageUrl: "" },
                    ],
                    ctaText: "",
                },
            };
        case "quiz":
            return {
                ...base,
                type: "quiz",
                data: {
                    title: "ลูกพร้อมสอบเข้าแค่ไหน?",
                    subtitle: "ตอบ 5 ข้อสั้นๆ รู้ผลทันที พร้อมคำแนะนำจากครูฮีม",
                    startButtonText: "เริ่มทำแบบทดสอบ",
                    retakeButtonText: "ทำใหม่อีกครั้ง",
                    questions: [
                        {
                            question: "ตอนนี้ลูกทำโจทย์คณิตเรื่องที่เคยเรียนมาแล้ว ได้คล่องแค่ไหน?",
                            options: [
                                { text: "ทำได้คล่อง เกือบทุกข้อ", score: 2 },
                                { text: "ทำได้บ้าง แต่ยังลืมบางเรื่อง", score: 1 },
                                { text: "ลืมเยอะ ทำไม่ค่อยได้", score: 0 },
                            ],
                        },
                        {
                            question: "เหลือเวลาก่อนสอบประมาณเท่าไหร่?",
                            options: [
                                { text: "มากกว่า 6 เดือน", score: 2 },
                                { text: "ประมาณ 3–6 เดือน", score: 1 },
                                { text: "น้อยกว่า 3 เดือน", score: 0 },
                            ],
                        },
                        {
                            question: "ลูกมีวินัยทบทวนบทเรียนเองไหม?",
                            options: [
                                { text: "ทบทวนสม่ำเสมอเองได้", score: 2 },
                                { text: "ต้องคอยเตือนบ้าง", score: 1 },
                                { text: "แทบไม่ได้ทบทวนเลย", score: 0 },
                            ],
                        },
                        {
                            question: "เวลาเจอโจทย์ยากๆ ลูกมักจะ...",
                            options: [
                                { text: "พยายามคิดหาวิธีก่อน", score: 2 },
                                { text: "ลองนิดหน่อยแล้วยอมแพ้", score: 1 },
                                { text: "ข้ามทันที ไม่อยากทำ", score: 0 },
                            ],
                        },
                        {
                            question: "ลูกมั่นใจกับวิชาคณิตแค่ไหน?",
                            options: [
                                { text: "มั่นใจ ชอบเลข", score: 2 },
                                { text: "เฉยๆ กลางๆ", score: 1 },
                                { text: "ไม่มั่นใจ กลัวเลข", score: 0 },
                            ],
                        },
                    ],
                    results: [
                        {
                            minScore: 0,
                            emoji: "🔴",
                            title: "ต้องเร่งเตรียมตัวแล้ว!",
                            desc: "ยังมีหลายจุดที่ต้องปูพื้นใหม่ให้แน่น แต่ไม่ต้องกังวล ยิ่งเริ่มเร็วยิ่งได้เปรียบ ครูฮีมช่วยวางแผนตั้งแต่ต้นให้ได้",
                            ctaText: "ปรึกษาครูฮีมฟรี",
                            ctaUrl: "",
                        },
                        {
                            minScore: 4,
                            emoji: "🟡",
                            title: "พร้อมปานกลาง — เสริมอีกนิด",
                            desc: "ลูกมีพื้นฐานอยู่แล้ว แต่ยังมีบางจุดที่ต้องอุดให้แน่น ถ้าเริ่มติวตอนนี้ยังทันแน่นอน",
                            ctaText: "เริ่มเตรียมตัวกับครูฮีม",
                            ctaUrl: "",
                        },
                        {
                            minScore: 7,
                            emoji: "🟢",
                            title: "พร้อมสอบในระดับดี!",
                            desc: "พื้นฐานแน่นมาก เหลือแค่ฝึกโจทย์แนวข้อสอบให้ชำนาญ คอร์สของครูฮีมจะช่วยต่อยอดให้ติดชัวร์",
                            ctaText: "ดูคอร์สที่เหมาะกับลูก",
                            ctaUrl: "",
                        },
                    ],
                },
            };
    }
}
