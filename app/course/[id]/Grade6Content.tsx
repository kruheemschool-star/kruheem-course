"use client";

import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/autoplay';

// Font Awesome CDN
const FontAwesome = () => (
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
);

// Google Font Kanit
const KanitFont = () => (
    <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    </>
);

export default function Grade6Content() {
    // State for Accordions
    const [openChapterIndex, setOpenChapterIndex] = useState<number | null>(null);
    const [openGiftedIndex, setOpenGiftedIndex] = useState<number | null>(null);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    // State for Video Tabs
    const [activeVideo, setActiveVideo] = useState("https://www.youtube.com/embed/HKMJ1ITccJc");
    const [activeTab, setActiveTab] = useState(0);

    // State for Discount Code
    const [showCode, setShowCode] = useState(false);
    const [discountCode, setDiscountCode] = useState("");

    // State for Lightbox
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Generate Discount Code
    useEffect(() => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setDiscountCode('KHEEM' + result);
    }, []);

    const toggleChapter = (index: number) => {
        setOpenChapterIndex(openChapterIndex === index ? null : index);
    };

    const toggleGifted = (index: number) => {
        setOpenGiftedIndex(openGiftedIndex === index ? null : index);
    };

    const toggleFaq = (index: number) => {
        setOpenFaqIndex(openFaqIndex === index ? null : index);
    };

    const videoTabs = [
        { id: 0, title: "ปูพื้นฐานเนื้อหา", icon: "📚", src: "https://www.youtube.com/embed/HKMJ1ITccJc" },
        { id: 1, title: "เทคนิคลัด", icon: "✨", src: "https://www.youtube.com/embed/hXt1qLFX1_o" },
        { id: 2, title: "โจทย์สอบเข้า ม.1", icon: "🎯", src: "https://www.youtube.com/embed/S4C6ZKDsoTI" },
        { id: 3, title: "โจทย์ห้อง Gifted", icon: "🏆", src: "https://www.youtube.com/embed/IVwbcj9KGoE" },
    ];

    const reviewImages = Array.from({ length: 19 }, (_, i) => `/images/re${(i + 1).toString().padStart(2, '0')}.jpg`);
    const docImages = Array.from({ length: 16 }, (_, i) => `/images/enpage${(i + 1).toString().padStart(2, '0')}.JPG`);

    return (
        <div className="font-kanit bg-gray-100 text-gray-800">
            <FontAwesome />
            <KanitFont />
            <style jsx global>{`
                .font-kanit { font-family: 'Kanit', sans-serif; }
                .hero-gradient { background: linear-gradient(135deg, #6ee7b7 0%, #2dd4bf 100%); }
                .cta-gradient { background: linear-gradient(to right, #34d399, #14b8a6); }
                .fade-in-up { animation: fadeInUp 0.8s ease-out forwards; opacity: 0; transform: translateY(20px); }
                @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
                .choice-card:hover { transform: translateY(-8px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
            `}</style>

            {/* Header Section */}
            <header className="bg-white shadow-md sticky top-0 z-50">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <a href="#" className="text-2xl font-bold text-emerald-600">คณิตครูฮีม 🔥</a>
                    <div className="hidden md:flex space-x-2 items-center">
                        <a href="#courses" className="px-4 py-2 rounded-md transition-colors duration-300 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600">รายละเอียดคอร์ส</a>
                        <a href="#testimonials" className="px-4 py-2 rounded-md transition-colors duration-300 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600">รีวิว</a>
                        <a href="#trial" className="px-4 py-2 rounded-md transition-colors duration-300 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600">ทดลองเรียน</a>
                        <a href="#faq" className="px-4 py-2 rounded-md transition-colors duration-300 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600">FAQ</a>
                        <a href="#signup" className="px-4 py-2 rounded-md transition-colors duration-300 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600">สมัครเลย</a>
                    </div>
                </nav>
            </header>

            <main>
                {/* Hero Section */}
                <section className="hero-gradient h-screen sticky top-0 z-0 flex flex-col justify-center items-center -mt-20">
                    <div className="container mx-auto px-6 text-center">
                        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 text-black">
                            <span className="md:hidden">เปลี่ยนความกังวล<br />เรื่องสอบเข้า ม.1<br />ของลูก<br />ให้เป็นความมั่นใจ<br />เต็ม 100%</span>
                            <span className="hidden md:inline">เปลี่ยนความกังวลเรื่องสอบเข้า ม.1 ของลูก ให้เป็นความมั่นใจเต็ม 100%</span>
                        </h1>
                        <p className="text-2xl md:text-3xl mb-8 text-black max-w-3xl mx-auto">คอร์สออนไลน์เดียวที่สรุปเนื้อหา ป.4-ป.6 ทั้งหมด <br className="md:hidden" /> พร้อมตะลุยโจทย์เข้มข้นกว่า 1,000 ข้อ</p>
                        <a href="#courses" className="bg-white text-emerald-600 font-bold py-3 px-8 rounded-full text-lg hover:bg-gray-100 transition duration-300 transform hover:scale-105">ดูรายละเอียดคอร์ส</a>
                    </div>
                </section>

                {/* Main Content Wrapper */}
                <div className="relative z-10 bg-white rounded-t-[2.5rem] -mt-24">

                    {/* Testimonials Section */}
                    <section id="testimonials" className="pt-20 pb-20 overflow-hidden">
                        <div className="container mx-auto px-6 text-center">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-12">อย่าเชื่อแค่คำพูด... <br className="md:hidden" /> แต่จงเชื่อ "ผลลัพธ์"</h2>
                        </div>
                        <div className="relative max-w-5xl mx-auto">
                            <Swiper
                                modules={[Autoplay]}
                                spaceBetween={16}
                                slidesPerView={'auto'}
                                loop={true}
                                speed={8000}
                                autoplay={{ delay: 0, disableOnInteraction: false }}
                                className="testimonial-image-slider"
                                wrapperClass="transition-timing-function-linear"
                            >
                                {reviewImages.map((img, i) => (
                                    <SwiperSlide key={i} style={{ width: 'auto' }}>
                                        <div className="h-[35vh] max-h-[300px] bg-gray-100 rounded-xl p-3 flex justify-center items-center">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={img}
                                                alt="รีวิว"
                                                className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg shadow-sm cursor-pointer"
                                                onClick={() => setLightboxImage(img)}
                                                onError={(e) => e.currentTarget.src = 'https://placehold.co/400x600/f3f4f6/ef4444?text=Image+Error'}
                                            />
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                        <div className="text-center mt-10">
                            <a href="#signup" className="bg-emerald-500 text-white font-bold py-3 px-10 rounded-full text-lg hover:bg-emerald-600 transition duration-300 transform hover:scale-105 inline-block">สมัครเลย!</a>
                        </div>
                    </section>

                    {/* Story Section */}
                    <section id="story" className="bg-gray-50 pt-20 pb-20">
                        <div className="container mx-auto px-6">
                            <div className="max-w-3xl mx-auto text-center">
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-12">ผมเคยเกือบยอมแพ้...<br className="md:hidden" />จนวันที่ค้นพบ "ความจริง" ของการเรียนเลขให้เก่ง</h2>
                                <p className="text-xl text-gray-700 leading-relaxed mb-8">เชื่อไหมครับว่าครั้งหนึ่ง ผมเคยนั่งจ้องโจทย์เลขแล้วในหัวว่างเปล่า เหมือนที่น้องๆ หลายคนเป็น ผมเคยรู้สึกว่าตัวเองหัวช้า ไม่เก่งเหมือนเพื่อน เคยแม้กระทั่งคิดว่า "เราคงไม่มีพรสวรรค์ด้านนี้" ทุกครั้งที่เห็นข้อสอบ ผมจะเข้าไป "นั่งคิด" ว่าจะเริ่มยังไงดี? จะใช้สูตรไหน? เอ๊ะ... แบบนี้จะใช่ไหมหนอ? สุดท้ายก็ทำไม่เคยทัน แถมที่ทำไปก็ผิด</p>
                                <p className="text-xl text-gray-700 leading-relaxed mb-8">จนวันหนึ่งที่ผมทนความรู้สึกนั้นไม่ไหว ผมตัดสินใจลุกขึ้นมา "ลองผิด" ด้วยตัวเอง และนั่นคือจุดที่ผมค้นพบความจริงว่า...</p>
                                <h3 className="text-2xl md:text-3xl font-bold text-emerald-600 mb-8">"การเรียนเลขให้เก่ง ไม่ได้จบที่โรงเรียน... <br className="md:hidden" />แต่มันเริ่มต้นที่บ้าน"</h3>
                                <p className="text-xl text-gray-700 leading-relaxed mb-8">ผมเปลี่ยนวิธีทบทวนใหม่หมด หลังเลิกเรียน ผมจะเอาทุกสิ่งที่เรียนในวันนั้นมา "เขียนใหม่ด้วยลายมือตัวเอง" ตั้งแต่อายุ คุณสมบัติ ไปจนถึงกลเม็ดคิดลัด จากนั้นก็ "ลบแล้วทำซ้ำ" วันแรก 10 ข้อ ผมอาจทำถูกแค่ 6 ข้อ แต่ผมไม่ท้อ ข้อไหนผิด ผมเปิดดู... แล้วทำใหม่ วันต่อมา ผมก็ทำแบบเดิมอีกครั้ง</p>
                                <p className="text-xl text-gray-700 leading-relaxed mb-8">ผมเพิ่งเข้าใจในวันนั้นเองว่า การเรียนมันเหมือน "การเติมน้ำใส่แก้วก้นรั่ว" เราจะเติมบ้างหยุดบ้างไม่ได้ เพราะน้ำจะรั่วออกหมด เสียเวลาเปล่า เราต้องเติมให้ต่อเนื่องและมากพอจนมันล้นออกมา</p>
                                <p className="text-xl font-bold text-gray-800 leading-relaxed mb-8">และแล้ววันที่น่าอัศจรรย์ก็มาถึง... วันที่ผมเห็นข้อสอบแล้วไม่ได้ "นั่งคิด" แต่ผม "ลงมือทำ" ทันที... โดยอัตโนมัติ! สมองมันร้องอ๋อออกมาเองว่า "ข้อนี้น่ะเหรอ? เคยทำมาแล้ว!"</p>
                                <p className="text-xl text-gray-700 leading-relaxed mb-8">ผมจึงได้รู้ความลับข้อที่ใหญ่ที่สุดว่า คนที่เตรียมตัวมาพร้อม เขาไม่ได้เข้าไปนั่งคิดในห้องสอบครับ เขาเข้าไปนั่งทำอย่างเดียว! ประสบการณ์ครั้งนั้นเปลี่ยนชีวิตผมไปตลอดกาล มันทำให้ผมรู้ว่าความสำเร็จไม่ได้มาจากพรสวรรค์ ไม่ได้มาจากความฝันที่สวยหรู ไม่ใช่เรื่องของคนเรียนๆ เล่นๆ แล้วจะทำได้ แต่มันมาจาก "ความมานะพยายามอย่างต่อเนื่อง"</p>
                                <p className="text-xl text-gray-700 leading-relaxed mb-8">และนี่คือแก่นของเทคนิคทั้งหมดที่ผมใช้สอนน้องๆ ที่ครูฮีม... เพราะผมเชื่อสุดหัวใจว่า</p>
                                <blockquote className="text-3xl md:text-4xl font-bold text-emerald-700 border-l-4 border-emerald-500 pl-6">คณิตศาสตร์ไม่ยาก... <br className="md:hidden" />ยากเฉพาะคนไม่ลงมือทำ</blockquote>
                            </div>
                        </div>
                    </section>

                    {/* Course Details Section */}
                    <section id="courses" className="bg-white pt-20 pb-20">
                        <div className="container mx-auto px-6">
                            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-4">🔥คอร์สสอบเข้า ม.1🔥</h2>
                            <p className="text-center text-lg text-gray-600 mb-12">พร้อมลุย 💪 ปูพื้นฐานแน่น 🧱 เสริมเทคนิค ✨ เก่งไว ⚡ สอบเข้าได้สบาย 😎💯</p>
                            <div className="max-w-4xl mx-auto bg-gray-50 p-8 rounded-2xl shadow-lg">
                                <div className="grid md:grid-cols-2 gap-8 mb-10 text-center">
                                    <div className="bg-emerald-100 p-6 rounded-lg"><h3 className="font-bold text-emerald-800 text-xl mb-2">ปูพื้นฐานใหม่หมดจด</h3><p>คอร์สนี้จะปูพื้นฐานใหม่ตั้งแต่ ป.4, ป.5, ป.6 และเพิ่มเติมเนื้อหา ม.1-3 ที่ต้องใช้ในการทำข้อสอบ</p></div>
                                    <div className="bg-emerald-100 p-6 rounded-lg"><h3 className="font-bold text-emerald-800 text-xl mb-2">ตะลุยโจทย์เข้มข้น</h3><p>คัดแนวโจทย์จากสนามสอบเข้าจริง, ข้อสอบแข่งขัน สสวท. และสมาคมคณิตศาสตร์</p></div>
                                </div>
                                <h3 className="font-bold text-2xl text-center text-gray-800 mb-6">📖 ภายในคอร์สอัดแน่นเนื้อหาทั้ง 16 บท (คลิกเพื่อดูรายละเอียด)</h3>

                                {/* Main Course Accordion */}
                                <div className="space-y-3 mb-10">
                                    {[
                                        { title: "บทที่ 1️⃣ จำนวนนับและการบวก ลบ คูณ และหาร ➕➖✖️➗", content: ["ส่วนที่ 1: รู้จักตัวเลขให้ลึกซึ้ง", "ส่วนที่ 2: เครื่องมือช่วยคำนวณ", "ส่วนที่ 3: การประยุกต์ใช้และแก้ปัญหา"] },
                                        { title: "บทที่ 2️⃣ สมการและการแก้สมการ ⚖️", content: ["ส่วนที่ 1: รู้จักสมการ", "ส่วนที่ 2: เทคนิคการแก้สมการที่ซับซ้อน", "ส่วนที่ 3: ตะลุยโจทย์ปัญหา"] },
                                        { title: "บทที่ 3️⃣ ตัวประกอบของจำนวนนับ 🔢", content: ["ส่วนที่ 1: พื้นฐานต้องแม่น!", "ส่วนที่ 2: ห.ร.ม. และ ค.ร.น.", "ส่วนที่ 3: ตะลุยโจทย์ปัญหา"] },
                                        { title: "บทที่ 4️⃣ มุมและส่วนของเส้นตรง 📏📐", content: ["ส่วนที่ 1: เครื่องมือเรขาคณิต", "ส่วนที่ 2: เมื่อเส้นตรงมาเจอกัน", "ส่วนที่ 3: ตะลุยโจทย์ประยุกต์"] },
                                        { title: "บทที่ 5️⃣ เส้นขนาน ↔️", content: ["ส่วนที่ 1: พื้นฐานต้องแม่น!", "ส่วนที่ 2: เทคนิคตะลุยโจทย์ 3 รูปแบบ", "ส่วนที่ 3: คลังข้อสอบจริง"] },
                                        { title: "บทที่ 6️⃣ ทิศและแผนผัง 🗺️", content: ["ส่วนที่ 1: การบอกตำแหน่งด้วยทิศ", "ส่วนที่ 2: ย่อ-ขยายโลกด้วยมาตราส่วน", "ส่วนที่ 3: ตะลุยโจทย์ปัญหา"] },
                                        { title: "บทที่ 7️⃣ เศษส่วน 🍕", content: ["ส่วนที่ 1: ปูพื้นฐานให้แน่น!", "ส่วนที่ 2: เซียนคำนวณ!", "ส่วนที่ 3: ตะลุยโจทย์ปัญหา"] },
                                        { title: "บทที่ 8️⃣ ทศนิยม 💰", content: ["ส่วนที่ 1: Hello, Decimals!", "ส่วนที่ 2: คู่แฝดคนละฝา", "ส่วนที่ 3: บวก ลบ คูณ", "ส่วนที่ 4: คณิตศาสตร์ในชีวิตจริง"] },
                                        { title: "บทที่ 9️⃣ การหารทศนิยม ➗", content: ["ส่วนที่ 1: หลักการและเทคนิค", "ส่วนที่ 2: ตะลุยโจทย์คำนวณ"] },
                                        { title: "บทที่ 🔟 รูปสี่เหลี่ยม ⏹️", content: ["ส่วนที่ 1: เปิดโลกสี่เหลี่ยม", "ส่วนที่ 2: สูตรลับคำนวณ", "ส่วนที่ 3: ตะลุยโจทย์ประยุกต์"] },
                                        { title: "บทที่ 1️⃣1️⃣ รูปสามเหลี่ยม 🔺", content: ["ส่วนที่ 1: แกะโครงสร้าง", "ส่วนที่ 2: การคำนวณเบื้องต้น", "ส่วนที่ 3: ตะลุยโจทย์ประยุกต์"] },
                                        { title: "บทที่ 1️⃣2️⃣ รูปวงกลม ⭕", content: ["ส่วนที่ 1: Anatomy of a Circle", "ส่วนที่ 2: สูตรคำนวณมหัศจรรย์", "ส่วนที่ 3: ตะลุยโจทย์ประยุกต์"] },
                                        { title: "บทที่ 1️⃣3️⃣ บทประยุกต์ 📈", content: ["ส่วนที่ 1: ร้อยละ / เปอร์เซ็นต์", "ส่วนที่ 2: กำไร - ขาดทุน", "ส่วนที่ 3: ดอกเบี้ย"] },
                                        { title: "บทที่ 1️⃣4️⃣ รูปทรงและปริมาตร 📦", content: ["ส่วนที่ 1: รู้จักรูปเรขาคณิตสามมิติ", "ส่วนที่ 2: การคำนวณ", "ส่วนที่ 3: พื้นที่ผิว", "ส่วนที่ 4: ตะลุยโจทย์"] },
                                        { title: "บทที่ 1️⃣5️⃣ แผนภูมิและกราฟ 📊", content: ["ส่วนที่ 1: การนำเสนอข้อมูล", "ส่วนที่ 2: การวิเคราะห์", "ส่วนที่ 3: ตะลุยโจทย์"] },
                                        { title: "บทที่ 1️⃣6️⃣ ความน่าจะเป็น 🎲", content: ["ส่วนที่ 1: โอกาสของเหตุการณ์", "ส่วนที่ 2: การคำนวณ", "ส่วนที่ 3: การนับเบื้องต้น"] },
                                    ].map((chapter, index) => (
                                        <div key={index} className="bg-white rounded-lg shadow-sm">
                                            <button
                                                onClick={() => toggleChapter(index)}
                                                className="w-full flex justify-between items-center p-4 text-left font-semibold text-emerald-700"
                                            >
                                                <span>{chapter.title}</span>
                                                <i className={`fas fa-chevron-down transition-transform duration-300 ${openChapterIndex === index ? 'rotate-180' : ''}`}></i>
                                            </button>
                                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openChapterIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <div className="p-4 pt-2 text-gray-600 space-y-2 text-left">
                                                    <ul className="list-disc list-inside pl-4 text-sm space-y-1">
                                                        {chapter.content.map((item, i) => <li key={i}>{item}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Special Offer Box */}
                                <div className="bg-teal-50 border-l-4 border-teal-400 text-teal-800 p-6 rounded-lg shadow-md my-10">
                                    <div className="flex items-center">
                                        <div className="pr-4"><i className="fas fa-wand-magic-sparkles fa-2x text-teal-500"></i></div>
                                        <div>
                                            <p className="font-bold text-lg">สมัครเรียนตอนนี้คุ้มมากๆ ครับ!</p>
                                            <p className="text-teal-700">เพราะตอนนี้ครูฮีมกำลังอัพเดทแนวโจทย์พิเศษสอบเข้าห้อง Gifted อีก 40 แนวโจทย์ <br className="sm:hidden" />ถ้าการอัพเดทเสร็จสมบูรณ์แล้ว ราคาจะเพิ่มขึ้นอีกพอสมควรเลยครับ</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Gifted Content Accordion */}
                                <div className="mt-8 space-y-3">
                                    <h4 className="font-bold text-xl text-center text-gray-800 mb-4">💡 40 แนวโจทย์ห้อง Gifted ที่ครูฮีมกำลัง update</h4>
                                    {[
                                        { title: "PART 1: รากฐานคณิตศาสตร์และทักษะการคำนวณ 📚", items: ["บทที่ 1: หลักการคำนวณ", "บทที่ 2: เลขยกกำลัง", "บทที่ 3: ตัวประกอบ", "บทที่ 4: ห.ร.ม. และ ค.ร.น.", "บทที่ 5: แบบรูป", "บทที่ 6: ฟีโบนักชี", "บทที่ 7: ลำดับเลขคณิต", "บทที่ 8: การหารลงตัว"] },
                                        { title: "PART 2: เศษส่วน ทศนิยม และอนุกรมขั้นสูง 📈", items: ["บทที่ 9: เศษส่วนซ้อน", "บทที่ 10: อนุกรมเทเลสโกปิก", "บทที่ 11: แยกเศษส่วนย่อย", "บทที่ 12: ทศนิยมซ้ำ"] },
                                        { title: "PART 3: สมการและการแก้โจทย์ปัญหา ⚖️", items: ["บทที่ 13: สมการเชิงเส้น", "บทที่ 14: ระบบสมการ"] },
                                        { title: "PART 4: คณิตศาสตร์ประยุกต์ในชีวิตจริง 📊", items: ["บทที่ 15: อัตราส่วน", "บทที่ 16: ร้อยละ", "บทที่ 17: กำไร-ขาดทุน", "บทที่ 18: ดอกเบี้ย"] },
                                        { title: "PART 5: เรขาคณิตและการให้เหตุผล 📐", items: ["บทที่ 19: พีทาโกรัส", "บทที่ 20: สามเหลี่ยมคล้าย", "บทที่ 21-28: เรขาคณิตต่างๆ"] },
                                        { title: "PART 6: กลยุทธ์และเทคนิคพิชิตข้อสอบ 🎯", items: ["บทที่ 29: พื้นที่แรเงา", "บทที่ 30: เรขาคณิตวิเคราะห์", "บทที่ 31: ปริมาตร", "บทที่ 32-40: โจทย์ปัญหาต่างๆ"] },
                                    ].map((part, index) => (
                                        <div key={index} className="bg-white rounded-lg shadow-sm">
                                            <button
                                                onClick={() => toggleGifted(index)}
                                                className="w-full flex justify-between items-center p-4 text-left font-semibold text-gray-800"
                                            >
                                                <span>{part.title}</span>
                                                <i className={`fas fa-chevron-down transition-transform duration-300 ${openGiftedIndex === index ? 'rotate-180' : ''}`}></i>
                                            </button>
                                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openGiftedIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <div className="p-4 pt-2 text-gray-600 space-y-2 text-left">
                                                    {part.items.map((item, i) => <div key={i}>{item}</div>)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pricing */}
                                <div className="grid md:grid-cols-2 gap-8 my-10">
                                    <div className="bg-white p-6 rounded-lg"><h4 className="font-bold text-xl mb-2">⏳ ระยะเวลาเรียน: 5 ปีเต็ม!</h4><p>ให้เวลาเรียนแบบจุใจ ทบทวนได้เต็มที่ ไม่ต้องกังวลเรื่องเวลา</p></div>
                                    <div className="bg-white p-6 rounded-lg"><h4 className="font-bold text-xl mb-2">🔁 เรียนซ้ำได้ไม่จำกัด</h4><p>กลับมาดูซ้ำได้ตลอด 5 ปี ไม่จำกัดจำนวนครั้ง จนกว่าจะเข้าใจ</p></div>
                                </div>
                                <div className="bg-emerald-600 text-white p-8 rounded-2xl text-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
                                    <p className="text-xl opacity-80">ราคาปกติ 3,700 บาท</p>
                                    <p className="text-4xl font-bold mt-1">**ลดพิเศษเหลือ**</p>
                                    <p className="text-7xl font-bold my-2 tracking-tight">2900</p>
                                    <p className="text-4xl font-bold mb-4">บาท**</p>
                                    <p className="mb-2 text-xl font-bold">ถ้าหารเฉลี่ยตลอด 5 ปี เท่ากับลงทุนแค่ <span className="text-amber-300">1.6</span> บาทต่อวันเท่านั้น!</p>
                                    <p className="mb-6 text-emerald-100 text-lg">เนื้อหายังไม่จบ 📈 จะอัพเดทแนวโจทย์ให้เรื่อยๆ<br />(เพิ่มแนวโจทย์ให้เยอะที่สุดเท่าที่ผมสามารถให้ได้) 💪</p>
                                    <a href="#signup" className="bg-white text-emerald-600 font-bold py-3 px-10 rounded-full text-lg hover:bg-gray-200 transition duration-300 inline-block">สมัครตอนนี้ เรียนได้ทันที!</a>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Trial Lesson Section */}
                    <section id="trial" className="bg-gray-50 pt-20 pb-20">
                        <div className="container mx-auto px-6">
                            <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">เรียนฟรีก่อนตัดสินใจ! 🎥</h2>
                            <p className="text-center text-lg text-gray-600 mb-12">เลือกดูสไตล์การสอนของครูฮีมได้เลยครับ</p>

                            <div className="max-w-xl mx-auto grid grid-cols-2 gap-3 sm:gap-4 mb-8">
                                {videoTabs.map((tab, index) => (
                                    <button
                                        key={index}
                                        onClick={() => { setActiveTab(index); setActiveVideo(tab.src); }}
                                        className={`py-3 px-4 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 flex items-center justify-center ${activeTab === index ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-200 text-gray-600'}`}
                                    >
                                        <span className="mr-2">{tab.icon}</span> {tab.title}
                                    </button>
                                ))}
                            </div>

                            <div className="max-w-sm mx-auto bg-white p-2 sm:p-3 rounded-2xl shadow-lg">
                                <div className="aspect-[9/16] w-full">
                                    <iframe className="w-full h-full rounded-lg" src={activeVideo} title="วิดีโอทดลองเรียน" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                                </div>
                            </div>

                            <div className="text-center mt-8">
                                <a href="#signup" className="bg-emerald-500 text-white font-bold py-3 px-10 rounded-full text-lg hover:bg-emerald-600 transition duration-300 transform hover:scale-105 inline-block">สมัครตอนนี้เรียนได้ทันที!</a>
                            </div>

                            {/* Document Slider */}
                            <div className="mt-20">
                                <h3 className="text-2xl font-bold text-center text-gray-800 mb-4">ตัวอย่างเอกสารประกอบการเรียน 📄</h3>
                                <p className="text-center text-xl text-gray-600 mb-12">เอกสารเรียนสามารถโหลดได้ภายในกลุ่ม</p>
                                <div className="relative max-w-5xl mx-auto">
                                    <Swiper
                                        modules={[Autoplay]}
                                        spaceBetween={16}
                                        slidesPerView={'auto'}
                                        loop={true}
                                        speed={10000}
                                        autoplay={{ delay: 0, disableOnInteraction: false }}
                                        className="document-image-slider"
                                    >
                                        {docImages.map((img, i) => (
                                            <SwiperSlide key={i} style={{ width: '250px' }}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={img}
                                                    alt="เอกสาร"
                                                    className="w-full h-auto rounded-lg shadow-md border-4 border-white cursor-pointer hover:scale-105 transition-transform"
                                                    onClick={() => setLightboxImage(img)}
                                                    onError={(e) => e.currentTarget.src = 'https://placehold.co/250x350/ffffff/ef4444?text=Doc+Error'}
                                                />
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* FAQ Section */}
                    <section id="faq" className="bg-white py-20">
                        <div className="container mx-auto px-6">
                            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">ไขทุกข้อข้องใจ 🧐 ก่อนพาลูกพิชิตสนามสอบ!</h2>
                            <div className="max-w-3xl mx-auto space-y-4">
                                {[
                                    { q: "Q1: น้องพื้นฐานไม่แน่นเลย จะเรียนทันเพื่อนไหมคะ?", a: "สบายใจได้เลยครับ! คอร์สนี้ออกแบบมาเพื่อแก้ปัญหานี้โดยเฉพาะ เราจะเริ่มต้น 'ปูพื้นฐานใหม่ทั้งหมด' ตั้งแต่อายุ ป.4, ป.5, ป.6 อย่างละเอียด" },
                                    { q: "Q2: คอร์สนี้แตกต่างจากที่อื่นอย่างไร?", a: "เราเน้นที่ 'ผลลัพธ์ที่จับต้องได้' ครับ! ครูฮีมไม่ได้แค่สอนสูตร แต่สอนจากประสบการณ์ตรงที่เคยเป็นเด็กไม่เก่งคณิตมาก่อน" },
                                    { q: "Q3: ถ้าเรียนแล้วมีคำถาม จะถามครูได้ที่ไหน?", a: "เรามี 'กลุ่มเรียนออนไลน์' ทั้งทาง LINE และ Facebook ครับ น้องๆ สามารถสอบถามข้อสงสัยได้ตลอดเวลา" },
                                    { q: "Q4: เรียนออนไลน์ น้องจะเบื่อไหม? มีสมาธิเรียนหรือเปล่า?", a: "ครูฮีมใช้เทคนิคการสอนที่ 'สนุกและเข้าใจง่าย' ครับ! แต่ละคลิปจะกระชับ ไม่ยาวเกินไป เน้นการอธิบายให้เห็นภาพ" },
                                    { q: "Q5: ทำไมราคาคอร์สถึงพิเศษขนาดนี้? แล้วจะมีการปรับราคาขึ้นไหม?", a: "ใช่ครับ ราคานี้พิเศษจริงๆ! เพราะตอนนี้เป็นช่วงที่ครูฮีมกำลังทยอยอัปเดตเนื้อหาและแนวข้อสอบสำหรับห้อง Gifted เพิ่มเติม" },
                                    { q: "Q6: สมัครแล้วเริ่มเรียนได้เลยไหม? ต้องรอรอบหรือเปล่า?", a: "เริ่มเรียนได้ทันทีเลยครับ! หลังจากชำระเงินและแจ้งหลักฐานเรียบร้อยแล้ว ทีมงานจะดึงเข้ากลุ่มและส่งรายละเอียดให้ทันที" },
                                    { q: "Q7: มีคอร์สฟรีใน YouTube เยอะแยะ ทำไมต้องจ่ายเงินเรียนคอร์สนี้?", a: "คลิปฟรีเหล่านั้นเปรียบเหมือน 'จิ๊กซอว์' ที่กระจัดกระจายครับ คอร์สครูฮีมคือ 'ภาพแผนที่สู่ความสำเร็จ' ที่วางเส้นทางไว้ชัดเจน" },
                                    { q: "Q8: อีกหลายเดือนกว่าจะสอบ รอใกล้ๆ ค่อยสมัครได้ไหม?", a: "การเตรียมตัวสอบก็เหมือน 'การเติมน้ำใส่แก้วก้นรั่ว' ครับ ยิ่งเริ่มเติมช้า ก็ยิ่งต้องออกแรงเยอะและเสี่ยงที่น้ำจะรั่วหมดก่อนถึงวันสอบ" },
                                ].map((item, index) => (
                                    <div key={index} className="bg-gray-50 rounded-lg shadow-sm">
                                        <button
                                            onClick={() => toggleFaq(index)}
                                            className="w-full flex justify-between items-center p-5 text-left font-semibold text-gray-800"
                                        >
                                            <span>{item.q}</span>
                                            <i className={`fas fa-chevron-down transition-transform duration-300 ${openFaqIndex === index ? 'rotate-180' : ''}`}></i>
                                        </button>
                                        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openFaqIndex === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="p-5 pt-0 text-gray-600">
                                                <p>{item.a}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Signup Section */}
                    <section id="signup" className="bg-gray-100 pt-20 pb-20">
                        <div className="container mx-auto px-6">
                            <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">สมัครเรียน / สอบถามเพิ่มเติม</h2>
                            <p className="text-center text-gray-600 mb-12">เลือกช่องทางที่สะดวกที่สุดได้เลยครับ</p>
                            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                                <div className="text-center bg-white p-8 rounded-lg shadow-lg transition-transform transform hover:scale-105">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-4">ช่องทางที่ 1: LINE</h3>
                                    <p className="text-gray-600 mb-6">สแกน QR Code เพื่อพูดคุย สอบถาม<br />หรือสมัครเรียนได้เลย!</p>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/images/qrline.png" alt="LINE QR Code" className="mx-auto mb-4 border-4 border-gray-200 rounded-lg w-48 h-48 object-cover" onError={(e) => e.currentTarget.src = 'https://placehold.co/250x250/ffffff/ef4444?text=QR+Error'} />
                                    <p className="text-lg font-semibold text-gray-700">LINE ID: @kruheem</p>
                                </div>
                                <div className="text-center bg-white p-8 rounded-lg shadow-lg transition-transform transform hover:scale-105">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-4">ช่องทางที่ 2: Facebook</h3>
                                    <p className="text-gray-600 mb-6">สะดวกทักแชท? กดปุ่มด้านล่าง<br />เพื่อส่งข้อความหาเราได้ทันที</p>
                                    <a href="https://www.facebook.com/kruheem.math" target="_blank" className="inline-flex items-center justify-center bg-blue-600 text-white font-bold py-4 px-8 rounded-full hover:bg-blue-700 transition duration-300 w-full md:w-auto">
                                        <i className="fab fa-facebook-messenger mr-3 text-2xl"></i>
                                        <span>ทักแชทเลย</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Choices Section */}
                    <section id="choices" className="bg-gray-50 pt-20 pb-20">
                        <div className="container mx-auto px-6 text-center">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-12">ณ จุดนี้มี 2 ทางเลือก...</h2>
                            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-gray-300 choice-card">
                                    <h3 className="text-2xl font-bold text-gray-700 mb-4">ทางเลือกที่ 1: เส้นทางเดิม</h3>
                                    <p className="text-gray-600 leading-relaxed">ปล่อยให้ความกังวลกัดกินต่อไป ลองผิดลองถูกด้วยตัวเอง เสียเวลาไปกับการงมหาแนวทางที่ไม่ชัดเจน และปล่อยให้อนาคตของลูกอยู่บนความเสี่ยง</p>
                                </div>
                                <div className="bg-white p-8 rounded-lg shadow-2xl border-t-4 border-emerald-500 choice-card">
                                    <h3 className="text-2xl font-bold text-emerald-600 mb-4">ทางเลือกที่ 2: เส้นทางสู่ความสำเร็จ</h3>
                                    <p className="text-gray-600 leading-relaxed mb-6">เลือกใช้ระบบที่พิสูจน์แล้วว่าได้ผลจริง ประหยัดเวลาไปหลายร้อยชั่วโมง สร้างความมั่นใจให้ลูกด้วยแผนการที่ชัดเจน</p>
                                    <a href="#signup" className="bg-emerald-500 text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-emerald-600 transition duration-300 inline-block">เลือกเส้นทางสู่ความสำเร็จ</a>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Special Offer Section */}
                    <section id="special-offer" className="bg-amber-50 py-16">
                        <div className="container mx-auto px-6 text-center">
                            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border-2 border-dashed border-amber-400">
                                <h2 className="text-2xl md:text-3xl font-bold text-amber-600 mb-2">🎁 สำหรับผู้ปกครองที่อ่านมาถึงตรงนี้...</h2>
                                <p className="text-gray-700 text-lg mb-6">ครูฮีมขอมอบของขวัญพิเศษ! เพื่อตอบแทนความใส่ใจในอนาคตของลูกคุณ</p>

                                <div className="my-6">
                                    {!showCode ? (
                                        <button onClick={() => setShowCode(true)} className="bg-amber-400 text-amber-900 font-bold py-3 px-8 rounded-full text-lg hover:bg-amber-500 transition duration-300 inline-block transform hover:scale-105">
                                            🎁 กดเพื่อรับโค้ดส่วนลดพิเศษ!
                                        </button>
                                    ) : (
                                        <div className="bg-gray-100 p-4 rounded-lg animate-in fade-in zoom-in">
                                            <p className="text-xl font-bold text-gray-800 mb-2">รับส่วนลดเพิ่มทันที <span className="text-red-500 text-2xl">100</span> บาท!</p>
                                            <p className="gray-600 mb-2">โค้ดส่วนลดของคุณคือ:</p>
                                            <p className="text-3xl font-bold text-emerald-600 tracking-widest bg-white py-3 rounded border border-emerald-200">{discountCode}</p>
                                        </div>
                                    )}
                                </div>

                                <p className="text-gray-600 font-semibold">เพียง <strong className="text-emerald-600">แคปหน้าจอ</strong> หรือ <strong className="text-emerald-600">บันทึกภาพโค้ดนี้</strong><br />แล้วส่งให้แอดมินทางข้อความ เพื่อรับส่วนลดได้เลยครับ!</p>
                                <p className="text-red-500 mt-4 font-bold animate-pulse">โค้ดนี้มีจำนวนจำกัด รีบใช้สิทธิ์ก่อนหมดนะครับ!</p>
                            </div>
                        </div>
                    </section>

                    {/* Final CTA */}
                    <section className="cta-gradient text-white">
                        <div className="container mx-auto px-6 py-16 text-center">
                            <h2 className="text-3xl font-bold mb-4">ถ้าพร้อมแล้ว เรามาลุยไปด้วยกัน!</h2>
                            <p className="text-2xl mb-8">สมัครและเริ่มเรียนได้ทันที!</p>
                            <a href="#signup" className="bg-white text-emerald-500 font-bold py-3 px-8 rounded-full text-lg hover:bg-gray-100 transition duration-300 transform hover:scale-105">ทัก LINE เลย!</a>
                        </div>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer id="contact" className="bg-gray-800 text-white py-12">
                <div className="container mx-auto px-6 text-center">
                    <div className="mb-12">
                        <h3 className="text-xl font-semibold mb-4">นักเรียนส่วนใหญ่...<br className="sm:hidden" /> เลือกลงเรียนคอร์สนี้ต่อ</h3>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                            <a href="#" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-full transition-colors duration-300">คอร์สเท่งสมการ</a>
                            <a href="#" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-full transition-colors duration-300">คอร์ส ม.1 เทอม 1</a>
                        </div>
                    </div>
                    <div className="flex justify-center space-x-6">
                        <a href="https://www.facebook.com/kruheem.math" className="text-2xl hover:text-emerald-400" target="_blank"><i className="fab fa-facebook"></i></a>
                        <a href="https://www.instagram.com/kruheemchotimanit?igsh=MWR4eXR3dGpnNHdkcQ==" className="text-2xl hover:text-emerald-400" target="_blank"><i className="fab fa-instagram"></i></a>
                        <a href="https://lin.ee/PtMNRFM" className="text-2xl hover:text-emerald-400" target="_blank"><i className="fab fa-line"></i></a>
                        <a href="https://www.youtube.com/channel/UCAp15hP0srAqeNX4nkOkOCw" className="text-2xl hover:text-emerald-400" target="_blank"><i className="fab fa-youtube"></i></a>
                        <a href="https://www.tiktok.com/@math_kruheem?_t=ZS-8zDsYQEwmrl&_r=1" className="text-2xl hover:text-emerald-400" target="_blank"><i className="fab fa-tiktok"></i></a>
                    </div>
                    <p className="mt-8 text-gray-400 text-sm">&copy; 2025 คณิตครูฮีม. All rights reserved.</p>
                </div>
            </footer>

            {/* Lightbox */}
            {lightboxImage && (
                <div className="fixed inset-0 z-[110] bg-black bg-opacity-80 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
                    <button className="absolute top-4 right-4 text-white text-3xl font-bold">&times;</button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lightboxImage} alt="Full Screen" className="max-w-full max-h-full object-contain" />
                </div>
            )}
        </div>
    );
}
