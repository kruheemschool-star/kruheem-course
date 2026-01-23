"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  Star,
  ArrowRight,
  Rocket,
  Search,
  Quote,
  Heart,
  Flame,
  Trophy,
  Loader2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";


const BannerImage = ({ url, isActive, index }: { url: string, isActive: boolean, index: number }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-stone-100 z-20 overflow-hidden">
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>

          {/* Subtle Center Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-stone-200/50 flex items-center justify-center animate-pulse">
              <Sparkles className="w-6 h-6 text-stone-300" />
            </div>
          </div>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Promotional Banner ${index + 1}`}
        className={`w-full h-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default function HomePage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [badgeText, setBadgeText] = useState("คอร์สยอดนิยม");
  const [badgeIcon, setBadgeIcon] = useState("Star");

  // Banner Content State
  const [bannerTitle, setBannerTitle] = useState("ติวเข้มสอบเข้า Gifted ม.1");
  const [bannerDescription, setBannerDescription] = useState("40 แนวข้อสอบที่ต้องรู้ก่อนเดินเข้าห้องสอบ เพราะที่นั่งในห้องเรียนอัจฉริยะ มีจำกัด");
  const [bannerPrice, setBannerPrice] = useState("1,900");
  const [bannerFullPrice, setBannerFullPrice] = useState("");
  const [bannerLinkUrl, setBannerLinkUrl] = useState("/payment");



  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        setCourses(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchBanner = async () => {
      try {
        const docRef = doc(db, "system", "banners");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.bannerImages && Array.isArray(data.bannerImages) && data.bannerImages.length > 0) {
            setBannerImages(data.bannerImages.map((img: any) => img.url));
          } else if (data.mainBannerUrl) {
            setBannerImages([data.mainBannerUrl]);
          } else {
            setBannerImages(["/images/course-promo-banner.png"]);
          }
          if (data.badgeText) setBadgeText(data.badgeText);
          if (data.badgeIcon) setBadgeIcon(data.badgeIcon);

          if (data.bannerTitle) setBannerTitle(data.bannerTitle);
          if (data.bannerDescription) setBannerDescription(data.bannerDescription);
          if (data.bannerTitle) setBannerTitle(data.bannerTitle);
          if (data.bannerDescription) setBannerDescription(data.bannerDescription);
          if (data.bannerPrice) setBannerPrice(data.bannerPrice);
          if (data.bannerFullPrice) setBannerFullPrice(data.bannerFullPrice);
          if (data.bannerLinkUrl) setBannerLinkUrl(data.bannerLinkUrl);
        } else {
          setBannerImages(["/images/course-promo-banner.png"]);
        }
      } catch (error) {
        console.error("Error fetching banner:", error);
        setBannerImages(["/images/course-promo-banner.png"]);
      } finally {
        setBannerLoading(false);
      }
    };

    fetchCourses();
    fetchBanner();
  }, []);

  // Auto-play slideshow
  useEffect(() => {
    if (bannerImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerImages.length);
    }, 5000); // Change every 5 seconds
    return () => clearInterval(interval);
  }, [bannerImages]);

  const groupedCourses = courses.reduce((acc: Record<string, any[]>, course: any) => {
    const category = course.category || "คอร์สเรียนทั่วไป";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(course);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort courses within each category
  Object.keys(groupedCourses).forEach(category => {
    groupedCourses[category].sort((a, b) => a.title.localeCompare(b.title, 'th'));
  });

  const categoryOrder = ["คอร์สสอบเข้า", "สอบเข้า ม.1", "ประถม (ป.4-6)", "ม.ต้น (ม.1-3)", "ม.ปลาย (ม.4-6)", "คอร์สเรียนทั่วไป"];
  const sortedCategories = Object.keys(groupedCourses).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  const [showRobloxModal, setShowRobloxModal] = useState(false);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'KruHeem Course',
    url: 'https://www.kruheemmath.com',
    logo: 'https://www.kruheemmath.com/assets/kruheem_avatar.png',
    sameAs: [
      'https://www.facebook.com/kruheem',
      'https://www.youtube.com/kruheem'
    ],
    description: 'สถาบันกวดวิชาคณิตศาสตร์ออนไลน์ โดยครูฮีม เน้นความเข้าใจ เทคนิคคิดลัด และการนำไปใช้จริง',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bangkok',
      addressCountry: 'TH'
    },
    offers: {
      '@type': 'Offer',
      category: 'Online Course'
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-teal-200 selection:text-teal-900 flex flex-col overflow-x-hidden transition-colors duration-500">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Dynamic Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 dark:hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-teal-100/30 rounded-full blur-[120px] mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-100/30 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[70vw] h-[70vw] bg-slate-100/40 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>
      {/* Dark mode background */}
      <div className="fixed inset-0 z-0 hidden dark:block">
        <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-teal-900/20 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-900/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[70vw] h-[70vw] bg-slate-900/30 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        {/* Hero Section */}
        <header className="pt-48 pb-16 px-6 text-center relative">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-700 shadow-sm mb-8 animate-fade-in hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors cursor-default max-w-3xl">
              <span className="flex-shrink-0 flex w-2 h-2 rounded-full bg-teal-500 animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.6)]"></span>
              <span className="text-sm md:text-base font-bold text-slate-700 dark:text-slate-300 tracking-wide drop-shadow-sm text-left md:text-center">
                เปลี่ยนความกังวลเรื่องการเรียนของลูก ให้เป็นความมั่นใจเต็ม 100%
              </span>
            </div>

            <h1 className="font-mero text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-slate-50 mb-8 tracking-tight leading-tight drop-shadow-md max-w-6xl mx-auto py-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 block mb-1 leading-tight">
                ในขณะที่เรากำลังลังเล
              </span>
              <span className="block text-slate-800 dark:text-slate-200 mb-1 leading-tight">
                มีเด็กคนอื่น ๆ ที่กำลังเรียนอยู่
              </span>
              <span className="block text-slate-700 dark:text-slate-300 leading-tight">
                และกำลังก้าวไปข้างหน้าอย่างไม่หยุดยั้ง
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
              การเรียนคณิตศาสตร์เหมือนการเติมน้ำใส่แก้วที่รั่ว <br className="hidden md:block" />
              ถ้าไม่เติมให้มากพอและต่อเนื่อง น้ำก็ไม่มีวันเต็มแก้ว
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button
                onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                className="group relative px-10 py-5 rounded-[2rem] bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-lg shadow-[0_10px_30px_rgba(20,184,166,0.3)] hover:shadow-[0_20px_40px_rgba(20,184,166,0.4)] hover:scale-105 transition-all duration-500 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Rocket className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                  คอร์สเรียนทั้งหมด
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              </button>
              <Link href="/my-courses" className="px-10 py-5 rounded-[2rem] bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-lg hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm hover:shadow-md flex items-center gap-3 group">
                <BookOpen className="group-hover:scale-110 transition-transform text-teal-600" />
                เข้าสู่บทเรียน
              </Link>
            </div>

            {/* Promotional Image Section (Slideshow) */}

            {/* Promotional Image Section (Slideshow) */}
            {/* Promotional Image Section (Vertical Card Style) */}
            <div className="mt-16 w-full animate-fade-in flex justify-center" style={{ animationDelay: '0.5s' }}>
              <Link
                href={bannerLinkUrl}
                className="group relative bg-white rounded-[2.5rem] shadow-2xl hover:shadow-orange-200/50 hover:-translate-y-2 transition-all duration-500 flex flex-col overflow-hidden w-full mx-auto border border-stone-100"
              >
                {/* Image Header */}
                <div className="aspect-[21/9] w-full bg-stone-100 relative overflow-hidden">
                  {bannerLoading ? (
                    <div className="w-full h-full bg-stone-200 animate-pulse flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-stone-400 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {bannerImages.map((url, index) => (
                        <BannerImage
                          key={index}
                          url={url}
                          index={index}
                          isActive={index === currentSlide}
                        />
                      ))}

                      {/* Navigation Dots */}
                      {bannerImages.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
                          {bannerImages.map((_, index) => (
                            <button
                              key={index}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentSlide(index);
                              }}
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentSlide ? 'w-8 bg-white' : 'bg-white/50 hover:bg-white/80'}`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Content Body */}
                <div className="p-8 flex flex-col bg-white text-left relative z-20">

                  {/* Badge */}
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-orange-50 text-orange-600 font-bold text-sm w-fit">
                    {badgeIcon === "Star" && <Star size={16} fill="currentColor" />}
                    {badgeIcon === "Heart" && <Heart size={16} fill="currentColor" />}
                    {badgeIcon === "Flame" && <Flame size={16} fill="currentColor" />}
                    {badgeIcon === "Trophy" && <Trophy size={16} fill="currentColor" />}
                    {badgeIcon === "Sparkles" && <Sparkles size={16} fill="currentColor" />}
                    {badgeText}
                  </div>

                  <h3 className="text-2xl font-black text-slate-800 mb-3 leading-tight group-hover:text-amber-600 transition-colors">
                    {bannerTitle}
                  </h3>
                  <p className="text-slate-500 text-base mb-8 leading-relaxed font-medium line-clamp-3">
                    {bannerDescription}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100 w-full">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Course Price</span>
                      <div className="flex items-center gap-3">
                        {bannerFullPrice && (
                          <span className="text-lg font-bold text-slate-400 line-through decoration-slate-400/50 decoration-2">
                            ฿{bannerFullPrice}
                          </span>
                        )}
                        <span className="text-4xl md:text-5xl font-black text-rose-500 tracking-tight drop-shadow-sm animate-heartbeat">
                          {bannerPrice ? (bannerPrice === "Free" || bannerPrice === "ฟรี" ? "Free" : `฿${bannerPrice}`) : "คลิกดูรายละเอียด"}
                        </span>
                      </div>
                    </div>
                    <span className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:scale-110">
                      <ArrowRight size={24} strokeWidth={3} />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Content Cards Section */}
        <section className="py-12 px-6 relative z-10">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">

            {/* Exam Card - Softer Glassmorphism */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 text-center shadow-lg border border-amber-100/50 dark:border-amber-800/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group">
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-200/30 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-amber-300/40 transition-colors duration-500"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-200/30 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>

              <div className="relative z-10">
                <div className="inline-block p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md mb-5 border border-amber-200/50 shadow-sm">
                  <Trophy size={40} className="text-amber-500" />
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tight leading-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500">คลังข้อสอบออนไลน์</span>
                </h2>
                <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  ฝึกฝนทักษะคณิตศาสตร์ผ่านโจทย์หลากหลายรูปแบบ<br className="hidden md:block" />
                  พร้อมระบบตรวจคำตอบทันทีและเฉลยละเอียด
                </p>

                <Link href="/exam" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300">
                  <span>เริ่มทำข้อสอบ</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            {/* Summary Content Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-teal-50/80 to-cyan-50/80 dark:from-teal-900/20 dark:to-cyan-900/20 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 text-center shadow-lg border border-teal-100/50 dark:border-teal-800/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group">
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-teal-200/30 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-teal-300/40 transition-colors duration-500"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-200/30 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>

              <div className="relative z-10">
                <div className="inline-block p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md mb-5 border border-teal-200/50 shadow-sm">
                  <BookOpen size={40} className="text-teal-500" />
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tight leading-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-500">สรุปเนื้อหา</span>
                </h2>
                <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  อ่านสรุปเนื้อหาคณิตศาสตร์แบบกระชับ เข้าใจง่าย<br className="hidden md:block" />
                  พร้อมสูตรสำคัญและตัวอย่างที่ช่วยให้จำได้แม่นยำ
                </p>

                <Link href="/summary" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold text-base shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300">
                  <span>อ่านสรุปเนื้อหา</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* Story Section */}
        <section className="py-16 px-6 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 border border-white/60 dark:border-slate-800 shadow-lg relative overflow-hidden group hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-500">
              <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <Quote size={120} className="text-amber-900 dark:text-amber-500" />
              </div>

              <div className="relative z-10 space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed text-lg md:text-xl font-medium">
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 mb-8 leading-tight">
                  ผมเคยเกือบยอมแพ้... <br />
                  <span className="text-amber-600">จนวันที่ค้นพบ &quot;ความจริง&quot; ของการเรียนเลขให้เก่ง</span>
                </h2>

                <p>
                  เชื่อไหมครับว่าครั้งหนึ่ง ผมเคยนั่งจ้องโจทย์เลขแล้วในหัวว่างเปล่า เหมือนที่น้องๆ หลายคนเป็น ผมเคยรู้สึกว่าตัวเองหัวช้า ไม่เก่งเหมือนเพื่อน เคยแม้กระทั่งคิดว่า <span className="italic text-slate-500">&quot;เราคงไม่มีพรสวรรค์ด้านนี้&quot;</span> ทุกครั้งที่เห็นข้อสอบ ผมจะเข้าไป &quot;นั่งคิด&quot; ว่าจะเริ่มยังไงดี? จะใช้สูตรไหน? เอ๊ะ... แบบนี้จะใช่ไหมหนอ? สุดท้ายก็ทำไม่เคยทัน แถมที่ทำไปก็ผิด
                </p>

                <p>
                  จนวันหนึ่งที่ผมทนความรู้สึกนั้นไม่ไหว ผมตัดสินใจลุกขึ้นมา &quot;ลองผิด&quot; ด้วยตัวเอง และนั่นคือจุดที่ผมค้นพบความจริงว่า...
                </p>

                <div className="bg-amber-50/50 border-l-4 border-amber-400 p-6 rounded-r-xl my-8">
                  <p className="text-2xl font-bold text-amber-800 italic">
                    &quot;การเรียนเลขให้เก่ง ไม่ได้จบที่โรงเรียน... แต่มันเริ่มต้นที่บ้าน&quot;
                  </p>
                </div>

                <p>
                  ผมเปลี่ยนวิธีทบทวนใหม่หมด หลังเลิกเรียน ผมจะเอาทุกสิ่งที่เรียนในวันนั้นมา <strong>&quot;เขียนใหม่ด้วยลายมือตัวเอง&quot;</strong> ตั้งแต่อายุ คุณสมบัติ ไปจนถึงกลเม็ดคิดลัด จากนั้นก็ <strong>&quot;ลบแล้วทำซ้ำ&quot;</strong> วันแรก 10 ข้อ ผมอาจทำถูกแค่ 6 ข้อ แต่ผมไม่ท้อ ข้อไหนผิด ผมเปิดดู... แล้วทำใหม่ วันต่อมา ผมก็ทำแบบเดิมอีกครั้ง
                </p>

                <p>
                  ผมเพิ่งเข้าใจในวันนั้นเองว่า การเรียนมันเหมือน <span className="text-amber-600 font-bold">&quot;การเติมน้ำใส่แก้วก้นรั่ว&quot;</span> เราจะเติมบ้างหยุดบ้างไม่ได้ เพราะน้ำจะรั่วออกหมด เสียเวลาเปล่า เราต้องเติมให้ต่อเนื่องและมากพอจนมันล้นออกมา
                </p>

                <p>
                  และแล้ววันที่น่าอัศจรรย์ก็มาถึง... วันที่ผมเห็นข้อสอบแล้วไม่ได้ &quot;นั่งคิด&quot; แต่ผม <strong>&quot;ลงมือทำ&quot;</strong> ทันที... โดยอัตโนมัติ! สมองมันร้องอ๋อออกมาเองว่า &quot;ข้อนี้น่ะเหรอ? เคยทำมาแล้ว!&quot;
                </p>

                <p>
                  ผมจึงได้รู้ความลับข้อที่ใหญ่ที่สุดว่า คนที่เตรียมตัวมาพร้อม เขาไม่ได้เข้าไปนั่งคิดในห้องสอบครับ เขาเข้าไปนั่งทำอย่างเดียว! ประสบการณ์ครั้งนั้นเปลี่ยนชีวิตผมไปตลอดกาล มันทำให้ผมรู้ว่าความสำเร็จไม่ได้มาจากพรสวรรค์ ไม่ได้มาจากความฝันที่สวยหรู ไม่ใช่เรื่องของคนเรียนๆ เล่นๆ แล้วจะทำได้ แต่มันมาจาก <strong>&quot;ความมานะพยายามอย่างต่อเนื่อง&quot;</strong>
                </p>

                <div className="pt-8 text-center">
                  <p className="text-slate-500 mb-4">และนี่คือแก่นของเทคนิคทั้งหมดที่ผมใช้สอนน้องๆ ที่ครูฮีม... เพราะผมเชื่อสุดหัวใจว่า</p>
                  <h3 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
                    คณิตศาสตร์ไม่ยาก... ยากเฉพาะคนไม่ลงมือทำ
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Choices Section */}
        <section className="py-16 px-6 relative z-10">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-slate-800 mb-12 text-center tracking-tight">
              ทางเลือกมีแค่ 2 ทาง... อยู่ที่คุณจะเลือก
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Option 1: Red Pastel - Old Path */}
              <div
                onClick={() => setShowRobloxModal(true)}
                className="bg-red-50/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer group hover:-translate-y-1"
              >
                <h3 className="text-2xl md:text-3xl font-bold text-red-900 mb-6 group-hover:text-red-700 transition-colors">
                  ทางเลือกที่ 1: เส้นทางเดิม
                </h3>
                <p className="text-red-900/70 text-lg leading-relaxed">
                  ปล่อยให้ความสับสนและความกังวลกัดกินหัวใจของน้องต่อไป... ทุกๆ วันที่ผ่านไปคือการปล่อยให้เขาเผชิญหน้ากับโจทย์ที่ไม่เข้าใจอยู่ลำพัง ความมั่นใจที่เคยมีค่อยๆ เลือนหายไป กลายเป็นความกลัวที่จะยกมือถาม ปล่อยให้ช่องว่างระหว่างเขากับเพื่อนร่วมห้องถ่างกว้างขึ้นเรื่อยๆ จนตามไม่ทัน และที่น่าเสียดายที่สุด คือการปล่อยให้โอกาสทองในการสร้างอนาคตทางการศึกษาที่ดีที่สุด... ค่อยๆ หลุดลอยไปกับความท้อแท้
                </p>
                <div className="mt-8 flex items-center text-red-600 font-bold group-hover:gap-2 transition-all">
                  <span>เลือกเส้นทางนี้</span>
                  <ArrowRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Option 2: Green Pastel - Success Path */}
              <div className="bg-emerald-50/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 shadow-lg hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl md:text-3xl font-bold text-emerald-900 mb-6">
                    ทางเลือกที่ 2: เส้นทางสู่ความสำเร็จ
                  </h3>
                  <p className="text-emerald-900/70 text-lg leading-relaxed mb-8">
                    เลือกระบบที่พิสูจน์แล้วว่าได้ผลจริง ประหยัดเวลาไปหลายร้อยชั่วโมง สร้างความมั่นใจให้ลูกด้วยแผนการที่ชัดเจน และเปลี่ยนอนาคตการเรียนคณิตศาสตร์ของพวกเขาไปตลอดกาล นี่ไม่ใช่แค่การลงทุนเพื่อการสอบ แต่คือการลงทุนเพื่อทักษะที่จะติดตัวเขาไปตลอดชีวิต
                  </p>

                  <Link
                    href="/payment"
                    className="block w-full text-center py-4 rounded-2xl bg-emerald-600 text-white font-bold text-xl shadow-lg hover:bg-emerald-700 hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all duration-300"
                  >
                    เลือกเส้นทางสู่ความสำเร็จ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Roblox Modal */}
        {showRobloxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRobloxModal(false)}></div>
            <div className="bg-white rounded-[2rem] p-8 max-w-md w-full relative z-10 animate-fade-in shadow-2xl text-center">
              <button
                onClick={() => setShowRobloxModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>

              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              </div>

              <h3 className="text-2xl font-bold text-slate-800 mb-2">คุณเลือกเส้นทางเดิม?</h3>
              <p className="text-slate-600 mb-8">
                ถ้ายังไม่พร้อมจะเปลี่ยนอนาคต... งั้นไปพักผ่อนเล่นเกมก่อนก็ได้ครับ
              </p>

              <a
                href="https://www.roblox.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
                onClick={() => setShowRobloxModal(false)}
              >
                ไปเล่น Roblox แก้เครียด
              </a>
            </div>
          </div>
        )}



        {/* Courses Grid */}
        <main id="courses" className="max-w-[1400px] mx-auto px-6 pb-32 w-full">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-[500px] bg-white/40 rounded-[3rem] animate-pulse border border-white/60"></div>)}
            </div>
          ) : (
            <div className="space-y-32">
              {sortedCategories.map((category) => (
                <section key={category} className="animate-fade-in">
                  <div className="flex items-center gap-6 mb-12 pl-4">
                    <div className="w-16 h-16 rounded-[2rem] bg-white/60 backdrop-blur-md border border-white/60 flex items-center justify-center rotate-6 shadow-sm">
                      <Star size={32} className="text-amber-400 drop-shadow-sm" fill="currentColor" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight drop-shadow-sm">{category}</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {groupedCourses[category].map((course: any) => (
                      <Link
                        href={`/course/${course.id}`}
                        key={course.id}
                        className="group relative bg-white rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-full overflow-hidden"
                      >
                        {/* Image Header */}
                        <div className="aspect-[4/3] w-full bg-gradient-to-br from-amber-50 to-orange-50 relative overflow-hidden">
                          {course.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={course.image} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-300">
                              <BookOpen size={60} />
                            </div>
                          )}
                        </div>

                        {/* Content Body */}
                        <div className="p-8 flex flex-col flex-1 bg-white">
                          <h3 className="text-2xl font-bold text-slate-800 mb-3 line-clamp-2 leading-tight group-hover:text-amber-600 transition-colors">{course.title}</h3>
                          <p className="text-slate-500 text-base line-clamp-2 mb-8 leading-relaxed font-medium">{course.desc || "ไม่มีรายละเอียด"}</p>

                          <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100">
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Course Price</span>
                              <div className="flex items-center gap-2">
                                {course.fullPrice > 0 && (
                                  <span className="text-sm font-bold text-slate-400 line-through">฿{course.fullPrice.toLocaleString()}</span>
                                )}
                                <span className="text-3xl font-black text-slate-800 tracking-tight">{course.price ? `฿${course.price.toLocaleString()}` : "Free"}</span>
                              </div>
                            </div>
                            <span className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:scale-110">
                              <ArrowRight size={24} strokeWidth={3} />
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {courses.length === 0 && !loading && (
            <div className="text-center py-32 bg-white/40 backdrop-blur-xl rounded-[3rem] border border-white/60 text-slate-400 max-w-2xl mx-auto">
              <div className="w-24 h-24 bg-white/40 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-600 mb-2">No Courses Found</h3>
              <p className="text-slate-500">Please check back later.</p>
            </div>
          )}
        </main>



        <Footer />
      </div >

      <style jsx global>{`
        @keyframes blob { 
            0% { transform: translate(0px, 0px) scale(1); } 
            33% { transform: translate(30px, -50px) scale(1.1); } 
            66% { transform: translate(-20px, 20px) scale(0.9); } 
            100% { transform: translate(0px, 0px) scale(1); } 
        }
        .animate-blob { animation: blob 10s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        @keyframes fadeIn { 
            from { opacity: 0; transform: translateY(20px); } 
            to { opacity: 1; transform: translateY(0); } 
        }
        .animate-fade-in { animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes shimmer {
            100% { transform: translateX(100%); }
        }
        
        @keyframes heartbeat {
            0% { transform: scale(1); }
            14% { transform: scale(1.1); }
            28% { transform: scale(1); }
            42% { transform: scale(1.1); }
            70% { transform: scale(1); }
        }
        .animate-heartbeat { animation: heartbeat 1.5s infinite ease-in-out; }
      `}</style>
    </div >
  );
}