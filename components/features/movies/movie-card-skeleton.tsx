export function MovieCardSkeleton() {
  return (
    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-surface ring-1 ring-white/[0.06] animate-pulse">
      <div className="absolute inset-x-0 bottom-0 p-3 space-y-2">
        <div className="h-3.5 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  );
}