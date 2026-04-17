"use client";
import type { Section, SectionContext } from "./types";
import HeroSection from "./sections/HeroSection";
import PainPointSection from "./sections/PainPointSection";
import SolutionSection from "./sections/SolutionSection";
import CurriculumSection from "./sections/CurriculumSection";
import ReviewsSection from "./sections/ReviewsSection";
import TestimonialSection from "./sections/TestimonialSection";
import TrustBadgesSection from "./sections/TrustBadgesSection";
import PriceStackSection from "./sections/PriceStackSection";
import GuaranteeSection from "./sections/GuaranteeSection";
import ComparisonSection from "./sections/ComparisonSection";
import FAQSection from "./sections/FAQSection";
import CTASection from "./sections/CTASection";
import CountdownSection from "./sections/CountdownSection";

export function renderSection(section: Section, ctx: SectionContext) {
    switch (section.type) {
        case "hero":
            return <HeroSection data={section.data} ctx={ctx} />;
        case "painPoint":
            return <PainPointSection data={section.data} />;
        case "solution":
            return <SolutionSection data={section.data} />;
        case "curriculum":
            return <CurriculumSection data={section.data} />;
        case "reviews":
            return <ReviewsSection data={section.data} />;
        case "testimonial":
            return <TestimonialSection data={section.data} />;
        case "trustBadges":
            return <TrustBadgesSection data={section.data} />;
        case "priceStack":
            return <PriceStackSection data={section.data} ctx={ctx} />;
        case "guarantee":
            return <GuaranteeSection data={section.data} />;
        case "comparison":
            return <ComparisonSection data={section.data} />;
        case "faq":
            return <FAQSection data={section.data} />;
        case "cta":
            return <CTASection data={section.data} ctx={ctx} />;
        case "countdown":
            return <CountdownSection data={section.data} />;
        default:
            return null;
    }
}
