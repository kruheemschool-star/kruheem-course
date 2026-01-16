import Navbar from "@/components/Navbar";

export default function SummaryDetailLoading() {
    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />

            <main className="pt-28 pb-20 px-6">
                <article className="max-w-3xl mx-auto">
                    {/* Breadcrumb skeleton */}
                    <div className="flex items-center gap-2 mb-8 animate-pulse">
                        <div className="w-24 h-4 bg-slate-200 rounded" />
                        <span className="text-slate-300">/</span>
                        <div className="w-48 h-4 bg-slate-200 rounded" />
                    </div>

                    {/* Header skeleton */}
                    <header className="mb-16 pb-10 border-b border-slate-100 relative animate-pulse">
                        {/* Background accent */}
                        <div className="absolute -left-6 -right-6 -top-6 bottom-0 bg-gradient-to-b from-slate-50/80 to-transparent rounded-3xl -z-10" />

                        {/* Meta tags skeleton */}
                        <div className="flex items-center gap-3 mb-6 flex-wrap">
                            <div className="w-16 h-7 bg-slate-800 rounded-full" />
                            <div className="w-24 h-7 bg-slate-200 rounded-full" />
                            <div className="w-20 h-6 bg-teal-100 rounded-full" />
                            <div className="w-16 h-6 bg-teal-100 rounded-full" />
                        </div>

                        {/* Title skeleton - multiple lines */}
                        <div className="space-y-4 mb-6">
                            <div className="w-full h-12 bg-slate-200 rounded-xl" />
                            <div className="w-4/5 h-12 bg-slate-200 rounded-xl" />
                            <div className="w-2/3 h-12 bg-slate-100 rounded-xl" />
                        </div>

                        {/* Subtitle skeleton */}
                        <div className="space-y-3">
                            <div className="w-full h-6 bg-slate-100 rounded-lg" />
                            <div className="w-3/4 h-6 bg-slate-100 rounded-lg" />
                        </div>
                    </header>

                    {/* Content skeleton */}
                    <div className="space-y-8 animate-pulse">
                        {/* Header block */}
                        <div className="mt-14 mb-8">
                            <div className="flex items-center gap-3 border-l-4 border-slate-300 pl-5 py-2">
                                <div className="w-8 h-8 bg-slate-200 rounded" />
                                <div className="w-64 h-8 bg-slate-200 rounded-xl" />
                            </div>
                        </div>

                        {/* Definition block */}
                        <div className="my-6 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 bg-slate-200 rounded shrink-0" />
                                <div className="flex-1 space-y-3">
                                    <div className="w-48 h-6 bg-slate-200 rounded" />
                                    <div className="w-full h-4 bg-slate-100 rounded" />
                                    <div className="w-4/5 h-4 bg-slate-100 rounded" />
                                    <div className="w-3/4 h-4 bg-slate-100 rounded" />
                                </div>
                            </div>
                        </div>

                        {/* Formula block */}
                        <div className="my-6 py-6 px-5 bg-white rounded-xl border border-slate-100 text-center">
                            <div className="w-32 h-6 bg-slate-200 rounded mx-auto mb-4" />
                            <div className="w-64 h-8 bg-slate-100 rounded-xl mx-auto" />
                        </div>

                        {/* Example block */}
                        <div className="my-6 pl-4 border-l-2 border-slate-200 py-1 space-y-3">
                            <div className="w-32 h-6 bg-slate-200 rounded" />
                            <div className="w-full h-4 bg-slate-100 rounded" />
                            <div className="w-5/6 h-4 bg-slate-100 rounded" />
                        </div>

                        {/* Image placeholder */}
                        <div className="my-8">
                            <div className="w-full h-64 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                                <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Loading indicator */}
                    <div className="flex items-center justify-center gap-2 text-slate-500 mt-12">
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <span className="text-sm font-medium">กำลังโหลดเนื้อหา...</span>
                    </div>
                </article>
            </main>
        </div>
    );
}
