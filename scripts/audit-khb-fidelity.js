/**
 * audit-khb-fidelity.js
 * ตรวจว่าบทความที่ปรับ khb-* callout ทุกบทความ "ไม่มีคำที่ครูฮีมไม่ได้เขียน" หลุดเข้าไป
 * โดยเฉพาะ h3 label ของ khb-fit/khb-warn ที่บางครั้งอาจถูก "แต่งป้ายใหม่" แทนที่จะดึงจากต้นฉบับ
 * (เหตุการณ์จริง 2026-08-01: subagent ชุดหนึ่งแต่งป้าย h3 ใหม่ 4 บทความ ตรวจจับ+แก้ด้วยสคริปต์นี้)
 *
 * วิธีตรวจ: strip HTML ของ "เนื้อหาปัจจุบัน" (รวม h3 เป็นข้อความธรรมดา) เทียบกับ "เนื้อหาต้นฉบับ"
 * (จาก backup ใน scripts/tmp/khb-reformat-backups/) บรรทัดไหนใน current ที่ไม่มีใน backup เลย
 * = คำที่ถูกแต่งเพิ่ม ต้องแก้
 *
 *   node scripts/audit-khb-fidelity.js          # ตรวจอย่างเดียว รายงาน
 *   node scripts/audit-khb-fidelity.js --fix    # แก้บทความที่มีปัญหา (unwrap khb-fit/khb-warn กลับเป็น <p> ธรรมดา)
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const FIX = process.argv.includes('--fix');
const BACKUP_DIR = path.resolve(__dirname, 'tmp/khb-reformat-backups');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function extractLines(html) {
    let t = html;
    t = t.replace(/<img[^>]*>/g, '\n');
    t = t.replace(/<hr\s*\/?>/g, '\n');
    t = t.replace(/<br\s*\/?>/g, '\n');
    t = t.replace(/<\/(p|h1|h2|h3|div)>/g, '\n');
    t = t.replace(/<[^>]+>/g, '');
    t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
    return t.split('\n').map((l) => l.trim()).filter(Boolean);
}

// เอาบล็อก khb-fit/khb-warn ที่มี <h3> ออก กลับไปเป็น <p> ธรรมดา (ตัด h3 ทิ้ง คง p ไว้ตามเดิม)
function unwrapFitWarn(html) {
    return html.replace(
        /<div class="khb-(?:fit|warn)">\s*<h3>[^<]*<\/h3>\s*((?:<p>[\s\S]*?<\/p>\s*)+)<\/div>/g,
        (_m, inner) => inner.trim()
    );
}

function findBackup(slug) {
    if (!fs.existsSync(BACKUP_DIR)) return null;
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith(slug + '-') && !f.includes('FLAGGED'));
    if (files.length === 0) return null;
    files.sort();
    return fs.readFileSync(path.join(BACKUP_DIR, files[files.length - 1]), 'utf8');
}

(async () => {
    const snap = await db.collection('posts').get();
    let clean = 0, invented = 0, noBackup = 0;
    const problems = [];

    for (const doc of snap.docs) {
        const d = doc.data();
        const slug = d.slug;
        const current = d.content || '';
        const backup = findBackup(slug);
        if (!backup) { noBackup++; continue; } // ไม่มี backup แปลว่ายังไม่เคยถูกแก้ (ข้ามได้)

        const oldLines = new Set(extractLines(backup));
        const newLines = extractLines(current);
        const inventedLines = newLines.filter((l) => !oldLines.has(l));

        if (inventedLines.length === 0) {
            clean++;
        } else {
            invented++;
            problems.push({ id: doc.id, slug, inventedLines, current });
            console.log(`❌ ${slug} — พบข้อความใหม่ ${inventedLines.length} บรรทัด: ${JSON.stringify(inventedLines)}`);
        }
    }

    console.log(`\nสรุป: สะอาด ${clean} | มีข้อความแต่งเพิ่ม ${invented} | ไม่มี backup(ข้าม) ${noBackup}`);

    if (!FIX || problems.length === 0) {
        if (problems.length > 0) console.log('\n(รันด้วย --fix เพื่อแก้ไขจริง)');
        process.exit(0);
    }

    console.log('\n🔧 กำลังแก้ไข...\n');
    for (const p of problems) {
        const fixedHtml = unwrapFitWarn(p.current);
        const backup = findBackup(p.slug);
        const oldLines = new Set(extractLines(backup));
        const newLines = extractLines(fixedHtml);
        const stillInvented = newLines.filter((l) => !oldLines.has(l));
        if (stillInvented.length > 0) {
            console.log(`⚠️  ${p.slug} — แก้แล้วยังเหลือข้อความแปลกปลอม: ${JSON.stringify(stillInvented)} (ข้าม ต้องตรวจมือ)`);
            continue;
        }
        // สำรองเวอร์ชันที่มีปัญหาไว้ก่อนเขียนทับ
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const flaggedBackupPath = path.join(BACKUP_DIR, `${p.slug}-FLAGGED-invented-h3-${Date.now()}.html`);
        fs.writeFileSync(flaggedBackupPath, p.current);
        await db.collection('posts').doc(p.id).update({
            content: fixedHtml,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ แก้แล้ว: ${p.slug} (unwrap khb-fit/khb-warn ที่มี h3 แต่งใหม่ กลับเป็น <p> ธรรมดา) — เวอร์ชันเดิมสำรองที่ ${flaggedBackupPath}`);
    }
    process.exit(0);
})().catch((e) => { console.error('❌', e); process.exit(1); });
