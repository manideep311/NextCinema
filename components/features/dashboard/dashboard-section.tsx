interface DashboardSectionProps {
  title: string;
  children: React.ReactNode;
}

/** Consistent heading + spacing wrapper for every dashboard section
 *  (Trending, Recommended, Favorites, etc.) — keeps section headers
 *  visually identical without repeating the same h2 classes 5 times. */
export function DashboardSection({ title, children }: DashboardSectionProps) {
  return (
    <section className="mb-10">
      <h2 className="font-heading text-lg font-semibold mb-4">{title}</h2>
      {children}
    </section>
  );
}
