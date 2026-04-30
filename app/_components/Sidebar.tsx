// app/_components/Sidebar.tsx — desktop left navigation
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAllLeads } from "@/lib/db/leads";
import { getFollowUpLogs } from "@/lib/db/follow-ups";

// ── Nav item definitions ───────────────────────────────────────────────────────

const mainItems = [
  { label: "Dashboard",    href: "/dashboard",    icon: DashboardIcon,  accent: "#1BC47D" },
  { label: "Leads",        href: "/leads",        icon: LeadsIcon,      accent: "#1BC47D" },
  { label: "Call Logs",    href: "/follow-ups",   icon: FollowUpIcon,   accent: "#1BC47D" },
  { label: "Tasks",        href: "/tasks",        icon: TasksIcon,      accent: "#1BC47D" },
];

const toolItems = [
  { label: "Properties",   href: "/properties",   icon: PropertiesIcon,  accent: "#1BC47D" },
  { label: "Clients",      href: "/clients",      icon: ClientsIcon,     accent: "#1BC47D" },
  { label: "Analytics",    href: "/analytics",    icon: AnalyticsIcon,   accent: "#1BC47D" },
  { label: "AI Tools",     href: "/ai-tools",     icon: AIIcon,          accent: "#1BC47D" },
  { label: "Secure Share", href: "/secure-share", icon: SecureShareIcon, accent: "#6366F1" },
  { label: "Import Leads", href: "/newspaper",    icon: NewspaperIcon,   accent: "#1BC47D" },
];

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  // Auto-open Tools section if the current route is inside it
  const isOnToolPage = toolItems.some(({ href }) => pathname === href || pathname.startsWith(href + "/"));
  const [toolsOpen,    setToolsOpen]    = useState(isOnToolPage);
  const [userName,     setUserName]     = useState("");
  const [userEmail,    setUserEmail]    = useState("");
  const [todayCount,   setTodayCount]   = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  // Keep Tools open when navigating to a tool page from outside the sidebar
  useEffect(() => {
    if (isOnToolPage) setToolsOpen(true);
  }, [pathname, isOnToolPage]);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User";
        setUserName(name);
        setUserEmail(user.email ?? "");
      }
    }
    loadUser();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    supabase
      .from("newspaper_leads")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("uploaded_at", todayStart.toISOString())
      .then(({ count }) => { if (count) setTodayCount(count); });

    const OVERDUE: Partial<Record<string, number>> = {
      negotiating: 1, new: 1, viewing: 2, contacted: 4,
    };
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      Promise.all([getAllLeads(), getFollowUpLogs(u?.id ?? "")]).then(([leads, logs]) => {
        const lastLogMap: Record<string, string> = {};
        logs.forEach((l) => { if (!lastLogMap[l.lead_id]) lastLogMap[l.lead_id] = l.created_at; });
        let count = 0;
        const today = new Date().toISOString().slice(0, 10);
        leads.forEach((lead) => {
          if (lead.stage === "closed" || lead.stage === "lost") return;
          if (lead.next_follow_up_at && lead.next_follow_up_at.slice(0, 10) > today) return;
          const last = lastLogMap[lead.id] ?? lead.created_at;
          const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
          const threshold = OVERDUE[lead.stage] ?? 999;
          if (days >= threshold) count++;
        });
        setOverdueCount(count);
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Shared nav-link renderer
  function NavLink({ label, href, icon: Icon, accent }: { label: string; href: string; icon: (p: { active: boolean }) => React.ReactNode; accent: string }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className="flex items-center gap-2.5 rounded-xl transition-colors"
        style={{
          padding:      "8px 10px",
          background:   active ? `${accent}18` : "transparent",
          color:        active ? accent : "#6B7280",
          fontWeight:   active ? 600 : 400,
          fontSize:     13.5,
          marginBottom: 1,
        }}
        onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "#F5F7FA"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}}
        onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}}
      >
        <Icon active={active} />
        <span className="flex-1">{label}</span>
        {href === "/newspaper" && todayCount > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, background: "#EF4444", color: "white", borderRadius: 99, minWidth: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
            {todayCount > 99 ? "99+" : todayCount}
          </span>
        )}
        {href === "/follow-ups" && overdueCount > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, background: "#EF4444", color: "white", borderRadius: 99, minWidth: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
            {overdueCount > 99 ? "99+" : overdueCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside className="flex flex-col w-56 h-screen sticky top-0 shrink-0 overflow-hidden" style={{ background: "#fff", borderRight: "1px solid #EEF1F6" }}>

      {/* Logo */}
      <div className="flex items-center px-4 border-b" style={{ paddingTop: 20, paddingBottom: 16, borderColor: "#F0F3F8" }}>
        <div className="flex items-end gap-0.5 shrink-0">
          <div style={{ width: 8, height: 18, borderRadius: 3, background: "#1BC47D" }} />
          <div style={{ width: 8, height: 12, borderRadius: 3, background: "#1BC47D55" }} />
        </div>
        <span className="font-extrabold tracking-tight ml-2" style={{ fontSize: 15, color: "#1A1D23", letterSpacing: "-0.02em" }}>
          EstatePro
        </span>
      </div>

      {/* Nav */}
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ padding: "10px 8px 6px" }}>

        {/* ── Main group ── */}
        <p className="px-2 pb-1" style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Main
        </p>
        {mainItems.map((item) => <NavLink key={item.href} {...item} />)}

        {/* ── Tools group (collapsible) ── */}
        <button
          onClick={() => setToolsOpen((v) => !v)}
          className="flex items-center justify-between w-full rounded-lg px-2 py-1 transition-colors"
          style={{ marginTop: 14, marginBottom: 4, background: "transparent", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F5F7FA"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
            Tools
          </p>
          <svg
            width="12" height="12" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24"
            style={{ transition: "transform 0.2s", transform: toolsOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {toolsOpen && toolItems.map((item) => <NavLink key={item.href} {...item} />)}

        {/* ── Settings & Help ── */}
        <p className="px-2 pb-1" style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 14, marginBottom: 0 }}>
          Settings & Help
        </p>

        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-xl transition-colors"
          style={{
            padding:      "8px 10px",
            background:   isActive("/settings") ? "#1BC47D18" : "transparent",
            color:        isActive("/settings") ? "#1BC47D" : "#6B7280",
            fontWeight:   isActive("/settings") ? 600 : 400,
            fontSize:     13.5,
            marginBottom: 1,
          }}
          onMouseEnter={(e) => { if (!isActive("/settings")) { (e.currentTarget as HTMLElement).style.background = "#F5F7FA"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}}
          onMouseLeave={(e) => { if (!isActive("/settings")) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}}
        >
          <SettingsIcon active={isActive("/settings")} />
          Settings
        </Link>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 rounded-xl transition-colors w-full text-left"
          style={{ padding: "8px 10px", fontSize: 13.5, color: "#6B7280", marginBottom: 1, background: "transparent", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FEF2F2"; (e.currentTarget as HTMLElement).style.color = "#EF4444"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}
        >
          <LogoutIcon />
          Sign out
        </button>
      </div>

      {/* User info */}
      <div className="flex items-center gap-2.5 px-3 py-3" style={{ borderTop: "1px solid #EEF1F6" }}>
        <div className="shrink-0 flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: "#1BC47D" }}>
          <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>
            {userName ? getInitials(userName) : "…"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate" style={{ fontSize: 12, fontWeight: 600, color: "#1A1D23" }}>
            {userName || "Loading..."}
          </p>
          <p className="truncate" style={{ fontSize: 10, color: "#9CA3AF" }}>{userEmail}</p>
        </div>
      </div>
    </aside>
  );
}

// ── Icons — all inherit color from parent via currentColor ──────────────────

function DashboardIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" style={{ color: active ? "#1BC47D" : "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function LeadsIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" style={{ color: active ? "#1BC47D" : "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function PropertiesIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" style={{ color: active ? "#1BC47D" : "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
}
function ClientsIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" style={{ color: active ? "#1BC47D" : "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function FollowUpIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" style={{ color: active ? "#1BC47D" : "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
}
function TasksIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" style={{ color: active ? "#1BC47D" : "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
}
function AnalyticsIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" style={{ color: active ? "#1BC47D" : "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function AIIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" style={{ color: active ? "#1BC47D" : "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
}
function SettingsIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" style={{ color: active ? "#1BC47D" : "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function NewspaperIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" style={{ color: active ? "#1BC47D" : "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>;
}
function SecureShareIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" style={{ color: active ? "#6366F1" : "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
}
function LogoutIcon() {
  return <svg className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
}
