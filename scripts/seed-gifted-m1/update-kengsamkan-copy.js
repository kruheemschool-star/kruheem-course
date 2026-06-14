/**
 * update-kengsamkan-copy.js — WRITE. Rewrite the sales-page copy of the
 * "เก่งสมการ" course to be equation-specific & high-converting, based on
 * the ad ครูฮีม supplied. Preserves theme/boosters/real review images;
 * drops in the real 19 Levels; adds a "why equations matter" article;
 * refreshes the (expired) countdown. A backup was saved beforehand.
 *   node update-kengsamkan-copy.js
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COURSE_ID = 'z41lCWEynOVjHhaoeT9B';

(async () => {
  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('course not found');
  const sp = snap.data().salesPage || {};

  // countdown: 4 days from now (the stored date was in the past → expired)
  const end = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();

  // keep the real review images already uploaded
  const reviewImages = (sp.sections || []).find((s) => s.type === 'reviews')?.data?.images || [];

  const article = `
<h2>ทำไม "สมการ" ถึงสำคัญกว่าที่พ่อแม่หลายคนคิด?</h2>
<p>ถ้าลูกของคุณเริ่ม "ไปไม่เป็น" ทุกครั้งที่เจอสมการ — นี่ไม่ใช่เรื่องเล็กที่ควรปล่อยผ่านครับ</p>
<p>เพราะ <strong>"การแก้สมการ" คือทักษะแกนกลาง</strong> ที่คณิตศาสตร์เกือบทุกเรื่องหลังจากนี้ต้องใช้ ไม่ว่าจะเป็นพีชคณิต ฟังก์ชัน เรขาคณิต ไปจนถึงโจทย์ปัญหาในสนามสอบเข้า ม.1 — ทั้งหมดตั้งอยู่บนพื้นฐานเดียวกันคือ <strong>"การย้ายข้างและจัดการสมการ"</strong></p>
<h3>ถ้าปล่อยไว้... จะเกิดอะไรขึ้น?</h3>
<ul>
<li>ยิ่งเรียนสูง ยิ่งไม่เข้าใจ เพราะเนื้อหาใหม่สร้างต่อจากสมการที่ยังไม่แม่น</li>
<li>ทำข้อสอบช้า เสียคะแนนง่าย ๆ เพราะย้ายข้างผิด เครื่องหมายพลาด</li>
<li>ค่อย ๆ หมดความมั่นใจ จนกลายเป็น "เด็กที่เกลียดเลข" ไปเลย</li>
</ul>
<blockquote>กำแพงด่านแรกที่ชื่อ "สมการ" นี่แหละ ที่ตัดสินว่าลูกจะ "รุ่ง" หรือ "ร่วง" ในวิชาคณิตไปอีกหลายปี</blockquote>
<h3>ข่าวดีคือ — สมการเป็นเรื่องที่ "ฝึกให้เก่งได้"</h3>
<p>สมการไม่ใช่เรื่องของพรสวรรค์ แต่เป็นเรื่องของ <strong>"ลำดับการฝึกที่ถูกต้อง"</strong> เมื่อเด็กเข้าใจหลักการย้ายข้างอย่างแท้จริง (ไม่ใช่ท่องจำ) แล้วฝึกไล่จากง่ายไปยากทีละสเต็ป — เด็กที่เคยกลัวสมการที่สุด ก็กลายเป็นคนที่ทำได้เร็วและแม่นที่สุดในห้องได้</p>
<p>และนั่นคือสิ่งที่ <strong>คอร์สเก่งสมการ</strong> ออกแบบมาให้ครับ 💚</p>`.trim();

  const sections = [
    // 1 — HERO
    {
      id: 'hero-1', type: 'hero', order: 1, enabled: true,
      data: {
        badgeText: 'คอร์สพลิกชีวิตเด็กเกลียดเลข',
        title: 'เปลี่ยน "เด็กเกลียดสมการ"\nให้เป็น "เซียนสมการ" 🚀',
        subtitle: 'ไม่ใช่แค่ท่องสูตร — แต่ปลดล็อกความเข้าใจแบบทะลุปรุโปร่ง พาไปทีละสเต็ป จาก 0 สู่ฮีโร่ ผ่าน 19 Level + โจทย์กว่า 400 ข้อ',
        ctaText: 'สมัครเรียน ล็อกราคาพิเศษ',
        ctaPriceText: '฿1,900',
        regularPriceText: 'ราคาปกติ ฿2,500',
        savingsText: 'ประหยัด ฿600',
        secondaryCtaText: 'ดูเนื้อหา 19 Level',
        secondaryCtaMeta: '· 19 Level',
        pricePerDayText: 'เฉลี่ยวันละ 1 บาทนิด ๆ ตลอด 5 ปี!',
        trustChips: [
          { icon: '📝', text: 'โจทย์', boldText: '400+', suffix: 'ข้อ', tone: 'amber' },
          { icon: '♾️', text: 'เรียนซ้ำ', boldText: '5 ปี', tone: 'green' },
        ],
        blobColors: ['bg-indigo-200/40', 'bg-rose-200/40'],
        coverType: 'courseCard',
      },
    },
    // 2 — COUNTDOWN
    {
      id: 'countdown-2', type: 'countdown', order: 2, enabled: true,
      data: {
        style: 'inline',
        title: '🔥 โปรโมชั่นเปิดคอร์ส — ราคาพิเศษเหลือเวลาอีก',
        subtitle: 'หมดเวลาเมื่อไหร่ กลับเป็นราคาปกติ ฿2,500',
        endDate: end,
        expiredMessage: 'โปรโมชั่นหมดแล้ว — สอบถามราคาปัจจุบันได้ที่ LINE @kruheemschool',
      },
    },
    // 3 — TRUST BADGES (kept)
    {
      id: 'trust-3', type: 'trustBadges', order: 3, enabled: true,
      data: {
        stats: [
          { icon: '👨‍🎓', number: '1,500+', label: 'นักเรียนที่เรียนแล้ว' },
          { icon: '⭐', number: '4.9', label: 'คะแนนรีวิวเฉลี่ย' },
          { icon: '🏫', number: '10+', label: 'ปีประสบการณ์สอน' },
          { icon: '💯', number: '87%', label: 'เด็กได้เกรด A' },
        ],
      },
    },
    // 4 — PAIN / SOLUTION
    {
      id: 'pain-4', type: 'painPoint', order: 4, enabled: true,
      data: {
        title: 'ลูกเป็นแบบนี้... อยู่หรือเปล่า? 😱',
        subtitle: 'ถ้าใช่ — อย่าปล่อยไว้ เพราะ "สมการ" คือกำแพงด่านแรกที่ตัดสินว่าลูกจะ "รุ่ง" หรือ "ร่วง" ในวิชาคณิต',
        problemTitle: 'สัญญาณที่ต้องรีบแก้',
        problemIcon: '😰',
        problems: [
          { icon: '😱', text: 'เห็น "สมการ" ทีไร... ไปไม่เป็นทุกที' },
          { icon: '💨', text: 'นั่งทำการบ้านแล้วถอนหายใจ ทำไม่ได้สักข้อ' },
          { icon: '📉', text: 'คะแนนคณิตไม่เคยน่าพอใจ ทั้งที่ก็ตั้งใจแล้ว' },
          { icon: '😔', text: 'ย้ายข้างมั่ว เครื่องหมายผิดตลอด จนหมดความมั่นใจ' },
        ],
        solutionTitle: 'พอจบคอร์สนี้ ลูกจะเปลี่ยนไป',
        solutionIcon: '✨',
        solutionDesc: 'เราไม่ได้สอนให้ "จำสูตร" แต่จะ "ปลดล็อก" ความเข้าใจให้ทะลุปรุโปร่ง',
        solutions: [
          { icon: '😄', text: 'เห็นสมการแล้วยิ้ม — มองเป็นเกมไขปริศนาสุดสนุก' },
          { icon: '⚡', text: 'ย้ายข้างอย่างโปร ทำโจทย์เร็วขึ้น แม่นยำขึ้น' },
          { icon: '💪', text: 'ทะลวงโจทย์ยาก เศษส่วน ทศนิยม วงเล็บ เอาอยู่หมด' },
          { icon: '🎯', text: 'กู้คืนความมั่นใจเต็มร้อย พร้อมทำคะแนนทุกสนามสอบ' },
        ],
      },
    },
    // 5 — ARTICLE (new)
    {
      id: 'richtext-why-equations', type: 'richText', order: 5, enabled: true,
      data: { html: article, bg: 'grid', color: '#dc2626', framed: true, bgIntensity: 2 },
    },
    // 6 — SOLUTION CARDS
    {
      id: 'solution-5', type: 'solution', order: 6, enabled: true,
      data: {
        title: 'ในคอร์สเก่งสมการ น้อง ๆ จะได้อะไรบ้าง? 🎁',
        subtitle: 'ทุกอย่างที่จำเป็นต่อการปั้นเซียนสมการ — ครบจบในคอร์สเดียว',
        items: [
          { icon: '🎬', title: 'วิดีโอ 19 Level เรียงง่าย → ยาก', desc: 'สอนทีละสเต็ป ไม่ต้องงมเอง เข้าใจทุกเทคนิค ทั้งย้ายข้าง คูณไขว้ และ ค.ร.น.' },
          { icon: '📝', title: 'คลังโจทย์แก้สมการ 400+ ข้อ', desc: 'ฝึกจนคล่องมือ พร้อมเฉลยละเอียดทีละขั้นตอนทุกข้อ' },
          { icon: '📄', title: 'เอกสารพร้อมดาวน์โหลด', desc: 'PDF สรุป + ใบงานทุก Level ไม่ต้องเสียเวลาจดเอง' },
          { icon: '💬', title: 'ถามครูฮีมได้ตลอด', desc: 'ติดตรงไหน สงสัยข้อไหน ทักถามผ่าน LINE ได้ทันที' },
          { icon: '♾️', title: 'เรียนซ้ำได้ 5 ปีเต็ม', desc: 'ไม่เข้าใจบทไหน วนกลับมาดูได้ไม่จำกัด จนกว่าจะเซียน' },
          { icon: '📱', title: 'เรียนออนไลน์ทุกที่ทุกเวลา', desc: 'มือถือ แท็บเล็ต หรือคอม ก็เรียนได้ ที่ไหนเมื่อไหร่ก็ได้' },
        ],
      },
    },
    // 7 — CURRICULUM (the real 19 Levels, grouped)
    {
      id: 'curriculum-6', type: 'curriculum', order: 7, enabled: true,
      data: {
        title: 'เนื้อหาในคอร์ส: 19 Level ปั้นเซียนสมการ 📚',
        subtitle: 'เรียงลำดับมาอย่างดีที่สุด จากศูนย์สู่ฮีโร่ — ไม่ต้องงมเอง เราพาไปทีละสเต็ป',
        chapters: [
          {
            id: 1, title: 'บทที่ 1 · ปูพื้นฐานสมการ + เทคนิคย้ายข้าง',
            desc: 'Level 1–7 · เริ่มจากศูนย์ เข้าใจการย้ายข้างอย่างแท้จริง',
            content: [
              'Level 1: สมการที่มีบวก ลบ เลขตัวเดียว',
              'Level 2: เทคนิคย้ายข้างบวก ลบ เพื่อลดขั้นตอน',
              'Level 3: สมการที่มีตัวเลขอยู่หน้าตัวแปร',
              'Level 4: แก้สมการที่มีเลขคูณ หาร ตัวแปร',
              'Level 5: แก้สมการที่มีตัวแปรเป็นตัวส่วน',
              'Level 6: เทคนิคการย้ายข้างไปคูณหรือหาร',
              'Level 7: เทคนิคการย้ายข้างไปคูณและหารพร้อมกัน',
            ],
          },
          {
            id: 2, title: 'บทที่ 2 · พิชิตเศษส่วนในสมการ',
            desc: 'Level 8–12 · คูณไขว้ กลับเศษ ค.ร.น. ครบทุกเทคนิค',
            content: [
              'Level 8: เทคนิคการคูณไขว้',
              'Level 9: เทคนิคการกลับเศษส่วน',
              'Level 10: การแก้สมการผสม บวก ลบ คูณ หาร',
              'Level 11: สมการที่มีเศษส่วน',
              'Level 12: เทคนิคกำจัดตัวส่วนด้วย ค.ร.น.',
            ],
          },
          {
            id: 3, title: 'บทที่ 3 · เอาชนะทศนิยมในสมการ',
            desc: 'Level 13–15 · เปลี่ยนทศนิยมยุ่งยากให้กลายเป็นเรื่องง่าย',
            content: [
              'Level 13: การบวก ลบ สมการที่มีทศนิยม',
              'Level 14: การคูณ หาร สมการที่มีทศนิยม',
              'Level 15: เทคนิคเปลี่ยนทศนิยมให้เป็นจำนวนเต็ม',
            ],
          },
          {
            id: 4, title: 'บทที่ 4 · สมการขั้นสูง พร้อมลุยสนามสอบ',
            desc: 'Level 16–19 · ต่อยอดสู่โจทย์ซับซ้อนอย่างมั่นใจ',
            content: [
              'Level 16: ลำดับการคำนวณ',
              'Level 17: สมการที่มีตัวแปรมากกว่า 1 ตำแหน่ง',
              'Level 18: สมการที่มีเครื่องหมายลบหน้าวงเล็บ',
              'Level 19: สมการจำนวนติดลบ',
              '🎁 โบนัส: คลังโจทย์แก้สมการกว่า 400 ข้อ พร้อมเฉลยละเอียด',
            ],
          },
        ],
      },
    },
    // 8 — TESTIMONIAL (lightly sharpened to equations)
    {
      id: 'testimonial-7', type: 'testimonial', order: 8, enabled: true,
      data: {
        title: 'เรื่องจริงจากนักเรียน 💪',
        subtitle: 'ไม่ใช่แค่คะแนนที่เปลี่ยน — แต่ความรู้สึกต่อวิชาเลขก็เปลี่ยน',
        stories: [
          { name: 'น้องเอ', role: 'ม.1', quote: 'ตอนแรกเจอสมการแล้วท้อมาก ย้ายข้างทีไรพังตลอด พอเรียนครบทุก Level ทำได้ลื่นขึ้นเยอะ คะแนนขยับขึ้นจริง!', beforeScore: '45 คะแนน', afterScore: '85 คะแนน' },
          { name: 'น้องบี', role: 'ป.6', quote: 'ครูสอนสนุก มีเทคนิคคิดลัดเยอะ โดยเฉพาะเศษส่วนกับคูณไขว้ ตอนนี้ทำโจทย์สมการได้เร็วกว่าเพื่อนในห้อง', beforeScore: 'เกรด 2', afterScore: 'เกรด 4' },
          { name: 'คุณแม่ของน้องซี', role: 'ผู้ปกครอง', quote: 'ตั้งแต่ลูกมาเรียนคอร์สนี้ จากที่เคยบ่นว่าเกลียดเลข ตอนนี้นั่งทำโจทย์สมการเองที่บ้านได้แล้ว' },
        ],
      },
    },
    // 9 — REVIEWS (kept real images)
    {
      id: 'reviews-8', type: 'reviews', order: 9, enabled: true,
      data: { title: 'อย่าเชื่อแค่คำพูด... ดูรีวิวจริง', subtitle: 'เสียงจริงจากผู้ปกครองและนักเรียนนับพัน', images: reviewImages },
    },
    // 10 — COMPARISON (kept)
    {
      id: 'comparison-9', type: 'comparison', order: 10, enabled: true,
      data: {
        title: 'ทำไมต้องเลือกคอร์สของครูฮีม?',
        subtitle: 'เปรียบเทียบให้เห็นภาพชัด ๆ',
        columns: [
          {
            title: 'เรียนเอง',
            features: [
              { text: 'ประหยัดเงิน', included: true },
              { text: 'เรียนได้ตามจังหวะ', included: true },
              { text: 'มีครูคอยตอบคำถาม', included: false },
              { text: 'มีเทคนิคคิดลัด', included: false },
              { text: 'เอกสาร + คลังโจทย์ครบ', included: false },
              { text: 'ประหยัดเวลา', included: false },
            ],
          },
          {
            title: 'ครูฮีม ✨', highlight: true,
            features: [
              { text: 'ราคาคุ้ม จ่ายครั้งเดียว ใช้ 5 ปี', included: true },
              { text: 'เรียนซ้ำได้ไม่จำกัด 5 ปี', included: true },
              { text: 'ถามครูฮีมได้ตลอดทาง LINE', included: true },
              { text: 'เทคนิคคิดลัดเพียบ (คูณไขว้/ค.ร.น.)', included: true },
              { text: 'เอกสาร PDF + โจทย์ 400+ ข้อ', included: true },
              { text: 'ประหยัดเวลา เรียงมาให้แล้ว 19 Level', included: true },
            ],
          },
          {
            title: 'ที่อื่น',
            features: [
              { text: 'ราคาสูง', included: false },
              { text: 'เรียนได้จำกัดเวลา', included: false },
              { text: 'ถามได้บางครั้ง', included: true },
              { text: 'มีเทคนิคพื้นฐาน', included: true },
              { text: 'เอกสารบางส่วน', included: true },
              { text: 'ใช้เวลาปานกลาง', included: true },
            ],
          },
        ],
      },
    },
    // 11 — PRICE STACK
    {
      id: 'pricestack-10', type: 'priceStack', order: 11, enabled: true,
      data: {
        title: 'คุ้มยิ่งกว่าคุ้ม — ลงทุนครั้งเดียว ใช้ได้ 5 ปี 💰',
        subtitle: 'รวมทุกอย่างที่ลูกได้รับ คิดเป็นมูลค่าจริง',
        items: [
          { name: 'วิดีโอบทเรียน 19 Level (สอนละเอียดทุกเทคนิค)', value: 3000 },
          { name: 'เอกสาร PDF สรุป + ใบงานทุก Level', value: 600 },
          { name: 'คลังโจทย์แก้สมการ 400+ ข้อ พร้อมเฉลย', value: 900 },
          { name: 'สิทธิ์ถามครูฮีมผ่าน LINE', value: 1500 },
          { name: 'สิทธิ์เรียนซ้ำ 5 ปีเต็ม', value: 1500 },
          { name: 'เทคนิคคิดลัด: คูณไขว้ / ค.ร.น. / ย้ายข้าง', value: 800 },
        ],
        regularPrice: 2500,
        finalPrice: 1900,
        discountNote: '* โปรโมชั่นเปิดคอร์ส ราคา ฿1,900 มีเวลาจำกัด — หมดแล้วกลับเป็นราคาปกติ ฿2,500',
        ctaText: 'สมัครเรียนเลย ฿1,900',
      },
    },
    // 12 — GUARANTEE (kept)
    {
      id: 'guarantee-11', type: 'guarantee', order: 12, enabled: true,
      data: {
        badgeText: 'รับประกันคุณภาพ',
        title: 'เรียนแล้วไม่พอใจ ยินดีคืนเงิน 100%',
        desc: 'เรามั่นใจในคุณภาพคอร์ส ถ้าเรียนแล้วรู้สึกว่าไม่ตรงตามที่คาดหวัง แจ้งเราภายใน 7 วัน คืนเงินเต็มจำนวน',
        features: ['รับประกันคืนเงินภายใน 7 วัน', 'ไม่มีคำถามยุ่งยาก', 'แจ้งขอคืนผ่าน LINE ได้ทันที'],
      },
    },
    // 13 — FAQ (enhanced for equations)
    {
      id: 'faq-12', type: 'faq', order: 13, enabled: true,
      data: {
        title: '🔥 ถามตรง-ตอบเคลียร์!',
        subtitle: 'คำถามที่พ่อแม่ถามบ่อย — อ่านให้จบ แล้วจะตัดสินใจได้ง่ายขึ้น',
        faqs: [
          { q: '1️⃣ ลูกเกลียดเลข พื้นฐานอ่อนมาก เรียนได้ไหม?', a: 'ได้แน่นอน! คอร์สเริ่มจาก Level 1 (สมการง่ายที่สุด) ไล่ทีละสเต็ป ออกแบบมาเพื่อเด็กที่พื้นฐานยังไม่แน่นโดยเฉพาะ ไม่ต้องกลัวตามไม่ทัน' },
          { q: '2️⃣ คอร์สนี้เหมาะกับชั้นไหน?', a: 'เหมาะกับ ป.5 – ม.ต้น ที่อยากปูพื้นฐานการแก้สมการให้แน่น ก่อนต่อยอดคณิตขั้นสูงและสนามสอบเข้า ม.1' },
          { q: '3️⃣ เรียนแล้วงง ถามใครได้?', a: 'มีช่องทาง LINE สำหรับนักเรียนโดยเฉพาะ ติดตรงไหนถามได้ทุกข้อ ครูฮีมตอบเอง' },
          { q: '4️⃣ เรียนได้นานแค่ไหน?', a: 'เรียนได้ 5 ปีเต็ม ทบทวนซ้ำได้ไม่จำกัด จนกว่าจะเข้าใจและทำได้คล่อง' },
          { q: '5️⃣ ต้องใช้อุปกรณ์อะไรบ้าง?', a: 'แค่มีมือถือ แท็บเล็ต หรือคอมพิวเตอร์ + อินเทอร์เน็ต ก็เรียนได้ทันที' },
          { q: '6️⃣ สมัครแล้วเข้าเรียนได้เลยไหม?', a: 'ได้เลย! แจ้งโอนแล้วระบบจะเปิดสิทธิ์ให้เข้าเรียนภายในไม่นาน เริ่มเรียนได้ทันที' },
        ],
      },
    },
    // 14 — FINAL CTA
    {
      id: 'cta-13', type: 'cta', order: 14, enabled: true,
      data: {
        urgencyText: '🔥 ราคาพิเศษ ฿1,900 — เหลือเวลาจำกัด',
        title: 'พร้อมปั้น "เซียนสมการ" ไปด้วยกันหรือยัง? 🚀',
        subtitle: 'อย่าปล่อยให้ "สมการ" ฉุดรั้งอนาคตของลูก — สมัครวันนี้ เริ่มเรียนได้ทันที',
        ctaText: 'สมัครเรียนเลย',
        priceText: '฿1,900',
      },
    },
  ];

  // keep boosters, but make the exit-intent honest (align to the real ฿1,900/฿2,500 deal)
  const boosters = sp.boosters || {};
  if (boosters.exitIntent) {
    boosters.exitIntent = {
      ...boosters.exitIntent,
      enabled: boosters.exitIntent.enabled !== false,
      title: 'เดี๋ยวก่อน! 🛑',
      desc: 'ราคาพิเศษ ฿1,900 (จากปกติ ฿2,500) — เรียนได้ 5 ปีเต็ม + ถามครูฮีมได้ตลอด',
      discountText: 'ประหยัด ฿600 เฉพาะช่วงโปรโมชั่นเปิดคอร์ส',
      ctaText: 'สนใจเลย!',
    };
  }

  const newSalesPage = {
    enabled: true,
    theme: sp.theme || { id: 'ruby' },
    boosters,
    sections,
  };

  await ref.update({ salesPage: newSalesPage });
  console.log('✅ updated salesPage for', COURSE_ID);
  console.log('   sections:', sections.length, '· countdown ends:', end);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
