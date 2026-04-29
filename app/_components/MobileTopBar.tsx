// app/_components/MobileTopBar.tsx — sticky top bar for mobile screens
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function MobileTopBar() {
  const router = useRouter();
  const [initial, setInitial] = useState("…");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name ?? user.email ?? "";
        setInitial(name.charAt(0).toUpperCase() || "U");
      }
    }
    loadUser();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4"
      style={{ height: 54, background: '#fff', borderBottom: '1px solid #EEF1F6' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="flex items-end gap-0.5 shrink-0">
          <div style={{ width: 8, height: 18, borderRadius: 3, background: '#1BC47D' }} />
          <div style={{ width: 8, height: 12, borderRadius: 3, background: '#1BC47D55' }} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1D23', letterSpacing: '-0.02em', marginLeft: 6 }}>
          EstatePro
        </span>
      </div>

      {/* Right: avatar + logout */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 32, height: 32, background: '#1BC47D' }}
        >
          <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{initial}</span>
        </div>
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="flex items-center justify-center rounded-xl transition-colors"
          style={{ width: 32, height: 32, border: '1px solid #EEF1F6', background: '#fff', color: '#9CA3AF' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#9CA3AF'; }}
        >
          <LogoutIcon />
        </button>
      </div>
    </header>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
