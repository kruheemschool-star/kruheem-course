"use client";
/**
 * Shared slip-image handling for every "แนบสลิป" flow (/payment, /payment/edit,
 * exam-paper PDF checkout). Exists to fix real-world attach failures:
 *
 *  1. Android pickers + in-app browsers (LINE/Messenger/Facebook) often hand
 *     over a REAL photo with an empty `file.type` — the old
 *     `type.startsWith('image/')` check rejected it as "not an image", so the
 *     user could never attach their slip. We now also accept by file extension,
 *     and as a last resort ask the browser to actually decode the file.
 *
 *  2. storage.rules only allows `contentType image/*` AND `size < 5MB` on
 *     slips/. An empty-type file uploads as application/octet-stream (denied),
 *     and an oversized original slips through when compression fails (denied).
 *     Both used to surface as a cryptic storage/unauthorized — or, inside
 *     FB/LINE webviews where alert() is silently dropped, as nothing at all.
 *     We now upload with an explicit image contentType and hard-stop oversized
 *     files with a clear Thai message BEFORE the upload starts.
 *
 *  3. iPhone HEIC photos pass every check but desktop browsers (where the
 *     admin reviews slips) can't display HEIC — convert to JPEG while
 *     compressing (iOS Safari's canvas decodes HEIC, so this works exactly
 *     where HEIC files come from).
 */

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i;
const HEIC_RE = /(^image\/hei[cf]$)|\.(heic|heif)$/i; // matches type or filename

/** Pick limit before compression (what the UI advertises). */
export const SLIP_MAX_SOURCE_BYTES = 10 * 1024 * 1024;
/** storage.rules hard limit: `request.resource.size < 5 * 1024 * 1024`. */
export const SLIP_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const COMPRESSION_TIMEOUT = 10_000; // per attempt
const COMPRESSION_THRESHOLD = 2 * 1024 * 1024; // only compress files above this

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
};

/**
 * MIME type to upload with. storage.rules rejects anything not image/* and
 * browsers often report an empty type for real photos, so fall back to the
 * file extension, then to image/jpeg (safe: we only call this on files that
 * already passed looksLikeSlipImage, and <img> renders by magic bytes anyway).
 */
export function slipContentType(file: File | Blob): string {
  if (file.type && file.type.startsWith("image/")) return file.type;
  const name = (file as File).name || "";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return EXT_TO_MIME[ext] || "image/jpeg";
}

/** Can the browser actually decode this file as an image? (objectURL + <img>) */
function decodesAsImage(file: File | Blob, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    img.onload = () => { clearTimeout(timer); done(true); };
    img.onerror = () => { clearTimeout(timer); done(false); };
    img.src = url;
  });
}

/**
 * Accept anything that is plausibly a photo/screenshot of a slip:
 * a declared image type, an image file extension, or (for the empty-type files
 * some Android pickers produce) whatever the browser itself can decode.
 * A file with a real non-image type (e.g. application/pdf) is rejected fast.
 */
export async function looksLikeSlipImage(file: File): Promise<boolean> {
  if (file.type && file.type.startsWith("image/")) return true;
  // Some Android pickers report application/octet-stream (or nothing at all)
  // for real photos — fall through to the extension/decode checks for those.
  // Any other concrete type (application/pdf, video/*, ...) is a fast reject.
  if (file.type && file.type !== "application/octet-stream") return false;
  if (IMAGE_EXT_RE.test(file.name || "")) return true;
  return decodesAsImage(file);
}

async function compressWithTimeout(
  file: File,
  options: Record<string, unknown>,
  timeoutMs: number,
): Promise<File | Blob> {
  const compressionPromise = import("browser-image-compression").then((mod) =>
    mod.default(file, options),
  );
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("COMPRESSION_TIMEOUT")), timeoutMs),
  );
  return Promise.race([compressionPromise, timeoutPromise]);
}

export type SlipPrepReason = "not-image" | "too-big-source" | "too-big-after";

export type SlipPrepResult =
  | { ok: true; file: File; contentType: string; originalBytes: number }
  | { ok: false; reason: SlipPrepReason };

/** User-facing Thai message for each rejection reason. */
export function slipPrepErrorText(reason: SlipPrepReason): string {
  switch (reason) {
    case "not-image":
      return "ไฟล์นี้ไม่ใช่รูปภาพ กรุณาแนบเป็นรูป (JPG/PNG) — ถ้าสลิปเป็นไฟล์ PDF ให้แคปหน้าจอสลิปแล้วแนบรูปแทน";
    case "too-big-source":
      return "ไฟล์ใหญ่เกิน 10MB กรุณาเลือกรูปที่เล็กลง หรือแคปหน้าจอสลิปแล้วแนบใหม่";
    case "too-big-after":
      return "รูปนี้ใหญ่เกิน 5MB และบีบอัดไม่สำเร็จ กรุณาแคปหน้าจอสลิปแล้วแนบใหม่ หรือเลือกรูปที่เล็กกว่านี้";
  }
}

/**
 * Validate → compress (web-worker, then no-worker fallback for in-app
 * browsers, each with a hard timeout) → enforce the storage.rules 5MB cap.
 * Never throws; returns a typed result the caller maps to UI.
 */
export async function prepareSlipImage(file: File): Promise<SlipPrepResult> {
  if (!(await looksLikeSlipImage(file))) return { ok: false, reason: "not-image" };
  if (file.size > SLIP_MAX_SOURCE_BYTES) return { ok: false, reason: "too-big-source" };

  const isHeic = HEIC_RE.test(file.type) || HEIC_RE.test(file.name || "");
  let out: File | Blob = file;

  // HEIC is converted even when small — the admin reviews slips on desktop,
  // where HEIC doesn't render.
  if (file.size > COMPRESSION_THRESHOLD || isHeic) {
    const options: Record<string, unknown> = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.85,
    };
    if (isHeic) options.fileType = "image/jpeg";
    try {
      out = await compressWithTimeout(file, options, COMPRESSION_TIMEOUT);
    } catch {
      try {
        out = await compressWithTimeout(file, { ...options, useWebWorker: false }, COMPRESSION_TIMEOUT);
      } catch {
        out = file; // compression totally failed — the original may still fit under 5MB
      }
    }
  }

  // storage.rules hard-denies >= 5MB; a clear message here beats a cryptic
  // storage/unauthorized after a long upload.
  if (out.size >= SLIP_MAX_UPLOAD_BYTES) return { ok: false, reason: "too-big-after" };

  const contentType =
    out.type && out.type.startsWith("image/") ? out.type : slipContentType(file);
  return { ok: true, file: out as File, contentType, originalBytes: file.size };
}
