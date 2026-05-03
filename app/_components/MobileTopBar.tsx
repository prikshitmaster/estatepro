// app/_components/MobileTopBar.tsx — mobile sticky top bar, FUB-style
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function MobileTopBar() {
  const router = useRouter();
  const [initial, setInitial] = useState("…");
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name = user.user_metadata?.full_name ?? user.email ?? "";
        setInitial(name.charAt(0).toUpperCase() || "U");
      }
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 md:hidden"
      style={{ height: 54, background: "#111827", borderBottom: "1px solid #1F2937" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="flex items-end gap-0.5">
          <div style={{ width: 7, height: 16, borderRadius: 3, background: "#1BC47D" }} />
          <div style={{ width: 7, height: 11, borderRadius: 3, background: "#1BC47D44" }} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginLeft: 4 }}>
          EstatePro
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 relative">
        {/* Add lead shortcut */}
        <Link
          href="/leads/new"
          className="flex items-center justify-center rounded-xl"
          style={{ width: 32, height: 32, background: "#1BC47D" }}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </Link>

        {/* Avatar + dropdown */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center rounded-full text-white text-xs font-bold"
          style={{ width: 32, height: 32, background: "#1BC47D" }}
        >
          {initial}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl z-50 overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
              <Link href="/settings" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Settings
              </Link>
              <div style={{ borderTop: "1px solid #F3F4F6" }}>
                <button onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
