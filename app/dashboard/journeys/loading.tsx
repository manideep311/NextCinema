/** Journey-card-shaped skeletons — the catalog can take a few seconds to build the very first time. */
export default function JourneysLoading() {
  return (
    <div aria-busy="true" aria-label="Loading journeys">
      <div className="h-9 w-56 bg-surface rounded animate-pulse mb-2" />
      <div className="h-4 w-80 bg-surface/70 rounded animate-pulse mb-10" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg overflow-hidden bg-surface ring-1 ring-white/[0.06]">
            <div className="aspect-[16/9] bg-surface-2 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
              <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
