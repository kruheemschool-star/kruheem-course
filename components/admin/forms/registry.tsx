"use client";

import HeroEditorForm from "@/components/admin/HeroEditorForm";
import {
    PainPointForm,
    SolutionForm,
    CurriculumForm,
    ReviewsForm,
    TestimonialForm,
    TrustBadgesForm,
    PriceStackForm,
    GuaranteeForm,
    ComparisonForm,
    FAQForm,
    CTAForm,
    CountdownForm,
} from "./SectionForms";
import type { Section, SectionType } from "@/app/course/[id]/template/types";

interface FormProps {
    value: any;
    onChange: (next: any) => void;
}

/**
 * Maps every section type to its form-based editor.
 * Returns null for types that don't yet have a form (caller falls back to JSON editor).
 */
export function getSectionForm(type: SectionType): React.ComponentType<FormProps> | null {
    switch (type) {
        case "hero": return HeroEditorForm as any;
        case "painPoint": return PainPointForm as any;
        case "solution": return SolutionForm as any;
        case "curriculum": return CurriculumForm as any;
        case "reviews": return ReviewsForm as any;
        case "testimonial": return TestimonialForm as any;
        case "trustBadges": return TrustBadgesForm as any;
        case "priceStack": return PriceStackForm as any;
        case "guarantee": return GuaranteeForm as any;
        case "comparison": return ComparisonForm as any;
        case "faq": return FAQForm as any;
        case "cta": return CTAForm as any;
        case "countdown": return CountdownForm as any;
        default: return null;
    }
}

export function hasFormEditor(type: SectionType): boolean {
    return getSectionForm(type) !== null;
}

export type SectionForSection<T extends Section["type"]> = Extract<Section, { type: T }>;
