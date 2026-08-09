import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth/session";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AssistantWidget } from "@/components/features/assistant/assistant-widget";

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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const initialUser = session
    ? { id: session.userId, email: session.email, name: session.name, role: session.role }
    : null;

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        <AuthProvider initialUser={initialUser}>
          {children}
          <AssistantWidget />
        </AuthProvider>
      </body>
    </html>
  );
}