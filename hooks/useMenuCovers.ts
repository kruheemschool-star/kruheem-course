import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface MenuCovers {
    [key: string]: string | null;
}

export function useMenuCovers() {
    const [covers, setCovers] = useState<MenuCovers>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCovers = async () => {
            try {
                const docRef = doc(db, 'settings', 'admin_menu');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCovers(docSnap.data()?.covers || {});
                } else {
                    setCovers({});
                }
            } catch (error) {
                console.error('Error fetching menu covers:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCovers();
    }, []);

    return { covers, loading };
}
