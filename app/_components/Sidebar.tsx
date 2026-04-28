// app/_components/Sidebar.tsx — desktop left navigation
//
// What this component does:
//   1. Shows the navigation links
//   2. Reads the REAL logged-in user name from Supabase on load
//   3. Has a REAL logout button that calls supabase.auth.signOut()
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navItems = [
  { label: "Dashboard",        href: "/dashboard",  icon: DashboardIcon  },
  { label: "Leads",            href: "/leads",      icon: LeadsIcon      },
  { label: "Properties",       href: "/properties", icon: PropertiesIcon },
  { label: "Clients",          href: "/clients",    icon: ClientsIcon    },
  { label: "Tasks",            href: "/tasks",      icon: TasksIcon      },
  { label: "Analytics",        href: "/analytics",  icon: AnalyticsIcon  },
  { label: "AI Tools",         href: "/ai-tools",   icon: AIIcon         },
  { label: "Newspaper Leads",  href: "/newspaper",  icon: NewspaperIcon  },
];

// Returns the first 2 initials from a name e.g. "Jay Patel" → "JP"
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [userName,    setUserName]    = useState("");
  const [userEmail,   setUserEmail]   = useState("");
  // Today's newspaper lead count — shows as a badge on the nav item
  const [todayCount,  setTodayCount]  = useState(0);

  // Runs once when the sidebar first appears on screen
  // Asks Supabase "who is currently logged in?"
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // full_name comes from the signup form (user_metadata we saved)
        // If not available, fall back to the part before @ in the email
        const name = user.user_metadata?.full_name
          ?? user.email?.split("@")[0]
          ?? "User";
        setUserName(name);
        setUserEmail(user.email ?? "");
      }
    }
    loadUser();

    // Count today's newspaper leads for the sidebar badge
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    supabase
      .from("newspaper_leads")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("uploaded_at", todayStart.toISOString())
      .then(({ count }) => { if (count) setTodayCount(count); });
  }, []); // [] means run once on load, not on every re-render

  // Called when the user clicks "Sign out"
  async function handleSignOut() {
    await supabase.auth.signOut(); // tell Supabase to end the session
    router.push("/login");         // send them back to the login page
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-white border-r border-gray-100 shrink-0">

      {/* ── Brand ── */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shrink-0">
          <span className="text-white font-bold text-sm">E</span>
        </div>
        <span className="font-bold text-gray-900 text-[15px]">EstatePro</span>
      </div>

      {/* ── Main nav links ── */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1 pt-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Icon active={active} />
              <span className="flex-1">{label}</span>
              {/* Today's newspaper leads badge — shows how many fresh leads arrived today */}
              {href === "/newspaper" && todayCount > 0 && (
                <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {todayCount > 99 ? "99+" : todayCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom: Settings + user info + logout ── */}
      <div className="px-2 pb-4 flex flex-col gap-0.5 border-t border-gray-100 pt-3">

        {/* Settings link */}
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
            isActive("/settings")
              ? "bg-blue-50 text-blue-600"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          }`}
        >
          <SettingsIcon active={isActive("/settings")} />
          Settings
        </Link>

        {/* Logout button — calls handleSignOut, NOT just a link */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left"
        >
          <LogoutIcon />
          Sign out
        </button>

        {/* Divider */}
        <div className="border-t border-gray-100 mt-1 pt-2 px-1">
          {/* User info — shows REAL name and email from Supabase */}
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            {/* Avatar: coloured circle with initials */}
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-[11px] font-bold">
                {userName ? getInitials(userName) : "…"}
              </span>
            </div>
            <div className="min-w-0">
              {/* Show real name, or "Loading..." while waiting */}
              <p className="text-[12px] font-semibold text-gray-800 truncate">
                {userName || "Loading..."}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function DashboardIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function LeadsIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function PropertiesIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
}
function ClientsIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function TasksIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
}
function AnalyticsIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function AIIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
}
function SettingsIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function NewspaperIcon({ active }: { active: boolean }) {
  return <svg className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>;
}
function LogoutIcon() {
  return <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
}
