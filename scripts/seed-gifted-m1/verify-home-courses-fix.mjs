// READ ONLY. Mirrors the new /api/home-courses logic (REST + field mask +
// decode) against the real prod project, to prove the fix yields all courses.
const PROJECT = 'kruheem-course-45088';
const KEY = 'AIzaSyD4JfVbIpBvh-TIwJgkG31ArNem99DV3FE'; // public NEXT_PUBLIC web key

function decode(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  return undefined;
}

const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/courses`;
const params = new URLSearchParams({ key: KEY, pageSize: '300' });
for (const f of ['title', 'desc', 'category', 'image', 'price', 'fullPrice']) params.append('mask.fieldPaths', f);

const res = await fetch(`${base}?${params}`);
const json = await res.json();
const docs = (json.documents ?? []).map((d) => {
  const doc = { id: d.name.split('/').pop() };
  for (const [k, v] of Object.entries(d.fields ?? {})) doc[k] = decode(v);
  return doc;
});
const courses = docs.map((d) => ({
  id: d.id,
  title: d.title || '',
  category: d.category || '',
  price: d.price ?? 0,
}));

console.log(`HTTP ${res.status} — courses returned: ${courses.length}`);
for (const c of courses.slice(0, 20)) {
  console.log(`  ฿${String(c.price).padStart(5)}  [${c.category || '-'}]  ${c.title}`);
}
console.log(courses.length >= 17 ? '\n✅ PASS — grid will be populated' : '\n❌ FAIL — still empty');
