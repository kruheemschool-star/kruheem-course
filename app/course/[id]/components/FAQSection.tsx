'use client';

import { useState } from 'react';

interface FAQItem {
    question: string;
    answer: string;
}

const faqData: FAQItem[] = [
    {
        question: 'ลูกไม่ชอบคณิตเลย พื้นฐานจาก ป.6 แย่มาก... จะเรียนคอร์สนี้รู้เรื่องไหม?',
        answer: 'ยิ่งพื้นฐานแย่ ยิ่ง "ต้อง" เรียนครับ! การเรียนคณิตศาสตร์เหมือนการสร้างตึก ถ้าเสาเข็มไม่แน่น สร้างต่อยังไงก็ถล่ม คอร์สนี้ผมออกแบบมาเพื่อ "ทุบแล้วสร้างใหม่" ผมสอนตั้งแต่เบสิค ค่อยๆ ปูทีละบรรทัด พร้อมบอกเหตุผลว่าทำไมถึงต้องทำแบบนี้... ผมเปลี่ยนภาษาคณิตศาสตร์ที่ดูเหมือน "ภาษาต่างดาว" ให้กลายเป็น "ภาษามนุษย์" ที่เด็กฟังแล้วร้อง อ๋อ! ทันที',
    },
    {
        question: 'เรียนออนไลน์ ลูกจะรู้เรื่องเหรอ? สู้ส่งไปเรียนสดกับติวเตอร์ดีกว่าไหม?',
        answer: 'เรียนสดเหมือนการ "ขึ้นรถเมล์" ครับ ถ้าลูกก้มหน้าจด หรือเหม่อแค่ 3 วินาที รถก็ขับผ่านป้ายไปแล้ว ตามไม่ทันก็คือจบ แต่คอร์สของผมคือ "รถยนต์ส่วนตัว" ลูกสามารถกดหยุด (Pause) เพื่อทำความเข้าใจ หรือกดกรอซ้ำ (Rewind) กี่รอบก็ได้จนกว่าจะเข้าใจ ที่สำคัญ... ติวเตอร์ข้างนอกชั่วโมงละ 500 บาท แต่ที่นี่ 1,900 บาท ลูกคุณเรียนซ้ำได้ยันลูกบวชครับ',
    },
    {
        question: 'กลัวซื้อไปแล้วลูก "ดองคอร์ส" แอบไปเล่นเกม ผู้ปกครองจะรู้ได้ยังไง?',
        answer: 'จบปัญหาจ่ายเงินฟรีครับ! เพราะคอร์สนี้มีโบนัส "ระบบติดตามผู้ปกครอง" เหมือนคุณมีกล้องวงจรปิด คุณจะเช็คได้ตลอด 24 ชม. ผ่านมือถือคุณเองว่า ลูกเรียนถึงไหนแล้ว บทไหนยังไม่เข้าเรียน หมดสิทธิ์อู้งานแน่นอน',
    },
    {
        question: 'พ่อแม่ไม่เก่งเลขเลย... จะช่วยลูกเรียนได้ไหม?',
        answer: 'คุณพ่อคุณแม่ไม่ต้องจับปากกาเลยครับ! หน้าที่สอน ปล่อยให้เป็นความปวดหัวของผม หน้าที่ของคุณคือ "ฝ่ายให้กำลังใจ" และคอยดูความคืบหน้าผ่านระบบก็พอ คืนความสงบสุขให้ครอบครัว ไม่ต้องมานั่งเถียงกันเรื่องสมการบนโต๊ะกินข้าวอีกต่อไป',
    },

    {
        question: 'ถ้ารอลูกเปิดเทอมก่อน หรือใกล้ๆ สอบค่อยสมัครได้ไหม?',
        answer: 'ได้ครับ... ถ้าคุณยอมจ่ายในราคา 1,900 บาท และถ้าคุณยอมให้ลูกต้องไป "เร่งอัด" ความรู้ช่วงใกล้สอบ การอัดเนื้อหาใกล้สอบก็เหมือน "การบังคับให้กินข้าว 3 มื้อรวดเดียว" เด็กจะจุกและอ้วกออกมา (สอบตก) เริ่มวันนี้ วันละ 15 นาที ลูกคุณจะเดินเข้าห้องสอบแบบชิลล์ๆ ครับ',
    },
    {
        question: 'เนื้อหา ม.1 มันเยอะมาก ลูกจะเครียดหนักกว่าเดิมไหม?',
        answer: 'ไม่เลยครับ เพราะผมมี "The Cheat Sheet (สรุปสูตรลับ)" และ "Blueprint" มันเหมือนลูกคุณกำลังเดินป่า แล้วผมเอา "แผนที่" กับ "ไฟฉาย" ใส่มือให้ เขาจะรู้ว่าต้องมองหาอะไร ไม่ต้องจำเปะปะ เน้นจำเฉพาะจุดที่ออกสอบและจุดที่โรงเรียนชอบหลอก คอร์สนี้เน้นความเข้าใจ ไม่เน้นใช้แรงงานครับ',
    },
    {
        question: 'ถ้าลูกไปเจอโจทย์ยากๆ จากโรงเรียน แล้วทำไม่ได้ คอร์สนี้ช่วยได้ไหม?',
        answer: 'แน่นอนครับ! เพราะคุณจะได้สิทธิ์ "Line ส่วนตัวครูฮีม" ติดตรงไหน ถ่ายรูปโจทย์ส่งมาได้เลย ผมจะไกด์วิธีคิดให้ทีละสเต็ป เหมือนมีผมสแตนด์บายอยู่ในกระเป๋ากางเกงลูกคุณตลอดเวลา (เฉพาะโบนัสข้อนี้ก็คุ้มเกินราคาค่าเรียนแล้วครับ)',
    },
    {
        question: 'เนื้อหาในคอร์สตรงกับหลักสูตรที่โรงเรียนสอนไหม?',
        answer: 'ตรง 100% ครับ ผมอิงตามหลักสูตรแกนกลางกระทรวงศึกษาธิการล่าสุด แต่ที่ต่างออกไปคือ "วิธีการอธิบาย" โรงเรียนอาจจะสอนแบบวิชาการจ๋าๆ แต่ผมสอนด้วยภาษาที่ฟังแล้วมีมุขตลกสอดแทรก ให้เด็กไม่เกร็ง แต่ได้สาระครบถ้วน',
    },
    {
        question: 'คำถามสุดท้าย... ถ้าซื้อไปแล้วลูกไม่ชอบ หรือรู้สึกว่าไม่ได้ผลลัพธ์ ทำยังไง?',
        answer: 'ผมกล้าท้าครับ! ถ้าภายใน 7 วัน ลูกเรียนแล้วรู้สึกว่า "ครูฮีมสอนไม่รู้เรื่องเลย" ทักแชทมาบอกผม ผมโอนเงินคืนให้เต็มจำนวน 1,900 บาททันที ไม่มีเงื่อนไข ไม่ถามจุกจิก... ความเสี่ยงของคุณคือ 0%',
    },
];

