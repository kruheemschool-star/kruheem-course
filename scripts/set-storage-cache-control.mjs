#!/usr/bin/env node
/**
 * Backfill Cache-Control metadata on existing Firebase Storage objects.
 *
 * Why: every object uploaded through the app before 2026-08-02 was saved with
 * no cacheControl, so Firebase serves it as `private, max-age=0` — browsers,
 * the Vercel image optimizer, and in-app browsers (FB/LINE) re-download the
 * full file on every view. That repeated download is billed Storage bandwidth
 * and was a major part of the July 2026 bill. This script patches METADATA
 * ONLY (file.setMetadata): bytes untouched, download tokens preserved, URLs
 * unchanged — one Class A operation per object.
 *
 * Skipped (must stay private / uncached):
 *   - slips/**       payment slips — sensitive financial images
 *   - exam-pdfs/**   paid master PDFs — served via short-lived signed URLs
 *
 * Prerequisites: service-account.json at repo root, .env.local with
 * NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (same as upload-public-assets.mjs).
 *
 * Usage:
 *   node scripts/set-storage-cache-control.mjs --dry-run   # count only
 *   node scripts/set-storage-cache-control.mjs             # apply
 */

import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

// --- Load .env.local manually (no dotenv dep needed) ---
const envPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
}

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
if (!BUCKET) {
    console.error("❌ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET not set in .env.local");
    process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");
// service-account.json (root) หรือ key เดิมที่สคริปต์ seed ใช้อยู่แล้ว
const SERVICE_ACCOUNT_PATH = [
    path.join(ROOT, "service-account.json"),
    path.join(ROOT, "scripts", "seed-gifted-m1", "serviceAccountKey.json"),
].find((p) => fs.existsSync(p));
if (!SERVICE_ACCOUNT_PATH) {
    console.error("❌ ไม่พบ service-account.json (root) หรือ scripts/seed-gifted-m1/serviceAccountKey.json");
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
    storageBucket: BUCKET,
});
const bucket = admin.storage().bucket();

const TARGET = "public, max-age=31536000, immutable";
const PRIVATE_PREFIXES = ["slips/", "exam-pdfs/"];
const CONCURRENCY = 20;

const topPrefix = (name) => (name.includes("/") ? name.split("/")[0] + "/" : "(root)");

(async () => {
    console.log(DRY_RUN ? "🧪 DRY RUN — นับอย่างเดียว ไม่แก้อะไร\n" : "🚀 APPLY — ตั้ง Cache-Control จริง\n");
    console.log(`bucket: ${BUCKET}\n`);

    const stats = {}; // prefix -> { total, patch, skipPrivate, already, bytes }
    const bump = (prefix, key, size = 0) => {
        if (!stats[prefix]) stats[prefix] = { total: 0, patch: 0, skipPrivate: 0, already: 0, bytes: 0 };
        stats[prefix].total++;
        stats[prefix][key]++;
        stats[prefix].bytes += size;
    };

    const toPatch = [];
    let pageToken;
    do {
        const [files, , resp] = await bucket.getFiles({ maxResults: 1000, pageToken, autoPaginate: false });
        for (const f of files) {
            const name = f.name;
            const size = Number(f.metadata.size || 0);
            const prefix = topPrefix(name);
            if (PRIVATE_PREFIXES.some((p) => name.startsWith(p))) {
                bump(prefix, "skipPrivate", size);
            } else if (f.metadata.cacheControl === TARGET) {
                bump(prefix, "already", size);
            } else {
                bump(prefix, "patch", size);
                toPatch.push(name);
            }
        }
        pageToken = resp?.nextPageToken;
    } while (pageToken);

    // Summary table
    const prefixes = Object.keys(stats).sort();
    let g = { total: 0, patch: 0, skipPrivate: 0, already: 0, bytes: 0 };
    for (const p of prefixes) {
        const s = stats[p];
        g.total += s.total; g.patch += s.patch; g.skipPrivate += s.skipPrivate; g.already += s.already; g.bytes += s.bytes;
        console.log(`${p.padEnd(28)} รวม ${String(s.total).padStart(5)} | จะตั้ง ${String(s.patch).padStart(5)} | ตั้งแล้ว ${String(s.already).padStart(4)} | ข้าม(private) ${String(s.skipPrivate).padStart(4)} | ${(s.bytes / 1048576).toFixed(1)} MB`);
    }
    console.log("─".repeat(100));
    console.log(`ทั้งหมด ${g.total} ไฟล์ (${(g.bytes / 1073741824).toFixed(2)} GB) | จะตั้ง ${g.patch} | ตั้งแล้ว ${g.already} | ข้าม ${g.skipPrivate}\n`);

    if (DRY_RUN || toPatch.length === 0) {
        console.log(DRY_RUN ? "จบ dry run — รันอีกครั้งโดยไม่มี --dry-run เพื่อตั้งจริง" : "ไม่มีไฟล์ต้องแก้ ✅");
        return;
    }

    let done = 0, failed = 0;
    const errors = [];
    for (let i = 0; i < toPatch.length; i += CONCURRENCY) {
        const batch = toPatch.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (name) => {
            try {
                await bucket.file(name).setMetadata({ cacheControl: TARGET });
                done++;
            } catch (e) {
                failed++;
                if (errors.length < 10) errors.push(`${name}: ${e.message}`);
            }
        }));
        if ((i / CONCURRENCY) % 10 === 0 || i + CONCURRENCY >= toPatch.length) {
            process.stdout.write(`\r  ตั้งแล้ว ${done + failed}/${toPatch.length} (พลาด ${failed})   `);
        }
    }
    console.log(`\n\n✅ เสร็จ: สำเร็จ ${done} | พลาด ${failed}`);
    if (errors.length) {
        console.log("ตัวอย่าง error:");
        errors.forEach((e) => console.log("  - " + e));
    }
})().catch((e) => {
    console.error("❌", e);
    process.exit(1);
});
