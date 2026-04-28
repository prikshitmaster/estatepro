// app/_components/MobileTopBar.tsx — sticky top bar for mobile screens
//
// Shows: EstatePro logo on the left, user initial + logout button on the right
// The logout button calls supabase.auth.signOut() for real
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function MobileTopBar() {
  const router = useRouter();
  const [initial, setInitial] = useState("…"); // shows "…" while loading user

  // Fetch the logged-in user's name once on load
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name ?? user.email ?? "";
        // Take the first letter of the name (or email) as the avatar initial
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
    <header className="sticky top-0 z-40 flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">

      {/* Left: logo + name */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shrink-0">
          <span className="text-white font-bold text-sm">E</span>
        </div>
        <span className="font-semibold text-gray-900">EstatePro CRM</span>
      </div>

      {/* Right: user avatar + logout */}
      <div className="flex items-center gap-2">
        {/* Avatar circle showing user's initial */}
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">{initial}</span>
        </div>
        {/* Logout button — a real button, not just a link */}
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
