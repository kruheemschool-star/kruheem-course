/**
 * add-comparison.js
 * Add a second (3-column) comparison section to the course salesPage, right
 * after the existing comparison. Content tailored to บัญญัติไตรยางค์ (590฿, ป.5-6).
 *
 *   node add-comparison.js            # dry run
 *   node add-comparison.js --commit   # write
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const COURSE_ID = 'xELVM7Nbeua9jm0NjJK7';
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const newComparison = {
  id: 'comparison-2',
  type: 'comparison',
  order: 0, // set on renumber
  enabled: true,
  data: {
    title: '3 ทางเลือกของลูก... ทางไหนคุ้มและได้ผลจริง?',
    subtitle: 'เทียบให้เห็นชัดๆ ก่อนตัดสินใจ ว่าเงินที่จ่ายไป ลูกได้อะไรกลับมา',
    columns: [
      {
        title: 'ติว/สถาบันทั่วไป',
        highlight: false,
        features: [
          { text: 'ค่าเรียนแพง จ่ายเป็นเทอมทุกเทอม', included: false },
          { text: 'ต้องพาลูกเดินทาง เสียเวลาทั้งบ้าน', included: false },
          { text: 'พลาดคาบไหน ตามเพื่อนไม่ทัน', included: false },
          { text: 'สอนตามกลุ่ม ไม่ได้ตามจังหวะลูก', included: false },
          { text: 'มีครูคอยดูแลในห้อง', included: true },
        ],
      },
      {
        title: '🌟 คอร์สบัญญัติไตรยางค์ ครูฮีม',
        highlight: true,
        features: [
          { text: "เข้าใจแก่น 'หัวใจ 2 ดวง' คิดเองเป็น", included: true },
          { text: 'เรียนซ้ำไม่จำกัด ตลอด 5 ปีเต็ม', included: true },
          { text: 'เรียนที่ไหน เมื่อไหร่ก็ได้ จาก iPad/มือถือ', included: true },
          { text: 'วิดีโอ + แบบฝึก + แนวข้อสอบ ครบจบในที่เดียว', included: true },
          { text: '590 บาท จ่ายครั้งเดียว (เฉลี่ยวันละ 0.32 บาท)', included: true },
        ],
      },
      {
        title: 'หาคลิปฟรีใน YouTube',
        highlight: false,
        features: [
          { text: 'เนื้อหากระจัดกระจาย ไม่เป็นระบบ', included: false },
          { text: 'ไม่เรียงตามลำดับการสอน', included: false },
          { text: 'ไม่มีแบบฝึก/แนวข้อสอบให้ฝึกมือ', included: false },
          { text: 'สงสัยแล้วถามใครไม่ได้', included: false },
          { text: 'ดูฟรี', included: true },
        ],
      },
    ],
  },
};

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE\n' : '🔍 DRY RUN\n');

  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  const course = snap.data();
  const sp = course.salesPage;
  if (!sp) throw new Error('no salesPage');

  if (sp.sections.some(s => s.id === 'comparison-2')) {
    console.log('comparison-2 already exists — will be replaced in place.');
    sp.sections = sp.sections.filter(s => s.id !== 'comparison-2');
  }

  // Insert right after the first existing comparison (else append before priceStack).
  const idx = sp.sections.findIndex(s => s.type === 'comparison');
  const insertAt = idx >= 0 ? idx + 1 : sp.sections.length;
  sp.sections.splice(insertAt, 0, newComparison);

  // Renumber orders from the (already-correct) array order after the splice.
  // Do NOT sort here — the new section has order 0 and would jump to the top.
  sp.sections.forEach((s, i) => { s.order = i + 1; });

  console.log('ลำดับ sections หลังเพิ่ม:');
  sp.sections.forEach(s => console.log(`  [${String(s.order).padStart(2)}] ${s.type}${s.id === 'comparison-2' ? '  ⬅️ ใหม่ (3 คอลัมน์)' : ''}`));
  console.log('\nเนื้อหา comparison ใหม่:');
  console.log(`  หัวข้อ: ${newComparison.data.title}`);
  newComparison.data.columns.forEach(col => {
    console.log(`\n  ▸ ${col.title}${col.highlight ? ' (เด่น)' : ''}`);
    col.features.forEach(f => console.log(`      ${f.included ? '✓' : '✗'} ${f.text}`));
  });

  if (!COMMIT) {
    console.log('\n(dry run — re-run with --commit to write)');
    process.exit(0);
  }

  const backupPath = path.resolve(__dirname, `salespage-backup-${COURSE_ID}-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(course.salesPage, null, 2));
  console.log(`\n📦 backed up → ${backupPath}`);

  await ref.update({ salesPage: sp });
  console.log('✅ added 3-column comparison (enabled stays true)');
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
