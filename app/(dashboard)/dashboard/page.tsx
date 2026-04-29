// app/(dashboard)/dashboard/page.tsx — Dashboard with REAL user name + DB status
//
// "use client" because we need useState and useEffect to:
//   1. Load the logged-in user's name from Supabase
//   2. Check if the database tables are set up correctly
//   3. Load real lead counts
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAllLeads, getDashboardStats } from "@/lib/db/leads";
import { getAllTasks } from "@/lib/db/tasks";
import { getAllClients } from "@/lib/db/clients";
import { getAllNewspaperLeads } from "@/lib/db/newspaper-leads";
import { formatPrice, initials } from "@/lib/mock-data";
import { Lead, LeadStage, Task, TaskPriority, NewspaperLead } from "@/lib/types";

// ── colour maps ───────────────────────────────────────────────────────────────

const STAGE_STYLE: Record<LeadStage, string> = {
  new:         "bg-blue-50 text-blue-600",
  contacted:   "bg-amber-50 text-amber-600",
  viewing:     "bg-violet-50 text-violet-600",
  negotiating: "bg-orange-50 text-orange-600",
  closed:      "bg-green-50 text-green-600",
  lost:        "bg-red-50 text-red-600",
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  high:   "bg-red-500",
  medium: "bg-amber-400",
  low:    "bg-green-400",
};

const AVATAR_COLORS = [
  "bg-blue-500","bg-violet-500","bg-green-500",
  "bg-amber-500","bg-rose-500","bg-cyan-500",
];

