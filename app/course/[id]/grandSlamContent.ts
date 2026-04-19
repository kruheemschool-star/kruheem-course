// Grand Slam Offer Content for Each Course
// Based on Alex Hormozi's Framework
// IMPORTANT: ห้ามตัดข้อความใดๆ ออก - เนื้อหาทุกส่วนคิดมาอย่างดีแล้ว

export interface StackItem {
    icon: string;
    title: string;
    desc: string;
    value: number | 'priceless';
    isBonus?: boolean;
}

export interface PainPoint {
    icon: string;
    title: string;
    desc: string;
}

export interface SolutionFeature {
    icon: string;
    title: string;
    desc: string;
}

export interface GrandSlamContent {
    hook: {
        headline: string | string[];
        secondaryHeadline?: string;
        subHeadline: string;
        blueprintImage?: string;
        sampleVideoId?: string; // YouTube Video ID for Free Sample
    };
    problem: {
        intro: string;
        image?: string; // Optional image below intro
        painPoints: PainPoint[];
        warningImage?: string; // Optional image before warning
        warning: string;
    };
    solution: {
        intro: string;
        systemName: string;
        systemIntro: string; // เพิ่มข้อความแนะนำระบบ
        diagramImage?: string; // Optional diagram
        features: SolutionFeature[];
    };
    stack: {
        freshCourseImage?: string; // Optional image before fresh course info
        freshCourseInfo?: string[]; // New field for Fresh Course message
        intro: string;
        items: StackItem[];
        totalValue: number;
    };
    pricing: {
        totalValueIntro: string;
        earlyBirdPrice: number;
        regularPrice: number;
        savings: number;
        isEarlyBird: boolean;
        priceDropIntro: string;
        notPayText: string;
    };
    scarcity: {
        question: string;
        answer: string;
        limitedSpots: number;
        reason: string;
        nextPriceWarning: string;
        finalWarning: string[];
    };
    guarantee: {
        days: number;
        title: string;
        promise: string;
        zeroRiskText: string;
        linkWarning: string[];
    };
    cta: {
        headline: string | string[];
        stepsIntro: string;
        steps: string[];
        buttonText: string;
    };
}

