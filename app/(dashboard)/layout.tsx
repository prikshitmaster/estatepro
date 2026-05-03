import AuthGuard from "../_components/AuthGuard";
import TopNav from "../_components/TopNav";
import MobileTopBar from "../_components/MobileTopBar";
import MobileBottomNav from "../_components/MobileBottomNav";
import QuickAction from "../_components/QuickAction";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
        {/* Desktop top nav — hidden on mobile */}
        <TopNav />

        {/* Mobile top bar — hidden on desktop */}
        <div className="md:hidden">
          <MobileTopBar />
        </div>

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <div className="md:hidden">
          <MobileBottomNav />
        </div>
      </div>

      <QuickAction />
    </AuthGuard>
  );
}
