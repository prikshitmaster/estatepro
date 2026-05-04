"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAllLeads, getDashboardStats } from "@/lib/db/leads";
import { getAllTasks } from "@/lib/db/tasks";
import { formatPrice, initials, STAGE_LABEL } from "@/lib/mock-data";
import { Lead, LeadStage, Task } from "@/lib/types";

interface ActivityEvent {
  id: string;
  type: "new_lead" | "call" | "whatsapp" | "visit" | "note" | "email";
  lead_id: string;
  lead_name: string;
  note: string;
  created_at: string;
}

const ACTIVITY_ICON: Record<ActivityEvent["type"], { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  new_lead:  { color: "#1BC47D", bg: "#D1FAE5", label: "New Lead",   icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> },
  call:      { color: "#059669", bg: "#D1FAE5", label: "Called",     icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> },
  whatsapp:  { color: "#25D366", bg: "#DCFCE7", label: "WhatsApp",   icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.657 0-3.213-.448-4.548-1.232l-.326-.192-3.373 1.003 1.003-3.373-.192-.326A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg> },
  visit:     { color: "#7C3AED", bg: "#EDE9FE", label: "Site Visit", icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  note:      { color: "#6B7280", bg: "#F3F4F6", label: "Note",       icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
  email:     { color: "#3B82F6", bg: "#DBEAFE", label: "Email",      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
};

const STAGE_PILL: Record<LeadStage, { bg: string; color: string }> = {
  new:         { bg: "#DBEAFE", color: "#1D4ED8" },
  contacted:   { bg: "#FEF3C7", color: "#92400E" },
  viewing:     { bg: "#EDE9FE", color: "#5B21B6" },
  negotiating: { bg: "#FFEDD5", color: "#9A3412" },
  closed:      { bg: "#D1FAE5", color: "#065F46" },
  lost:        { bg: "#FEE2E2", color: "#991B1B" },
};

const AVATAR_COLORS = ["#6366F1","#0EA5E9","#F59E0B","#EF4444","#8B5CF6","#14B8A6"];

export default function DashboardPage() {
  const [userName,     setUserName]     = useState("");
  const [dbOk,         setDbOk]         = useState(false);
  const [stats,        setStats]        = useState({ total: 0, newLeads: 0, activeFollowUps: 0, activeDeals: 0, closed: 0, pipelineValue: 0 });
  const [recentLeads,  setRecentLeads]  = useState<Lead[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [allLeads,     setAllLeads]     = useState<Lead[]>([]);
  const [activity,     setActivity]     = useState<ActivityEvent[]>([]);
  const [activityOk,   setActivityOk]   = useState<boolean | null>(null); // null = loading

  const todayStr = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "");
    });
    load();
    loadActivity();
  }, []);

  async function load() {
    try {
      const [leads, s, tasks] = await Promise.all([getAllLeads(), getDashboardStats(), getAllTasks()]);
      setDbOk(true);
      setAllLeads(leads);
      setRecentLeads(leads.slice(0, 8));
      setStats(s);
      setPendingTasks(tasks.filter((t) => !t.completed).slice(0, 5));
    } catch { setDbOk(false); }
  }

  async function loadActivity() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, type, note, lead_id, created_at, leads(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) { setActivityOk(false); return; }
    setActivityOk(true);
    // Also pull today's new leads as activity items
    const today = new Date().toISOString().slice(0, 10);
    const { data: newLeadsToday } = await supabase
      .from("leads")
      .select("id, name, created_at")
      .eq("user_id", user.id)
      .gte("created_at", today)
      .order("created_at", { ascending: false });
    const leadEvents: ActivityEvent[] = (newLeadsToday ?? []).map((l) => ({
      id: `lead-${l.id}`,
      type: "new_lead" as const,
      lead_id: l.id,
      lead_name: l.name,
      note: "",
      created_at: l.created_at,
    }));
    const logEvents: ActivityEvent[] = (data ?? []).map((row) => ({
      id: row.id,
      type: row.type as ActivityEvent["type"],
      lead_id: row.lead_id,
      lead_name: (row.leads as unknown as { name: string } | null)?.name ?? "",
      note: row.note ?? "",
      created_at: row.created_at,
    }));
    const merged = [...leadEvents, ...logEvents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 15);
    setActivity(merged);
  }

  const overdueLeads = useMemo(() => {
    const OVERDUE: Partial<Record<LeadStage, number>> = { negotiating: 1, new: 1, viewing: 2, contacted: 4 };
    const today = new Date().toISOString().slice(0, 10);
    return allLeads.filter((l) => {
      if (l.stage === "closed" || l.stage === "lost") return false;
      if (l.next_follow_up_at && l.next_follow_up_at.slice(0, 10) > today) return false;
      const days = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000);
      return days >= (OVERDUE[l.stage] ?? 999);
    }).slice(0, 5);
  }, [allLeads]);

  return (
    <div className="p-4 sm:p-6 pb-24 sm:pb-6 space-y-5 max-w-7xl mx-auto">

        {/* Welcome */}
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#111827" }}>
            Good {getTimeOfDay()}, {userName.split(" ")[0] || "there"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>{todayStr}</p>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total Leads" value={dbOk ? stats.total : "—"} sub="All time" color="#1BC47D" href="/leads"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <KpiCard label="Need to Call" value={dbOk ? stats.activeFollowUps : "—"}
            sub={overdueLeads.length > 0 ? `${overdueLeads.length} overdue` : "All caught up"}
            subColor={overdueLeads.length > 0 ? "#EF4444" : "#1BC47D"} color="#F59E0B" href="/leads?smart=follow-up"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
          />
          <KpiCard label="In Negotiation" value={dbOk ? stats.activeDeals : "—"} sub="Active deals" color="#8B5CF6" href="/leads"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <KpiCard label="Pipeline Value" value={dbOk ? formatPrice(stats.pipelineValue) : "—"}
            sub={`~${formatPrice(Math.round(stats.pipelineValue * 0.02))} commission`} color="#1BC47D" href="/deals"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Recent leads — 2/3 width */}
          <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
              <h2 className="font-semibold text-sm" style={{ color: "#111827" }}>Recent Leads</h2>
              <Link href="/leads" className="text-xs font-semibold" style={{ color: "#1BC47D" }}>View all →</Link>
            </div>

            {/* Desktop table */}
            {dbOk && recentLeads.length > 0 && (
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
                      {["Name", "Budget", "Stage", "Source", ""].map((h) => (
                        <th key={h} className="px-5 py-2.5 text-left" style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeads.map((lead, i) => {
                      const pill = STAGE_PILL[lead.stage];
                      return (
                        <tr key={lead.id} className="group transition-colors" style={{ borderBottom: "1px solid #F9FAFB" }}
                          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "#F9FAFB"}
                          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = ""}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                                {initials(lead.name)}
                              </div>
                              <div>
                                <Link href={`/leads/${lead.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#1BC47D] block">{lead.name}</Link>
                                <span className="text-xs text-gray-400">{lead.phone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm font-medium text-gray-700">{formatPrice(lead.budget_max)}</td>
                          <td className="px-5 py-3">
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: pill?.bg, color: pill?.color }}>
                              {STAGE_LABEL[lead.stage] ?? lead.stage}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-400 capitalize">{lead.source}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="hidden group-hover:flex items-center justify-end gap-1">
                              <a href={`tel:${lead.phone}`}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                                style={{ background: "#1BC47D" }}>
                                Call
                              </a>
                              <a href={`https://wa.me/91${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
                                style={{ background: "#25D366" }}>
                                WhatsApp
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mobile list */}
            {dbOk && recentLeads.length > 0 && (
              <div className="sm:hidden divide-y divide-gray-50">
                {recentLeads.map((lead, i) => {
                  const pill = STAGE_PILL[lead.stage];
                  return (
                    <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-gray-50">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                        {initials(lead.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
                        <p className="text-xs text-gray-400 truncate">{lead.phone} · {formatPrice(lead.budget_max)}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: pill?.bg, color: pill?.color }}>
                        {STAGE_LABEL[lead.stage] ?? lead.stage}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            {dbOk && recentLeads.length === 0 && (
              <div className="py-14 text-center">
                <p className="text-gray-400 text-sm">No leads yet.</p>
                <Link href="/leads/new" className="text-sm font-semibold mt-1 block" style={{ color: "#1BC47D" }}>Add your first lead →</Link>
              </div>
            )}

            {!dbOk && (
              <div className="divide-y divide-gray-50">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                      <div className="h-2.5 bg-gray-50 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Overdue follow-ups */}
            {overdueLeads.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #FCD34D" }}>
                <div className="flex items-center gap-2 px-4 py-3" style={{ background: "#FFFBEB", borderBottom: "1px solid #FCD34D" }}>
                  <span className="text-sm">⚠️</span>
                  <p className="text-sm font-bold text-amber-800">Call These Now</p>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#FCD34D", color: "#92400E" }}>
                    {overdueLeads.length}
                  </span>
                </div>
                <div className="divide-y divide-amber-50">
                  {overdueLeads.map((lead) => (
                    <Link key={lead.id} href={`/leads/${lead.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors active:bg-amber-100">
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-[10px] font-bold shrink-0">
                        {initials(lead.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
                        <p className="text-xs text-gray-400 truncate">{lead.phone}</p>
                      </div>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${lead.phone}`; }}
                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white"
                        style={{ background: "#1BC47D" }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </button>
                    </Link>
                  ))}
                </div>
                <div className="px-4 py-2.5" style={{ borderTop: "1px solid #FCD34D" }}>
                  <Link href="/leads" className="text-xs font-semibold text-amber-700">View in Leads →</Link>
                </div>
              </div>
            )}

            {/* Pending tasks */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <p className="text-sm font-semibold text-gray-800">Pending Tasks</p>
                <Link href="/tasks" className="text-xs font-semibold" style={{ color: "#1BC47D" }}>All →</Link>
              </div>
              {pendingTasks.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No pending tasks — all clear!</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {pendingTasks.map((t) => (
                    <Link key={t.id} href="/tasks" className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${t.priority === "high" ? "bg-red-500" : t.priority === "medium" ? "bg-amber-400" : "bg-green-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.lead_name}</p>
                        <p className="text-xs text-gray-400 truncate">{t.type}</p>
                      </div>
                      {t.due_date && (
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {new Date(t.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
              <p className="px-4 py-3 text-sm font-semibold text-gray-800" style={{ borderBottom: "1px solid #F3F4F6" }}>Quick Actions</p>
              <div className="divide-y divide-gray-50">
                {([
                  { label: "Add New Lead",        href: "/leads/new",           svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /> },
                  { label: "Add Property",         href: "/properties/new",      svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
                  { label: "Schedule Site Visit",  href: "/visits",              svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
                  { label: "Create Property Link", href: "/secure-share/create", svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /> },
                  { label: "Log Commission",       href: "/deals",               svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                ] as { label: string; href: string; svg: React.ReactNode }[]).map(({ label, href, svg }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group">
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-[#1BC47D] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{svg}</svg>
                    <span className="text-sm font-medium text-gray-700 flex-1">{label}</span>
                    <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#1BC47D] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Activity Feed ── */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
            {activityOk === false && (
              <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
                className="text-xs font-semibold text-amber-600 hover:text-amber-700">
                Run migration to enable →
              </a>
            )}
          </div>

          {activityOk === null && (
            <div className="divide-y divide-gray-50">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                  <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-2.5 bg-gray-50 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activityOk === false && (
            <div className="px-5 py-8 text-center">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Activity log not set up</p>
              <p className="text-xs text-gray-400">Run the SQL migration in Supabase to enable activity tracking</p>
            </div>
          )}

          {activityOk === true && activity.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No activity yet today. Start calling!</div>
          )}

          {activityOk === true && activity.length > 0 && (
            <div className="divide-y divide-gray-50 sm:grid sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
              {activity.slice(0, 10).map((ev) => {
                const meta = ACTIVITY_ICON[ev.type] ?? ACTIVITY_ICON.note;
                const relTime = timeAgo(ev.created_at);
                return (
                  <Link key={ev.id} href={`/leads/${ev.lead_id}`}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: meta.bg, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        <span style={{ color: meta.color }}>{meta.label}</span>
                        {ev.lead_name && <> · {ev.lead_name}</>}
                      </p>
                      {ev.note && <p className="text-xs text-gray-400 truncate mt-0.5">{ev.note}</p>}
                    </div>
                    <span className="text-[10px] text-gray-300 shrink-0 mt-0.5">{relTime}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, subColor = "#6B7280", icon, color, href,
}: {
  label: string; value: number | string; sub: string; subColor?: string;
  icon: React.ReactNode; color: string; href: string;
}) {
  return (
    <Link href={href} className="bg-white rounded-2xl p-4 flex flex-col gap-2 group transition-shadow hover:shadow-md active:scale-[0.99]" style={{ border: "1px solid #E5E7EB" }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "15", color }}>
          {icon}
        </div>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: "#111827" }}>{value}</p>
        <p className="text-xs font-medium mt-0.5" style={{ color: "#9CA3AF" }}>{label}</p>
      </div>
      <p className="text-xs font-semibold" style={{ color: subColor }}>{sub}</p>
    </Link>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
