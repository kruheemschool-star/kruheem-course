// ============================================================
// Sales Page Template — Type Definitions (Phase 1)
// ============================================================

export type SectionType =
    | "hero"
    | "painPoint"
    | "solution"
    | "curriculum"
    | "reviews"
    | "testimonial"
    | "trustBadges"
    | "priceStack"
    | "guarantee"
    | "comparison"
    | "faq"
    | "cta"
    | "countdown"
    | "videoPreview"
    | "statsTable";

export interface BaseSection<T extends SectionType, D> {
    id: string;
    type: T;
    order: number;
    enabled: boolean;
    data: D;
}

// ---------- Section Data Types ----------

export interface HeroData {
    badgeText?: string;
    title: string;
    subtitle?: string;
    ctaText?: string;
    ctaPriceText?: string;
    secondaryCtaText?: string;
    imageUrl?: string;
    videoUrl?: string;
    pricePerDayText?: string;
    blobColors?: [string, string]; // tailwind classes (legacy, kept for back-compat)

    // ---------- NEW: Theme colors (hex) ----------
    bgColorFrom?: string; // page background gradient start (hex)
    bgColorTo?: string;   // page background gradient end (hex)
    titleColor?: string;  // title text color (hex)
    subtitleColor?: string;
    badgeBgColor?: string;
    badgeTextColor?: string;
    blob1Color?: string;  // decorative blob 1 (hex)
    blob2Color?: string;  // decorative blob 2 (hex)

    // ---------- NEW: Cover ----------
    coverType?: "image" | "card"; // default "image"
    // Card-specific (when coverType === "card")
    cardMainText?: string;   // e.g. "ม.4"
    cardSubText?: string;    // e.g. "เทอม 2"
    cardBadgeText?: string;  // e.g. "คณิตศาสตร์เพิ่มเติม"
    cardColorFrom?: string;  // gradient start (hex)
    cardColorTo?: string;    // gradient end (hex)
    cardTextColor?: string;  // hex
}

export interface PainPointData {
    title: string;
    subtitle?: string;
    problemTitle?: string;
    problemIcon?: string;
    problems: { icon: string; text: string }[];
    solutionTitle?: string;
    solutionIcon?: string;
    solutionDesc?: string;
    solutions: { icon: string; text: string }[];
}

export interface SolutionData {
    title: string;
    subtitle?: string;
    items: { icon: string; title: string; desc: string }[];
}

export interface CurriculumChapter {
    id: number | string;
    title: string;
    desc?: string;
    content: string[];
    color?: string;
    iconColor?: string;
}

export interface CurriculumData {
    title: string;
    subtitle?: string;
    chapters: CurriculumChapter[];
}

export interface ReviewsData {
    title?: string;
    subtitle?: string;
    images: string[]; // URLs (Firebase Storage or any)
    // ---------- NEW: Live reviews from Firestore ----------
    source?: "images" | "live"; // default "images"
    liveScope?: "all" | "course"; // "course" = filter by current courseId; default "all"
    liveLimit?: number; // max reviews to fetch; default 30
    liveMinRating?: number; // min rating (1-5); default 4
}

export interface TestimonialStory {
    name: string;
    role?: string;
    imageUrl?: string;
    beforeScore?: string;
    afterScore?: string;
    quote: string;
}

export interface TestimonialData {
    title?: string;
    subtitle?: string;
    stories: TestimonialStory[];
}

export interface TrustBadgeStat {
    icon: string;
    number: string;
    label: string;
}

export interface TrustBadgesData {
    title?: string;
    stats: TrustBadgeStat[];
}

export interface StatsTableRow {
    left: string;   // ตัวเลข เช่น "3,087+"
    right: string;  // ความหมาย เช่น "โจทย์ในระบบ · เพิ่มใหม่ทุกเดือน"
}