// ── page component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  const [userName,  setUserName]  = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [dbConnected, setDbConnected] = useState(false);

  // Real stats from Supabase
  const [stats, setStats] = useState({
    total: 0, newLeads: 0, activeFollowUps: 0,
    activeDeals: 0, closed: 0, pipelineValue: 0,
  });

  // Real recent leads from Supabase
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [todayTasks, setTodayTasks]   = useState<Task[]>([]);
  const [clientCount, setClientCount] = useState(0);

  const [allLeads,       setAllLeads]       = useState<Lead[]>([]);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchOpen,     setSearchOpen]     = useState(false);
  const searchRef                           = useRef<HTMLDivElement>(null);

  // Notification bell + profile dropdown state
  const [notifOpen,      setNotifOpen]      = useState(false);
  const [profileOpen,    setProfileOpen]    = useState(false);
  const [newsLeads,      setNewsLeads]      = useState<NewspaperLead[]>([]);
  const [notifSeen,      setNotifSeen]      = useState(false);
  const notifRef                            = useRef<HTMLDivElement>(null);
  const profileRef                          = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Load everything when the page opens
  useEffect(() => {
    loadUser();
    loadDashboardData();
  }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const name = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "there";
      setUserName(name);
      setUserEmail(user.email ?? "");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function loadDashboardData() {
    try {
      const leads = await getAllLeads();
      setDbConnected(true);

      // Calculate stats from real data
      const s = await getDashboardStats();
      setStats(s);

      // Show 7 most recent leads
      setRecentLeads(leads.slice(0, 7));

      // Keep all leads for search
      setAllLeads(leads);

      // Load real tasks (show only pending, max 5)
      const tasks = await getAllTasks();
      setTodayTasks(tasks.filter((t) => !t.completed).slice(0, 5));

      try {
        const clients = await getAllClients();
        setClientCount(clients.length);
      } catch { /* clients table might not exist yet */ }

      // Load latest newspaper leads for the notification bell
      try {
        const nl = await getAllNewspaperLeads();
        setNewsLeads(nl.slice(0, 5));
      } catch { /* newspaper table might not exist yet */ }

    } catch {
      setDbConnected(false);
    }
  }

  const pendingTasks = todayTasks;

  // Close all dropdowns when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current  && !searchRef.current.contains(e.target as Node))  setSearchOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filter leads as user types — match name, phone, or location
  const searchResults = searchQuery.trim().length > 0
    ? allLeads.filter((l) => {
        const q = searchQuery.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          (l.location ?? "").toLowerCase().includes(q)
        );
      }).slice(0, 6) // show max 6 results
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          {/* Shows real user name, or "..." while loading */}
          <p className="text-xs text-gray-400 mt-0.5">
            Welcome back, <span className="font-medium text-gray-600">{userName || "…"}</span>
            {" · "}{todayStr}
          </p>
        </div>

        {/* Search (desktop only) — now actually works! */}
        <div ref={searchRef} className="hidden sm:block relative flex-1 max-w-xs">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              className="flex-1 text-sm text-gray-600 placeholder-gray-400 outline-none bg-transparent"
            />
            {/* Clear button */}
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                className="text-gray-300 hover:text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {searchResults.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
                    <p className="text-xs text-gray-400 truncate">{lead.phone} · {lead.location}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 ${STAGE_STYLE[lead.stage]}`}>
                    {lead.stage}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* No results message */}
          {searchOpen && searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 px-4 py-3 text-sm text-gray-400">
              No leads found for &quot;{searchQuery}&quot;
            </div>
          )}
        </div>

        {/* Notification bell + profile dropdown */}
        <div className="flex items-center gap-2 shrink-0">

          {/* ── Bell ── */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); setNotifSeen(true); }}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              <BellIcon />
              {newsLeads.length > 0 && !notifSeen && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900">Newspaper Leads</p>
                  <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    {newsLeads.length} latest
                  </span>
                </div>

                {newsLeads.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">
                    No newspaper leads yet
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {newsLeads.map((lead) => (
                      <Link
                        key={lead.id}
                        href="/newspaper"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {lead.bhk} {lead.property_type} — {lead.area}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {lead.city} · {formatPrice(lead.price)}
                            {lead.owner_type === "owner" && (
                              <span className="ml-1.5 text-purple-600 font-semibold">🔑 Owner</span>
                            )}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                <div className="px-4 py-2.5 border-t border-gray-100">
                  <Link
                    href="/newspaper"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                  >
                    View all newspaper leads →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── Profile avatar ── */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 transition-colors" style={{ background: '#1BC47D' }}
            >
              {userName ? userName.charAt(0).toUpperCase() : "…"}
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl z-50 overflow-hidden" style={{ border: '1px solid #EEF1F6' }}>
                {/* User info */}
                <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid #EEF1F6' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: '#1BC47D' }}>
                    {userName ? userName.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                    <p className="text-[11px] text-gray-400 truncate">{userEmail}</p>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>

                  <Link
                    href="/newspaper"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    Newspaper Leads
                  </Link>
                </div>

                <div className="py-1" style={{ borderTop: '1px solid #EEF1F6' }}>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>


      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

        <StatCard
          label="New Leads"
          value={dbConnected ? stats.newLeads : "—"}
          accent="blue"
          trend="↑ today"
          icon={<LeadStatIcon />}
          footer={<Link href="/leads/new" className="w-full text-center text-xs font-semibold rounded-lg py-1.5 transition-colors block" style={{ color: '#1BC47D', background: '#F0FDF4' }}>+ New Lead</Link>}
        />

        <StatCard
          label="Follow Ups"
          value={dbConnected ? stats.activeFollowUps : "—"}
          accent="amber"
          trend="↑ 8% increase"
          icon={<FollowUpIcon />}
          footer={<div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-400 h-1.5 rounded-full" style={{ width: "62%" }} /></div>}
        />

        <StatCard
          label="Active Deals"
          value={dbConnected ? stats.activeDeals : "—"}
          accent="violet"
          trend="In negotiation"
          icon={<DealIcon />}
          footer={<div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-violet-500 h-1.5 rounded-full" style={{ width: "40%" }} /></div>}
        />

        {/* Commission card — always shows (estimated) */}
        <div className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1BC47D, #0fa865)' }}>
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="flex items-center justify-between relative">
            <p className="text-xs font-medium text-white/70">Projected Commission</p>
            <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <CommissionIcon />
            </span>
          </div>
          <div className="relative">
            <p className="text-2xl font-bold text-white leading-tight">
              {dbConnected
                ? formatPrice(Math.round(stats.pipelineValue * 0.02)) // 2% of pipeline
                : "₹—"}
            </p>
            <p className="text-xs text-white/70 mt-1 font-medium">2% of pipeline</p>
          </div>
          <div className="flex items-center gap-1.5 relative">
            <CalendarIcon />
            <span className="text-xs text-white/70">
              Pipeline: {dbConnected ? formatPrice(stats.pipelineValue) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Pipeline Funnel ── */}
      {dbConnected && allLeads.length > 0 && (
        <PipelineFunnelCard leads={allLeads} />
      )}

      {/* ── Main content: Leads + Tasks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Leads Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #EEF1F6' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #EEF1F6' }}>
            <h2 className="font-semibold text-sm" style={{ color: '#1A1D23' }}>Leads Pipeline</h2>
            <Link href="/leads/new" className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors" style={{ background: '#1BC47D' }}>
              <PlusIcon /> Add Lead
            </Link>
          </div>

          {/* Loading skeleton */}
          {!dbConnected && recentLeads.length === 0 && (
            <div className="divide-y divide-gray-50">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                  <div className="h-5 bg-gray-200 rounded-full w-16" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {dbConnected && recentLeads.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">
              No leads yet.{" "}
              <Link href="/leads/new" className="hover:underline" style={{ color: '#1BC47D' }}>Add your first lead →</Link>
            </div>
          )}

          {/* Desktop table */}
          {dbConnected && recentLeads.length > 0 && (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F0F3F8' }}>
                      <th className="px-5 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Name</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Location</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Budget</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Stage</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F3F8]">
                    {recentLeads.map((lead, i) => (
                      <tr key={lead.id} className="hover:bg-[#F8F9FB] transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                              {initials(lead.name)}
                            </div>
                            <div>
                              <Link href={`/leads/${lead.id}`} className="text-xs font-semibold text-gray-900 hover:text-[#1BC47D] block">{lead.name}</Link>
                              <span className="text-[10px] text-gray-400">{lead.phone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{lead.location}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{lead.property_interest ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatPrice(lead.budget_max)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STAGE_STYLE[lead.stage]}`}>{lead.stage}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/leads/${lead.id}`} className="w-6 h-6 inline-flex items-center justify-center rounded-lg hover:bg-[#F0FDF4] text-gray-400 hover:text-[#1BC47D] transition-colors">
                            <ChevronIcon />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-[#F0F3F8]">
                {recentLeads.map((lead, i) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F8F9FB] transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {initials(lead.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
                      <p className="text-xs text-gray-400 truncate">{lead.location} · {lead.property_interest}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize shrink-0 ${STAGE_STYLE[lead.stage]}`}>{lead.stage}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className="px-5 py-3" style={{ borderTop: '1px solid #F0F3F8' }}>
            <Link href="/leads" className="text-xs font-medium hover:underline" style={{ color: '#1BC47D' }}>View all leads →</Link>
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="bg-white rounded-2xl overflow-hidden flex flex-col" style={{ border: '1px solid #EEF1F6' }}>
          <div className="grid grid-cols-3 divide-x border-b" style={{ borderColor: '#EEF1F6' }}>
            <div className="px-3 py-3 text-center">
              <p className="text-xl font-bold text-gray-900">
                {dbConnected ? stats.total : "—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Leads</p>
            </div>
            <div className="px-3 py-3 text-center">
              <p className="text-xl font-bold text-gray-900">
                {dbConnected ? clientCount : "—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Clients</p>
            </div>
            <div className="px-3 py-3 text-center">
              <p className="text-base font-bold text-gray-900 leading-tight">
                {dbConnected ? formatPrice(stats.pipelineValue) : "—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Pipeline</p>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #EEF1F6' }}>
            <h2 className="font-semibold text-sm" style={{ color: '#1A1D23' }}>Today&apos;s Tasks</h2>
            <span className="text-[11px] text-gray-400">{pendingTasks.length} pending</span>
          </div>

          <div className="flex flex-col divide-y divide-[#F0F3F8] flex-1">
            {todayTasks.length === 0 && dbConnected && (
              <p className="text-xs text-gray-400 text-center py-6">No pending tasks.</p>
            )}
            {todayTasks.map((task, i) => (
              <TaskItem key={task.id} task={task} index={i} />
            ))}
          </div>

          <div className="px-4 py-3" style={{ borderTop: '1px solid #F0F3F8' }}>
            <Link href="/tasks" className="w-full text-xs font-medium hover:underline text-center block" style={{ color: '#1BC47D' }}>
              View all tasks →
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Pipeline Funnel Card ──────────────────────────────────────────────────────

const FUNNEL_STAGES = [
  { stage: "new",         label: "New",         bar: "bg-blue-500",    text: "text-blue-600"    },
  { stage: "contacted",   label: "Contacted",   bar: "bg-amber-500",   text: "text-amber-600"   },
  { stage: "viewing",     label: "Viewing",     bar: "bg-violet-500",  text: "text-violet-600"  },
  { stage: "negotiating", label: "Negotiating", bar: "bg-orange-500",  text: "text-orange-600"  },
  { stage: "closed",      label: "Won ✓",       bar: "bg-emerald-500", text: "text-emerald-600" },
] as const;

function PipelineFunnelCard({ leads }: { leads: Lead[] }) {
  const pipeline = useMemo(() => FUNNEL_STAGES.map((s) => ({
    ...s,
    count: leads.filter((l) => l.stage === s.stage).length,
  })), [leads]);

  const topCount = Math.max(...pipeline.map((p) => p.count), 1);
  const total    = leads.length;
  const closed   = pipeline.find((p) => p.stage === "closed")?.count ?? 0;
  const convRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl px-5 py-4" style={{ border: '1px solid #EEF1F6' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Conversion Funnel</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {total} total leads
            <span className="mx-1.5 text-gray-200">·</span>
            <span className="font-semibold text-emerald-600">{convRate}% close rate</span>
          </p>
        </div>
        <Link href="/analytics" className="text-xs hover:underline font-medium" style={{ color: '#1BC47D' }}>
          Full analytics →
        </Link>
      </div>

      {/* Funnel bars */}
      <div className="flex flex-col gap-3">
        {pipeline.map(({ stage, label, bar, text, count }) => {
          const barWidth  = Math.round((count / topCount) * 100);
          const pctOfAll  = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={stage} className="flex items-center gap-3">
              <p className={`text-[11px] font-bold w-[88px] shrink-0 ${text}`}>{label}</p>
              <div className="flex-1 bg-[#F0F3F8] rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${bar} transition-all duration-700`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="flex items-baseline gap-1.5 shrink-0 w-14 justify-end">
                <span className="text-sm font-bold text-gray-800">{count}</span>
                <span className="text-[10px] text-gray-400">{pctOfAll}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drop-off hint */}
      {pipeline[0].count > 0 && pipeline[4].count === 0 && (
        <p className="text-[11px] text-amber-600 mt-3 bg-amber-50 px-3 py-2 rounded-lg">
          💡 No closed deals yet — keep pushing leads through the pipeline.
        </p>
      )}
      {convRate >= 20 && (
        <p className="text-[11px] text-emerald-600 mt-3 bg-emerald-50 px-3 py-2 rounded-lg">
          🎯 Strong {convRate}% close rate — top quartile for real estate brokers.
        </p>
      )}
    </div>
  );
}

// ── Small reusable stat card ──────────────────────────────────────────────────

function StatCard({
  label, value, accent, trend, icon, footer,
}: {
  label: string;
  value: number | string;
  accent: string;
  trend: string;
  icon: React.ReactNode;
  footer: React.ReactNode;
}) {
  const accentBg: Record<string, string> = {
    blue: "bg-[#F0FDF4]", amber: "bg-amber-50", violet: "bg-violet-50",
  };
  const trendColor: Record<string, string> = {
    blue: "text-[#1BC47D]", amber: "text-green-500", violet: "text-gray-400",
  };
  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-3" style={{ border: '1px solid #EEF1F6' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentBg[accent]}`}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className={`text-xs mt-1 font-medium ${trendColor[accent]}`}>{trend}</p>
      </div>
      {footer}
    </div>
  );
}

function TaskItem({ task, index }: { task: Task; index: number }) {
  const PRIORITY_DOT: Record<TaskPriority, string> = {
    high: "bg-red-500", medium: "bg-amber-400", low: "bg-green-400",
  };
  const colors = ["bg-blue-500","bg-violet-500","bg-green-500","bg-amber-500","bg-rose-500"];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${task.completed ? "opacity-50" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${colors[index % colors.length]}`}>
        {initials(task.lead_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold text-gray-900 truncate ${task.completed ? "line-through" : ""}`}>{task.lead_name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-gray-500">{task.type}</span>
          <span className="text-gray-200">·</span>
          <span className="text-[10px] text-gray-400">{task.lead_phone}</span>
        </div>
      </div>
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon() { return <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>; }
function BellIcon()   { return <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>; }
function LeadStatIcon(){ return <svg className="w-4 h-4" style={{ color: '#1BC47D' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function FollowUpIcon(){ return <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>; }
function DealIcon()   { return <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>; }
function CommissionIcon(){ return <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function CalendarIcon(){ return <svg className="w-3 h-3 text-blue-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>; }
function PlusIcon()   { return <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>; }
function ChevronIcon(){ return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>; }
