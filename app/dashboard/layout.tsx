import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <TopNav />
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
