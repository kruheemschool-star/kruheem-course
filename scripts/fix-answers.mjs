// Quick script to scan and fix correctIndex mismatches via the local API
const BASE = 'http://localhost:3000/api/fix-exam-answers';

console.log('🔍 Scanning all exams...');
const scanRes = await fetch(BASE);
const scan = await scanRes.json();
console.log(`Total exams: ${scan.totalExams}`);
console.log(`Total questions: ${scan.totalQuestions}`);
console.log(`Checked (has explanation): ${scan.checked}`);
console.log(`Mismatches found: ${scan.mismatches}`);

if (scan.details && scan.details.length > 0) {
    console.log('\n📋 Mismatches:');
    scan.details.forEach(d => {
        console.log(`  ${d.exam} | ข้อ ${d.question}: ระบบ=ข้อ ${d.stored} → เฉลย=ข้อ ${d.explained} | ${d.text}`);
    });

    console.log('\n🔧 Fixing all mismatches...');
    const fixRes = await fetch(BASE, { method: 'POST' });
    const fix = await fixRes.json();
    console.log(`✅ Fixed: ${fix.totalFixed} questions`);
    fix.fixes?.forEach(f => {
        console.log(`  ${f.exam} | ข้อ ${f.question}: ข้อ ${f.old} → ข้อ ${f.new}`);
    });
} else {
    console.log('✅ No mismatches found!');
}
