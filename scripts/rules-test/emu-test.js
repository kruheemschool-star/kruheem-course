// Runs INSIDE `firebase emulators:exec` against a local emulator only (demo project, no network to prod).
const NM = require('path').resolve(__dirname, '../../node_modules') + '/';
const { initializeApp } = require(NM + 'firebase/app');
const F = require(NM + 'firebase/firestore');
const { getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, serverTimestamp, increment, Timestamp } = F;
const PROJECT = process.env.GCLOUD_PROJECT || 'demo-rules-test';
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
let n = 0;
function client(user) {
  const app = initializeApp({ projectId: PROJECT, apiKey: 'x' }, 'app' + (n++));
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host, Number(port), user ? { mockUserToken: { user_id: user.uid, sub: user.uid, email: user.email } } : undefined);
  return db;
}
const ADMIN = client({ uid: 'adm', email: 'kruheemschool@gmail.com' });
const STU = client({ uid: 'stu1', email: 'stu1@example.com' });
const OTHER = client({ uid: 'stu2', email: 'stu2@example.com' });
const GUEST = client(null);
const results = [];
async function t(name, expectAllow, fn) {
  let ok, err = '';
  try { await fn(); ok = true; } catch (e) { ok = false; err = e.code || e.message; }
  const pass = ok === expectAllow;
  results.push({ name, expect: expectAllow ? 'ALLOW' : 'DENY', got: ok ? 'ALLOW' : 'DENY', pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  [${ok ? 'ALLOW' : 'DENY '}] ${name}${pass ? '' : '  (expected ' + (expectAllow ? 'ALLOW' : 'DENY') + ') ' + err}`);
}
(async () => {
  // seed as admin (admin may write users/enrollments; stats counters are create-allowed)
  await setDoc(doc(STU, 'users', 'stu1'), { email: 'stu1@example.com', displayName: 'น้องหนึ่ง', phoneNumber: '0800000000' });
  const base = { userId: 'stu1', courseId: 'c1', price: 100, discountAmount: 0, finalPrice: 100 };
  await setDoc(doc(ADMIN, 'enrollments', 'eA'), { ...base, status: 'approved', lastAccessedAt: Timestamp.fromDate(new Date('2026-05-01')) });
  await setDoc(doc(ADMIN, 'enrollments', 'eP'), { ...base, status: 'pending', slipUrl: 'a' });
  await setDoc(doc(GUEST, 'stats', 'daily_visits'), { '2026-09-29': 10, device_mobile: 5 }, { merge: true }).catch(() => {});
  await setDoc(doc(GUEST, 'stats', 'page_views'), { '/': 3 }, { merge: true }).catch(() => {});
  await setDoc(doc(ADMIN, 'stats', 'daily_visits'), { '2026-09-29': 10, device_mobile: 5 }, { merge: true }).catch(() => {});
  await setDoc(doc(ADMIN, 'stats', 'page_views'), { '/': 3 }, { merge: true }).catch(() => {});

  // --- users (AuthContext / VisitorTracker / payment / admin pages) ---
  await t('U1 นักเรียนอ่านโปรไฟล์ตัวเอง', true, () => getDoc(doc(STU, 'users', 'stu1')));
  await t('U2 สมาชิกอื่นอ่านโปรไฟล์ของคนอื่น', false, () => getDoc(doc(OTHER, 'users', 'stu1')));
  await t('U3 สมาชิกดึงรายชื่อโปรไฟล์ทุกคน', false, () => getDocs(collection(OTHER, 'users')));
  await t('U4 แอดมินอ่านโปรไฟล์นักเรียน', true, () => getDoc(doc(ADMIN, 'users', 'stu1')));
  await t('U5 แอดมินดึงรายชื่อสมาชิกทุกคน (หลังบ้าน)', true, () => getDocs(collection(ADMIN, 'users')));
  await t('U6 แอดมินค้นสมาชิกที่ออนไลน์ (useAdminStats)', true, () => getDocs(query(collection(ADMIN, 'users'), where('lastActive', '>', new Date(0)))));
  await t('U7 คนไม่ล็อกอินอ่านโปรไฟล์', false, () => getDoc(doc(GUEST, 'users', 'stu1')));
  await t('U8 นักเรียนบันทึกเวลาออนไลน์ของตัวเอง (AuthContext merge)', true, () => setDoc(doc(STU, 'users', 'stu1'), { lastActive: serverTimestamp(), email: 'stu1@example.com' }, { merge: true }));
  await t('U9 นักเรียนบันทึกหน้าที่เปิด (VisitorTracker merge)', true, () => setDoc(doc(STU, 'users', 'stu1'), { currentPage: '/learn/c1', lastActive: serverTimestamp() }, { merge: true }));
  await t('U10 นักเรียนบันทึกชื่อ/เบอร์ตอนแจ้งโอน (payment merge)', true, () => setDoc(doc(STU, 'users', 'stu1'), { displayName: 'น้องหนึ่ง', phoneNumber: '0800000000' }, { merge: true }));
  await t('U11 นักเรียนอ่านความคืบหน้าของตัวเอง', true, () => getDoc(doc(STU, 'users', 'stu1', 'progress', 'c1')));
  await t('U12 สมาชิกใหม่สร้างโปรไฟล์ตัวเอง', true, () => setDoc(doc(OTHER, 'users', 'stu2'), { email: 'stu2@example.com', authProvider: 'email' }, { merge: true }));
  // --- enrollments (learn heartbeat / payment / admin) ---
  await t('E1 นักเรียนบันทึกเข้าเรียนล่าสุด (serverTimestamp) บนใบที่อนุมัติแล้ว', true, () => setDoc(doc(STU, 'enrollments', 'eA'), { lastAccessedAt: serverTimestamp() }, { merge: true }));
  await t('E2 นักเรียนปลอมเวลาเข้าเรียนล่าสุด', false, () => setDoc(doc(STU, 'enrollments', 'eA'), { lastAccessedAt: Timestamp.fromDate(new Date('2030-01-01')) }, { merge: true }));
  await t('E3 นักเรียนแก้สถานะเป็นอนุมัติเอง', false, () => updateDoc(doc(STU, 'enrollments', 'eP'), { status: 'approved' }));
  await t('E4 นักเรียนแก้เวลาเข้าเรียน + แก้ราคาพร้อมกัน', false, () => updateDoc(doc(STU, 'enrollments', 'eA'), { lastAccessedAt: serverTimestamp(), finalPrice: 0 }));
  await t('E5 สมาชิกอื่นแก้เวลาเข้าเรียนในใบของคนอื่น', false, () => setDoc(doc(OTHER, 'enrollments', 'eA'), { lastAccessedAt: serverTimestamp() }, { merge: true }));
  await t('E6 คนไม่ล็อกอินแก้เวลาเข้าเรียน', false, () => setDoc(doc(GUEST, 'enrollments', 'eA'), { lastAccessedAt: serverTimestamp() }, { merge: true }));
  await t('E7 นักเรียนแก้สลิปของใบที่ยังรออนุมัติ (payment/edit)', true, () => updateDoc(doc(STU, 'enrollments', 'eP'), { slipUrl: 'b', lastUpdated: serverTimestamp() }));
  await t('E8 แอดมินอนุมัติใบ', true, () => updateDoc(doc(ADMIN, 'enrollments', 'eP'), { status: 'approved' }));
  await t('E9 นักเรียนอ่านใบของตัวเอง', true, () => getDoc(doc(STU, 'enrollments', 'eA')));
  await t('E10 นักเรียนค้นใบของตัวเอง (where userId)', true, () => getDocs(query(collection(STU, 'enrollments'), where('userId', '==', 'stu1'))));
  await t('E11 สมาชิกอื่นอ่านใบของคนอื่น', false, () => getDoc(doc(OTHER, 'enrollments', 'eA')));
  await t('E12 นักเรียนสร้างใบแจ้งโอนใหม่ (สถานะรออนุมัติ)', true, () => setDoc(doc(STU, 'enrollments', 'eNew'), { ...base, status: 'pending', slipUrl: 'x' }));
  await t('E13 นักเรียนสร้างใบที่อนุมัติแล้วเอง', false, () => setDoc(doc(STU, 'enrollments', 'eBad'), { ...base, status: 'approved' }));
  // --- stats (VisitorTracker / examStats / videoStats / promo) ---
  await t('S1 ผู้เข้าชมเพิ่มยอดวิวรายวัน (merge + increment)', true, () => setDoc(doc(GUEST, 'stats', 'daily_visits'), { '2026-09-30': increment(1), device_mobile: increment(1) }, { merge: true }));
  await t('S2 ผู้เข้าชมเพิ่มยอดหน้าเว็บ (page_views)', true, () => setDoc(doc(GUEST, 'stats', 'page_views'), { '/exam': increment(1) }, { merge: true }));
  await t('S3 ผู้เข้าชมสร้างตัวนับคลังข้อสอบรายวัน exam_', true, () => setDoc(doc(GUEST, 'stats', 'exam_2026-09-30'), { ex1: { views: increment(1) } }, { merge: true }));
  await t('S4 ผู้เข้าชมบันทึกคลิกโปรโมชัน', true, () => setDoc(doc(GUEST, 'stats', 'promo_homepage'), { clicks: increment(1) }, { merge: true }));
  await t('S5 คนนอกเขียนทับยอดวิวจนประวัติหาย', false, () => setDoc(doc(GUEST, 'stats', 'daily_visits'), { wiped: 1 }));
  await t('S6 คนนอกลบเอกสารสถิติ', false, () => deleteDoc(doc(GUEST, 'stats', 'daily_visits')));
  await t('S7 คนนอกสร้างเอกสารขยะใน stats', false, () => setDoc(doc(GUEST, 'stats', 'junk'), { x: 1 }));
  await t('S8 คนนอกอ่านสถิติ', false, () => getDoc(doc(GUEST, 'stats', 'daily_visits')));
  await t('S9 แอดมินอ่านสถิติ (แดชบอร์ด)', true, () => getDoc(doc(ADMIN, 'stats', 'daily_visits')));
  await t('S10 แอดมินลบเอกสารสถิติ', true, () => deleteDoc(doc(ADMIN, 'stats', 'page_views')));
  const pass = results.filter(r => r.pass).length;
  console.log(`\n== ${process.env.RULES_LABEL}: ${pass}/${results.length} ตรงตามที่คาด`);
  
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
