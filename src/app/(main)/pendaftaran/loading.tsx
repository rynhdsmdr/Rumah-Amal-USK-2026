export default function PendaftaranLoading() {
  return (
    <div className="min-h-screen bg-gray-50/60 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-[1280px] mx-auto space-y-10">
        {/* HERO SKELETON */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#063A1E]/80 to-[#0b6330]/80 p-8 sm:p-12 shadow-xl animate-pulse">
          <div className="max-w-2xl space-y-4">
            <div className="h-6 w-48 bg-white/20 rounded-full" />
            <div className="h-10 w-96 max-w-full bg-white/30 rounded-xl" />
            <div className="h-4 w-80 max-w-full bg-white/20 rounded-lg" />
          </div>
        </div>

        {/* SEARCH & FILTER SKELETON */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="h-12 w-full sm:w-96 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-6 w-40 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* GRID CARDS SKELETON */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-9 w-28 bg-gray-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
