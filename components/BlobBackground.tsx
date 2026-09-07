/**
 * พื้นหลัง "สีฟุ้ง" — วงกลมเบลอ 3 วงลอยอยู่หลังเนื้อหา
 *
 * ใช้ซ้ำได้ทุกหน้า วางซ้อนบนพื้นหลังเดิมได้เลย (ลายจุด/ลายเส้นยังขึ้นผ่านมา
 * เพราะแผ่นนี้ไม่มีพื้นหลังของตัวเอง) สไตล์อยู่ที่ .kh-blobs / .kh-blob
 * ใน app/globals.css
 *
 * วิธีใช้ — วางเป็นลูกตัวแรกของกล่องหน้า แล้ว **ต้อง** ครอบเนื้อหาที่เหลือ
 * ด้วย `relative` ไม่งั้นแผ่นสี (z-index: 0) จะทับตัวหนังสือ:
 *
 *   <div className="min-h-screen bg-white bg-dot-pattern">
 *       <BlobBackground />
 *       <Navbar />
 *       <div className="relative">...</div>
 *   </div>
 *
 * ⚠️ ใส่แค่ `relative` พอ **ห้ามเติม z-index** — แผ่นสีอยู่ที่ z-index: 0 ส่วน
 * เนื้อหาที่ position:relative + z-index:auto จะวาดทีหลังตามลำดับใน DOM อยู่แล้ว
 * ถ้าเผลอใส่ z-index เข้าไป กล่องเนื้อหาจะกลายเป็น stacking context ใหม่ แล้ว
 * ป๊อปอัปข้างใน (lightbox z-[60] / ฟอร์มสั่งซื้อ z-50) จะถูกขังอยู่ในนั้น
 * แล้วมุดไปอยู่ใต้แถบเมนูที่เป็น fixed z-50 ของหน้าเว็บ
 */
export default function BlobBackground() {
    return (
        <div className="kh-blobs" aria-hidden>
            <span className="kh-blob b1" />
            <span className="kh-blob b2" />
            <span className="kh-blob b3" />
        </div>
    );
}
