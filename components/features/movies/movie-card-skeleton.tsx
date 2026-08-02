export function MovieCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden glass animate-pulse">
      <div className="aspect-[2/3] bg-white/5" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  );
}