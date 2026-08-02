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
    <div className="glass rounded-xl py-12 px-6 flex flex-col items-center text-center">
      <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="size-6 text-primary" />
      </div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-muted text-sm max-w-xs">{description}</p>
    </div>
  );
}
