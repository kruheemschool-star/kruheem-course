# คำแนะนำสำหรับทีม MathCraft AI: การ Auto-Tag ข้อสอบ

## 🎯 เป้าหมาย

ให้ระบบ MathCraft AI สร้างข้อสอบที่มี **tags อัตโนมัติ** จากบท (Chapter) และหัวข้อย่อย (Sub-topic) ที่ user เลือก เพื่อให้สามารถ import เข้า kruheem-course ได้ทันทีโดยไม่ต้องแก้ไข

---

## 📋 ภาพรวมระบบ

### ข้อมูลที่มีอยู่ใน MathCraft AI
```
บท (Chapter): "มุมและส่วนของเส้นตรง"
├── หัวข้อย่อย: "ทฤษฎีเส้นขนานกัน"
├── หัวข้อย่อย: "จุด เส้นตรง ส่วนของเส้นตรง รังสี"
├── หัวข้อย่อย: "มุมและการวัดมุม"
└── หัวข้อย่อย: "มุมประกอบและมุมเสริม"
```

### ข้อมูลที่ kruheem-course ต้องการ
```json
{
  "question": "...",
  "options": [...],
  "correctIndex": 0,
  "explanation": "...",
  "tags": ["มุม", "เส้นขนาน", "เรขาคณิต"]
}
```

---

## 🔧 วิธีที่ 1: Auto-Tagging จากบท/หัวข้อโดยตรง (แนะนำ)

### ขั้นตอนที่ 1: สร้าง Mapping Function

```javascript
// ฟังก์ชันแปลงบท/หัวข้อเป็น tags
function generateTagsFromSelection(chapter, subTopics, level) {
  const tags = [];
  
  // 1. เพิ่มชื่อบทเป็น tag หลัก
  if (chapter) {
    tags.push(chapter);
  }
  
  // 2. เพิ่มหัวข้อย่อยทั้งหมดที่เลือก
  if (subTopics && Array.isArray(subTopics)) {
    tags.push(...subTopics);
  }
  
  // 3. สกัดคำสำคัญจากชื่อบท/หัวข้อ
  const keywords = extractKeywords(chapter, subTopics);
  tags.push(...keywords);
  
  // 4. เพิ่ม level tag (optional)
  if (level) {
    tags.push(level);
  }
  
  // ลบ tag ซ้ำ
  return [...new Set(tags)];
}

// ฟังก์ชันสกัดคำสำคัญจากข้อความ
function extractKeywords(chapter, subTopics) {
  const keywords = [];
  const allText = [chapter, ...(subTopics || [])].join(' ');
  
  // รายการคำสำคัญที่ควรสกัด
  const importantTerms = [
    'มุม', 'เส้นตรง', 'เส้นขนาน', 'สมการ', 'ฟังก์ชัน',
    'ลำดับ', 'อนุกรม', 'สามเหลี่ยม', 'วงกลม', 'ทศนิยม',
    'เศษส่วน', 'ร้อยละ', 'อัตราส่วน', 'ตรีโกณมิติ',
    'แคลคูลัส', 'อนุพันธ์', 'ปริพันธ์', 'ความน่าจะเป็น'
  ];
  
  for (const term of importantTerms) {
    if (allText.includes(term)) {
      keywords.push(term);
    }
  }
  
  return keywords;
}
```

### ขั้นตอนที่ 2: ใช้งานใน UI

```javascript
// เมื่อ user เลือกบทและหัวข้อ
const selectedChapter = "มุมและส่วนของเส้นตรง";
const selectedSubTopics = [
  "ทฤษฎีเส้นขนานกัน",
  "มุมและการวัดมุม"
];
const selectedLevel = "ม.1";

// สร้าง tags อัตโนมัติ
const autoTags = generateTagsFromSelection(
  selectedChapter,
  selectedSubTopics,
  selectedLevel
);

console.log(autoTags);
// Output: [
//   "มุมและส่วนของเส้นตรง",
//   "ทฤษฎีเส้นขนานกัน", 
//   "มุมและการวัดมุม",
//   "มุม",
//   "เส้นขนาน",
//   "ม.1"
// ]
```

