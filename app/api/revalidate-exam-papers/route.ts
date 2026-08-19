import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdminToken } from "@/lib/verifyAdminToken";

// On-demand ISR invalidation for the public PDF-exam shop.
//
// /exam-papers (listing) and /exam-papers/[id] (detail) are ISR-cached for 5 min
// so they load fast. Without this, adding/deleting/hiding a paper in the admin
// took up to 5 minutes to show on the shop. The admin POSTs here after each
// change to bust those caches immediately.
//
// Admin is verified via Google's Identity Toolkit REST (public web API key), NOT
// the Firebase Admin SDK — same reason as /api/revalidate-exams: the Admin SDK
// service-account is not guaranteed in every runtime. Fails closed.

export const runtime = "nodejs";


export async function POST(request: NextRequest) {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ok = await verifyAdminToken(token);
    if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    revalidatePath("/exam-papers");
    revalidatePath("/exam-papers/[id]", "page");

    return NextResponse.json({ revalidated: true });
}
