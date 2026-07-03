import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ADMIN_EMAILS } from "@/lib/constants";

// On-demand ISR invalidation for the public exam pages.
//
// The admin writes exam metadata (isFree, hidden, category, order, ...) straight
// to Firestore, but the student-facing pages are ISR-cached — the listing
// (/exam) revalidates every 5 min and each exam page (/exam/[id]) every 1 min.
// So flipping an exam to "ทำฟรี" looked like it took minutes to appear. After
// each admin change we POST here to bust those caches immediately.

export const runtime = "nodejs";

// Verify the caller is a signed-in admin WITHOUT the Firebase Admin SDK. The
// Admin SDK's service-account creds are not configured in production here (the
// same reason /api/exam-averages returns 500 in prod), so adminAuth.verifyIdToken
// would fail and this endpoint would never run in prod. Instead we validate the
// Firebase ID token the way the rest of the app reads data: a plain HTTPS call
// to Google's Identity Toolkit with the public web API key. That endpoint
// rejects invalid/expired tokens and returns the signed-in user's email, which
// we check against the admin allow-list. Fails closed.
async function verifyAdmin(idToken: string): Promise<boolean> {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) return false;
    try {
        const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
                cache: "no-store",
                signal: AbortSignal.timeout(8000),
            }
        );
        if (!res.ok) return false;
        const data = (await res.json()) as { users?: { email?: string }[] };
        const email = (data.users?.[0]?.email || "").toLowerCase();
        return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email);
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ok = await verifyAdmin(token);
    if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Bust the ISR cache for both the listing and every individual exam page.
    // Passing the route pattern + "page" revalidates all /exam/[id] pages at once.
    revalidatePath("/exam");
    revalidatePath("/exam/[id]", "page");

    // Also bust the exam data feeds so the homepage carousel and the search
    // index refresh instantly instead of waiting out their 1-hour windows.
    // ({ expire: 0 } = immediate expiration, the pre-Next-16 revalidateTag behavior.)
    revalidateTag("exams-feed", { expire: 0 });
    revalidatePath("/api/feature-exams");

    return NextResponse.json({ revalidated: true });
}
