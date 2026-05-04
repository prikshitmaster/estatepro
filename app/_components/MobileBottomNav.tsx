// app/_components/MobileBottomNav.tsx — fixed bottom tab bar for mobile
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mainTabs = [
  { label: "Home",       href: "/dashboard",    icon: HomeIcon    },
  { label: "Leads",      href: "/leads",        icon: UsersIcon   },
  { label: "Tasks",      href: "/tasks",        icon: TasksIcon   },
  { label: "Properties", href: "/properties",   icon: BuildingIcon},
];

const moreItems = [
  { label: "Auto Capture",     href: "/auto-capture", icon: CaptureIcon   },
  { label: "Action Plans",     href: "/action-plans", icon: ActionPlanIcon},
  { label: "Site Visits",      href: "/visits",       icon: CalendarIcon  },
  { label: "Commission",       href: "/deals",        icon: CoinIcon      },
  { label: "Clients",          href: "/clients",      icon: ClientIcon    },
  { label: "Property Links",   href: "/secure-share", icon: LinkIcon      },
  { label: "Newspaper Leads",  href: "/newspaper",    icon: NewsIcon      },
  { label: "Message Templates",href: "/ai-tools",     icon: MsgIcon       },
  { label: "Reports",          href: "/analytics",    icon: ChartIcon     },
  { label: "Settings",         href: "/settings",     icon: SettingsIcon  },
];

export default function MobileBottomNav() {
  const pathname  = usePathname();
  const [open, setOpen] = useState(false);

  const moreActive = moreItems.some(({ href }) => pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      {/* ── Bottom Tab Bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex safe-area-bottom sm:hidden"
        style={{ background: "#fff", borderTop: "1px solid #EEF1F6" }}
      >
        {mainTabs.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors"
              style={{ color: active ? "#1BC47D" : "#9CA3AF" }}
            >
              <Icon active={active} />
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 500 }}>{label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors"
          style={{ color: open || moreActive ? "#1BC47D" : "#9CA3AF", background: "transparent", border: "none" }}
        >
          <MoreIcon active={open || moreActive} />
          <span style={{ fontSize: 10, fontWeight: open || moreActive ? 600 : 500 }}>More</span>
        </button>
      </nav>

      {/* ── More drawer backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-30 sm:hidden"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── More drawer panel ── */}
      <div
        className="fixed left-0 right-0 z-40 sm:hidden rounded-t-2xl overflow-hidden"
        style={{
          bottom: 57,
          background: "#fff",
          borderTop: "1px solid #EEF1F6",
          transform: open ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1D23" }}>All Tools</p>
          <button
            onClick={() => setOpen(false)}
            style={{ background: "#F3F4F6", border: "none", borderRadius: 99, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <svg width="14" height="14" fill="none" stroke="#6B7280" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-0 px-2 pb-4">
          {moreItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-colors"
                style={{ color: active ? "#1BC47D" : "#374151", background: active ? "#F0FDF9" : "transparent" }}
              >
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{ width: 44, height: 44, background: active ? "#1BC47D18" : "#F5F7FA" }}
                >
                  <Icon active={active} />
                </div>
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, textAlign: "center", lineHeight: 1.3, color: active ? "#1BC47D" : "#374151" }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function UsersIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function TasksIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
}
function PhoneIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
}
function BuildingIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
}
function CaptureIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
}
function ActionPlanIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
}
function CalendarIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
function CoinIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function ClientIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function LinkIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
}
function NewsIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>;
}
function MsgIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
}
function ChartIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function SettingsIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function MoreIcon({ active }: { active: boolean }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M4 6h16M4 12h16M4 18h16" /></svg>;
}
