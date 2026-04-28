// app/admin/layout.tsx — Admin panel layout
//
// 🧠 WHAT THIS DOES:
//    Protects every page under /admin.
//    If the logged-in user is NOT the admin email → sends them to /dashboard.
//    Regular brokers will NEVER see admin pages — they get silently redirected.
//    This is completely separate from the broker dashboard (no sidebar/nav).
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const ADMIN_EMAIL = "prikshitcorp@gmail.com";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        // Not admin — silently redirect to their dashboard
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Loading…
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-600 shrink-0">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">EstatePro Admin</p>
            <p className="text-[10px] text-gray-400">Management Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-800 transition-colors">
            ← Back to CRM
          </Link>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">ADMIN</span>
        </div>
      </header>

      {/* Page content */}
      <main>{children}</main>
    </div>
  );
}
