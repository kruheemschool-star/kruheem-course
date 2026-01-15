import { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import Link from 'next/link';

interface ActivityItem {
    id: string;
    type: 'lesson_complete' | 'course_start' | 'login' | 'enrollment';
    userName: string;
    timestamp: Date;
    description: string;
}

export default function RecentActivityWidget() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                // Fetch recent enrollments as a proxy for interesting activity
                const q = query(collection(db, "enrollments"), orderBy("approvedAt", "desc"), limit(5));
                const snap = await getDocs(q);

                const items: ActivityItem[] = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'approved') {
                        items.push({
                            id: doc.id,
                            type: 'enrollment',
                            userName: data.userName || data.userEmail,
                            timestamp: data.approvedAt?.toDate() || new Date(),
                            description: `ลงทะเบียนคอร์ส ${data.courseTitle}`
                        });
                    }
                });
                setActivities(items);
            } catch (err) {
                console.error("Error fetching recent activity", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecent();
    }, []);

    if (loading) return <div className="animate-pulse h-40 bg-slate-50 rounded-3xl"></div>;

    if (activities.length === 0) return null;

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800">🚀 กิจกรรมล่าสุด</h3>
                <Link href="/admin/activity" className="text-sm text-indigo-500 hover:text-indigo-700">
                    ดูทั้งหมด →
                </Link>
            </div>
            <div className="space-y-4">
                {activities.map(item => (
                    <div key={item.id} className="flex items-start gap-3 text-sm">
                        <div className="mt-1">
                            {item.type === 'enrollment' && '💰'}
                            {item.type === 'login' && '🔑'}
                        </div>
                        <div>
                            <p className="font-bold text-slate-700">{item.userName}</p>
                            <p className="text-slate-500 text-xs">{item.description}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5">
                                {item.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