### ขั้นตอนที่ 3: ฝัง Tags ใน AI Prompt

```javascript
function buildPromptWithAutoTags(chapter, subTopics, level, numberOfQuestions) {
  // สร้าง tags อัตโนมัติ
  const tags = generateTagsFromSelection(chapter, subTopics, level);
  
  const prompt = `
สร้างข้อสอบคณิตศาสตร์ ${numberOfQuestions} ข้อ

บท: ${chapter}
หัวข้อ: ${subTopics.join(', ')}
ระดับ: ${level}

**สำคัญมาก**: ทุกข้อต้องมี field "tags" ที่มีค่าเป็น:
${JSON.stringify(tags)}

กฎการสร้างข้อสอบ:
1. เนื้อหาโจทย์ต้องเกี่ยวข้องกับหัวข้อที่ระบุ
2. ใช้คำศัพท์ที่ตรงกับ tags (เช่น "มุม", "เส้นขนาน")
3. เฉลยต้องอธิบายชัดเจนและมีคำสำคัญจาก tags

รูปแบบ JSON ที่ต้องการ:
[
  {
    "question": "โจทย์ที่เกี่ยวข้องกับ ${subTopics[0]}",
    "options": ["ก", "ข", "ค", "ง"],
    "correctIndex": 0,
    "explanation": "เฉลยละเอียด",
    "tags": ${JSON.stringify(tags)}
  }
]
`;

  return prompt;
}
```

---

## 🔄 วิธีที่ 2: Sync กับ keywords.json (Advanced)

### ขั้นตอนที่ 1: ดาวน์โหลด keywords.json

```javascript
// ดาวน์โหลดจาก kruheem-course
async function loadKruheemKeywords() {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/kruheemschool-star/kruheem-course/main/data/keywords.json'
    );
    const keywords = await response.json();
    
    // เก็บไว้ใน localStorage
    localStorage.setItem('kruheem_keywords', JSON.stringify(keywords));
    localStorage.setItem('kruheem_keywords_version', keywords.version);
    
    return keywords;
  } catch (error) {
    console.error('Failed to load keywords:', error);
    // ใช้ keywords ที่เก็บไว้ใน localStorage
    return JSON.parse(localStorage.getItem('kruheem_keywords') || '{}');
  }
}
```

### ขั้นตอนที่ 2: สร้าง Mapping ระหว่างบท/หัวข้อกับ Keywords

```javascript
// สร้าง mapping ระหว่างบท MathCraft กับ category ของ kruheem
const chapterToCategoryMapping = {
  "มุมและส่วนของเส้นตรง": "geometry",
  "ลำดับและอนุกรมเลขคณิต": "algebra",
  "สมการและอสมการ": "algebra",
  "ฟังก์ชันและกราฟ": "algebra",
  "สามเหลี่ยมและรูปเรขาคณิต": "geometry",
  "ทศนิยมและเศษส่วน": "number-system",
  "ร้อยละและอัตราส่วน": "number-system",
  "สถิติและความน่าจะเป็น": "statistics",
  "ตรีโกณมิติ": "trigonometry",
  "แคลคูลัส": "calculus"
};

// ฟังก์ชันหา keywords ที่เกี่ยวข้อง
function findRelatedKeywords(chapter, subTopics, kruheemKeywords) {
  const categoryId = chapterToCategoryMapping[chapter];
  if (!categoryId) return [];
  
  const category = kruheemKeywords.categories.find(c => c.id === categoryId);
  if (!category) return [];
  
  const relatedKeywords = [];
  const searchText = [chapter, ...(subTopics || [])].join(' ').toLowerCase();
  
  // ค้นหา keywords ที่ตรงกับบท/หัวข้อ
  for (const kw of category.keywords) {
    // เช็คว่า term หรือ aliases ตรงกับข้อความไหม
    if (searchText.includes(kw.term.toLowerCase())) {
      relatedKeywords.push(kw.term);
      continue;
    }
    
    if (kw.aliases) {
      for (const alias of kw.aliases) {
        if (searchText.includes(alias.toLowerCase())) {
          relatedKeywords.push(kw.term);
          break;
        }
      }
    }
  }
  
  return relatedKeywords;
}
```

