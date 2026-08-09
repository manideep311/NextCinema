import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Used anywhere a section has no data yet (empty Favorites, no
 *  Recently Viewed, etc.) — the spec calls for empty states to
 *  "feel polished," so this gets an icon + message rather than
 *  a bare "No items" string. */
export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="border border-dashed border-white/10 rounded-lg py-14 px-6 flex flex-col items-center text-center">
      <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="size-5 text-primary" strokeWidth={1.5} />
      </div>
      <h3 className="font-serif text-base mb-1">{title}</h3>
      <p className="text-muted text-sm max-w-xs">{description}</p>
    </div>
  );
}
