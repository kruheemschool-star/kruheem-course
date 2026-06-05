import { NextResponse } from "next/server";
import { getActivePromotion } from "@/lib/promotion";

// JSON feed for the homepage promotion. The homepage now reads the promo
// server-side via getActivePromotion(); this route shares the exact same logic
// (enabled + non-empty + within schedule) so the two never disagree.
export const revalidate = 30;

export async function GET() {
    const promo = await getActivePromotion();
    return NextResponse.json({ promo });
}