### ขั้นตอนที่ 3: ผสม Tags จากทั้งสองแหล่ง

```javascript
async function generateSmartTags(chapter, subTopics, level) {
  const tags = [];
  
  // 1. Tags จากบท/หัวข้อโดยตรง
  tags.push(chapter);
  if (subTopics) tags.push(...subTopics);
  
  // 2. Tags จาก keywords.json ของ kruheem
  const kruheemKeywords = await loadKruheemKeywords();
  const relatedKeywords = findRelatedKeywords(chapter, subTopics, kruheemKeywords);
  tags.push(...relatedKeywords);
  
  // 3. Tags จากการสกัดคำสำคัญ
  const extractedKeywords = extractKeywords(chapter, subTopics);
  tags.push(...extractedKeywords);
  
  // 4. เพิ่ม level
  if (level) tags.push(level);
  
  // ลบ tag ซ้ำและเรียงตามความสำคัญ
  return [...new Set(tags)];
}
```

---

## 💡 ตัวอย่างการใช้งานจริง

### Scenario 1: User เลือกบท "มุมและส่วนของเส้นตรง"

```javascript
const chapter = "มุมและส่วนของเส้นตรง";
const subTopics = ["ทฤษฎีเส้นขนานกัน", "มุมและการวัดมุม"];
const level = "ม.1";

// สร้าง tags
const tags = await generateSmartTags(chapter, subTopics, level);

// สร้าง prompt
const prompt = buildPromptWithAutoTags(chapter, subTopics, level, 5);

// ส่งไป AI
const aiResponse = await callAI(prompt);

// ตรวจสอบ output
const questions = JSON.parse(aiResponse);
questions.forEach(q => {
  console.log('Question:', q.question);
  console.log('Tags:', q.tags);
  console.log('---');
});
```

### Output ที่คาดหวัง

```json
[
  {
    "question": "ถ้าเส้นตรง AB ขนานกับเส้นตรง CD และมีเส้นตัด EF ตัดทั้งสองเส้น มุมแย้งที่เกิดขึ้นมีค่าเท่ากับเท่าใด",
    "options": ["เท่ากัน", "ต่างกัน", "รวมกัน 180°", "รวมกัน 90°"],
    "correctIndex": 0,
    "explanation": "ตามทฤษฎีเส้นขนานกัน มุมแย้งที่เกิดจากเส้นตัดกับเส้นขนานจะมีค่าเท่ากัน",
    "tags": [
      "มุมและส่วนของเส้นตรง",
      "ทฤษฎีเส้นขนานกัน",
      "มุมและการวัดมุม",
      "มุม",
      "เส้นขนาน",
      "เรขาคณิต",
      "ม.1"
    ]
  }
]
```

---

## 🎨 UI/UX Recommendations

### 1. แสดง Preview ของ Tags

```javascript
// Component สำหรับแสดง tags ที่จะถูกใช้
function TagsPreview({ chapter, subTopics, level }) {
  const [tags, setTags] = useState([]);
  
  useEffect(() => {
    generateSmartTags(chapter, subTopics, level).then(setTags);
  }, [chapter, subTopics, level]);
  
  return (
    <div className="tags-preview">
      <h4>🏷️ Tags ที่จะถูกเพิ่มในข้อสอบ:</h4>
      <div className="tag-chips">
        {tags.map((tag, i) => (
          <span key={i} className="tag-chip">{tag}</span>
        ))}
      </div>
      <p className="hint">
        ข้อสอบที่สร้างจะสามารถ import เข้า kruheem-course ได้ทันทีด้วย tags เหล่านี้
      </p>
    </div>
  );
}
```

### 2. Validation ก่อนส่งไป AI

```javascript
function validateBeforeGenerate(chapter, subTopics) {
  if (!chapter) {
    alert('❌ กรุณาเลือกบท');
    return false;
  }
  
  if (!subTopics || subTopics.length === 0) {
    alert('❌ กรุณาเลือกหัวข้อย่อยอย่างน้อย 1 หัวข้อ');
    return false;
  }
  
  return true;
}
```

