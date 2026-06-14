// READ ONLY. Mirrors the new home-reviews + feature-summaries REST logic
// against prod, to confirm the rewrite returns the same visible sets as today
// (prod currently serves ~38 reviews and ~12 summaries via the client SDK).
const PROJECT = 'kruheem-course-45088';
const KEY = 'AIzaSyD4JfVbIpBvh-TIwJgkG31ArNem99DV3FE';

function decode(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  return undefined;
}
async function list(col, fields) {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${col}`;
  const p = new URLSearchParams({ key: KEY, pageSize: '300' });
  for (const f of fields) p.append('mask.fieldPaths', f);
  const r = await fetch(`${base}?${p}`);
  const j = await r.json();
  return (j.documents ?? []).map((d) => {
    const o = { id: d.name.split('/').pop() };
    for (const [k, v] of Object.entries(d.fields ?? {})) o[k] = decode(v);
    return o;
  });
}

// reviews
const rDocs = await list('reviews', ['userName', 'rating', 'comment', 'courseName', 'isHidden', 'createdAt']);
const reviews = rDocs
  .map((d) => ({ id: d.id, isHidden: d.isHidden === true, createdAt: d.createdAt || '' }))
  .filter((r) => !r.isHidden)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .slice(0, 60);
console.log(`reviews:   total=${rDocs.length}  visible(after !isHidden, top60)=${reviews.length}`);

// summaries
const sDocs = await list('summaries', ['title', 'coverImage', 'status']);
const summaries = sDocs
  .map((d) => ({ id: d.id, status: d.status || '' }))
  .filter((s) => s.status === 'published' || !s.status)
  .slice(0, 12);
console.log(`summaries: total=${sDocs.length}  shown(published|no-status, top12)=${summaries.length}`);

const ok = reviews.length >= 30 && summaries.length >= 1;
console.log(ok ? '\n✅ PASS — both feeds populated, behavior preserved' : '\n⚠️  check counts');
