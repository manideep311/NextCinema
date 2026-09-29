import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth/session";
import { AuthProvider } from "@/components/providers/auth-provider";
import { LibraryProvider, type InitialLibrary } from "@/components/providers/library-provider";
import { AssistantWidget } from "@/components/features/assistant/assistant-widget";
import { OpeningIntro } from "@/components/features/intro/opening-intro";
import { INTRO_HEADER } from "@/lib/intro";
import { listFavorites } from "@/services/favorites";
import { listWatchlist } from "@/services/watchlist";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Editorial serif for headlines/titles — replaces the previous geometric
// sans heading font so the product reads as a cinema/editorial brand
// rather than a SaaS dashboard.
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NextCinema",
  description: "Every great story begins with a good recommendation.",
};

/** The signed-in user's lists, read once per full page load; null (→ one client fetch) if the read fails. */
async function loadInitialLibrary(userId: string): Promise<InitialLibrary | null> {
  try {
    const [favorites, watchlist] = await Promise.all([listFavorites(userId), listWatchlist(userId)]);
    return { favorites, watchlist };
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, requestHeaders] = await Promise.all([getSession(), headers()]);
  // First page load of this browsing session only — decided by proxy.ts.
  const showIntro = requestHeaders.get(INTRO_HEADER) === "1";
  const initialUser = session
    ? { id: session.userId, email: session.email, name: session.name, role: session.role }
    : null;
  const initialLibrary = session ? await loadInitialLibrary(session.userId) : { favorites: [], watchlist: [] };

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        {showIntro && <OpeningIntro />}
        <AuthProvider initialUser={initialUser}>
          {/* Keyed by user so signing in/out swaps in a fresh store rather than leaking the previous user's lists. */}
          <LibraryProvider key={session?.userId ?? "guest"} signedIn={Boolean(session)} initialLibrary={initialLibrary}>
            {children}
            <AssistantWidget />
          </LibraryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
