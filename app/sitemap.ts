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
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/exam`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/reviews`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/faq`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/how-to-apply`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/summary`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/practice`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/my-courses`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.4,
        },
        {
            url: `${baseUrl}/register`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.4,
        },
    ]

    // Dynamic Blog Post Routes
    let blogRoutes: MetadataRoute.Sitemap = []

    try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"))
        const querySnapshot = await getDocs(q)

        blogRoutes = querySnapshot.docs
            .filter(doc => {
                const status = doc.data().status;
                return status === 'published' || !status;
            })
            .map(doc => {
                const data = doc.data();
                return {
                    url: `${baseUrl}/blog/${data.slug}`,
                    lastModified: data.updatedAt?.toDate() || data.createdAt?.toDate() || new Date(),
                    changeFrequency: 'weekly' as const,
                    priority: 0.8,
                }
            })
    } catch (error) {
        console.error("Error generating sitemap for blog posts:", error)
    }

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
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            }
        })
    } catch (error) {
        console.error("Error generating sitemap for exams:", error)
    }

    // Dynamic Courses Routes
    let courseRoutes: MetadataRoute.Sitemap = []

    try {
        const q = query(collection(db, "courses"), orderBy("createdAt", "desc"))
        const querySnapshot = await getDocs(q)

        courseRoutes = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                url: `${baseUrl}/course/${doc.id}`,
                lastModified: data.updatedAt?.toDate() || new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.9,
            }
        })
    } catch (error) {
        console.error("Error generating sitemap for courses:", error)
    }

    // Dynamic Summary Routes
    let summaryRoutes: MetadataRoute.Sitemap = []

    try {
        const q = query(collection(db, "summaries"), orderBy("createdAt", "desc"))
        const querySnapshot = await getDocs(q)

        summaryRoutes = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                url: `${baseUrl}/summary/${data.slug || doc.id}`,
                lastModified: data.updatedAt?.toDate() || data.createdAt?.toDate() || new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            }
        })
    } catch (error) {
        console.error("Error generating sitemap for summaries:", error)
    }

    return [...staticRoutes, ...courseRoutes, ...blogRoutes, ...summaryRoutes, ...examRoutes]
}
