/**
 * พื้นหลัง "สีฟุ้ง" — วงกลมเบลอ 3 วงลอยอยู่หลังเนื้อหา
 *
 * ใช้ซ้ำได้ทุกหน้า วางซ้อนบนพื้นหลังเดิมได้เลย (ลายจุด/ลายเส้นยังขึ้นผ่านมา
 * เพราะแผ่นนี้ไม่มีพื้นหลังของตัวเอง) สไตล์อยู่ที่ .kh-blobs / .kh-blob
 * ใน app/globals.css
 *
 * วิธีใช้ — วางเป็นลูกตัวแรกของกล่องหน้า แล้ว **ต้อง** ครอบเนื้อหาที่เหลือ
 * ด้วย `relative z-10` ไม่งั้นแผ่นสี (z-index: 0) จะทับตัวหนังสือ:
 *
 *   <div className="min-h-screen bg-white bg-dot-pattern">
 *       <BlobBackground />
 *       <Navbar />
 *       <div className="relative z-10">...</div>
 *   </div>
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