// ม.1 เทอม 1 Content - ข้อความครบถ้วนสมบูรณ์ตามต้นฉบับ
export const m1Term1Content: GrandSlamContent = {
    hook: {
        headline: [
            'วิธีเปลี่ยนลูกจาก',
            '"เด็กที่เกลียดเลข"',
            'ให้กลายเป็น "สอบได้เกรด 4"',
            'ในเทอมแรกของ ม.1'
        ],
        secondaryHeadline: 'โดยที่คุณไม่ต้องเคี่ยวเข็ญจนบ้านแตก และไม่ต้องจ้างติวเตอร์ชั่วโมงละ 500 บาท',
        subHeadline: 'ระบบการเรียนรู้แบบใหม่ ที่ออกแบบมาแก้ปัญหา "รอยต่อ ม.1" โดยเฉพาะ... ออกแบบมาเพื่อให้เข้าใจง่ายกว่าการเรียนในห้องเรียน',
        // blueprintImage field ถูกลบออก — field เป็น optional และไม่มี component ไหน consume
        // ไฟล์ /images/blueprint-m1.png ไม่มีอยู่ใน /public จึงเป็น broken reference
        sampleVideoId: 'hJYJf2FHxIQ', // Real sample video from SolutionSection 
    },
    problem: {
        intro: 'คุณกำลังเจอปัญหาเหล่านี้อยู่ใช่ไหม?',
        image: '/images/math-cliff.png',
        painPoints: [
            {
                icon: '😓',
                title: 'ลูกปรับตัวไม่ทัน',
                desc: 'จากเลขประถมง่ายๆ พอเจอ "สมการ" และ "จำนวนติดลบ" ใน ม.1 ก็ไปไม่เป็น เกรดตกฮวบจนน่าตกใจ',
            },
            {
                icon: '💸',
                title: 'เสียเงินฟรี',
                desc: 'เคยส่งเรียนพิเศษแบบกลุ่ม ลูกก็นั่งหลับ ครูสอนเร็วตามไม่ทัน สุดท้ายได้แต่ไปนั่งตากแอร์',
            },
            {
                icon: '😡',
                title: 'บ้านแตก',
                desc: 'พยายามสอนลูกเอง แต่สอนไปสอนมา ทะเลาะกัน บ้านร้อนเป็นไฟ เพราะลูกไม่เข้าใจสิ่งที่คุณอธิบาย',
            },
            {
                icon: '❓',
                title: 'กลัวว่าลูกจะเปิดคอม แล้วสลับหน้าจอไปเล่นเกม',
                desc: 'จ่ายเงินค่าคอร์สไปแล้ว แต่ไม่รู้เลยว่าลูกเรียนจริงไหม หรือแอบเล่นเกม',
            },
        ],
        warningImage: '/images/foundation-collapse.jpg',
        warning: 'ข่าวร้ายคือ: ถ้าคุณปล่อยปัญหานี้ไว้ พื้นฐาน ม.1 ที่พังทลาย จะส่งผลกระทบยาวไปจนถึง ม.6 และการสอบเข้ามหาวิทยาลัยครับ',
    },
    solution: {
        intro: 'ผมขอเสนอทางออกใหม่... มันไม่ใช่ "การเรียนพิเศษ" แบบเดิมๆ แต่มันคือ',
        systemName: "Kru Heem's M.1 Blueprint System",
        systemIntro: 'ผม (ครูฮีม) ใช้ คิดและทบทวน กลั่นกรองประสบการณ์ออกมาเป็น "พิมพ์เขียวแก้เกมคณิตศาสตร์" แผ่นเดียว ที่จะปิดรอยรั่วทุกจุด:',
        diagramImage: '/images/blueprint-diagram.png',
        features: [
            {
                icon: '🧩',
                title: 'ย่อยเรื่องยากให้เป็นเรื่องง่าย',
                desc: 'ผมเข้าใจว่าเด็กส่วนใหญ่งงตรงไหน เพราะผมสอนเรื่องนี้ซ้ำๆ มากว่า 10 ปี ผมจึงออกแบบ "ระบบแปลภาษาคณิตศาสตร์" ให้เป็นภาษาคน ไม่ใช้ศัพท์เทคนิคให้ปวดหัว แต่เน้นความเข้าใจแบบเห็นภาพ เข้าใจที่มาที่ไป ไม่เน้นจำสูตร',
            },
            {
                icon: '🎯',
                title: 'ดักคอจุดที่โรงเรียนชอบหลอก',
                desc: 'ลูกคุณจะไม่เสียคะแนนฟรีๆ ในจุดที่คนอื่นพลาด',
            },
            {
                icon: '📊',
                title: 'ระบบติดตามผล',
                desc: 'ผู้ปกครองเช็คได้ทันทีว่าลูกเรียนถึงไหน "คุณแม่แค่นั่งจิบกาแฟ แล้วดูมือถือ ก็รู้ทันทีว่าลูกเรียนถึงตอนไหน โดยไม่ต้องเดินไปถามให้ลูกรำคาญ" (จบปัญหาจ่ายเงินแล้วลูกไม่เรียน)',
            },
        ],
    },
    stack: {
        freshCourseImage: '/images/fresh-course-comparison.png',
        freshCourseInfo: [
            '"คอร์สนี้ไม่ใช่คอร์สสำเร็จรูปที่อัดทิ้งไว้ตั้งแต่ปีมะโว้..."',
            'แต่เป็น "Fresh Course" ที่ผมตั้งใจปั้นใหม่ทั้งหมด!',
            'เราจะเรียนไปพร้อมๆ กันในรูปแบบ \'Update วันต่อวัน\'',
            '✅ บทที่ 1 (จำนวนเต็ม): พร้อมเรียนทันที! เนื้อหาแน่นปึ้ก',
            '✅ บทถัดไป: ผมจะอัปเดตคลิปและชีทสรุปให้ "ทุกวัน" อย่างต่อเนื่องจนจบคอร์ส',
            'ข้อดีที่คุณจะได้รับ: เนื้อหาจะสดใหม่ที่สุด และถ้าคุณเรียนตรงไหนแล้วงง',
            'หรืออยากให้ผมเน้นตรงไหนเป็นพิเศษ "คุณสามารถ Request ได้ทันที"',
            'แล้วผมจะอัดคลิปเสริมส่วนนั้นให้ในวันถัดไป...',
        ],
        intro: 'สิ่งที่คุณจะได้รับทั้งหมด ถ้าสมัครวันนี้',
        items: [
            {
                icon: '📦',
                title: 'คอร์สปูพื้นฐานคณิต ม.1 เทอม 1 (ฉบับสมบูรณ์)',
                desc: 'เนื้อหาเจาะลึก 5 บทเรียน (จำนวนเต็ม, เรขาคณิต, เลขยกกำลัง, ฯลฯ) อัปเดตใหม่ล่าสุด เรียนซ้ำได้ตลอดชีพ',
                value: 1900,
                isBonus: false,
            },
            {
                icon: '🎁',
                title: 'โบนัส #1: คลังข้อสอบกว่า 1000 ข้อ (The Exam Vault)',
                desc: 'แบ่งระดับ ง่าย -> กลาง -> ยาก พร้อมเฉลยละเอียดทุกข้อ เหมือนมีครูมาจับมือทำ',
                value: 1000,
                isBonus: true,
            },
            {
                icon: '🎁',
                title: 'โบนัส #2: The Cheat Sheet (ใบสรุปสูตรลับ)',
                desc: 'กระดาษแผ่นเดียวที่สรุปทุกสูตรสำคัญ ไว้อ่าน 5 นาทีก่อนเข้าห้องสอบ เพื่อเรียกความมั่นใจ',
                value: 500,
                isBonus: true,
            },
            {
                icon: '🎁',
                title: 'โบนัส #3: Flashcards ช่วยจำ (Digital Edition)',
                desc: 'บัตรคำศัพท์ช่วยจำสูตรและนิยาม สนุกเหมือนเล่นเกม',
                value: 590,
                isBonus: true,
            },
            {
                icon: '🎁',
                title: 'โบนัส #4: ระบบติดตามผู้ปกครอง (Parent Monitoring)',
                desc: 'เช็คสถานะการเรียนของลูกได้ตลอด 24 ชม. (ประเมินมูลค่าไม่ได้ - เพราะความสบายใจสำคัญที่สุด)',
                value: 'priceless',
                isBonus: true,
            },
        ],
        totalValue: 3990,
    },
    pricing: {
        totalValueIntro: 'รวมมูลค่าทั้งหมดที่คุณจะได้รับ:',
        earlyBirdPrice: 1900,
        regularPrice: 1900,
        savings: 2090,
        isEarlyBird: true,
        priceDropIntro: 'แต่เดี๋ยวก่อน... ผมไม่ได้ทำคอร์สนี้มาเพื่อจะรวยจากการขายแพงๆ แต่ผมต้องการสร้าง "ผลลัพธ์"',
        notPayText: 'ดังนั้น คุณไม่ต้องจ่าย',
    },
    scarcity: {
        question: '"ทำไมถึงขายถูกขนาดนี้? มีเงื่อนไขอะไรไหม?"',
        answer: 'เงื่อนไขมีข้อเดียวครับ:',
        limitedSpots: 30,
        reason: '(หลังจากคนที่ 30 ราคาจะปรับขึ้นเป็น 1,900 บาทแน่นอน)',
        nextPriceWarning: 'รุ่นหน้า ราคาจะปรับขึ้นเป็น 1,900 บาทแน่นอน',
        finalWarning: [],
    },
    guarantee: {
        days: 7,
        title: 'การรับประกันความพอใจ 100%',
        promise: 'ถ้าลูกคุณเรียนไปแล้ว ภายใน 7 วัน รู้สึกว่า "ครูฮีมสอนไม่รู้เรื่อง" หรือ "ระบบนี้ใช้ไม่ได้ผล" ทักบอกผม ผมโอนเงินคืนให้เต็มจำนวน 1,900 บาท ไม่มีคำถามเซ้าซี้',
        zeroRiskText: 'เท่ากับว่าการลองครั้งนี้...<br>ความเสี่ยงของคุณคือ<br>0',
        linkWarning: [],
    },
    cta: {
        headline: [
            'อย่าปล่อยให้ลูกต้องทนเรียน',
            'แบบงงๆ อีกต่อไป'
        ],
        stepsIntro: '👉 วิธีสมัคร:',
        steps: [
            'กดปุ่มสีเขียวด้านล่าง "จองสิทธิ์ราคา 1,900 บาท"',
            'ทักแชท แล้วพิมพ์ว่า "เอาโปร 1,900"',
            'เริ่มเรียนได้ทันที!',
        ],
        buttonText: 'จองสิทธิ์รุ่นบุกเบิก',
    },
};

// Function to get content by course title
export function getGrandSlamContent(courseTitle: string): GrandSlamContent | null {
    const isM1Term1 = courseTitle.includes('ม.1') && courseTitle.includes('เทอม 1');

    if (isM1Term1) {
        return m1Term1Content;
    }

    // Add more courses here as needed
    // if (isM1Term2) return m1Term2Content;
    // if (isM2Term1) return m2Term1Content;

    return null; // Fallback - will use old design
}
