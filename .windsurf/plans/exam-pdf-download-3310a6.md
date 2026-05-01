# แผน: ดาวน์โหลดข้อสอบเป็น PDF (html2canvas + jsPDF)

แทนที่ปุ่ม "พิมพ์" ด้วยปุ่ม "ดาวน์โหลด PDF" 2 ชุด (โจทย์ / เฉลย) โดยใช้ html2canvas แคป DOM จากหน้า Print แล้วสร้างไฟล์ PDF ด้วย jsPDF + font ไทย

---

## 1. ติดตั้ง dependency

```bash
npm install jspdf
```

## 2. เตรียม font ไทย (TH Sarabun)

- โหลด `THSarabunNew.ttf` ไว้ใน `public/fonts/`
- แปลงเป็น base64 ไว้ใน `lib/fonts/thSarabunBase64.ts`
- jsPDF embed ผ่าน `addFileToVFS()` + `addFont()`

## 3. สร้าง `lib/generateExamPdf.ts`

ฟังก์ชันรับ `(elementId, mode, title)`:
1. `html2canvas(element, { scale: 2 })` → canvas
2. สร้าง `jsPDF('p', 'mm', 'a4')`
3. Embed font TH Sarabun
4. แบ่ง canvas เป็น pages ตามความสูง A4
5. เพิ่ม header/footer ทุกหน้า
6. exam mode → ช่อง "ชื่อ: ________ ชั้น: ________"
7. answer mode → grid เฉลยเร็วหน้าแรก
8. `doc.save(`${title}-${mode}.pdf`)`

## 4. แก้ `components/exam/ExamPrintButton.tsx`

แทนที่ dropdown print ด้วย dropdown download:
- 📄 โจทย์ข้อสอบ → เปิด `/exam/[id]/print?mode=exam&download=1`
- 📋 เฉลยพร้อมคำอธิบาย → เปิด `/exam/[id]/print?mode=answer&download=1`

## 5. แก้ `app/exam/[id]/print/PrintPageClient.tsx`

- Detect `download=1` → ซ่อน controls bar, แสดง loading spinner
- Auto-trigger `generateExamPdf()` เมื่อ DOM render เสร็จ
- แสดง progress "กำลังสร้าง PDF..."
- PDF เสร็จ → แสดง "ดาวน์โหลดเสร็จแล้ว" + ปุ่มปิด tab

---

**ความเสี่ยง:** Font ไทยต้อง convert base64 (ขนาด ~200KB) หรือ load จาก public URL ซึ่งอาจมี CORS issue กับ html2canvas — แนะนำ inline base64 ใน .ts file

**ประมาณการ token:** ไฟล์ utility (~150 บรรทัด) + แก้ 2 ไฟล์เดิม (~50 บรรทัด)
