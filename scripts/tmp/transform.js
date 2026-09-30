const fs = require('fs');

// Finds the unique top-level <TAG ...>...</TAG> block in `content` whose
// inner text contains `fingerprint`. Returns {full, inner, start, end, openTag}.
// Throws if not exactly one match. Handles <p> and <li> (non-nested tags).
function findBlock(content, tag, fingerprint) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, 'g');
  const matches = [...content.matchAll(re)];
  const hits = matches.filter(m => m[0].includes(fingerprint));
  if (hits.length !== 1) {
    throw new Error(`findBlock<${tag}>: expected 1 match for fingerprint, got ${hits.length}\nfingerprint: ${fingerprint}`);
  }
  return hits[0][0]; // full matched string e.g. "<p>...</p>"
}

function replaceOnce(content, oldStr, newStr, label) {
  const count = content.split(oldStr).length - 1;
  if (count !== 1) {
    throw new Error(`replaceOnce (${label || ''}): expected 1 occurrence, got ${count}\noldStr: ${oldStr.slice(0, 120)}`);
  }
  return content.replace(oldStr, newStr);
}

// Wrap an entire <p>...</p> (found via fingerprint) with a div wrapper.
function wrapP(content, fingerprint, wrapOpen, wrapClose) {
  const p = findBlock(content, 'p', fingerprint);
  return replaceOnce(content, p, `${wrapOpen}${p}${wrapClose}`, `wrapP:${fingerprint}`);
}

// Wrap a phrase inside a specific <p> (found via fingerprint) with <mark class="khb-mark">.
function markPhrase(content, fingerprint, phrase) {
  const p = findBlock(content, 'p', fingerprint);
  const count = p.split(phrase).length - 1;
  if (count !== 1) {
    throw new Error(`markPhrase: expected phrase to occur exactly once inside matched <p>, got ${count}\nfingerprint: ${fingerprint}\nphrase: ${phrase}\np: ${p}`);
  }
  const newP = p.replace(phrase, `<mark class="khb-mark">${phrase}</mark>`);
  return replaceOnce(content, p, newP, `markPhrase:${fingerprint}/${phrase}`);
}

// Wrap a <p>...</p> (found via fingerprint) as the khb-dark lead sentence:
// turns <p>TEXT</p> into <div class="khb-dark khb-dark-COLOR">\n<p class="khb-lead">TEXT</p>\n</div>
function wrapDark(content, fingerprint, color) {
  const p = findBlock(content, 'p', fingerprint);
  const inner = p.replace(/^<p>/, '').replace(/<\/p>$/, '');
  const replacement = `<div class="khb-dark khb-dark-${color}">\n<p class="khb-lead">${inner}</p>\n</div>`;
  return replaceOnce(content, p, replacement, `wrapDark:${fingerprint}`);
}

module.exports = { findBlock, replaceOnce, wrapP, markPhrase, wrapDark };
