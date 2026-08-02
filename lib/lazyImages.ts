// เนื้อหาบทความโหมด HTML (post.content / summary.htmlContent) ถูกเรนเดอร์ผ่าน
// dangerouslySetInnerHTML — รูปสไลด์ในเนื้อหา (บางบทความมี 10+ รูป) จึงไม่ผ่าน
// next/image และถูกโหลดพร้อมกันทั้งหมดตั้งแต่เปิดหน้า ตัวช่วยนี้แทรก
// loading="lazy" + decoding="async" ให้ <img> ทุกแท็กที่ยังไม่มี เพื่อให้
// เบราว์เซอร์โหลดเฉพาะรูปที่เลื่อนถึงจริง (ตัด bandwidth ก้อนใหญ่ต่อวิว)
export function addLazyLoadingToImages(html: string | undefined | null): string {
    if (!html) return "";
    return html.replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async" ');
}
