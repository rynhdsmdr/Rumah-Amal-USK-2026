export default function MainLoading() {
  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center p-8">
      <div className="relative flex items-center justify-center mb-5">
        <div className="w-14 h-14 rounded-full border-4 border-[#005621]/15 border-t-[#005621] animate-spin" />
        <div className="absolute w-7 h-7 rounded-full bg-[#f5b016]/20 animate-ping" />
      </div>
      <p className="text-sm font-semibold text-gray-600 tracking-wide animate-pulse">
        Memuat halaman...
      </p>
    </div>
  );
}
