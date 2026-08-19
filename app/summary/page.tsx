import { Metadata } from 'next';
import { listCollection } from '@/lib/firestoreRest';
import Navbar from '@/components/Navbar';
import { BookOpen } from 'lucide-react';
import SummaryGrid from '@/components/SummaryGrid';

export const metadata: Metadata = {
    title: 'สรุปสูตร & เนื้อหาคณิตศาสตร์ (Math Quick Review) | Kruheem.com',
    description: 'รวมสรุปสูตรคณิตศาสตร์ ม.ต้น - ม.ปลาย อ่านทบทวนก่อนสอบ Short Note เข้าใจง่าย เน้นจุดสำคัญที่ออกสอบบ่อย',
    keywords: ['สรุปสูตรคณิต', 'ชีทสรุป', 'Short Note คณิต', 'ทบทวนก่อนสอบ', 'Kruheem'],
};

// ISR: 1 ชม. — เดิม 5 นาที = อ่าน summaries ทั้งชุด (รวมเนื้อหาเต็ม) สูงสุด 288 รอบ/วัน
// สรุปที่เพิ่ม/แก้/ลบยังโผล่ทันที: หน้าแอดมินยิง /api/revalidate-content หลังบันทึก
export const revalidate = 3600;

interface Summary {
    id: string;
    title: string;
    slug: string;
    order: number;
    status?: string;
    excerpt?: string;
    meta_description?: string;
    coverImage?: string;
    category?: string;
    readingTime?: number;
    viewCount?: number;
}

async function getSummaries(): Promise<Summary[]> {
    try {
        // อ่านผ่าน Firestore REST + field mask — โปรเจกต์เฉพาะฟิลด์การ์ด ไม่ดึง
        // เนื้อหาเต็ม (content หลาย KB ต่อบท ไม่ได้ใช้ในหน้า list) และติด tag
        // ให้ /api/revalidate-content บัสต์ทันทีตอนแอดมินบันทึก
        // ลองซ้ำ 1 ครั้งก่อนยอมแพ้ — ถ้าคืน [] เพราะเน็ตสะดุดชั่วคราว หน้า "ว่าง"
        // จะถูกแช่ใน ISR นานถึง 1 ชม. (เดิม TTL 5 นาทีความเสี่ยงนี้เล็กกว่ามาก)
        let docs;
        try {
            docs = await listCollection(
                'summaries',
                [
                    'title', 'slug', 'order', 'status', 'excerpt', 'meta_description',
                    'coverImage', 'category', 'readingTime', 'viewCount',
                ],
                { revalidate: 3600, tags: ['summaries-feed'] }
            );
        } catch {
            await new Promise((r) => setTimeout(r, 600));
            docs = await listCollection(
                'summaries',
                [
                    'title', 'slug', 'order', 'status', 'excerpt', 'meta_description',
                    'coverImage', 'category', 'readingTime', 'viewCount',
                ],
                { revalidate: 3600, tags: ['summaries-feed'] }
            );
        }

        return docs
            .filter((d) => (d.status as string) === 'published')
            .map((d) => ({
                id: d.id,
                title: (d.title as string) || '',
                slug: (d.slug as string) || '',
                order: (d.order as number | undefined) ?? 0,
                status: (d.status as string) || '',
                excerpt: (d.excerpt as string) || '',
                meta_description: (d.meta_description as string) || '',
                coverImage: (d.coverImage as string) || '',
                category: (d.category as string) || '',
                readingTime: (d.readingTime as number | undefined) ?? 0,
                viewCount: (d.viewCount as number | undefined) ?? 0,
            } as Summary))
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
        console.error('Error fetching summaries:', error);
        return [];
    }
}

export default async function SummaryHomePage() {
    const summaries = await getSummaries();

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans transition-colors">
            <Navbar />

            <main className="pt-28 pb-20 px-6">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-white text-slate-600 px-4 py-2 rounded-full text-sm font-bold mb-6 shadow-sm">
                            <BookOpen size={16} />
                            สรุปเนื้อหา
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 leading-tight mb-4">
                            📚 คลังสรุปเนื้อหา & สูตรคณิตศาสตร์
                        </h1>
                        <p className="text-slate-500 text-lg max-w-xl mx-auto">
                            สรุปเนื้อหาคณิตศาสตร์แบบเข้าใจง่าย พร้อมสูตรและตัวอย่าง
                        </p>
                    </div>

                    {/* Summary Grid with Search & Filter */}
                    <SummaryGrid summaries={summaries} />
                </div>
            </main>
        </div>
    );
}
