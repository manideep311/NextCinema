import { Logo } from "@/components/ui/logo";

// Product links point at real routes. Company/Legal pages don't exist in
// this portfolio project, so those entries are intentionally left as
// placeholders rather than linking to invented pages.
const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Features", href: "/#features" },
    { label: "Recommendations", href: "/dashboard/recommendations" },
    { label: "Trending", href: "/dashboard/trending" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-12">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 font-serif font-semibold mb-3">
            <Logo />
          </div>
          <p className="text-muted text-sm">
            Every great story begins with a good recommendation.
          </p>
        </div>

        {Object.entries(FOOTER_LINKS).map(([category, links]) => (
          <div key={category}>
            <h4 className="font-semibold text-sm mb-3">{category}</h4>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-muted text-sm hover:text-text transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.06] py-6 text-center text-muted text-xs">
        © {new Date().getFullYear()} NextCinema. Built as a portfolio project.
      </div>
    </footer>
  );
}