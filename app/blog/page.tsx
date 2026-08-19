import Link from "next/link";
import { listCollection } from "@/lib/firestoreRest";
import Navbar from "@/components/Navbar";
import { BookOpen, ArrowLeft } from "lucide-react";
import Image from "next/image";

// ISR: server-render + cache 5 min. The blog list only needs title/slug/
// cover — fetching here (server, cached, metadata-only) instead of the
// browser keeps every post's full `content` blob off the user's
// connection and removes the per-visit client Firestore download.
// 1 ชม. (เดิม 5 นาที) — บทความใหม่/แก้/ลบจากหน้าแอดมินยังโผล่ทันทีผ่าน
// /api/revalidate-content; ลิงก์ตรงไปบทความใหม่ ( /blog/[slug] ) ไม่เคยติดแคชอยู่แล้ว
export const revalidate = 3600;

interface Post {
    id: string;
    title: string;
    slug: string;
    coverImage: string;
    status: string;
    createdAt: string | null;
}

async function getPosts(): Promise<Post[]> {
    try {
        // Firestore REST + field mask: หน้า list ใช้แค่ title/slug/cover — ไม่ดึง
        // `content` เต็ม (หลาย ร้อยKB ต่อโพสต์) เหมือนที่ client SDK ทำ; tag ให้
        // /api/revalidate-content บัสต์ทันทีตอนแอดมินบันทึก
        // ลองซ้ำ 1 ครั้งก่อนยอมแพ้ — กันหน้า /blog ว่างถูกแช่ใน ISR ทั้งชั่วโมง
        // เพราะ REST สะดุดจังหวะเดียวตอน rebuild
        let docs;
        try {
            docs = await listCollection(
                "posts",
                ["title", "slug", "coverImage", "status", "createdAt"],
                { revalidate: 3600, tags: ["posts-feed"] }
            );
        } catch {
            await new Promise((r) => setTimeout(r, 600));
            docs = await listCollection(
                "posts",
                ["title", "slug", "coverImage", "status", "createdAt"],
                { revalidate: 3600, tags: ["posts-feed"] }
            );
        }
        return docs
            .map((d) => ({
                id: d.id,
                title: (d.title as string) || "",
                slug: (d.slug as string) || "",
                coverImage: (d.coverImage as string) || "",
                status: (d.status as string) || "",
                // REST คืน timestamp เป็น ISO string อยู่แล้ว
                createdAt: (d.createdAt as string) || null,
            } as Post))
            // เฉพาะที่เผยแพร่ (โพสต์รุ่นเก่าไม่มี field status = ถือว่าเผยแพร่)
            // และต้องมี createdAt — ตรงกับ orderBy เดิมที่ตัด doc ไม่มีฟิลด์นี้ทิ้ง
            .filter((p) => (p.status === "published" || !p.status) && p.createdAt)
            // เรียงใหม่→เก่าแบบตัวเลขเวลา — เทียบ ISO ตรงๆ พังกรณีวินาทีเดียวกัน
            // ("10:00:00Z" > "10:00:00.123Z" เพราะ '.' < 'Z' ในตาราง lexicographic)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (error) {
        console.error("Error fetching posts:", error);
        return [];
    }
}

export default async function BlogIndexPage() {
    const posts = await getPosts();

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-teal-100 selection:text-teal-900 transition-colors">
            <Navbar />

            <main className="pt-28 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Back Button */}
                    <div className="mb-6">
                        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            กลับหน้าแรก
                        </Link>
                    </div>

                    {/* Header Section */}
                    <div className="text-center mb-16 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-teal-200/20 rounded-full blur-[100px] pointer-events-none"></div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100 mb-4 relative z-10 tracking-tight">
                            สาระน่ารู้จาก <span className="text-teal-600">ครูฮีม</span> 🎓
                        </h1>
                        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto relative z-10 font-medium">
                            รวมเทคนิคคณิตศาสตร์ ข่าวสารการสอบ และเรื่องราวดีๆ ที่จะช่วยให้น้องๆ เก่งขึ้น
                        </p>
                    </div>

                    {posts.length === 0 ? (
                        <div className="text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold text-slate-400">ยังไม่มีบทความในตอนนี้</h3>
                            <p className="text-slate-400 mt-2">โปรดติดตามตอนต่อไป...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                            {posts.map((post) => (
                                <Link href={`/blog/${post.slug}`} key={post.id} className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-slate-100 dark:border-slate-800">
                                    {/* Image - Portrait */}
                                    <div className="aspect-[3/4.4] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                        {post.coverImage ? (
                                            <Image
                                                src={post.coverImage}
                                                alt={post.title}
                                                fill
                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-teal-50 dark:bg-teal-900/20 text-teal-200">
                                                <BookOpen size={48} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug line-clamp-2">
                                            {post.title}
                                        </h2>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
