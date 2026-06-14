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
export async function POST(request: NextRequest) {
  try {
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
