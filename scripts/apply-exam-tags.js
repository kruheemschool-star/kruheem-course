/**
 * เขียน tag 4 มิติ (สาระ + หัวข้อย่อย + ทักษะ + ระดับ + ชั้น) กลับเข้าชุดข้อสอบ
 *
 * ระบบวิเคราะห์จุดอ่อนต้องใช้ tag ครบ 4 มิติถึงจะวาดเรดาร์และแนะนำได้
 * ชุดเก่าจำนวนมากมีแต่ tag สาระแบบหลวมๆ (เช่น "ตัวแปร" "บวก" "ลบ") ซึ่งบอกอะไรไม่ได้
 *
 * ไฟล์กำหนด tag อยู่ที่ scripts/tmp/tagging/sets/<ชื่อ>.py — เขียนด้วยมือหลังอ่านโจทย์ครบทุกข้อ
 * สคริปต์นี้อ่านไฟล์นั้นผ่าน python แล้วเขียนกลับ Firestore
 *
 * รัน: node scripts/apply-exam-tags.js <ชื่อไฟล์>          (dry-run)
 *      node scripts/apply-exam-tags.js <ชื่อไฟล์> --apply  (เขียนจริง)
 *
 * หลังเขียนจริง ต้องรัน: node scripts/bust-caches.js exams
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const name = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!name) { console.error('ต้องระบุชื่อไฟล์ เช่น m1-integers'); process.exit(1); }

const SETS = path.resolve(__dirname, 'tmp/tagging/sets');
const BACKUP = path.resolve(__dirname, 'tmp');
const src = path.join(SETS, name + '.py');
if (!fs.existsSync(src)) { console.error('ไม่พบไฟล์', src); process.exit(1); }

// อ่านไฟล์ python ออกมาเป็น JSON
const spec = JSON.parse(execFileSync('python3', ['-c', `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('s', ${JSON.stringify(src)})
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
print(json.dumps({'examId': m.EXAM_ID, 'grade': m.GRADE, 'chapter': m.CHAPTER,
                  'strand': m.STRAND, 'topic': m.TOPIC, 'lvl': m.LVL, 'skl': m.SKL,
                  'a': {str(k): list(v) for k, v in m.A.items()}}, ensure_ascii=False))
`], { encoding: 'utf8' }));

const utf8 = (s) => Buffer.byteLength(s, 'utf8');
function docSize(obj) {
    const sz = (v) => {
        if (v == null) return 1;
        const t = typeof v;
        if (t === 'string') return utf8(v) + 1;
        if (t === 'boolean') return 1;
        if (t === 'number') return 8;
        if (Array.isArray(v)) return v.reduce((s, e) => s + sz(e), 0);
        if (t === 'object') { let s = 32; for (const [k, val] of Object.entries(v)) s += utf8(k) + 1 + sz(val); return s; }
        return 8;
    };
    let total = 32;
    for (const [k, v] of Object.entries(obj)) total += utf8(k) + 1 + sz(v);
    return total;
}

(async () => {
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง (--apply)' : '🔍 dry-run — ตรวจอย่างเดียว'}\n`);
    const ref = db.collection('exams').doc(spec.examId);
    const snap = await ref.get();
    if (!snap.exists) { console.error('ไม่พบชุด', spec.examId); process.exit(1); }
    const cur = snap.data();
    const qs = cur.questions || [];
    console.log(`── "${String(cur.title).replace(/\s+/g, ' ')}" [${cur.category}] ${qs.length} ข้อ ──`);

    const keys = Object.keys(spec.a).map(Number).sort((a, b) => a - b);
    if (keys.length !== qs.length || keys[0] !== 1 || keys[keys.length - 1] !== qs.length) {
        console.error(`❌ ไฟล์ tag มี ${keys.length} ข้อ (${keys[0]}-${keys[keys.length - 1]}) ไม่ตรงกับชุดที่มี ${qs.length} ข้อ`);
        process.exit(1);
    }

    const lvCount = {}, skCount = {}, tpCount = {};
    const next = qs.map((q, i) => {
        const [t, s, l] = spec.a[String(i + 1)];
        const topic = spec.topic[t], skill = spec.skl[s], level = spec.lvl[l];
        if (!topic || !skill || !level) throw new Error(`ข้อ ${i + 1}: รหัสไม่รู้จัก ${t}/${s}/${l}`);
        lvCount[level] = (lvCount[level] || 0) + 1;
        skCount[skill] = (skCount[skill] || 0) + 1;
        tpCount[topic] = (tpCount[topic] || 0) + 1;
        // tag ชุดใหม่แทนของเดิมทั้งหมด — ของเดิมเป็นคำหลวมๆ อย่าง "ตัวแปร" "บวก" ที่ใช้จำแนกอะไรไม่ได้
        // และหลายชุดชิดเพดาน 1 MiB อยู่แล้ว จึงไม่เก็บซ้ำไว้ใน suggestedTags
        return { ...q, tags: [spec.chapter, topic, spec.strand, spec.grade, skill, level] };
    });

    const order = ['ง่าย', 'กลาง', 'ยาก', 'ยากมาก'];
    console.log('   ระดับ : ' + order.map((k) => `${k} ${lvCount[k] || 0}`).join(' · '));
    console.log('   ทักษะ : ' + ['คิดเลข', 'เข้าใจ', 'แปลโจทย์'].map((k) => `${k} ${skCount[k] || 0}`).join(' · '));
    console.log('   หัวข้อย่อย ' + Object.keys(tpCount).length + ' หัวข้อ: '
        + Object.entries(tpCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));

    const before = docSize(cur), after = docSize({ ...cur, questions: next });
    console.log(`   ขนาด doc: ${before.toLocaleString()} → ${after.toLocaleString()} ไบต์ (${(after / 1048576 * 100).toFixed(1)}% ของเพดาน)`);
    if (after > 1000000) { console.error('   ❌ ใหญ่เกินไป'); process.exit(1); }

    // ตัวอย่าง 3 ข้อ
    console.log('\n   ตัวอย่าง:');
    [0, Math.floor(qs.length / 2), qs.length - 1].forEach((i) => {
        console.log(`     [${i + 1}] ${String(qs[i].question).replace(/\s+/g, ' ').slice(0, 62)}…`);
        console.log(`          เดิม: ${JSON.stringify(qs[i].tags)}`);
        console.log(`          ใหม่: ${JSON.stringify(next[i].tags)}`);
    });

    if (!APPLY) { console.log('\n(dry-run) สั่ง --apply เพื่อเขียนจริง'); process.exit(0); }

    fs.mkdirSync(BACKUP, { recursive: true });
    const bak = path.join(BACKUP, `tags-backup-${spec.examId}.json`);
    fs.writeFileSync(bak, JSON.stringify({ examId: spec.examId, title: cur.title, questions: qs }), 'utf8');
    await ref.update({ questions: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log(`\n✅ เขียน tag แล้ว ${next.length} ข้อ · สำรองของเดิมที่ ${path.relative(process.cwd(), bak)}`);
    console.log('⚠️  ขั้นต่อไป: node scripts/bust-caches.js exams');
    process.exit(0);
})();
