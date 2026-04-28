// app/(dashboard)/dashboard/page.tsx — Main dashboard, matches reference design
import Link from "next/link";
import { mockLeads, mockTasks, formatPrice, initials } from "../../../lib/mock-data";
import { Lead, LeadStage, Task, TaskPriority } from "../../../lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

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

// Avatar background colours cycle through a palette
const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-green-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];

function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  // Derived counts
  const newLeads       = mockLeads.filter((l) => l.stage === "new").length;
  const activeFollowUps = mockLeads.filter((l) => ["contacted", "viewing"].includes(l.stage)).length;
  const activeDeals    = mockLeads.filter((l) => l.stage === "negotiating").length;
  const projectedComm  = 245000;   // TODO: real calc from Supabase

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const recentLeads = [...mockLeads].reverse().slice(0, 7);
  const pendingTasks = mockTasks.filter((t) => !t.completed);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1280px] mx-auto">

      {/* ── Top bar: title + search + user ───────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">{todayStr}</p>
        </div>

        {/* Search — hidden on small mobile */}
        <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xs bg-white border border-gray-200 rounded-xl px-3 py-2">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search leads, properties..."
            className="flex-1 text-sm text-gray-600 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>

        {/* Notification + user */}
        <div className="flex items-center gap-2 shrink-0">
          <button className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
            <BellIcon />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            JP
          </div>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

        {/* 1. New Leads */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">New Leads</p>
            <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <LeadStatIcon />
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{newLeads}</p>
            <p className="text-xs text-blue-500 mt-1 font-medium">↑ 2 new today</p>
          </div>
          <Link
            href="/leads/new"
            className="w-full text-center text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg py-1.5 transition-colors"
          >
            + New Lead
          </Link>
        </div>

        {/* 2. Active Follow Ups */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Follow Ups</p>
            <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <FollowUpIcon />
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{activeFollowUps}</p>
            <p className="text-xs text-green-500 mt-1 font-medium">↑ 8% increase</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: "62%" }} />
          </div>
        </div>

        {/* 3. Active Deals */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Active Deals</p>
            <span className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <DealIcon />
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{activeDeals}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">In negotiation</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: "40%" }} />
          </div>
        </div>

        {/* 4. Projected Commission — blue gradient */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
          {/* decorative circles */}
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
              ₹{(projectedComm / 100000).toFixed(0)}L
            </p>
            <p className="text-xs text-blue-100 mt-1 font-medium">This month</p>
          </div>
          <div className="flex items-center gap-1.5 relative">
            <CalendarIcon />
            <span className="text-xs text-blue-100">Today&apos;s goal: ₹45K</span>
          </div>
        </div>
      </div>

      {/* ── Main content: Leads Pipeline + Tasks ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Leads Pipeline (takes 2/3 on desktop) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Leads Pipeline</h2>
            <Link
              href="/leads/new"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <PlusIcon />
              Add Lead
            </Link>
          </div>

          {/* Table — desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Source</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Location</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Budget</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Stage</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentLeads.map((lead, i) => (
                  <LeadRow key={lead.id} lead={lead} index={i} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Card list — mobile */}
          <div className="sm:hidden divide-y divide-gray-50">
            {recentLeads.map((lead, i) => (
              <LeadCardRow key={lead.id} lead={lead} index={i} />
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-50">
            <Link href="/leads" className="text-xs text-blue-600 font-medium hover:underline">
              View all leads →
            </Link>
          </div>
        </div>

        {/* Right: Today's Tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
          {/* Mini stats */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
            <div className="px-4 py-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{mockLeads.length}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Total Leads</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-lg font-bold text-gray-900">₹3.45L</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Pipeline Value</p>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Today&apos;s Tasks</h2>
            <span className="text-[11px] text-gray-400">{pendingTasks.length} pending</span>
          </div>

          {/* Task list */}
          <div className="flex flex-col divide-y divide-gray-50 flex-1">
            {mockTasks.map((task, i) => (
              <TaskItem key={task.id} task={task} index={i} />
            ))}
          </div>

          {/* Footer */}
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

// ── Sub-components ────────────────────────────────────────────────────────────

function LeadRow({ lead, index }: { lead: Lead; index: number }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${avatarColor(index)}`}>
            {initials(lead.name)}
          </div>
          <div>
            <Link href={`/leads/${lead.id}`} className="text-xs font-semibold text-gray-900 hover:text-blue-600 block">
              {lead.name}
            </Link>
            <span className="text-[10px] text-gray-400">{lead.phone}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 capitalize">{lead.source}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{lead.location}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{lead.property_interest ?? "—"}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{formatPrice(lead.budget_max)}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STAGE_STYLE[lead.stage]}`}>
          {lead.stage}
        </span>
      </td>
      <td className="px-4 py-3">
        <Link href={`/leads/${lead.id}`} className="w-6 h-6 inline-flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
          <ChevronIcon />
        </Link>
      </td>
    </tr>
  );
}

function LeadCardRow({ lead, index }: { lead: Lead; index: number }) {
  return (
    <Link href={`/leads/${lead.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(index)}`}>
        {initials(lead.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
        <p className="text-xs text-gray-400 truncate">{lead.location} · {lead.property_interest}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STAGE_STYLE[lead.stage]}`}>
          {lead.stage}
        </span>
        <span className="text-[10px] text-gray-400">{formatPrice(lead.budget_max)}</span>
      </div>
    </Link>
  );
}

function TaskItem({ task, index }: { task: Task; index: number }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${task.completed ? "opacity-50" : ""}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${avatarColor(index)}`}>
        {initials(task.lead_name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold text-gray-900 truncate ${task.completed ? "line-through" : ""}`}>
          {task.lead_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-gray-500">{task.type}</span>
          <span className="text-gray-200">·</span>
          <span className="text-[10px] text-gray-400">{task.lead_phone}</span>
        </div>
      </div>

      {/* Priority dot */}
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
    </div>
  );
}

// ── Icon components ───────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function LeadStatIcon() {
  return (
    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function FollowUpIcon() {
  return (
    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function DealIcon() {
  return (
    <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

function CommissionIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-3 h-3 text-blue-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
