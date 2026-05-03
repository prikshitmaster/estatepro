// app/(dashboard)/layout.tsx — dashboard shell + auth protection
//
// 🧠 WHAT THIS DOES:
//    This is the "frame" that wraps every dashboard page (dashboard, leads,
//    properties, clients, tasks, analytics, ai-tools, settings).
//
//    AuthGuard sits at the very top — it checks if the user is logged in
//    BEFORE anything else renders. If not logged in → redirect to /login.
//
//    Mobile: top bar + bottom tab nav
//    Desktop (md+): left sidebar
import AuthGuard from "../_components/AuthGuard";
import Sidebar from "../_components/Sidebar";
import MobileTopBar from "../_components/MobileTopBar";
import MobileBottomNav from "../_components/MobileBottomNav";
import QuickAction from "../_components/QuickAction";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // AuthGuard checks login status first — if not logged in, user never sees the layout
    <AuthGuard>
      <div className="flex min-h-screen bg-[#F8FAFC]">
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

      {/* Floating quick-action "+" button */}
      <QuickAction />
    </AuthGuard>
  );
}
