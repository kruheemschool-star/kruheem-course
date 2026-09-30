const fs = require('fs');
const path = require('path');

const files = {
  a1: 'a1-EWTj70wjWNzpplXtvYE0.html',
  a2: 'a2-WhesQXg0zxzaNRiCMGzV.html',
  a3: 'a3-782Ay0Fr2SV9ZSSLTF0F.html',
  a4: 'a4-arwbgG8yI9lS3pccW0nz.html',
};

// Very simple top-level block splitter: split on boundaries between
// <p>, <h1>, <h2>, <h3>, <hr>, <img>, <ol>, <ul>, <div> at depth 0.
function outline(html) {
  const blocks = [];
  let i = 0;
  const n = html.length;
  function readTag(pos) {
    // returns {tag, isClose, raw, end}
    const m = /^<\/?([a-zA-Z0-9]+)([^>]*)>/.exec(html.slice(pos));
    if (!m) return null;
    return { tag: m[1].toLowerCase(), isClose: html[pos+1] === '/', raw: m[0], end: pos + m[0].length };
  }
  while (i < n) {
    if (html[i] === '<') {
      const t = readTag(i);
      if (!t) { i++; continue; }
      if (['img','hr','br'].includes(t.tag)) {
        blocks.push({ type: t.tag, raw: t.raw });
        i = t.end;
        continue;
      }
      if (['p','h1','h2','h3','ol','ul','div'].includes(t.tag) && !t.isClose) {
        // find matching close tag (handle nesting for ol/ul/div, p/h can't nest same tag typically)
        let depth = 1;
        let j = t.end;
        while (j < n && depth > 0) {
          const nt = readTag(j);
          if (nt && nt.tag === t.tag) {
            if (nt.isClose) depth--;
            else depth++;
            j = nt.end;
          } else {
            j++;
          }
        }
        const inner = html.slice(t.end, j).replace(new RegExp(`</${t.tag}>$`), '');
        blocks.push({ type: t.tag, raw: t.raw, inner, full: html.slice(i, j) });
        i = j;
        continue;
      }
      i = t.end;
      continue;
    }
    i++;
  }
  return blocks;
}

function plain(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'").trim();
}

for (const [key, fname] of Object.entries(files)) {
  const html = fs.readFileSync(path.resolve('scripts/tmp', fname), 'utf8');
  const blocks = outline(html);
  console.log(`\n===== ${key} (${fname}) — ${blocks.length} top-level blocks =====`);
  blocks.forEach((b, idx) => {
    if (b.type === 'img') { console.log(`[${idx}] IMG`); return; }
    if (b.type === 'hr') { console.log(`[${idx}] HR`); return; }
    const txt = plain(b.inner || '');
    const preview = txt.length > 90 ? txt.slice(0, 90) + '…' : txt;
    const hasStrong = /<strong>/.test(b.inner||'');
    console.log(`[${idx}] <${b.type}>${hasStrong ? ' [strong]' : ''} len=${txt.length} :: ${preview}`);
  });
}