### 3. Post-Processing หลัง AI Generate

```javascript
function ensureTagsInOutput(questions, expectedTags) {
  return questions.map(q => {
    // ถ้าไม่มี tags หรือ tags ไม่ครบ ให้เพิ่มให้
    if (!q.tags || !Array.isArray(q.tags)) {
      q.tags = expectedTags;
    } else {
      // เพิ่ม tags ที่ขาดหายไป
      const missingTags = expectedTags.filter(t => !q.tags.includes(t));
      q.tags = [...q.tags, ...missingTags];
    }
    
    return q;
  });
}

// ใช้งาน
const rawQuestions = JSON.parse(aiResponse);
const validatedQuestions = ensureTagsInOutput(rawQuestions, expectedTags);
```

---

## ✅ Checklist สำหรับ Implementation

### Phase 1: Basic Auto-Tagging
- [ ] สร้างฟังก์ชัน `generateTagsFromSelection()`
- [ ] สร้างฟังก์ชัน `extractKeywords()`
- [ ] ปรับ prompt template ให้ฝัง tags อัตโนมัติ
- [ ] เพิ่ม UI แสดง preview ของ tags
- [ ] ทดสอบกับบท/หัวข้อต่างๆ

### Phase 2: Sync กับ kruheem-course
- [ ] ดาวน์โหลด keywords.json จาก GitHub
- [ ] สร้าง mapping ระหว่างบท MathCraft กับ category ของ kruheem
- [ ] สร้างฟังก์ชัน `findRelatedKeywords()`
- [ ] ผสม tags จากทั้งสองแหล่ง
- [ ] ทดสอบ import ใน kruheem-course

### Phase 3: Validation & Quality
- [ ] เพิ่ม validation ตรวจสอบ tags ใน output
- [ ] สร้าง post-processing เพิ่ม tags ที่ขาดหายไป
- [ ] เพิ่มสถิติ: tags ไหนถูกใช้บ่อย
- [ ] ปรับปรุง keyword extraction ให้แม่นยำขึ้น

---

## 🔍 ตัวอย่าง Mapping ที่แนะนำ

### บท → Category

| บท MathCraft AI | Category kruheem | Keywords หลัก |
|-----------------|------------------|---------------|
| มุมและส่วนของเส้นตรง | geometry | มุม, เส้นตรง, เส้นขนาน |
| ลำดับและอนุกรมเลขคณิต | algebra | ลำดับ, อนุกรม, ลำดับเลขคณิต |
| สมการและอสมการ | algebra | สมการ, อสมการ, สมการเชิงเส้น |
| ทศนิยมและเศษส่วน | number-system | ทศนิยม, เศษส่วน |
| สถิติและกราฟ | statistics | ค่าเฉลี่ย, มัธยฐาน, แผนภูมิ |
| ตรีโกณมิติ | trigonometry | sin, cos, tan, ตรีโกณมิติ |

---

## 📞 Support & Testing

### ทดสอบการ Import

1. สร้างข้อสอบใน MathCraft AI
2. Export เป็น JSON
3. Import ใน kruheem-course admin panel
4. ตรวจสอบว่า tags ถูกตรวจจับอัตโนมัติหรือไม่

### ตัวอย่าง Test Case

```javascript
// Test Case 1: บท "มุมและส่วนของเส้นตรง"
const test1 = {
  chapter: "มุมและส่วนของเส้นตรง",
  subTopics: ["ทฤษฎีเส้นขนานกัน"],
  level: "ม.1"
};

const tags1 = await generateSmartTags(test1.chapter, test1.subTopics, test1.level);
console.assert(tags1.includes("มุม"), "ต้องมี tag 'มุม'");
console.assert(tags1.includes("เส้นขนาน"), "ต้องมี tag 'เส้นขนาน'");
```

---

**อัปเดตล่าสุด**: 2026-03-20  
**Version**: 1.0  
**ผู้รับผิดชอบ**: ทีม MathCraft AI
