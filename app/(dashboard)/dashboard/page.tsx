// app/(dashboard)/dashboard/page.tsx — Dashboard with REAL user name + DB status
//
// "use client" because we need useState and useEffect to:
//   1. Load the logged-in user's name from Supabase
//   2. Check if the database tables are set up correctly
//   3. Load real lead counts
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAllLeads, getDashboardStats } from "@/lib/db/leads";
import { mockTasks, formatPrice, initials } from "@/lib/mock-data";
import { Lead, LeadStage, Task, TaskPriority } from "@/lib/types";

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
  // User info from Supabase auth
  const [userName, setUserName] = useState("");

  // Database connection status:
  //   "checking" → waiting for response
  //   "connected" → tables exist and working
  //   "no-tables" → connected but schema.sql not run yet
  //   "error" → something else went wrong
  type DBStatus = "checking" | "connected" | "no-tables" | "error";
  const [dbStatus, setDbStatus] = useState<DBStatus>("checking");
  const [dbError,  setDbError]  = useState("");

  // Real stats from Supabase
  const [stats, setStats] = useState({
    total: 0, newLeads: 0, activeFollowUps: 0,
    activeDeals: 0, closed: 0, pipelineValue: 0,
  });

  // Real recent leads from Supabase
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Load everything when the page opens
  useEffect(() => {
    loadUser();
    loadDashboardData();
  }, []);

  // Step 1: get who is logged in
  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const name = user.user_metadata?.full_name
        ?? user.email?.split("@")[0]
        ?? "there";
      setUserName(name);
    }
  }

  // Step 2: try to fetch leads — this tells us if the DB is set up correctly
  async function loadDashboardData() {
    try {
      const leads = await getAllLeads();

      // If we reach here without an error, the DB tables exist and work!
      setDbStatus("connected");

      // Calculate stats from real data
      const s = await getDashboardStats();
      setStats(s);

      // Show 7 most recent leads
      setRecentLeads(leads.slice(0, 7));

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      // PostgreSQL error code 42P01 = "table does not exist"
      // This means the user hasn't run schema.sql in Supabase yet
      if (message.includes("42P01") || message.includes("does not exist")) {
        setDbStatus("no-tables");
      } else {
        setDbStatus("error");
        setDbError(message);
      }
    }
  }

  const pendingTasks = mockTasks.filter((t) => !t.completed);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1280px] mx-auto">

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

        {/* Search (desktop only) */}
        <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xs bg-white border border-gray-200 rounded-xl px-3 py-2">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search leads, properties..."
            className="flex-1 text-sm text-gray-600 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>

        {/* Notification + user avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <button className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
            <BellIcon />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : "…"}
          </div>
        </div>
      </div>

      {/* ── Database status banner ─────────────────────────────────────────── */}
      {/* This shows you EXACTLY what the database connection state is */}

      {dbStatus === "checking" && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          Checking database connection…
        </div>
      )}

      {dbStatus === "connected" && (
        // ✅ Green = tables exist, connection works, data is real
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <strong>Supabase Connected</strong> — database is live. Data below is real.
        </div>
      )}

      {dbStatus === "no-tables" && (
        // 🟡 Yellow = connected to Supabase but tables don't exist yet
        // They need to run the schema.sql file
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <p className="font-semibold mb-1">⚠️ Database tables not found</p>
          <p>Your Supabase connection works, but the tables haven&apos;t been created yet.</p>
          <p className="mt-1">
            Fix: In Supabase → <strong>SQL Editor</strong> → paste the contents of{" "}
            <code className="bg-amber-100 px-1 rounded">supabase/schema.sql</code> → click Run
          </p>
        </div>
      )}

      {dbStatus === "error" && (
        // 🔴 Red = something else went wrong
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <p className="font-semibold mb-1">❌ Database error</p>
          <p className="font-mono text-xs">{dbError}</p>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

        <StatCard
          label="New Leads"
          value={dbStatus === "connected" ? stats.newLeads : "—"}
          accent="blue"
          trend="↑ today"
          icon={<LeadStatIcon />}
          footer={<Link href="/leads/new" className="w-full text-center text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg py-1.5 transition-colors block">+ New Lead</Link>}
        />

        <StatCard
          label="Follow Ups"
          value={dbStatus === "connected" ? stats.activeFollowUps : "—"}
          accent="amber"
          trend="↑ 8% increase"
          icon={<FollowUpIcon />}
          footer={<div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-400 h-1.5 rounded-full" style={{ width: "62%" }} /></div>}
        />

        <StatCard
          label="Active Deals"
          value={dbStatus === "connected" ? stats.activeDeals : "—"}
          accent="violet"
          trend="In negotiation"
          icon={<DealIcon />}
          footer={<div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-violet-500 h-1.5 rounded-full" style={{ width: "40%" }} /></div>}
        />

        {/* Commission card — always shows (estimated) */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="flex items-center justify-between relative">
            <p className="text-xs font-medium text-blue-100">Projected Commission</p>
            <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <CommissionIcon />
            </span>
          </div>
          <div className="relative">
            <p className="text-2xl font-bold text-white leading-tight">
              {dbStatus === "connected"
                ? formatPrice(Math.round(stats.pipelineValue * 0.02)) // 2% of pipeline
                : "₹—"}
            </p>
            <p className="text-xs text-blue-100 mt-1 font-medium">2% of pipeline</p>
          </div>
          <div className="flex items-center gap-1.5 relative">
            <CalendarIcon />
            <span className="text-xs text-blue-100">
              Pipeline: {dbStatus === "connected" ? formatPrice(stats.pipelineValue) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main content: Leads + Tasks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Leads Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Leads Pipeline</h2>
            <Link href="/leads/new" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
              <PlusIcon /> Add Lead
            </Link>
          </div>

          {/* Loading skeleton */}
          {dbStatus === "checking" && (
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
          {dbStatus === "connected" && recentLeads.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">
              No leads yet.{" "}
              <Link href="/leads/new" className="text-blue-600 hover:underline">Add your first lead →</Link>
            </div>
          )}

          {/* Desktop table */}
          {dbStatus === "connected" && recentLeads.length > 0 && (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-5 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Name</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Location</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Budget</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Stage</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentLeads.map((lead, i) => (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                              {initials(lead.name)}
                            </div>
                            <div>
                              <Link href={`/leads/${lead.id}`} className="text-xs font-semibold text-gray-900 hover:text-blue-600 block">{lead.name}</Link>
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
                          <Link href={`/leads/${lead.id}`} className="w-6 h-6 inline-flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                            <ChevronIcon />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-gray-50">
                {recentLeads.map((lead, i) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
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

          <div className="px-5 py-3 border-t border-gray-50">
            <Link href="/leads" className="text-xs text-blue-600 font-medium hover:underline">View all leads →</Link>
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
            <div className="px-4 py-3 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {dbStatus === "connected" ? stats.total : "—"}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Total Leads</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-lg font-bold text-gray-900">
                {dbStatus === "connected" ? formatPrice(stats.pipelineValue) : "—"}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Pipeline Value</p>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Today&apos;s Tasks</h2>
            <span className="text-[11px] text-gray-400">{pendingTasks.length} pending</span>
          </div>

          <div className="flex flex-col divide-y divide-gray-50 flex-1">
            {mockTasks.map((task, i) => (
              <TaskItem key={task.id} task={task} index={i} />
            ))}
          </div>

          <div className="px-4 py-3 border-t border-gray-50">
            <button className="w-full text-xs text-blue-600 font-medium hover:underline text-center">
              View all tasks →
            </button>
          </div>
        </div>
      </div>

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
    blue: "bg-blue-50", amber: "bg-amber-50", violet: "bg-violet-50",
  };
  const trendColor: Record<string, string> = {
    blue: "text-blue-500", amber: "text-green-500", violet: "text-gray-400",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
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
function LeadStatIcon(){ return <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function FollowUpIcon(){ return <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>; }
function DealIcon()   { return <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>; }
function CommissionIcon(){ return <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function CalendarIcon(){ return <svg className="w-3 h-3 text-blue-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>; }
function PlusIcon()   { return <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>; }
function ChevronIcon(){ return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>; }
