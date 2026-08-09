import { FadeIn } from "@/components/motion/fade-in";

interface DashboardSectionProps {
  title: string;
  children: React.ReactNode;
}

/** Consistent heading + spacing wrapper for every dashboard section
 *  (Trending, Recommended, Favorites, etc.) — keeps section headers
 *  visually identical without repeating the same h2 classes 5 times.
 *  Wrapped in FadeIn so each section reveals on scroll (reduced-motion
 *  aware, plays once). */
export function DashboardSection({ title, children }: DashboardSectionProps) {
  return (
    <FadeIn>
      <section className="mb-12">
        <h2 className="font-serif text-xl mb-4">{title}</h2>
        {children}
      </section>
    </FadeIn>
  );
}
