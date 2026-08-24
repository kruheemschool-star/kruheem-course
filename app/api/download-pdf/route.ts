import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage, ADMIN_STORAGE_BUCKET } from "@/lib/firebase-admin";
import { stampPdf, STAMP_VERSION } from "@/lib/pdfStamp";

// Never cache — every response is a freshly-signed, short-lived URL tied to the
// requesting user. This route does the paywall for downloadable PDF exams.
export const dynamic = "force-dynamic";
// First download per buyer stamps the whole PDF (download master → watermark
// every page → upload) — that can exceed Vercel's default window on big files.
export const maxDuration = 60;

const ADMIN_EMAILS = ["kruheemschool@gmail.com"];
const LINK_TTL_MS = 10 * 60 * 1000; // signed URL valid for 10 minutes

/**
 * POST /api/download-pdf   body: { paperId }   header: Authorization: Bearer <idToken>
 *
 * Flow (this is the "ticket checker" for paid PDF exams):
 *   1. Verify the caller's Firebase ID token → uid + email.
 *   2. Confirm they OWN this paper: an approved, non-expired `enrollments` doc
 *      with paperId == this paper (admins bypass).
 *   3. Watermark the buyer's copy: name + phone stamped on every page
 *      (footer + faint diagonal + hidden metadata) so a leaked file points
 *      straight back to the account that shared it. The stamped copy is cached
 *      in `stamped/` and reused until ครูฮีม replaces the master file.
 *      Admins get the clean master. If stamping ever fails, the buyer still
 *      gets the master — the watermark must never block a paying customer.
 *   4. Mint a signed URL for the PRIVATE file that expires in 10 min.
 *
 * The master PDF path is never exposed to the client and the bucket denies
 * public reads (storage.rules), so the signed URL is the only way in — and it
 * dies in 10 minutes, so it can't be re-shared.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const paperId: string | null = body?.paperId ?? null;
        const fileId: string | null = body?.fileId ?? null;
        if (!paperId || typeof paperId !== "string") {
            return NextResponse.json({ error: "missing paperId" }, { status: 400 });
        }

        // --- 1. Authenticate the caller -------------------------------------
        const authHeader = req.headers.get("authorization") || "";
        const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!idToken) {
            return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
        }

        let uid: string;
        let email: string | undefined;
        try {
            const decoded = await adminAuth.verifyIdToken(idToken);
            uid = decoded.uid;
            email = decoded.email;
        } catch {
            return NextResponse.json({ error: "invalid token" }, { status: 401 });
        }

        // --- 2. Load the paper ---------------------------------------------
        const paperSnap = await adminDb.collection("examPapers").doc(paperId).get();
        if (!paperSnap.exists) {
            return NextResponse.json({ error: "paper not found" }, { status: 404 });
        }
        const paper = paperSnap.data() || {};

        // Resolve which file to sign. New products store an array of files; old
        // ones only have the single pdfPath — treat that as a one-item list.
        type PaperFile = { id?: string; path?: string; name?: string; label?: string };
        const files: PaperFile[] = Array.isArray(paper.files) && paper.files.length
            ? paper.files
            : (paper.pdfPath ? [{ id: "legacy", path: paper.pdfPath, name: paper.pdfName }] : []);
        if (!files.length) {
            return NextResponse.json({ error: "file not ready" }, { status: 409 });
        }
        // A stale tab can ask for an OLD fileId after ครูฮีม replaces a file
        // (each upload mints a new id). With a single-file product there is no
        // wrong pick, so quietly serve the one file instead of failing the
        // buyer; with several files we can't guess which set they meant.
        let target = fileId ? files.find((f) => f.id === fileId) : files[0];
        if (fileId && !target && files.length === 1) {
            target = files[0];
        }
        const pdfPath = target?.path;
        if (!pdfPath) {
            return NextResponse.json(
                { error: "ไม่พบไฟล์นี้แล้ว ครูอาจเพิ่งอัปเดตไฟล์เวอร์ชันใหม่ กรุณารีเฟรชหน้านี้แล้วกดดาวน์โหลดอีกครั้งนะครับ" },
                { status: 404 },
            );
        }

        // --- 3. Entitlement check ------------------------------------------
        // The owning enrollment also carries the buyer's name/phone from the
        // payment form — that's what gets stamped onto their copy below.
        const isAdmin = !!email && ADMIN_EMAILS.includes(email);
        let buyerName = "";
        let buyerPhone = "";
        let buyerEmail = "";
        if (!isAdmin) {
            const enrollSnap = await adminDb
                .collection("enrollments")
                .where("userId", "==", uid)
                .where("paperId", "==", paperId)
                .where("status", "==", "approved")
                .limit(5)
                .get();

            const now = Date.now();
            const owningDoc = enrollSnap.docs.find((d) => {
                const exp = d.data().expiryDate;
                if (!exp) return true; // lifetime access
                const expMs = typeof exp?.toDate === "function" ? exp.toDate().getTime() : new Date(exp).getTime();
                return isNaN(expMs) || expMs > now;
            });

            if (!owningDoc) {
                return NextResponse.json({ error: "not purchased" }, { status: 403 });
            }
            const e = owningDoc.data();
            buyerName = String(e.userName || "").trim();
            buyerPhone = String(e.userTel || "").trim();
            buyerEmail = String(e.userEmail || "").trim();
        }

        if (!ADMIN_STORAGE_BUCKET) {
            return NextResponse.json({ error: "storage not configured" }, { status: 500 });
        }

        // --- 4. Watermark the buyer's copy (admins get the clean master) ----
        const bucket = adminStorage.bucket(ADMIN_STORAGE_BUCKET);
        const masterFile = bucket.file(pdfPath);
        let fileToSign = masterFile;
        if (!isAdmin) {
            try {
                // Older enrollments may predate the name/phone fields — fall
                // back to the user profile, then to the login email.
                if (!buyerName || !buyerPhone) {
                    const userSnap = await adminDb.collection("users").doc(uid).get();
                    const u = userSnap.data() || {};
                    buyerName = buyerName || String(u.displayName || "").trim();
                    buyerPhone = buyerPhone || String(u.phoneNumber || "").trim();
                }
                buyerEmail = buyerEmail || email || "";
                const stampName = buyerName || buyerEmail || "สมาชิก kruheemmath.com";

                // Cache key: one stamped copy per buyer per file, valid only for
                // the exact master generation + stamp layout it was made from.
                const [masterMeta] = await masterFile.getMetadata();
                const masterGen = String(masterMeta.generation ?? "");
                const stampedFile = bucket.file(`stamped/${paperId}/${target?.id || "legacy"}/${uid}.pdf`);

                let fresh = false;
                try {
                    const [sm] = await stampedFile.getMetadata();
                    const custom = (sm.metadata || {}) as Record<string, string>;
                    fresh = custom.masterGeneration === masterGen && custom.stampVersion === STAMP_VERSION;
                } catch { /* no cached copy yet */ }

                if (!fresh) {
                    const [masterBytes] = await masterFile.download();
                    const stamped = await stampPdf(new Uint8Array(masterBytes), {
                        name: stampName,
                        phone: buyerPhone,
                        email: buyerEmail,
                        uid,
                    });
                    await stampedFile.save(Buffer.from(stamped), {
                        contentType: "application/pdf",
                        resumable: false,
                        metadata: { metadata: { masterGeneration: masterGen, stampVersion: STAMP_VERSION, uid, paperId } },
                    });
                }
                fileToSign = stampedFile;
            } catch (err) {
                // Stamping must never block a paying customer — serve the
                // master and leave a trace in the logs to investigate.
                console.error("download-pdf: stamping failed, serving master:", err);
                fileToSign = masterFile;
            }
        }

        // --- 5. Mint a short-lived signed URL ------------------------------
        // Give the buyer a clean, descriptive filename built from the PRODUCT
        // title (+ the set label when the product has several sets) — regardless
        // of how the raw file was named on upload. Thai is fully supported: we
        // send an ASCII fallback (`filename=`) AND an RFC 5987 UTF-8 name
        // (`filename*=`) so Thai-aware browsers show the Thai name and older
        // clients still get a readable one.
        const baseTitle = String(paper.title || target?.name || "ข้อสอบ").replace(/\.pdf$/i, "").trim();
        const multiSet = files.length > 1 && target?.label ? ` - ${target.label}` : "";
        const niceName = `${baseTitle}${multiSet}.pdf`.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim();
        const asciiName = niceName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "") || "exam.pdf";
        const disposition = `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(niceName)}`;
        const [url] = await fileToSign
            .getSignedUrl({
                version: "v4",
                action: "read",
                expires: Date.now() + LINK_TTL_MS,
                responseDisposition: disposition,
            });

        return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
        console.error("download-pdf error:", err);
        return NextResponse.json({ error: "server error" }, { status: 500 });
    }
}
