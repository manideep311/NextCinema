import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { GuestBanner } from "@/components/features/dashboard/guest-banner";
import { CommandPaletteProvider } from "@/components/providers/command-palette-provider";
import { CommandPalette } from "@/components/features/search/command-palette";
import { getSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <CommandPaletteProvider>
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <TopNav />
          <main className="p-4 md:p-8">
            {!session && <GuestBanner />}
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
    </CommandPaletteProvider>
  );
}