function FAQItem({ item, isOpen, onClick }: { item: FAQItem; isOpen: boolean; onClick: () => void }) {
    return (
        <div className="border-b border-slate-200 last:border-b-0">
            <button
                onClick={onClick}
                className="w-full py-5 px-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors duration-200 group"
            >
                <span className="font-semibold text-xl text-slate-800 pr-4 leading-relaxed group-hover:text-slate-900">
                    {item.question}
                </span>
                <span
                    className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''
                        }`}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M8 3V13M3 8H13"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                </span>
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="px-4 pb-5 text-lg text-slate-600 leading-relaxed">
                    {item.answer}
                </div>
            </div>
        </div>
    );
}

export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const handleClick = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="py-16 bg-white">
            <div className="max-w-3xl mx-auto px-6">
                {/* Section Title */}
                <div className="text-center mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                        ❓ FAQ: คำถามที่พบบ่อย
                    </h2>
                    <p className="text-slate-500 text-base">
                        (สำหรับคนรักลูกแต่ยังลังเล)
                    </p>
                </div>

                {/* FAQ Accordion */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    {faqData.map((item, index) => (
                        <FAQItem
                            key={index}
                            item={item}
                            isOpen={openIndex === index}
                            onClick={() => handleClick(index)}
                        />
                    ))}
                </div>


            </div>
        </section>
    );
}
