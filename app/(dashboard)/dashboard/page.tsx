"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAllLeads, getDashboardStats } from "@/lib/db/leads";
import { getAllTasks } from "@/lib/db/tasks";
import { formatPrice, initials, STAGE_LABEL } from "@/lib/mock-data";
import { Lead, LeadStage, Task } from "@/lib/types";

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

  const todayStr = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "");
    });
    load();
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
            Good {getTimeOfDay()}, {userName.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>{todayStr}</p>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total Leads"
            value={dbOk ? stats.total : "—"}
            sub="All time"
            icon="👥"
            color="#1BC47D"
            href="/leads"
          />
          <KpiCard
            label="Need to Call"
            value={dbOk ? stats.activeFollowUps : "—"}
            sub={overdueLeads.length > 0 ? `${overdueLeads.length} overdue` : "All caught up"}
            subColor={overdueLeads.length > 0 ? "#EF4444" : "#1BC47D"}
            icon="📞"
            color="#F59E0B"
            href="/follow-ups"
          />
          <KpiCard
            label="In Negotiation"
            value={dbOk ? stats.activeDeals : "—"}
            sub="Active deals"
            icon="🤝"
            color="#8B5CF6"
            href="/leads"
          />
          <KpiCard
            label="Pipeline Value"
            value={dbOk ? formatPrice(stats.pipelineValue) : "—"}
            sub={`~${formatPrice(Math.round(stats.pipelineValue * 0.02))} commission`}
            icon="💰"
            color="#1BC47D"
            href="/deals"
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
                      <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()}
                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white"
                        style={{ background: "#1BC47D" }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </a>
                    </Link>
                  ))}
                </div>
                <div className="px-4 py-2.5" style={{ borderTop: "1px solid #FCD34D" }}>
                  <Link href="/follow-ups" className="text-xs font-semibold text-amber-700">Go to My Calls →</Link>
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
                <div className="px-4 py-6 text-center text-sm text-gray-400">No pending tasks 🎉</div>
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
                {[
                  { label: "Add New Lead",        href: "/leads/new",           icon: "👤" },
                  { label: "Add Property",         href: "/properties/new",      icon: "🏢" },
                  { label: "Schedule Site Visit",  href: "/visits",              icon: "📅" },
                  { label: "Create Property Link", href: "/secure-share/create", icon: "🔗" },
                  { label: "Log Commission",       href: "/deals",               icon: "💰" },
                ].map(({ label, href, icon }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group">
                    <span className="text-base shrink-0">{icon}</span>
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
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, subColor = "#6B7280", icon, color, href,
}: {
  label: string; value: number | string; sub: string; subColor?: string;
  icon: string; color: string; href: string;
}) {
  return (
    <Link href={href} className="bg-white rounded-2xl p-4 flex flex-col gap-2 group transition-shadow hover:shadow-md active:scale-[0.99]" style={{ border: "1px solid #E5E7EB" }}>
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
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
