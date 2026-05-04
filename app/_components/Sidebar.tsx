// app/_components/Sidebar.tsx — FUB-style dark sidebar for desktop
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAllLeads } from "@/lib/db/leads";
// ── Nav structure ─────────────────────────────────────────────────────────────

const coreItems = [
  { label: "Dashboard",       href: "/dashboard",    icon: DashboardIcon  },
  { label: "Leads",           href: "/leads",        icon: LeadsIcon      },
  { label: "Tasks",           href: "/tasks",        icon: TasksIcon      },
  { label: "Auto Capture",    href: "/auto-capture", icon: CaptureIcon    },
];

const toolItems = [
  { label: "Properties",       href: "/properties",   icon: BuildingIcon  },
  { label: "Site Visits",      href: "/visits",       icon: CalendarIcon  },
  { label: "Commission",       href: "/deals",        icon: CoinIcon      },
  { label: "Clients",          href: "/clients",      icon: ClientIcon    },
  { label: "Property Links",   href: "/secure-share", icon: LinkIcon      },
  { label: "Newspaper Leads",  href: "/newspaper",    icon: NewsIcon      },
  { label: "Msg Templates",    href: "/ai-tools",     icon: MsgIcon       },
  { label: "Reports",          href: "/analytics",    icon: ChartIcon     },
];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const isOnTool = toolItems.some(({ href }) => pathname === href || pathname.startsWith(href + "/"));
  const [toolsOpen,    setToolsOpen]    = useState(isOnTool);
  const [userName,     setUserName]     = useState("");
  const [userEmail,    setUserEmail]    = useState("");
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => { if (isOnTool) setToolsOpen(true); }, [pathname, isOnTool]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "");
      setUserEmail(user.email ?? "");

      const OVERDUE: Partial<Record<string, number>> = { negotiating: 1, new: 1, viewing: 2, contacted: 4 };
      getAllLeads().then((leads) => {
        const today = new Date().toISOString().slice(0, 10);
        let n = 0;
        leads.forEach((lead) => {
          if (lead.stage === "closed" || lead.stage === "lost") return;
          if (lead.next_follow_up_at && lead.next_follow_up_at.slice(0, 10) > today) return;
          const days = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000);
          if (days >= (OVERDUE[lead.stage] ?? 999)) n++;
        });
        setOverdueCount(n);
      }).catch(() => {});
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className="hidden md:flex flex-col w-56 h-screen sticky top-0 shrink-0 overflow-hidden"
      style={{ background: "#111827", borderRight: "1px solid #1F2937" }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 px-4 py-5" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-end gap-0.5 shrink-0">
          <div style={{ width: 8, height: 18, borderRadius: 3, background: "#1BC47D" }} />
          <div style={{ width: 8, height: 12, borderRadius: 3, background: "#1BC47D44" }} />
        </div>
        <span className="font-extrabold tracking-tight text-white" style={{ fontSize: 15, letterSpacing: "-0.02em" }}>
          EstatePro
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex flex-col flex-1 overflow-y-auto py-3 px-2 gap-0.5">

        {/* Core section */}
        <SectionLabel>Core</SectionLabel>
        {coreItems.map(({ label, href, icon: Icon }) => (
          <NavItem key={href} href={href} active={active(href)} onClick={() => {}}>
            <Icon active={active(href)} />
            <span className="flex-1 truncate">{label}</span>
            {href === "/leads" && overdueCount > 0 && <Badge n={overdueCount} />}
          </NavItem>
        ))}

        {/* Tools section (collapsible) */}
        <button
          onClick={() => setToolsOpen((v) => !v)}
          className="flex items-center justify-between w-full rounded-lg px-2 py-1.5 mt-3 transition-colors"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#1F2937"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: "#4B5563", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Tools
          </span>
          <svg width="12" height="12" fill="none" stroke="#4B5563" viewBox="0 0 24 24"
            style={{ transform: toolsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {toolsOpen && toolItems.map(({ label, href, icon: Icon }) => (
          <NavItem key={href} href={href} active={active(href)} onClick={() => {}}>
            <Icon active={active(href)} />
            <span className="flex-1 truncate">{label}</span>
          </NavItem>
        ))}

        {/* Upgrade banner */}
        <Link
          href="/upgrade"
          className="flex items-center gap-2 rounded-xl mt-4 mx-0"
          style={{
            padding: "10px 11px",
            background: "linear-gradient(135deg, #1BC47D22, #6366F122)",
            border: "1px solid #1BC47D33",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: 14 }}>⚡</span>
          <div className="min-w-0 flex-1">
            <p style={{ fontSize: 11.5, fontWeight: 700, color: "#E5E7EB" }}>Upgrade Plan</p>
            <p style={{ fontSize: 10, color: "#6B7280" }}>Starter · Pro · Team</p>
          </div>
        </Link>

        {/* Settings */}
        <div className="mt-2">
          <NavItem href="/settings" active={active("/settings")} onClick={() => {}}>
            <SettingsIcon active={active("/settings")} />
            <span className="flex-1">Settings</span>
          </NavItem>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 w-full text-left rounded-xl transition-colors"
            style={{ padding: "7px 10px", background: "transparent", border: "none", cursor: "pointer", fontSize: 13, color: "#6B7280" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#7F1D1D22"; (e.currentTarget as HTMLElement).style.color = "#FCA5A5"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>
      </nav>

      {/* ── User footer ── */}
      <div
        className="flex items-center gap-2.5 px-3 py-3"
        style={{ borderTop: "1px solid #1F2937" }}
      >
        <div
          className="shrink-0 flex items-center justify-center rounded-full text-white font-bold"
          style={{ width: 30, height: 30, background: "#1BC47D", fontSize: 11 }}
        >
          {userName ? getInitials(userName) : "…"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-white" style={{ fontSize: 12, fontWeight: 600 }}>
            {userName || "Loading…"}
          </p>
          <p className="truncate" style={{ fontSize: 10, color: "#6B7280" }}>{userEmail}</p>
        </div>
      </div>
    </aside>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pb-1 pt-1" style={{ fontSize: 10, fontWeight: 700, color: "#4B5563", letterSpacing: "0.08em", textTransform: "uppercase" }}>
      {children}
    </p>
  );
}

function NavItem({
  href, active, onClick, children,
}: {
  href: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl transition-all"
      style={{
        padding:    "7px 10px",
        fontSize:   13,
        fontWeight: active ? 600 : 400,
        color:      active ? "#ffffff" : "#9CA3AF",
        background: active ? "#1BC47D22" : "transparent",
        borderLeft: active ? "3px solid #1BC47D" : "3px solid transparent",
        marginBottom: 1,
      }}
      onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "#1F2937"; (e.currentTarget as HTMLElement).style.color = "#E5E7EB"; } }}
      onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; } }}
    >
      {children}
    </Link>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, background: "#EF4444", color: "white",
      borderRadius: 99, minWidth: 16, height: 16, display: "flex",
      alignItems: "center", justifyContent: "center", padding: "0 4px",
    }}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

// ── Icons (all use currentColor so parent color drives them) ──────────────────

function DashboardIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function LeadsIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function PhoneIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
}
function TasksIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
}
function CaptureIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
}
function BuildingIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
}
function CalendarIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
function CoinIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function ClientIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function LinkIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
}
function NewsIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>;
}
function MsgIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
}
function ChartIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function SettingsIcon({ active }: { active: boolean }) {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function LogoutIcon() {
  return <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
}
