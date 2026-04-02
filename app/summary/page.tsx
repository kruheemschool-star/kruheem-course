import { Metadata } from 'next';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import Navbar from '@/components/Navbar';
import { BookOpen } from 'lucide-react';
import SummaryGrid from '@/components/SummaryGrid';

export const metadata: Metadata = {
    title: 'สรุปสูตร & เนื้อหาคณิตศาสตร์ (Math Quick Review) | Kruheem.com',
    description: 'รวมสรุปสูตรคณิตศาสตร์ ม.ต้น - ม.ปลาย อ่านทบทวนก่อนสอบ Short Note เข้าใจง่าย เน้นจุดสำคัญที่ออกสอบบ่อย',
    keywords: ['สรุปสูตรคณิต', 'ชีทสรุป', 'Short Note คณิต', 'ทบทวนก่อนสอบ', 'Kruheem'],
};

// ISR: Cache for 5 minutes, new summaries appear within 5 min
export const revalidate = 300;

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
        // Optimized query: filter at Firestore level + order by 'order' field
        const q = query(
            collection(db, 'summaries'),
            where('status', '==', 'published'),
            orderBy('order', 'asc')
        );
        const snapshot = await getDocs(q);

        // Map to plain objects (no client-side filtering needed)
        return snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                title: d.title || '',
                slug: d.slug || '',
                order: d.order || 0,
                status: d.status || '',
                excerpt: d.excerpt || '',
                meta_description: d.meta_description || '',
                coverImage: d.coverImage || '',
                category: d.category || '',
                readingTime: d.readingTime || 0,
                viewCount: d.viewCount || 0,
            } as Summary;
        });
    } catch (error) {
        console.error('Error fetching summaries:', error);
        // Fallback: try without orderBy in case index doesn't exist
        try {
            const fallbackQuery = query(collection(db, 'summaries'));
            const snapshot = await getDocs(fallbackQuery);
            return snapshot.docs
                .map(doc => {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        title: d.title || '',
                        slug: d.slug || '',
                        order: d.order || 0,
                        status: d.status || '',
                        excerpt: d.excerpt || '',
                        meta_description: d.meta_description || '',
                        coverImage: d.coverImage || '',
                        category: d.category || '',
                        readingTime: d.readingTime || 0,
                        viewCount: d.viewCount || 0,
                    } as Summary;
                })
                .filter(s => s.status === 'published')
                .sort((a, b) => (a.order || 0) - (b.order || 0));
        } catch (fallbackError) {
            console.error('Fallback query also failed:', fallbackError);
            return [];
        }
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
