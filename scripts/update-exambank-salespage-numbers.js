/**
 * อัปเดตตัวเลขบนหน้าขายคลังข้อสอบ (courses/26UeeaBMMFswM3RH5aI1) ให้ตรงกับของจริง
 *
 * ปัญหา: หน้าขายเขียน "3,087+ ข้อ (30 ชุด)" อยู่ 5 จุด ทั้งที่ของจริง 18,548 ข้อ 106 ชุด
 *        (ต่ำกว่าความจริง 5.8 เท่า) และเขียน "ป.1 ถึง ม.6" ขัดกับ "ป.4 ถึง ม.6" ในหน้าเดียวกัน
 *        ส่วนเป้าหมาย "ภายใน 5 ปีจะมีไม่ต่ำกว่า 20,000 ข้อ" ตอนนี้ทำไปแล้ว 93%
 *
 * นับจำนวนจริงจากคอลเลกชัน exams สดๆ ทุกครั้ง แล้วปัดลงเป็นหลักร้อยกันเลขเกินจริง
 *
 * รัน: node scripts/update-exambank-salespage-numbers.js          (dry-run)
 *      node scripts/update-exambank-salespage-numbers.js --apply  (เขียนจริง)
 *
 * หลังเขียนจริง: node scripts/bust-caches.js exams
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
const COURSE_ID = '26UeeaBMMFswM3RH5aI1';
const BACKUP_DIR = path.resolve(__dirname, 'tmp');

(async () => {
    // ---------- นับของจริง ----------
    const snap = await db.collection('exams').get();
    let sets = 0, questions = 0;
    snap.forEach((d) => {
        const x = d.data();
        let qs = x.questions;
        if (typeof qs === 'string') { try { qs = JSON.parse(qs); } catch { qs = []; } }
        const n = Array.isArray(qs) ? qs.length : 0;
        if (x.hidden || n === 0) return;      // ไม่นับชุดที่ซ่อนหรือว่าง
        sets++; questions += n;
    });
    const rounded = Math.floor(questions / 100) * 100;   // ปัดลงหลักร้อย กันเลขเกินจริง
    const fmt = rounded.toLocaleString('en-US');
    console.log(`นับของจริงจากฐานข้อมูล: ${sets} ชุด · ${questions.toLocaleString()} ข้อ`);
    console.log(`ตัวเลขที่จะใช้บนหน้าขาย: ${fmt}+ ข้อ (${sets} ชุด)  — ปัดลงหลักร้อย\n`);

    const ref = db.collection('courses').doc(COURSE_ID);
    const cur = (await ref.get()).data();
    if (!cur) throw new Error('ไม่พบคอร์สคลังข้อสอบ');

    let s = JSON.stringify(cur.salesPage);
    const before = s;

    // ---------- แก้ทีละจุด ----------
    const edits = [
        // 1) แถบตัวเลขความน่าเชื่อถือด้านบน
        //    ห้ามใช้ needle ที่คร่อม 2 key เพราะ Admin SDK คืน map เรียงตามตัวอักษร
        //    ลำดับ key จึงไม่เหมือนที่เห็นในหน้าแอดมิน — จับแค่ key กับค่าของมันเอง
        ['"number":"3,087+"', `"number":"${fmt}+"`],
        // 2) หัวข้อ "สิ่งที่น้องๆ จะได้รับ"
        ['คลังข้อสอบ3,087+ข้อ"', `คลังข้อสอบ ${fmt}+ ข้อ"`],
        ['"ป.4ถึงม.6·จัดหมวดตามบทหาง่ายใช้เลย"', `"ป.4 ถึง ม.6 · ${sets} ชุด จัดหมวดตามบท หาง่าย ใช้เลย"`],
        // 3) ตารางเทียบราคา
        ['"text":"3,087+ข้อและเพิ่มฟรีไม่จำกัด"', `"text":"${fmt}+ ข้อ และเพิ่มฟรีไม่จำกัด"`],
        // 4) กล่องสรุปความคุ้มค่า
        ['"name":"คลังข้อสอบ3,087+ข้อ(30ชุด)"', `"name":"คลังข้อสอบ ${fmt}+ ข้อ (${sets} ชุด)"`],
        // 5) คำถามที่พบบ่อย — ตัวเลขปัจจุบัน + เป้าหมาย 5 ปี (ทำไปแล้ว 93% ต้องขยับเป้า)
        ['ตอนนี้คลังมี3,087+ข้อ', `ตอนนี้คลังมี ${fmt}+ ข้อ จาก ${sets} ชุด`],
        ['ภายใน5ปีจะมีไม่ต่ำกว่า20,000ข้อ', 'ภายใน 5 ปีจะมีไม่ต่ำกว่า 30,000 ข้อ'],
        // 6) แก้ "ป.1 ถึง ม.6" ให้ตรงกับของจริง (คลังเริ่มที่ ป.4)
        ['รวมทุกข้อสอบไว้ที่เดียวป.1ถึงม.6ครบในแอปเดียว', 'รวมทุกข้อสอบไว้ที่เดียว ป.4 ถึง ม.6 ครบในแอปเดียว'],
    ];

    // จับคู่แบบไม่สนช่องว่าง เพื่อกันปัญหา JSON.stringify เว้นวรรคไม่เหมือนกัน
    const squash = (t) => t.replace(/\s+/g, '');
    let applied = 0;
    for (const [needleRaw, replacement] of edits) {
        const needle = squash(needleRaw);
        // หาตำแหน่งจริงใน s โดยเทียบเวอร์ชันที่ตัดช่องว่างแล้ว
        const map = [];            // index ใน squashed -> index ใน s
        let sq = '';
        for (let i = 0; i < s.length; i++) { if (!/\s/.test(s[i])) { map.push(i); sq += s[i]; } }
        const at = sq.indexOf(needle);
        if (at === -1) { console.log(`⚠️  ไม่พบข้อความที่จะแก้: ${needleRaw.slice(0, 55)}...`); continue; }
        const start = map[at], end = map[at + needle.length - 1] + 1;
        console.log(`✏️  แก้: ${s.slice(start, end).slice(0, 70).replace(/\s+/g, ' ')}...`);
        console.log(`      → ${replacement.slice(0, 70)}...`);
        s = s.slice(0, start) + replacement + s.slice(end);
        applied++;
    }

    console.log(`\nแก้ได้ ${applied} / ${edits.length} จุด`);
    const leftover = (s.match(/3,087/g) || []).length;
    if (leftover) console.log(`⚠️  ยังเหลือ "3,087" อีก ${leftover} จุด`);
    else console.log('✅ ไม่เหลือเลข 3,087 ในหน้าขายแล้ว');

    let salesPage;
    try { salesPage = JSON.parse(s); }
    catch (e) { throw new Error('JSON พังหลังแก้ ยกเลิกทั้งหมด: ' + e.message); }
    console.log('✅ JSON ยัง parse ได้ปกติ');

    if (s === before) { console.log('\nไม่มีอะไรเปลี่ยน'); process.exit(0); }
    if (!APPLY) { console.log('\n(dry-run) สั่ง --apply เพื่อเขียนจริง'); process.exit(0); }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bak = path.join(BACKUP_DIR, `BACKUP-salespage-exambank-${stamp}.json`);
    fs.writeFileSync(bak, JSON.stringify(cur, null, 1));
    console.log(`\n💾 สำรองหน้าขายเดิมไว้ที่ ${path.relative(process.cwd(), bak)}`);

    await ref.update({ salesPage, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log('✅ เขียนหน้าขายใหม่เรียบร้อย');
    console.log('\nขั้นต่อไป: node scripts/bust-caches.js exams');
    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
