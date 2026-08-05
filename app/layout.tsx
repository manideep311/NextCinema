import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth/session";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AssistantWidget } from "@/components/features/assistant/assistant-widget";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
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
      <body className={`${inter.variable} ${sora.variable} antialiased`}>
        <AuthProvider initialUser={initialUser}>
          {children}
          <AssistantWidget />
        </AuthProvider>
      </body>
    </html>
  );
}