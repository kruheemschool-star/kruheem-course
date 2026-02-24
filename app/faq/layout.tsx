import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "คำถามที่พบบ่อย (FAQ) | ตอบทุกข้อสงสัยก่อนสมัครเรียน",
    description: "รวมคำถามที่พบบ่อยเกี่ยวกับคอร์สเรียนคณิตศาสตร์ออนไลน์ของครูฮีม ตอบครบทุกข้อสงสัย ตั้งแต่วิธีสมัคร ราคา อุปกรณ์ จนถึงการรับประกันผล",
    keywords: ["คำถามที่พบบ่อย", "FAQ", "ครูฮีม", "คอร์สเรียนคณิต", "สมัครเรียน"],
    openGraph: {
        title: "คำถามที่พบบ่อย (FAQ) | KruHeem Course",
        description: "ตอบทุกข้อสงสัยเกี่ยวกับคอร์สเรียนคณิตศาสตร์ออนไลน์ของครูฮีม",
        type: "website",
    },
};

// FAQPage JSON-LD structured data for Google rich results
const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'พื้นฐานไม่แน่นเลย จะเรียนทันเพื่อนไหม?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'ทันแน่นอน! เพราะเราเริ่มให้ใหม่ตั้งแต่ศูนย์ ครูจะรื้อฟื้นพื้นฐานที่จำเป็นให้ใหม่หมด ปูให้แน่นปึ้กก่อนขึ้นเนื้อหายาก',
            },
        },
        {
            '@type': 'Question',
            name: 'คอร์สนี้ต่างจากที่อื่นยังไง?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'ต่างที่ความเข้าใจ ไม่ใช่แค่การจำ ครูสอนให้เห็นภาพว่าทำไมต้องใช้สูตรนี้ มีเทคนิคเฉพาะตัวที่สั้น กระชับ ตรงจุด',
            },
        },
        {
            '@type': 'Question',
            name: 'ถ้าเรียนแล้วงง มีคำถาม จะไปถามใคร?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'ถามครูได้โดยตรง! เรามีช่องทางพิเศษ LINE/Facebook Group สำหรับนักเรียนโดยเฉพาะ ครูและทีมงานพร้อมอธิบายจนกว่าจะเข้าใจ',
            },
        },
        {
            '@type': 'Question',
            name: 'ราคาแพงไปไหม? จะคุ้มค่าหรือเปล่า?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'คุ้มยิ่งกว่าคุ้ม! ราคาหารออกมาตกวันละไม่กี่บาท แต่ดูทวนซ้ำได้ตลอด 5 ปี แถมได้เทคนิคที่ติดตัวไปจนสอบเข้ามหาวิทยาลัย',
            },
        },
        {
            '@type': 'Question',
            name: 'ต้องใช้อุปกรณ์อะไรบ้าง?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'ง่ายมาก! มีแค่มือถือเครื่องเดียวก็เรียนได้ ระบบรองรับทุกอุปกรณ์ ขอแค่มีอินเทอร์เน็ต เรียนได้ทุกที่ ทุกเวลา',
            },
        },
        {
            '@type': 'Question',
            name: 'สมัครแล้วจะได้เรียนทันทีเลยไหม?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'โอนปุ๊บ เรียนได้ปั๊บ! ระบบอัตโนมัติ สมัครเสร็จระบบเปิดสิทธิ์ให้เข้าเรียนได้ทันทีภายใน 5 นาที',
            },
        },
    ],
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            {children}
        </>
    );
}
