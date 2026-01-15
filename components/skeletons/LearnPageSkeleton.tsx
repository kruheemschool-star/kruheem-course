'use client';

export function LearnPageSkeleton() {
    return (
        <div className="h-[100dvh] bg-[#F3F4F6] font-sans flex overflow-hidden">
            {/* Sidebar Skeleton */}
            <aside className="w-80 bg-white border-r border-gray-200 flex-shrink-0 h-full hidden md:flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-5 pb-4 border-b border-gray-100 flex flex-col items-center">
                    {/* Back Button Skeleton */}
                    <div className="w-full h-12 bg-gray-100 rounded-2xl animate-pulse mb-4"></div>

                    {/* Course Thumbnail */}
                    <div className="w-4/5 aspect-video rounded-xl bg-gray-200 animate-pulse mb-3"></div>

                    {/* Course Title */}
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                </div>

                {/* Progress Bar */}
                <div className="px-5 pt-4">
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full w-1/4 bg-gray-200 animate-pulse"></div>
                    </div>
                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mt-1 ml-auto"></div>
                </div>

                {/* Document Button Skeleton */}
                <div className="px-5 mt-4">
                    <div className="h-10 w-full bg-blue-50 rounded-xl animate-pulse"></div>
                </div>

                {/* Exam Section Skeleton */}
                <div className="px-5 mt-6">
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-5 border border-indigo-100">
                        <div className="h-5 w-32 bg-indigo-200/50 rounded animate-pulse mb-4"></div>
                        <div className="space-y-2">
                            <div className="h-10 bg-white/60 rounded-xl animate-pulse"></div>
                            <div className="h-10 bg-white/60 rounded-xl animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* Lesson List Skeleton */}
                <div className="flex-1 overflow-hidden mt-6 border-t border-gray-100">
                    {[1, 2, 3].map((section) => (
                        <div key={section} className="border-b border-gray-50">
                            {/* Section Header */}
                            <div className="p-4 flex items-center justify-between">
                                <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-4 w-4 bg-gray-100 rounded animate-pulse"></div>
                            </div>

                            {/* Lesson Items */}
                            <div className="px-6 pb-4 space-y-2">
                                {[1, 2, 3].map((item) => (
                                    <div key={item} className="flex items-center gap-3 py-2">
                                        <div className="w-4 h-4 rounded-full bg-gray-200 animate-pulse"></div>
                                        <div className="flex-1">
                                            <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse mb-1"></div>
                                            <div className="h-3 w-16 bg-gray-50 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content Skeleton */}
            <main className="flex-1 flex flex-col bg-white min-w-0">
                {/* Header */}
                <header className="h-16 md:h-20 bg-white border-b border-gray-100 flex justify-between items-center px-4 md:px-10">
                    <div className="flex items-center gap-3">
                        {/* Mobile menu button skeleton */}
                        <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse md:hidden"></div>

                        <div>
                            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mb-2"></div>
                            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:block h-10 w-44 bg-gray-100 rounded-full animate-pulse"></div>
                        <div className="h-10 w-36 bg-emerald-50 rounded-full animate-pulse"></div>
                    </div>
                </header>

                {/* Video Area Skeleton */}
                <div className="flex-1 bg-[#F9FAFB] flex items-center justify-center">
                    <div className="w-full max-w-4xl aspect-video bg-gray-900/10 rounded-xl animate-pulse flex items-center justify-center">
                        <div className="w-20 h-20 bg-gray-300/50 rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-l-[20px] border-l-gray-400/50 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-2"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
