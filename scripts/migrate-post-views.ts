import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migratePostViews() {
    console.log('🚀 Starting migration: Adding views field to posts...\n');

    try {
        const postsRef = collection(db, 'posts');
        const snapshot = await getDocs(postsRef);

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data();
            const postId = docSnapshot.id;

            // Check if views field exists
            if (data.views === undefined) {
                try {
                    await updateDoc(doc(db, 'posts', postId), {
                        views: 0
                    });
                    console.log(`✅ Updated post: ${data.title || postId} - Added views: 0`);
                    updatedCount++;
                } catch (error) {
                    console.error(`❌ Error updating post ${postId}:`, error);
                    errorCount++;
                }
            } else {
                console.log(`⏭️  Skipped post: ${data.title || postId} - Already has views: ${data.views}`);
                skippedCount++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   Total posts: ${snapshot.docs.length}`);
        console.log(`   ✅ Updated: ${updatedCount}`);
        console.log(`   ⏭️  Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log('\n✨ Migration completed!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migratePostViews();
