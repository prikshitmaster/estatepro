"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const actions = [
  { label: "Add Lead",          href: "/leads/new",           bg: "#1BC47D", icon: <AddLeadIcon /> },
  { label: "Log Call",          href: "/leads",               bg: "#1BC47D", icon: <PhoneIcon />   },
  { label: "Add Property",      href: "/properties/new",      bg: "#1BC47D", icon: <BuildingIcon /> },
  { label: "Create Share Link", href: "/secure-share/create", bg: "#6366F1", icon: <ShareIcon />   },
];

export default function QuickAction() {
  const [open, setOpen]   = useState(false);
  const router            = useRouter();

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Container — above mobile bottom nav, bottom-right on desktop */}
      <div className="fixed right-4 bottom-20 md:bottom-6 z-50 flex flex-col items-end gap-2.5">

        {/* Action pills — stacked above the + button */}
        {open && [...actions].reverse().map(({ label, href, bg, icon }) => (
          <button
            key={href}
            onClick={() => { router.push(href); setOpen(false); }}
            className="flex items-center gap-2.5 cursor-pointer"
            style={{ animation: "qaSlide 0.15s ease both" }}
          >
            <span style={{
              background:   "#fff",
              color:        "#1A1D23",
              padding:      "7px 14px",
              borderRadius: 24,
              fontSize:     13,
              fontWeight:   600,
              boxShadow:    "0 2px 14px rgba(0,0,0,0.13)",
              whiteSpace:   "nowrap",
              border:       "1px solid #EEF1F6",
            }}>
              {label}
            </span>
            <div style={{
              width:         40,
              height:        40,
              borderRadius:  "50%",
              background:    bg,
              display:       "flex",
              alignItems:    "center",
              justifyContent:"center",
              flexShrink:    0,
              boxShadow:     "0 2px 10px rgba(0,0,0,0.18)",
            }}>
              {icon}
            </div>
          </button>
        ))}

        {/* Main + button */}
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            width:         52,
            height:        52,
            borderRadius:  "50%",
            background:    open ? "#1A1D23" : "#1BC47D",
            color:         "#fff",
            fontSize:      28,
            lineHeight:    1,
            display:       "flex",
            alignItems:    "center",
            justifyContent:"center",
            border:        "none",
            cursor:        "pointer",
            boxShadow:     open
              ? "0 4px 16px rgba(0,0,0,0.25)"
              : "0 4px 16px rgba(27,196,125,0.45)",
            transition:    "background 0.2s, transform 0.2s, box-shadow 0.2s",
            transform:     open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          +
        </button>
      </div>

      <style>{`
        @keyframes qaSlide {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

function AddLeadIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="#fff" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="#fff" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="#fff" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="#fff" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}
