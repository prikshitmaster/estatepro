// app/(dashboard)/layout.tsx — dashboard shell
// Mobile: top bar + bottom tab nav
// Desktop (md+): left sidebar
import Sidebar from "../_components/Sidebar";
import MobileTopBar from "../_components/MobileTopBar";
import MobileBottomNav from "../_components/MobileBottomNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Right side: top bar (mobile) + content + bottom nav (mobile) */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden">
          <MobileTopBar />
        </div>

        {/* Page content — pb-20 on mobile leaves space above bottom nav */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <div className="md:hidden">
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
