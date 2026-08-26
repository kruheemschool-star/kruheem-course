# -*- coding: utf-8 -*-
"""หาไฟล์ต้นฉบับบนดิสก์ที่ตรงกับชุดบนเว็บ แล้วดูว่ามี tag ระดับ/ทักษะ ที่เว็บไม่มีไหม"""
import json, io, os, re, sys
from collections import Counter

LV = ['ง่าย', 'กลาง', 'ยาก', 'ยากมาก']
SK = ['คิดเลข', 'เข้าใจ', 'แปลโจทย์']
ROOT = os.path.expanduser('~/Documents/workspace')
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'[^\w฀-๿]', '', str(s)))[:70]

# ทำดัชนีไฟล์บนดิสก์
disk = []
for dp, dn, fn in os.walk(ROOT):
    dn[:] = [d for d in dn if d not in ('node_modules', '.git', '__pycache__')]
    for f in fn:
        if not f.endswith('.json'):
            continue
        p = os.path.join(dp, f)
        try:
            if os.path.getsize(p) < 20000:
                continue
            d = json.load(io.open(p, encoding='utf-8'))
        except Exception:
            continue
        qs = d if isinstance(d, list) else (d.get('questions') if isinstance(d, dict) else None)
        if not isinstance(qs, list) or len(qs) < 20 or not isinstance(qs[0], dict):
            continue
        if 'question' not in qs[0]:
            continue
        lv = sum(1 for q in qs if any(t in LV for t in (q.get('tags') or [])))
        sk = sum(1 for q in qs if any(t in SK for t in (q.get('tags') or [])))
        disk.append({'path': p, 'n': len(qs), 'lv': lv, 'sk': sk,
                     'keys': {norm(q.get('question')) for q in qs}, 'qs': qs})
print('ไฟล์บนดิสก์ที่เป็นชุดข้อสอบ: %d' % len(disk), file=sys.stderr)

U = json.load(io.open('unlabeled.json', encoding='utf-8'))
hits = []
for s in U:
    keys = {norm(r['question']) for r in s['rows']}
    best, bs = None, 0
    for d in disk:
        ov = len(keys & d['keys'])
        if ov > bs:
            best, bs = d, ov
    if best and bs >= max(10, len(keys) * 0.5):
        hits.append((s, best, bs / len(keys)))

print('\n══ ชุดบนเว็บที่หาไฟล์ต้นฉบับเจอ ══')
usable = 0
for s, d, cov in sorted(hits, key=lambda t: -t[1]['lv']):
    tag = 'มี tag ครบ ✅' if d['lv'] == d['n'] and d['sk'] == d['n'] else (
        f"tag ระดับ {d['lv']}/{d['n']} ทักษะ {d['sk']}/{d['n']}" if d['lv'] or d['sk'] else 'ไม่มี tag เหมือนกัน')
    if d['lv'] == d['n'] and d['sk'] == d['n']:
        usable += s['n']
    print(f"  [{s['cat']:>7s}] {s['title'][:34]:36s} {s['n']:>3d} ข้อ · ตรงกัน {cov*100:.0f}% · {tag}")
    print(f"      {os.path.relpath(d['path'], ROOT)}")
print(f"\nชุดที่ดึง tag จากดิสก์มาใช้ได้เลย: {usable} ข้อ · หาไฟล์ไม่เจอ {len(U)-len(hits)} ชุด")