export interface StatsTableData {
    title?: string;
    leftHeader: string;   // หัวคอลัมน์ซ้าย เช่น "ตัวเลข"
    rightHeader: string;  // หัวคอลัมน์ขวา เช่น "ความหมาย"
    rows: StatsTableRow[];
}

export interface PriceStackData {
    title?: string;
    subtitle?: string;
    items: { name: string; value: number }[]; // value in baht
    totalValue?: number; // auto-calculated if omitted
    regularPrice: number;
    finalPrice: number;
    discountNote?: string;
    ctaText?: string;
}

export interface GuaranteeData {
    title: string;
    desc?: string;
    features?: string[];
    badgeText?: string;
}

export interface ComparisonColumn {
    title: string;
    highlight?: boolean;
    features: { text: string; included: boolean }[];
}

export interface ComparisonData {
    title?: string;
    subtitle?: string;
    columns: ComparisonColumn[];
}

export interface FAQData {
    title?: string;
    subtitle?: string;
    faqs: { q: string; a: string }[];
}

export interface CTAData {
    title: string;
    subtitle?: string;
    ctaText: string;
    urgencyText?: string;
    priceText?: string;
}

export interface CountdownData {
    title?: string;
    subtitle?: string;
    endDate: string; // ISO string, e.g. "2026-12-31T23:59:59"
    expiredMessage?: string;
    style?: "banner" | "inline"; // banner = full-width, inline = centered card
}

export interface VideoPreviewItem {
    title: string;
    youtubeUrl: string; // YouTube URL or video ID
    description?: string;
}

export interface VideoPreviewData {
    title?: string;
    subtitle?: string;
    videos: VideoPreviewItem[];
}

// ---------- Discriminated Union ----------

export type Section =
    | BaseSection<"hero", HeroData>
    | BaseSection<"painPoint", PainPointData>
    | BaseSection<"solution", SolutionData>
    | BaseSection<"curriculum", CurriculumData>
    | BaseSection<"reviews", ReviewsData>
    | BaseSection<"testimonial", TestimonialData>
    | BaseSection<"trustBadges", TrustBadgesData>
    | BaseSection<"priceStack", PriceStackData>
    | BaseSection<"guarantee", GuaranteeData>
    | BaseSection<"comparison", ComparisonData>
    | BaseSection<"faq", FAQData>
    | BaseSection<"cta", CTAData>
    | BaseSection<"countdown", CountdownData>
    | BaseSection<"videoPreview", VideoPreviewData>
    | BaseSection<"statsTable", StatsTableData>;

// ---------- Conversion Boosters ----------

export interface StickyCTAConfig {
    enabled: boolean;
    ctaText?: string;
    priceText?: string;
    showAfterScrollPx?: number; // default 600
}

export interface SocialProofMessage {
    name: string;
    location?: string;
    action?: string; // e.g. "เพิ่งสมัครเรียน"
    timeAgo?: string; // e.g. "5 นาทีที่แล้ว"
}

export interface SocialProofConfig {
    enabled: boolean;
    messages: SocialProofMessage[];
    intervalSeconds?: number; // default 15
    displaySeconds?: number; // default 5
}

export interface ExitIntentConfig {
    enabled: boolean;
    title?: string;
    desc?: string;
    ctaText?: string;
    discountText?: string;
}

export interface BoostersConfig {
    stickyCTA?: StickyCTAConfig;
    socialProof?: SocialProofConfig;
    exitIntent?: ExitIntentConfig;
}

export interface SalesPageConfig {
    enabled: boolean;
    theme?: {
        primaryColor?: string; // tailwind class e.g. "indigo"
        backgroundColor?: string;
    };
    sections: Section[];
    boosters?: BoostersConfig;
}

// ---------- Shared Context (passed to every section) ----------

export interface SectionContext {
    courseId: string;
    courseTitle: string;
    coursePrice: number;
    courseFullPrice?: number;
    courseImage?: string;
    onCTAClick: () => void | Promise<void>;
    user: any;
    enrollmentStatus: "none" | "pending" | "approved";
}
