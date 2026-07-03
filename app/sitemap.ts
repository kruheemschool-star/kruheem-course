import { MetadataRoute } from 'next'
import { listCollection, type FsDoc } from '@/lib/firestoreRest'

// Reads via the Firestore REST API with field projection (see lib/firestoreRest)
// instead of the Firebase client SDK: the client SDK is unreliable inside
// server code on Vercel (empty/partial snapshots), and projection means each
// (re)generation transfers only the few fields below instead of full documents
// (exams alone carry multi-MB `questions` arrays the sitemap never used).
// Ordering was dropped — sitemap consumers don't care about entry order — but
// the old orderBy("createdAt") also excluded docs missing createdAt, so the
// same filter is kept to emit the exact same URL set.

const toDate = (value: unknown): Date => {
    if (typeof value === 'string') {
        const d = new Date(value) // REST returns timestamps as ISO 8601 strings
        if (!isNaN(d.getTime())) return d
    }
    return new Date()
}

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
        const docs = await listCollection('posts', ['slug', 'status', 'createdAt', 'updatedAt'], { revalidate: 3600 })

        blogRoutes = docs
            .filter((d: FsDoc) => d.createdAt != null)
            .filter((d: FsDoc) => d.status === 'published' || !d.status)
            .map((d: FsDoc) => ({
                url: `${baseUrl}/blog/${d.slug}`,
                lastModified: toDate(d.updatedAt ?? d.createdAt),
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            }))
    } catch (error) {
        console.error('Error generating sitemap for blog posts:', error)
    }

    // Dynamic Exams Routes
    let examRoutes: MetadataRoute.Sitemap = []

    try {
        const docs = await listCollection('exams', ['createdAt', 'updatedAt'], { revalidate: 3600, tags: ['exams-feed'] })

        examRoutes = docs
            .filter((d: FsDoc) => d.createdAt != null)
            .map((d: FsDoc) => ({
                url: `${baseUrl}/exam/${d.id}`,
                lastModified: toDate(d.updatedAt),
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            }))
    } catch (error) {
        console.error('Error generating sitemap for exams:', error)
    }

    // Dynamic Courses Routes
    let courseRoutes: MetadataRoute.Sitemap = []

    try {
        const docs = await listCollection('courses', ['createdAt', 'updatedAt'], { revalidate: 3600 })

        courseRoutes = docs
            .filter((d: FsDoc) => d.createdAt != null)
            .map((d: FsDoc) => ({
                url: `${baseUrl}/course/${d.id}`,
                lastModified: toDate(d.updatedAt),
                changeFrequency: 'weekly' as const,
                priority: 0.9,
            }))
    } catch (error) {
        console.error('Error generating sitemap for courses:', error)
    }

    // Dynamic Summary Routes
    let summaryRoutes: MetadataRoute.Sitemap = []

    try {
        const docs = await listCollection('summaries', ['slug', 'createdAt', 'updatedAt'], { revalidate: 3600 })

        summaryRoutes = docs
            .filter((d: FsDoc) => d.createdAt != null)
            .map((d: FsDoc) => ({
                url: `${baseUrl}/summary/${d.slug || d.id}`,
                lastModified: toDate(d.updatedAt ?? d.createdAt),
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            }))
    } catch (error) {
        console.error('Error generating sitemap for summaries:', error)
    }

    return [...staticRoutes, ...courseRoutes, ...blogRoutes, ...summaryRoutes, ...examRoutes]
}
