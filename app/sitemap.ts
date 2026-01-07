import { MetadataRoute } from 'next'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://www.kruheemmath.com'

    // Static Routes
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/my-courses`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/exam`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/register`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ]

    // Dynamic Exams Routes
    let examRoutes: MetadataRoute.Sitemap = []

    try {
        const q = query(collection(db, "exams"), orderBy("createdAt", "desc"))
        const querySnapshot = await getDocs(q)

        examRoutes = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                url: `${baseUrl}/exam/${doc.id}`,
                lastModified: data.updatedAt?.toDate() || new Date(),
                changeFrequency: 'weekly',
                priority: 0.7,
            }
        })
    } catch (error) {
        console.error("Error generating sitemap for exams:", error)
    }

    return [...staticRoutes, ...examRoutes]
}
