# -*- coding: utf-8 -*-
"""เครื่องมือกลางสำหรับเขียนข้อใหม่แทนข้อซ้ำ

กติกา
  1. คำตอบต้องผูกกับค่าที่ SymPy แก้ได้ ห้ามพิมพ์เลขคำตอบเอง
  2. correctIndex ต้องคงตำแหน่งเดิมของข้อที่ถูกแทน (ไม่งั้นการกระจาย ก/ข/ค/ง เสีย)
  3. ตัวเลือกห้ามซ้ำ · ตัวลวงต้องมาจาก error pattern จริง
  4. โจทย์ใหม่ต้องไม่ซ้ำกับข้อใดในชุดเดิม
"""
import json, io, os, re

ITEMS = {}


def add(pos, ci, question, options, answer, errors, explanation, tags):
    """pos = เลขข้อ (เริ่ม 1) · ci = ตำแหน่งคำตอบเดิม (เริ่ม 1) · answer = ค่าที่ SymPy แก้ได้"""
    assert 1 <= ci <= 4, (pos, ci)
    assert len(options) == 4 and len(set(options)) == 4, ('ตัวเลือกซ้ำ', pos)
    assert options[ci - 1] == answer, ('คำตอบไม่ตรงตำแหน่ง ci', pos, options[ci - 1], answer)
    head = '**คำตอบ: ข้อ %d.**' % ci
    assert explanation.startswith(head), ('หัวเฉลยไม่ตรง ci', pos)
    assert len(explanation) >= 700, ('เฉลยสั้นไป %d' % len(explanation), pos)
    assert explanation.count('$$') % 2 == 0, ('$$ ไม่สมดุล', pos)
    seen = set()
    for c, _ in errors:
        assert c != ci and 1 <= c <= 4 and c not in seen, ('ตัวลวงผิด', pos, c)
        seen.add(c)
    assert len(errors) == 3, ('ตัวลวงไม่ครบ 3', pos)
    assert pos not in ITEMS, ('ข้อซ้ำในไฟล์', pos)
    ITEMS[pos] = {
        'question': question,
        'options': options,
        'correctIndex': ci - 1,
        'explanation': explanation,
        'tags': tags,
        'distractorErrors': [{'choice': c - 1, 'code': code} for c, code in errors],
    }


def dump(exam_id, path):
    out = {'examId': exam_id, 'replace': {str(k): v for k, v in sorted(ITEMS.items())}}
    json.dump(out, io.open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('เขียน %d ข้อ → %s' % (len(ITEMS), os.path.basename(path)))
