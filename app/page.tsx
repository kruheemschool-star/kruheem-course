import HomeClient from "./HomeClient";
import { getActivePromotion } from "@/lib/promotion";

// Server component: read the promotion on the server so the homepage HTML
// already knows whether to show the banner (no layout shift / hero "jump"),
// then hand off to the interactive client homepage. ISR-cached ~30s so admin
// promo edits appear on the live site quickly.
export const revalidate = 30;

export default async function HomePage() {
  const initialPromo = await getActivePromotion();
  return <HomeClient initialPromo={initialPromo} />;
}
