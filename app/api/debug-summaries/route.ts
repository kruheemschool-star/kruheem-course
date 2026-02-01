import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';

export async function GET() {
    try {
        const q = query(collection(db, 'summaries'));
        const snapshot = await getDocs(q);

        const summaries = snapshot.docs.map(doc => ({
            id: doc.id,
            title: doc.data().title,
            slug: doc.data().slug,
            status: doc.data().status,
            order: doc.data().order,
            category: doc.data().category,
        }));

        return NextResponse.json({
            success: true,
            count: summaries.length,
            summaries,
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: String(error),
        });
    }
}
