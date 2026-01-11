
import Navbar from "@/components/Navbar";

export default function Loading() {
    return (
        <div className="min-h-screen bg-[#FDFCF8] font-sans flex flex-col">
            <Navbar />

            <div className="pt-24 pb-12">
                <div className="px-6 py-8 relative">
                    {/* Header Skeleton */}
                    <div className="max-w-4xl mx-auto text-center mb-8 animate-pulse">
                        <div className="h-10 bg-slate-200 rounded-full w-64 mx-auto mb-4"></div>
                        <div className="h-6 bg-slate-100 rounded-full w-96 mx-auto"></div>
                    </div>

                    {/* Search Bar Skeleton */}
                    <div className="max-w-2xl mx-auto mb-8 animate-pulse">
                        <div className="h-16 bg-slate-200 rounded-2xl w-full"></div>
                    </div>

                    {/* Categories Skeleton */}
                    <div className="flex flex-wrap gap-2 mb-10 justify-center animate-pulse">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-10 w-24 bg-slate-200 rounded-full"></div>
                        ))}
                    </div>

                    {/* Grid Skeleton */}
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <div key={i} className="aspect-[3/4] bg-slate-200 rounded-2xl animate-pulse flex flex-col justify-end p-6">
                                    <div className="space-y-3">
                                        <div className="h-8 bg-slate-300 rounded w-3/4"></div>
                                        <div className="h-4 bg-slate-300 rounded w-full"></div>
                                        <div className="h-4 bg-slate-300 rounded w-2/3"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
