import fs from "fs";
import path from "path";
import { PDFDocument, PDFFont, PDFPage, degrees, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * Per-buyer PDF watermarking for the exam-paper shop.
 *
 * Three layers, so a leaked file is traceable even after casual tampering:
 *   1. Footer line on every page  — buyer name + phone, small and readable.
 *   2. Faint diagonal watermark   — sits ON TOP of the content, survives
 *      screenshots and re-prints; removing it means editing every page.
 *   3. Document metadata          — invisible; identifies the account even if
 *      someone crops the visible marks away.
 *
 * Bump STAMP_VERSION whenever the visual layout changes — cached stamped
 * copies are keyed on it, so old copies regenerate on next download.
 */
export const STAMP_VERSION = "v1";

export interface StampInfo {
    name: string;
    phone: string;
    email: string;
    uid: string;
}

// Thai text needs an embedded Thai font — the PDF standard fonts have no Thai
// glyphs at all. Sarabun lives in assets/fonts (next.config traces it into the
// serverless bundle). Loaded once per instance, not per request.
let sarabunBytes: Buffer | null = null;
function loadSarabun(): Buffer {
    if (!sarabunBytes) {
        sarabunBytes = fs.readFileSync(path.join(process.cwd(), "assets", "fonts", "Sarabun-Regular.ttf"));
    }
    return sarabunBytes;
}

const GRAY = rgb(0.42, 0.42, 0.42);
const FOOTER_MAX_SIZE = 8.5;
const FOOTER_MIN_SIZE = 6;
const FOOTER_BASELINE_Y = 10; // below typical page numbers (~20pt+)

function drawFooter(page: PDFPage, font: PDFFont, text: string) {
    const { width } = page.getSize();
    // Shrink to fit narrow pages; never overflow the edges.
    let size = FOOTER_MAX_SIZE;
    let textWidth = font.widthOfTextAtSize(text, size);
    const maxWidth = width - 40;
    if (textWidth > maxWidth) {
        size = Math.max(FOOTER_MIN_SIZE, size * (maxWidth / textWidth));
        textWidth = font.widthOfTextAtSize(text, size);
    }
    page.drawText(text, {
        x: (width - textWidth) / 2,
        y: FOOTER_BASELINE_Y,
        size,
        font,
        color: GRAY,
    });
}

function drawDiagonal(page: PDFPage, font: PDFFont, text: string) {
    const { width, height } = page.getSize();
    const angle = Math.atan2(height, width); // along the page diagonal
    // Size the text to span ~78% of the diagonal, then center it. pdf-lib
    // rotates around the text's baseline origin, so offset the origin by half
    // the text vector to keep the line visually centered.
    const diag = Math.hypot(width, height);
    const target = diag * 0.78;
    const widthAt100 = font.widthOfTextAtSize(text, 100);
    const size = Math.min(72, Math.max(18, (target / widthAt100) * 100));
    const textWidth = font.widthOfTextAtSize(text, size);
    const x = width / 2 - (textWidth / 2) * Math.cos(angle);
    const y = height / 2 - (textWidth / 2) * Math.sin(angle);
    page.drawText(text, {
        x,
        y,
        size,
        font,
        color: GRAY,
        opacity: 0.09,
        rotate: degrees((angle * 180) / Math.PI),
    });
}

/**
 * Stamp every page of `masterBytes` with the buyer's identity.
 * Throws on PDFs pdf-lib can't process (e.g. encrypted) — the caller decides
 * the fallback; a paying customer must never be blocked by the stamp.
 */
export async function stampPdf(masterBytes: Uint8Array, info: StampInfo): Promise<Uint8Array> {
    const doc = await PDFDocument.load(masterBytes, { updateMetadata: false });
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(loadSarabun(), { subset: true });

    const phonePart = info.phone ? ` (โทร ${info.phone})` : "";
    const footerText = `จัดทำเพื่อ ${info.name}${phonePart} • kruheemmath.com • สงวนลิขสิทธิ์ ห้ามเผยแพร่ต่อ`;
    const diagonalText = info.phone ? `${info.name} • ${info.phone}` : `${info.name} • kruheemmath.com`;

    for (const page of doc.getPages()) {
        drawDiagonal(page, font, diagonalText);
        drawFooter(page, font, footerText);
    }

    // Layer 3 — invisible ownership record inside the file itself.
    doc.setSubject(`สำเนานี้จัดทำเฉพาะสำหรับ ${info.name}${phonePart} — บัญชี ${info.email}`);
    doc.setKeywords([info.uid, info.email, info.phone, "kruheemmath.com", STAMP_VERSION].filter(Boolean));
    doc.setProducer("kruheemmath.com");
    doc.setModificationDate(new Date());

    return doc.save();
}
