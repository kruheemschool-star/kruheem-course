/** replace-testimonials-real.js — WRITE. Put REAL reviews (from the reviews
 *  collection) into every course's testimonial data.stories, replacing the
 *  fabricated ones. Works on the CURRENTLY DEPLOYED (old) code which renders
 *  data.stories directly — so real reviews show on refresh, no deploy needed.
 *  Keeps useRealReviews=true so the new marquee code upgrades it once deployed. */
const admin = require('firebase-admin'); const path = require('path');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname,'serviceAccountKey.json'))) });
const db = admin.firestore();

// 6 strong REAL reviews (lightly trimmed), from the live reviews collection.
const STORIES = [
  { name: 'เด็กหญิงณัฐิดา ศรีเมือง', role: '⭐⭐⭐⭐⭐ ผู้เรียนจริง', quote: 'เรียนกับครูฮีมแล้วรู้สึกว่าคณิตไม่ยากอย่างที่คิดเลยค่ะ ครูสอนละเอียดมาก อธิบายทีละขั้นตอน เข้าใจง่าย มีเทคนิคดี ๆ จากที่เคยงง ๆ ตอนนี้ทำได้มั่นใจขึ้นเยอะมาก 👍' },
  { name: 'ปุณณะวิชญ์', role: '⭐⭐⭐⭐⭐ ผู้เรียนจริง', quote: 'เป็นคอร์สที่ได้ฝึกทำแบบฝึกหัดเยอะมาก แบ่งเป็น level ให้ฝึกตั้งแต่ง่ายไปยาก ถึงยากมาก ถ้าทำครบทุกข้อ แก้สมการได้ทุกข้อแน่นอน' },
  { name: 'Usa Tamtinthai', role: '⭐⭐⭐⭐⭐ ผู้เรียนจริง', quote: 'เป็นคอร์สที่สอนดี ค่อย ๆ อธิบายให้เด็กเข้าใจได้ง่าย ที่สำคัญประทับใจครูฮีมตรงที่ให้โอกาสเด็ก ๆ ได้มีระยะเวลากลับมาทบทวนได้ตั้ง 5 ปี ขอบคุณมากค่ะ' },
  { name: 'ปุณณ์', role: '⭐⭐⭐⭐⭐ ผู้เรียนจริง', quote: 'ได้เรียนคอร์สนี้เหมือนได้ทบทวนเนื้อหาตั้งแต่แรกไปจนเรื่องที่ยาก ครูฮีมอธิบายดีมาก เข้าใจง่าย ใช้ฝึกทำเตรียมสอบเข้า ม.1 ได้เป็นอย่างดี คุ้มมาก ๆ คอร์สนี้' },
  { name: 'Season', role: '⭐⭐⭐⭐⭐ ผู้เรียนจริง', quote: 'ตั้งใจหาที่เรียนออนไลน์มาหลายที่ มาถูกใจที่นี่ เสียงครูที่สอนดูอบอุ่น เด็กตั้งใจเรียนอย่างสบายใจ ไม่เครียด ไม่ต้องกลัวตามไม่ทัน มีเนื้อหาครบ แบบฝึกหัดเยอะ เรียนแล้วเพลินไปเลย' },
  { name: 'Play Fah', role: '⭐⭐⭐⭐⭐ ผู้เรียนจริง', quote: 'สอบคณิตที่ผ่านมาได้เพราะครูเลยค่ะ ขอบคุณมากค่ะ ไม่รู้ทำไมเพิ่งมาเจอ อธิบายดีมาก ๆ เลยค่ะ' },
];

(async()=>{
  const snap = await db.collection('courses').get();
  let n = 0;
  for (const d of snap.docs){
    const sp = d.data().salesPage;
    if (!sp?.sections) continue;
    const idx = sp.sections.findIndex(s => s.type === 'testimonial');
    if (idx < 0) continue;
    const sections = sp.sections.map((s,i) => i===idx ? {
      ...s,
      data: {
        ...s.data,
        title: s.data?.title || 'เรื่องจริงจากนักเรียน 💪',
        subtitle: 'รีวิวจริงจากนักเรียนของครูฮีม',
        useRealReviews: true,         // new code → live marquee from /api/home-reviews
        stories: STORIES,             // old/deployed code & fallback → REAL reviews (no more fakes)
      },
    } : s);
    await d.ref.update({ 'salesPage.sections': sections });
    console.log(`✅ ${d.data().title} · stories → ${STORIES.length} real reviews`);
    n++;
  }
  console.log(`\ndone · ${n} courses updated`);
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
