"use client";
import { useState, useEffect, Suspense } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc, limit } from "firebase/firestore";
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
  XCircle,
  AlertCircle,
  Check,
  Newspaper,
  Calendar,
} from "lucide-react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FeatureCarousel from "@/components/home/FeatureCarousel";
// import CourseFinder from "@/components/CourseFinder";

// Type definitions
interface Course {
  id: string;
  title: string;
  desc?: string;
  category?: string;
  image?: string;
  price?: number;
  fullPrice?: number;
  createdAt?: Date;
}


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
  const [courses, setCourses] = useState<Course[]>([]);
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
        setCourses(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[]);
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

    // Execute both fetches in parallel
    Promise.all([fetchCourses(), fetchBanner()]);
  }, []);

  // Auto-play slideshow
  useEffect(() => {
    if (bannerImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerImages.length);
    }, 5000); // Change every 5 seconds
    return () => clearInterval(interval);
  }, [bannerImages]);

  const groupedCourses = courses.reduce((acc: Record<string, Course[]>, course: Course) => {
    const category = course.category || "คอร์สเรียนทั่วไป";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(course);
    return acc;
  }, {} as Record<string, Course[]>);

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
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 dark:hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-teal-100/30 rounded-full blur-[120px] mix-blend-multiply"></div>
        <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-100/30 rounded-full blur-[120px] mix-blend-multiply"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[70vw] h-[70vw] bg-slate-100/40 rounded-full blur-[120px] mix-blend-multiply"></div>
      </div>
      {/* Dark mode background */}
      <div className="fixed inset-0 z-0 hidden dark:block">
        <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-teal-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[70vw] h-[70vw] bg-slate-900/30 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        {/* Hero Section */}
        {/* Hero Section - Asymmetrical Split */}
        <header className="pt-32 pb-16 px-6 relative overflow-visible z-10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-6 items-center">

            {/* Left Column: Text Content */}
            <div className="lg:col-span-7 flex flex-col items-start text-left relative z-20 pt-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-sm mb-6 shadow-sm hover:shadow-md transition-all cursor-default w-fit">
                <span className="flex w-2 h-2 rounded-full bg-teal-500"></span>
                <span>คอร์สเรียนคณิตศาสตร์อันดับ 1 ในใจเด็ก Gifted</span>
              </div>

              <h1 className="sr-only">
                คอร์สเรียนคณิตศาสตร์ออนไลน์ ติวสอบเข้า ม.1 ม.4 โดยครูฮีม สอนเทคนิคคิดลัด เข้าใจง่าย
              </h1>

              <h2 className="font-mero text-4xl sm:text-5xl lg:text-7xl font-bold text-slate-900 dark:text-slate-50 mb-6 tracking-tight leading-snug drop-shadow-sm">
                <span className="block mb-2 text-slate-400 dark:text-slate-500 text-2xl lg:text-4xl font-bold font-sans tracking-normal">
                  ในขณะที่เรากำลังลังเล...
                </span>
                <span className="block bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300">
                  มีเด็กคนอื่นกำลัง
                </span>
                <span className="block bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 pb-2">
                  ก้าวไปข้างหน้า
                </span>
              </h2>

              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl leading-relaxed font-sans font-medium">
                การเรียนคณิตศาสตร์เหมือนการเติมน้ำใส่แก้วที่รั่ว <br className="hidden md:block" />
                ถ้าไม่เติมให้มากพอและต่อเนื่อง... <span className="text-rose-500 font-bold decoration-wavy underline decoration-rose-200">ไม่มีวันเต็ม</span>
              </p>

              <div className="flex flex-wrap gap-4 w-full">
                <button
                  onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-lg shadow-[0_10px_30px_rgba(20,184,166,0.2)] hover:shadow-[0_20px_40px_rgba(20,184,166,0.3)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Rocket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    ดูคอร์สเรียนทั้งหมด
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                </button>
                <Link href="/my-courses" className="px-8 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-lg hover:border-teal-200 dark:hover:border-teal-800 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-2 group">
                  <BookOpen className="w-5 h-5 group-hover:text-teal-500 transition-colors" />
                  เข้าสู่บทเรียน
                </Link>
              </div>

              {/* Social Proof / Stats */}
              <div className="mt-12 flex items-center gap-6 text-sm font-bold text-slate-500 dark:text-slate-400">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center overflow-hidden relative z-[${5 - i}]`}>
                      {/* Placeholder Avatars */}
                      <div className={`w-full h-full bg-gradient-to-br ${i % 2 === 0 ? 'from-blue-200 to-indigo-200' : 'from-rose-200 to-pink-200'}`}></div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex text-amber-500 mb-0.5">
                    <Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" />
                  </div>
                  <p>มั่นใจแล้วกว่า <span className="text-slate-900 dark:text-white">1,000+</span> ครอบครัว</p>
                </div>
              </div>
            </div>

            {/* Right Column: Visual & 3D Tilt */}
            <div className="lg:col-span-5 relative z-10 perspective-1000 mt-12 lg:mt-0">
              {/* Static Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-amber-200/20 to-teal-200/20 rounded-full blur-3xl"></div>

              {/* Main Card Container */}
              <div className="relative w-full aspect-[800/950] max-h-[950px] mx-auto transform hover:rotate-y-6 hover:rotate-x-6 transition-transform duration-700 ease-out preserve-3d group">


                {/* 1. Main Banner Image - Now Clickable */}
                <Link href={bannerLinkUrl} className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-sm z-20 bg-white dark:bg-slate-800 cursor-pointer hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 group">
                  {/* Glass Shine Effect */}
                  <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] group-hover:animate-glass-shine z-30 pointer-events-none filter blur-sm"></div>

                  {bannerLoading ? (
                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {bannerImages.map((url, index) => (
                        url && (
                          <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
                            <Image
                              src={url}
                              alt={`คอร์สเรียนคณิตศาสตร์ครูฮีม ติวสอบเข้า ม.1 และ ม.4 - ${bannerTitle}`}
                              fill
                              priority={index === 0}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              className="object-cover"
                            />
                            {/* Reveal-on-Hover Overlay */}
                            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out"></div>

                            <div className="absolute bottom-0 left-0 p-8 w-full translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                              <span className="inline-block px-3 py-1.5 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full mb-3 shadow-lg border border-white/30">
                                {badgeText}
                              </span>
                              <h3 className="text-white font-bold text-xl md:text-2xl line-clamp-2 drop-shadow-lg mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white via-amber-200 to-amber-500">{bannerTitle}</h3>
                              <div className="flex items-center gap-3">
                                <span className="text-3xl font-black text-amber-400 drop-shadow-lg">฿{bannerPrice}</span>
                                {bannerFullPrice && <span className="text-white/60 line-through text-sm bg-black/20 px-2 py-0.5 rounded-full">฿{bannerFullPrice}</span>}
                              </div>
                            </div>
                          </div>
                        )
                      ))}
                    </>
                  )}
                </Link>

              </div>
            </div>
          </div>
        </header>

        {/* Course Finder Section - Solution to Paradox of Choice */}
        {/* <CourseFinder /> */}

        {/* Content Cards Section - Slideshow */}
        <FeatureCarousel />

        {/* Story Section */}
        <section className="py-16 px-6 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 border border-white/60 dark:border-slate-800 shadow-lg relative overflow-hidden group hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-500">
              <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <Quote size={120} className="text-amber-900 dark:text-amber-500" />
              </div>

              <div className="relative z-10 space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed text-lg md:text-xl font-medium">
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 mb-8 leading-relaxed">
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
        <section className="py-24 px-6 relative z-10 overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-red-100/40 rounded-full blur-[128px] -translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-[128px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <div className="max-w-6xl mx-auto relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-slate-800 mb-16 text-center tracking-tight">
              ทางเลือกมีแค่ 2 ทาง... อยู่ที่คุณจะเลือก
            </h2>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
              {/* Option 1: Red Pastel - Old Path */}
              <div
                onClick={() => setShowRobloxModal(true)}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border border-red-100 shadow-xl hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 cursor-pointer group hover:-translate-y-2 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform group-hover:scale-110 transition-transform duration-700">
                  <XCircle size={120} className="text-red-500" />
                </div>

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 text-red-600 text-sm font-bold mb-6 border border-red-100">
                    <AlertCircle size={16} />
                    <span>เส้นทางเดิม</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6 group-hover:text-red-600 transition-colors">
                    ปล่อยให้ปัญหาคาราคาซัง
                  </h3>

                  <ul className="space-y-4 mb-8">
                    {[
                      'ความสับสนและความกังวลกัดกินใจน้องต่อไป',
                      'ปล่อยให้เขาเผชิญโจทย์ที่ไม่เข้าใจอยู่ลำพัง',
                      'ความมั่นใจลดลง เลือนหายจนกลัวการถาม',
                      'ช่องว่างกับเพื่อนห่างขึ้นเรื่อยๆ จนตามไม่ทัน'
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-600 group-hover:text-slate-700 transition-colors">
                        <div className="mt-1 min-w-[20px] text-red-400">
                          <XCircle size={20} />
                        </div>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-6 border-t border-red-50 flex items-center text-red-500 font-bold group-hover:gap-2 transition-all">
                    <span>เลือกเส้นทางนี้ (ไม่แนะนำ)</span>
                    <ArrowRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              {/* Option 2: Green Pastel - Success Path */}
              <div className="relative transform md:-translate-y-4 lg:-translate-y-8">
                <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 rounded-[3rem] animate-pulse"></div>
                <div className="bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-900 dark:to-emerald-950/30 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border-2 border-emerald-100 dark:border-emerald-900 shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.3)] transition-all duration-500 relative overflow-hidden group">

                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100/40 to-transparent rounded-bl-[10rem] -mr-16 -mt-16 pointer-events-none"></div>
                  <div className="absolute top-6 right-6 p-2 rounded-full bg-emerald-100 text-emerald-600 animate-bounce shadow-sm">
                    <Star size={24} fill="currentColor" />
                  </div>

                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold mb-6 border border-emerald-200 shadow-sm">
                      <Sparkles size={16} />
                      <span>ทางเลือกสำหรับผู้ชนะ</span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
                      เส้นทางสู่ความสำเร็จที่แน่นอน
                    </h3>

                    <ul className="space-y-4 mb-10">
                      {[
                        'ระบบที่พิสูจน์แล้วว่าได้ผลจริง (Proven System)',
                        'ประหยัดเวลาลองผิดลองถูกไปหลายร้อยชั่วโมง',
                        'สร้างความมั่นใจถาวร ด้วยแผนการที่ชัดเจน',
                        'ทักษะติดตัวไปตลอดชีวิต (Lifetime Skill)'
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-1 min-w-[24px] w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform bg-gradient-to-br from-emerald-400 to-teal-500 text-white border border-emerald-200">
                            <Check size={14} strokeWidth={3} />
                          </div>
                          <span className="text-lg font-medium text-slate-700 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/payment"
                      className="group/btn relative block w-full text-center py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] transition-all duration-300 overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        เลือกเส้นทางสู่ความสำเร็จ <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                      </span>
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out"></div>
                    </Link>

                    <p className="text-center text-emerald-600/70 text-sm mt-4 font-medium">
                      *รับประกันความพอใจ 100%
                    </p>
                  </div>
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
                    {groupedCourses[category].map((course: Course) => (
                      <Link
                        href={`/course/${course.id}`}
                        key={course.id}
                        className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl hover:shadow-glow hover:-translate-y-2 transition-all duration-500 flex flex-col h-full overflow-hidden border border-slate-100 dark:border-slate-800"
                      >
                        {/* Shine Effect Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-20" style={{ transform: 'skewX(-20deg) translateX(-150%)', animation: 'shine-slide 1s' }}></div>

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
                        <div className="p-8 flex flex-col flex-1 bg-white dark:bg-slate-900 relative z-10">
                          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 line-clamp-2 leading-relaxed group-hover:text-amber-600 transition-colors">{course.title}</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-base line-clamp-2 mb-8 leading-relaxed font-medium">{course.desc || "ไม่มีรายละเอียด"}</p>

                          <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">ราคาคอร์ส</span>
                              <div className="flex items-center gap-2">
                                {(course.fullPrice ?? 0) > 0 && (
                                  <span className="text-sm font-bold text-slate-400 line-through">฿{course.fullPrice?.toLocaleString()}</span>
                                )}
                                <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{course.price ? `฿${course.price.toLocaleString()}` : "ฟรี"}</span>
                              </div>
                            </div>
                            <span className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:scale-110">
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
              <h3 className="text-2xl font-bold text-slate-600 mb-2">ไม่พบคอร์สเรียน</h3>
              <p className="text-slate-500">โปรดติดตามเร็วๆ นี้</p>
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

        @keyframes glass-shine {
            0% { left: -100%; opacity: 0; }
            50% { opacity: 1; }
            100% { left: 200%; opacity: 0; }
        }
        .animate-glass-shine { animation: glass-shine 0.7s ease-in-out forwards; }
      `}</style>
    </div >
  );
}