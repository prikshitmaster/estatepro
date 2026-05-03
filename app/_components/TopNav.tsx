// app/_components/TopNav.tsx — FUB-style horizontal top navigation bar (desktop)
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PRIMARY_NAV = [
  { label: "Dashboard",    href: "/dashboard"    },
  { label: "Leads",        href: "/leads"        },
  { label: "My Calls",     href: "/follow-ups"   },
  { label: "Properties",   href: "/properties"   },
  { label: "Tasks",        href: "/tasks"        },
];

const MORE_NAV = [
  { label: "Auto Capture ⚡",   href: "/auto-capture"  },
  { label: "Site Visits",       href: "/visits"        },
  { label: "Commission",        href: "/deals"         },
  { label: "Clients",           href: "/clients"       },
  { label: "Property Links",    href: "/secure-share"  },
  { label: "Newspaper Leads",   href: "/newspaper"     },
  { label: "Msg Templates",     href: "/ai-tools"      },
  { label: "Reports",           href: "/analytics"     },
];

export default function TopNav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [userName,    setUserName]    = useState("");
  const [userEmail,   setUserEmail]   = useState("");
  const [moreOpen,    setMoreOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search,      setSearch]      = useState("");
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [allLeads,    setAllLeads]    = useState<{ id: string; name: string; phone: string }[]>([]);

  const moreRef    = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLDivElement>(null);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const moreActive = MORE_NAV.some(({ href }) => isActive(href));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "");
      setUserEmail(user.email ?? "");
    });
    // Load leads for global search
    import("@/lib/db/leads").then(({ getAllLeads }) =>
      getAllLeads().then((leads) =>
        setAllLeads(leads.map((l) => ({ id: l.id, name: l.name, phone: l.phone })))
      ).catch(() => {})
    );
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (moreRef.current    && !moreRef.current.contains(e.target as Node))    setMoreOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (searchRef.current  && !searchRef.current.contains(e.target as Node))  setSearchOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const searchResults = search.trim().length > 0
    ? allLeads.filter((l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search)
      ).slice(0, 6)
    : [];

  const initials = userName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "U";

  return (
    <header
      className="hidden md:flex items-center gap-0 sticky top-0 z-50 h-14 px-4"
      style={{ background: "#1e293b", borderBottom: "1px solid #334155" }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 mr-6 shrink-0">
        <div className="flex items-end gap-0.5">
          <div style={{ width: 7, height: 16, borderRadius: 3, background: "#1BC47D" }} />
          <div style={{ width: 7, height: 11, borderRadius: 3, background: "#1BC47D55" }} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
          EstatePro
        </span>
      </Link>

      {/* Primary nav */}
      <nav className="flex items-center h-full">
        {PRIMARY_NAV.map(({ label, href }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center h-full px-4 text-sm font-medium relative transition-colors"
              style={{ color: active ? "#ffffff" : "#94a3b8" }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "#e2e8f0"; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
            >
              {label}
              {active && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full" style={{ background: "#1BC47D" }} />
              )}
            </Link>
          );
        })}

        {/* More dropdown */}
        <div ref={moreRef} className="relative h-full flex items-center">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="flex items-center gap-1 h-full px-4 text-sm font-medium transition-colors relative"
            style={{ color: moreActive || moreOpen ? "#ffffff" : "#94a3b8", background: "transparent", border: "none", cursor: "pointer" }}
          >
            More
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ transform: moreOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
            {moreActive && <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full" style={{ background: "#1BC47D" }} />}
          </button>

          {moreOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl z-50 py-1 overflow-hidden"
              style={{ border: "1px solid #e2e8f0" }}>
              {MORE_NAV.map(({ label, href }) => (
                <Link key={href} href={href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center px-4 py-2.5 text-sm transition-colors"
                  style={{ color: isActive(href) ? "#1BC47D" : "#374151", fontWeight: isActive(href) ? 600 : 400 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                  {isActive(href) && <span className="mr-2 text-[10px]">✓</span>}
                  {label}
                </Link>
              ))}
              <div style={{ borderTop: "1px solid #F3F4F6" }}>
                <Link href="/settings" onClick={() => setMoreOpen(false)}
                  className="flex items-center px-4 py-2.5 text-sm text-gray-700"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                  Settings
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div ref={searchRef} className="relative mr-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: "#334155", border: "1px solid #475569", width: 220 }}>
          <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "#94a3b8" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: "#f1f5f9", caretColor: "#1BC47D" }}
          />
          {search && (
            <button onClick={() => { setSearch(""); setSearchOpen(false); }} style={{ color: "#64748b" }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {searchOpen && searchResults.length > 0 && (
          <div className="absolute top-full right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl z-50 overflow-hidden"
            style={{ border: "1px solid #e2e8f0" }}>
            {searchResults.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`}
                onClick={() => { setSearch(""); setSearchOpen(false); }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[10px] font-bold shrink-0">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                  <p className="text-xs text-gray-400">{lead.phone}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add Lead */}
      <Link href="/leads/new"
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold mr-3 shrink-0 transition-opacity hover:opacity-90"
        style={{ background: "#1BC47D", color: "#fff" }}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        Add Lead
      </Link>

      {/* User avatar */}
      <div ref={profileRef} className="relative">
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#334155"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "#1BC47D" }}>
            {initials}
          </div>
          <svg className="w-3.5 h-3.5" style={{ color: "#64748b" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl z-50 overflow-hidden"
            style={{ border: "1px solid #e2e8f0" }}>
            <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
              <p className="text-sm font-semibold text-gray-900">{userName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{userEmail}</p>
            </div>
            <div className="py-1">
              <Link href="/settings" onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Settings
              </Link>
              <Link href="/upgrade" onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <span>⚡</span> Upgrade Plan
              </Link>
            </div>
            <div className="py-1" style={{ borderTop: "1px solid #F3F4F6" }}>
              <button onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
