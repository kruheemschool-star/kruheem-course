/**
 * fix-kengsamkan-card.js — WRITE. The hero course card was showing DEFAULT
 * (Gifted geometry) chapters/stats because the hero had no real `chapters`.
 * Fill the card's สารบัญ with the REAL 19-Level equation episodes from the
 * classroom, and fix the stats/tags/preview label. Merges into existing hero
 * data (keeps the sales copy). Only touches the hero section.
 *   node fix-kengsamkan-card.js
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COURSE_ID = 'z41lCWEynOVjHhaoeT9B';

// Real table of contents — built from the classroom (EP01 intro + Lev1-19 + exam).
// desc = clip count per Level (grouped from the 59 video EPs). First 3 are free.
const chapters = [
  { title: 'EP01 · หลักการแก้สมการ', desc: '1 คลิป', free: true },
  { title: 'Level 1 · สมการที่มีบวก/ลบ เลขตัวเดียว', desc: '1 คลิป', free: true },
  { title: 'Level 2 · เทคนิคย้ายข้างบวก ลบ', desc: '1 คลิป', free: true },
  { title: 'Level 3 · ตัวเลขอยู่หน้าตัวแปร', desc: '1 คลิป' },
  { title: 'Level 4 · ตัวเลขคูณ/หาร หน้าตัวแปร', desc: '1 คลิป' },
  { title: 'Level 5 · ตัวแปรเป็นตัวส่วน', desc: '1 คลิป' },
  { title: 'Level 6 · ย้ายข้างไปคูณหรือหาร', desc: '1 คลิป' },
  { title: 'Level 7 · ย้ายข้างไปคูณและหารพร้อมกัน', desc: '1 คลิป' },
  { title: 'Level 8 · เทคนิคการคูณไขว้', desc: '1 คลิป' },
  { title: 'Level 9 · เทคนิคการกลับเศษส่วน', desc: '1 คลิป' },
  { title: 'Level 10 · สมการผสม บวก ลบ คูณ หาร', desc: '8 คลิป' },
  { title: 'Level 11 · สมการที่มีเศษส่วน', desc: '2 คลิป' },
  { title: 'Level 12 · กำจัดตัวส่วนด้วย ค.ร.น.', desc: '8 คลิป' },
  { title: 'Level 13 · บวก ลบ สมการที่มีทศนิยม', desc: '1 คลิป' },
  { title: 'Level 14 · คูณ หาร สมการที่มีทศนิยม', desc: '4 คลิป' },
  { title: 'Level 15 · เปลี่ยนทศนิยมเป็นจำนวนเต็ม', desc: '5 คลิป' },
  { title: 'Level 16 · ลำดับการคำนวณ', desc: '2 คลิป' },
  { title: 'Level 17 · ตัวแปรมากกว่า 1 ตำแหน่ง', desc: '6 คลิป' },
  { title: 'Level 18 · สมการที่มีลบหน้าวงเล็บ', desc: '2 คลิป' },
  { title: 'Level 19 · สมการจำนวนติดลบ', desc: '2 คลิป' },
  { title: 'แนวข้อสอบเก่งสมการ', desc: '9 คลิป' },
];

(async () => {
  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  const sp = snap.data().salesPage;
  const sections = sp.sections.map((s) => {
    if (s.type !== 'hero') return s;
    return {
      ...s,
      data: {
        ...s.data,
        cardVolLabel: 'KRUHEEM · เก่งสมการ',
        cardTags: ['19 Level', '5 ปี', 'HD'],
        chaptersTitle: `สารบัญทั้งหมด · ${chapters.length} บท`,
        chapters,
        cardStats: [
          { value: '19', label: 'Level' },
          { value: '400+', label: 'โจทย์' },
          { value: '4.9★', label: 'รีวิว' },
        ],
        preview: {
          ...(s.data.preview || {}),
          label: 'คลิปตัวอย่างฟรี',
          epLabel: 'EP.01 · ตัวอย่างฟรี',
          chapterTitle: 'EP01 · หลักการแก้สมการ',
          freeChipText: 'ดูฟรี · ไม่ต้องสมัคร',
          equations: ['9 + y = 25', '2x − 3 = 7', '5a = 30', 'x/4 = 2', '3(n − 1) = 12'],
        },
      },
    };
  });

  await ref.update({ 'salesPage.sections': sections });
  console.log('✅ fixed hero course card · chapters:', chapters.length);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
