import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * PUBLIC pre-auth endpoint for the enrollment form's "email-first" step.
 * Given an email, reports whether a Firebase account already exists and which
 * sign-in provider it uses — so the form can show "set a password" (new user)
 * vs "enter your password" (returning user) vs steer Google users to Google.
 *
 * Returns ONLY { exists, provider } — never any PII. This does not worsen the
 * existing enumeration surface (the /register page already reveals
 * "email already in use"). If the lookup fails, the client degrades to an
 * attempt-based flow, so a failure here never blocks enrollment.
 */

// Per-IP throttle so this endpoint can't be scripted into a bulk email-
// enumeration scan. In-memory and therefore per-serverless-instance — not a
// hard guarantee, but it turns "millions of lookups" into "a few dozen per
// instance" at zero infra cost. Real users check 1-2 emails per enrollment;
// the client already degrades gracefully on any non-200 (see above), so a
// throttled legitimate user just falls back to the attempt-based flow.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    if (hits.size > 5000) hits.clear(); // bound memory on long-lived instances
    hits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    // Basic shape check — don't even hit Firebase for obvious junk.
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      const providerIds = (userRecord.providerData || []).map((p) => p.providerId);
      const provider = providerIds.includes("password")
        ? "password"
        : providerIds.includes("google.com")
          ? "google"
          : "other";
      return NextResponse.json({ exists: true, provider });
    } catch (err) {
      if ((err as { code?: string })?.code === "auth/user-not-found") {
        return NextResponse.json({ exists: false });
      }
      throw err;
    }
  } catch (error) {
    console.error("check-email error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
