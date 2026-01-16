import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface MenuCovers {
    [key: string]: string | null;
}

export function useMenuCovers() {
    const [covers, setCovers] = useState<MenuCovers>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, 'settings', 'admin_menu'),
            (docSnap) => {
                if (docSnap.exists()) {
                    setCovers(docSnap.data()?.covers || {});
                } else {
                    setCovers({});
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching menu covers:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return { covers, loading };
}
