import type { SalesPageConfig } from "@/app/course/[id]/template/types";
import { STATIC_REVIEWS } from "@/lib/staticAssets";

interface Input {
    title: string;
    price: number;
    fullPrice: number;
}

export function buildSampleSalesPage({ title, price, fullPrice }: Input): SalesPageConfig {
    // Countdown: ends in 7 days
    const countdownEnd = new Date();
    countdownEnd.setDate(countdownEnd.getDate() + 7);

    return {
        enabled: true,
        boosters: {
            stickyCTA: {
                enabled: true,
                ctaText: "สมัครเรียน",
                priceText: `฿${price.toLocaleString("th-TH")}`,
                showAfterScrollPx: 600,
            },
            socialProof: {
                enabled: true,
                intervalSeconds: 15,
                displaySeconds: 5,
                messages: [
                    { name: "คุณสมชาย", location: "กรุงเทพฯ", action: "เพิ่งสมัครคอร์สนี้", timeAgo: "3 นาทีที่แล้ว" },
                    { name: "คุณสมหญิง", location: "เชียงใหม่", action: "เพิ่งสมัครคอร์สนี้", timeAgo: "8 นาทีที่แล้ว" },
                    { name: "น้องเอ", location: "ภูเก็ต", action: "เพิ่งสมัครคอร์สนี้", timeAgo: "15 นาทีที่แล้ว" },
                    { name: "น้องบี", location: "ขอนแก่น", action: "เพิ่งสมัครคอร์สนี้", timeAgo: "22 นาทีที่แล้ว" },
                ],
            },
            exitIntent: {
                enabled: true,
                title: "เดี๋ยวก่อน! 🛑",
                desc: "อย่าพลาดโอกาสนี้ — เรียนได้ 5 ปีเต็ม + มีครูตอบคำถามตลอด",
                ctaText: "สนใจเลย!",
                discountText: "ลดเพิ่ม 500 บาท เฉพาะวันนี้",
            },
        },
        sections: [
            {
                id: "hero-1",
                type: "hero",
                order: 1,
                enabled: true,
                data: {
                    badgeText: "คอร์สยอดนิยม",
                    title: title,
                    subtitle: "เปลี่ยนการเรียนคณิตศาสตร์ให้สนุก เข้าใจง่าย และทำคะแนนได้จริง",
                    ctaText: "สมัครเรียนทันที",
                    ctaPriceText: `฿${price.toLocaleString("th-TH")}`,
                    secondaryCtaText: "ทดลองเรียน",
                    pricePerDayText: `เฉลี่ยวันละ ${(price / 365).toFixed(2)} บาทเท่านั้น`,
                    blobColors: ["bg-indigo-200/40", "bg-rose-200/40"],
                },
            },
            {
                id: "countdown-2",
                type: "countdown",
                order: 2,
                enabled: true,
                data: {
                    title: "🔥 โปรโมชั่นเปิดคอร์ส — เหลือเวลาอีก",
                    subtitle: "ราคาพิเศษนี้สิ้นสุดเมื่อเวลาหมด",
                    endDate: countdownEnd.toISOString(),
                    expiredMessage: "โปรโมชั่นหมดแล้ว",
                    style: "inline",
                },
            },
            {
                id: "trust-3",
                type: "trustBadges",
                order: 3,
                enabled: true,
                data: {
                    stats: [
                        { icon: "👨‍🎓", number: "1,500+", label: "นักเรียนที่เรียนแล้ว" },
                        { icon: "⭐", number: "4.9", label: "คะแนนรีวิวเฉลี่ย" },
                        { icon: "🏫", number: "10+", label: "ปีประสบการณ์สอน" },
                        { icon: "💯", number: "87%", label: "เด็กได้เกรด A" },
                    ],
                },
            },
            {
                id: "pain-4",
                type: "painPoint",
                order: 4,
                enabled: true,
                data: {
                    title: "ปัญหาเหล่านี้... เป็นกันอยู่ไหม? 🤔",
                    subtitle: "ถ้าคำตอบคือ \"ใช่\" คอร์สนี้ออกแบบมาเพื่อคุณโดยเฉพาะ",
                    problemTitle: "ปัญหาที่พบบ่อย",
                    problemIcon: "😰",
                    problems: [
                        { icon: "😵", text: "เรียนในห้องไม่เข้าใจ ครูสอนเร็วเกินไป" },
                        { icon: "📉", text: "พื้นฐานไม่แน่น ทำให้เรียนเรื่องใหม่ไม่รู้เรื่อง" },
                        { icon: "📝", text: "โจทย์ปัญหาทำไม่ได้ ตีความไม่ออก" },
                        { icon: "😔", text: "ขาดความมั่นใจเวลาเข้าห้องสอบ" },
                    ],
                    solutionTitle: "สิ่งที่จะเปลี่ยนไป",
                    solutionIcon: "✨",
                    solutionDesc: "คอร์สนี้จะเปลี่ยน \"ความกลัว\" ให้กลายเป็น \"ความสนุก\"",
                    solutions: [
                        { icon: "✅", text: "เข้าใจเนื้อหาแบบเห็นภาพ ไม่ต้องท่องจำ" },
                        { icon: "✅", text: "ปูพื้นฐานให้แน่น ก่อนไปขั้นถัดไป" },
                        { icon: "✅", text: "มีเทคนิคแก้โจทย์ที่ใช้ได้จริง" },
                        { icon: "✅", text: "ได้เรียนซ้ำได้ไม่จำกัด 5 ปีเต็ม" },
                    ],
                },
            },
            {
                id: "solution-5",
                type: "solution",
                order: 5,
                enabled: true,
                data: {
                    title: "สิ่งที่น้องๆ จะได้รับ 🎁",
                    subtitle: "ทุกอย่างที่จำเป็นสำหรับความสำเร็จ — ครบในคอร์สเดียว",
                    items: [
                        { icon: "🎬", title: "วิดีโอคุณภาพสูง", desc: "เนื้อหาชัดเจน ย่อยง่าย พร้อมเทคนิคพิเศษ" },
                        { icon: "📚", title: "เอกสารครบถ้วน", desc: "PDF สรุปเนื้อหา + โจทย์แบบฝึกหัดหลายร้อยข้อ" },
                        { icon: "💬", title: "ถามครูได้ตลอด", desc: "ติดตรงไหน ถามผ่าน LINE ได้ทันที" },
                        { icon: "⏱️", title: "เรียนได้ 5 ปี", desc: "ทบทวนได้ไม่จำกัดจนกว่าจะชำนาญ" },
                        { icon: "📱", title: "เรียนทุกที่", desc: "ใช้ได้ทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์" },
                        { icon: "🎯", title: "ตรงประเด็น", desc: "เน้นสิ่งที่ออกสอบจริง ไม่เสียเวลา" },
                    ],
                },
            },
            {
                id: "curriculum-6",
                type: "curriculum",
                order: 6,
                enabled: true,
                data: {
                    title: "เนื้อหาในคอร์สนี้ 📚",
                    subtitle: "หลักสูตรครอบคลุมตามมาตรฐาน สสวท. ปรับปรุงล่าสุด",
                    chapters: [
                        {
                            id: 1,
                            title: "บทที่ 1: ปูพื้นฐาน",
                            desc: "เริ่มต้นจากศูนย์ เข้าใจหลักการสำคัญ",
                            content: [
                                "แนวคิดพื้นฐานของเรื่องนี้",
                                "คำศัพท์สำคัญที่ต้องรู้",
                                "ตัวอย่างง่ายๆ ให้เห็นภาพ",
                            ],
                        },
                        {
                            id: 2,
                            title: "บทที่ 2: เนื้อหาหลัก",
                            desc: "เจาะลึกเนื้อหาสำคัญ",
                            content: [
                                "ทฤษฎีและสูตรที่ต้องจำ",
                                "วิธีประยุกต์ใช้",
                                "ข้อควรระวัง",
                            ],
                        },
                        {
                            id: 3,
                            title: "บทที่ 3: เทคนิคทำข้อสอบ",
                            desc: "เทคนิคพิเศษสำหรับห้องสอบ",
                            content: [
                                "เทคนิคการอ่านโจทย์ให้เร็ว",
                                "วิธีคิดลัด",
                                "การตรวจคำตอบ",
                            ],
                        },
                    ],
                },
            },
            {
                id: "testimonial-7",
                type: "testimonial",
                order: 7,
                enabled: true,
                data: {
                    title: "เรื่องจริงจากนักเรียน 💪",
                    subtitle: "ไม่ใช่แค่คะแนนที่เปลี่ยน — แต่ชีวิตการเรียนก็เปลี่ยน",
                    stories: [
                        {
                            name: "น้องเอ",
                            role: "ม.3 โรงเรียนสาธิตฯ",
                            beforeScore: "45 คะแนน",
                            afterScore: "85 คะแนน",
                            quote: "ตอนแรกกลัวคณิตมาก แต่พอเรียนคอร์สนี้ครบทุกบท รู้สึกว่าเข้าใจเยอะขึ้น ข้อสอบที่เคยทำไม่ได้ก็ทำได้แล้ว!",
                        },
                        {
                            name: "น้องบี",
                            role: "ม.2 โรงเรียนเตรียมฯ",
                            beforeScore: "เกรด 2",
                            afterScore: "เกรด 4",
                            quote: "ครูสอนสนุกมาก อธิบายเข้าใจง่าย มีเทคนิคคิดลัดเยอะเลย เพื่อนในห้องก็มาถามว่าเรียนที่ไหนมา",
                        },
                        {
                            name: "คุณแม่ของน้องซี",
                            role: "ผู้ปกครอง",
                            quote: "ตั้งแต่ลูกมาเรียนคอร์สนี้ เขาเปลี่ยนไปเยอะ จากที่เคยบ่นว่าไม่ชอบคณิต ตอนนี้ชอบทำโจทย์ที่บ้านเอง",
                        },
                    ],
                },
            },
            {
                id: "reviews-8",
                type: "reviews",
                order: 8,
                enabled: true,
                data: {
                    title: "อย่าเชื่อแค่คำพูด...",
                    subtitle: "ดูรีวิวจริงจากผู้เรียนนับพัน",
                    images: [...STATIC_REVIEWS],
                },
            },
            {
                id: "comparison-9",
                type: "comparison",
                order: 9,
                enabled: true,
                data: {
                    title: "ทำไมต้องเลือกคอร์สของครูฮีม?",
                    subtitle: "เปรียบเทียบให้เห็นภาพชัด",
                    columns: [
                        {
                            title: "เรียนเอง",
                            features: [
                                { text: "ประหยัดเงิน", included: true },
                                { text: "เรียนได้ตามจังหวะ", included: true },
                                { text: "มีครูคอยตอบคำถาม", included: false },
                                { text: "มีเทคนิคคิดลัด", included: false },
                                { text: "เอกสารครบถ้วน", included: false },
                                { text: "ประหยัดเวลา", included: false },
                            ],
                        },
                        {
                            title: "ครูฮีม ✨",
                            highlight: true,
                            features: [
                                { text: "ราคาคุ้มค่า จ่ายครั้งเดียว", included: true },
                                { text: "เรียนซ้ำได้ 5 ปี", included: true },
                                { text: "ถามครูได้ตลอด", included: true },
                                { text: "เทคนิคคิดลัดเพียบ", included: true },
                                { text: "เอกสาร PDF ครบ", included: true },
                                { text: "ประหยัดเวลามาก", included: true },
                            ],
                        },
                        {
                            title: "ที่อื่น",
                            features: [
                                { text: "ราคาสูง", included: false },
                                { text: "เรียนได้จำกัดเวลา", included: false },
                                { text: "ถามได้บางครั้ง", included: true },
                                { text: "มีเทคนิคพื้นฐาน", included: true },
                                { text: "เอกสารบางส่วน", included: true },
                                { text: "ใช้เวลาปานกลาง", included: true },
                            ],
                        },
                    ],
                },
            },
            {
                id: "pricestack-10",
                type: "priceStack",
                order: 10,
                enabled: true,
                data: {
                    title: "คุ้มทุกบาท ทุกสตางค์ 💰",
                    subtitle: "มูลค่ารวมของสิ่งที่จะได้รับจากคอร์สนี้",
                    items: [
                        { name: "วิดีโอบทเรียนคุณภาพสูง", value: 3000 },
                        { name: "เอกสาร PDF สรุปเนื้อหา", value: 500 },
                        { name: "แบบฝึกหัด 400+ ข้อ", value: 800 },
                        { name: "สิทธิ์ถามครูผ่าน LINE", value: 2000 },
                        { name: "สิทธิ์เรียนซ้ำ 5 ปี", value: 1500 },
                        { name: "ข้อสอบจำลองพร้อมเฉลย", value: 500 },
                    ],
                    regularPrice: fullPrice,
                    finalPrice: price,
                    discountNote: "* โปรโมชั่นเปิดคอร์ส ราคานี้มีเวลาจำกัด",
                    ctaText: "สมัครเรียนเลย",
                },
            },
            {
                id: "guarantee-11",
                type: "guarantee",
                order: 11,
                enabled: true,
                data: {
                    badgeText: "รับประกันคุณภาพ",
                    title: "เรียนแล้วไม่พอใจ ยินดีคืนเงิน 100%",
                    desc: "เรามั่นใจในคุณภาพคอร์ส ถ้าเรียนแล้วรู้สึกว่าไม่ตรงตามที่คาดหวัง แจ้งเราภายใน 7 วัน เราคืนเงินเต็มจำนวน",
                    features: [
                        "รับประกันคืนเงินภายใน 7 วัน",
                        "ไม่มีคำถามยุ่งยาก",
                        "ขอคืนผ่าน LINE ได้ทันที",
                    ],
                },
            },
            {
                id: "faq-12",
                type: "faq",
                order: 12,
                enabled: true,
                data: {
                    title: "🔥 ถามตรง-ตอบเคลียร์!",
                    subtitle: "คำถามที่พบบ่อย — อ่านให้จบ แล้วจะตัดสินใจได้ง่ายขึ้น",
                    faqs: [
                        {
                            q: "1️⃣ พื้นฐานไม่แน่น จะเรียนทันไหม?",
                            a: "ทันแน่นอน! คอร์สเริ่มจากพื้นฐานให้ใหม่ ไม่ต้องกลัวตามไม่ทัน",
                        },
                        {
                            q: "2️⃣ เรียนแล้วจะงงไหม ถามใครได้?",
                            a: "มีช่อง LINE สำหรับนักเรียนโดยเฉพาะ ถามได้ทุกคำถาม ครูตอบเองทุกข้อ",
                        },
                        {
                            q: "3️⃣ เรียนได้นานแค่ไหน?",
                            a: "เรียนได้ 5 ปีเต็ม ทบทวนซ้ำได้ไม่จำกัด จนกว่าจะเข้าใจ",
                        },
                        {
                            q: "4️⃣ ต้องใช้อุปกรณ์อะไรบ้าง?",
                            a: "แค่มีมือถือ แท็บเล็ต หรือคอมพิวเตอร์ + อินเทอร์เน็ต ก็เรียนได้ทันที",
                        },
                        {
                            q: "5️⃣ สมัครแล้วเข้าเรียนได้เลยไหม?",
                            a: "ใช่! โอนเงินแล้วระบบจะเปิดสิทธิ์ให้เข้าเรียนภายใน 5 นาที",
                        },
                    ],
                },
            },
            {
                id: "cta-13",
                type: "cta",
                order: 13,
                enabled: true,
                data: {
                    urgencyText: "🔥 โปรโมชั่นพิเศษ — เวลาจำกัด",
                    title: "พร้อมเปลี่ยนอนาคตการเรียนแล้วหรือยัง?",
                    subtitle: "สมัครเรียนวันนี้ เริ่มเรียนได้ทันทีภายใน 5 นาที",
                    ctaText: "สมัครเรียนเลย",
                    priceText: `฿${price.toLocaleString("th-TH")}`,
                },
            },
        ],
    };
}
