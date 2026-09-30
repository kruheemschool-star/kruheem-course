const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const SCRATCH = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad';

const articles = [
  { id: 'YsteVTr21peCs2FaxZ3z', slug: '15-min-math-rule', newFile: `${SCRATCH}/khb-15-min-math-rule.html`, expectTitle: 'กฎเหล็ก 15 นาที: วิธีปั้นพื้นฐานคณิตให้แน่นปึ้ก ก่อนที่ลูกจะเกลียดวิชานี้ไปตลอดกาล (อ่านด่วนก่อนสาย)' },
  { id: 'yLFdsBfVwRywVr5ukCxG', slug: 'stop-saying-smart-math', newFile: `${SCRATCH}/khb-stop-saying-smart-math.html`, expectTitle: 'เลิกชมลูกว่า "เก่งจัง" ถ้าอยากให้ลูกรอดวิชาเลข! ปลดล็อกสมองเด็กด้วยกฎจาก Stanford' },
  { id: '3qnTVOWPWYUrrwNURg2q', slug: 'gambaru-spirit-success', newFile: `${SCRATCH}/khb-gambaru-spirit-success.html`, expectTitle: 'เลิกน้อยใจที่เกิดมาไม่เก่งคณิต เพราะความพยายามแบบ กัมบารุ จะทำให้หนูชนะทุกสมการในชีวิต' },
  { id: 'mgH8aTAQ4qTLcL6sCd1j', slug: '5000-year-old-secret-revealed', newFile: `${SCRATCH}/khb-5000-year-old-secret-revealed.html`, expectTitle: 'ความลับ 5,000 ปีจากป่าลึกสู่ห้องนั่งเล่น: วิธีสร้าง "พื้นที่ศักดิ์สิทธิ์" ให้ลูกเรียนเก่งแบบก้าวกระโดด' },
];

(async () => {
  for (const art of articles) {
    const doc = await db.collection('posts').doc(art.id).get();
    const data = doc.data();
    const expectedNew = fs.readFileSync(art.newFile, 'utf-8');
    const contentMatches = data.content === expectedNew;
    const titleMatches = data.title === art.expectTitle;
    const slugMatches = data.slug === art.slug;
    console.log(`${art.slug} (${art.id}):`);
    console.log(`  content matches intended new HTML: ${contentMatches}`);
    console.log(`  title unchanged: ${titleMatches} ("${data.title}")`);
    console.log(`  slug unchanged: ${slugMatches} ("${data.slug}")`);
    console.log(`  other fields present: excerpt=${!!data.excerpt} keywords=${!!data.keywords} coverImage=${!!data.coverImage} status=${data.status} views=${data.views} createdAt=${!!data.createdAt} updatedAt=${!!data.updatedAt}`);
    console.log('');
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
