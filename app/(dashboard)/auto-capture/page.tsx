"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tab = "99acres" | "magicbricks" | "housing" | "test";

interface GmailConnection {
  google_email:    string;
  last_checked_at: string;
  leads_captured:  number;
  active:          boolean;
}

export default function AutoCapturePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [userId,       setUserId]       = useState("");
  const [uniqueId,     setUniqueId]     = useState("");
  const [loading,      setLoading]      = useState(true);
  const [gmailConn,    setGmailConn]    = useState<GmailConnection | null>(null);
  const [connecting,   setConnecting]   = useState(false);
  const [disconnecting,setDisconnecting]= useState(false);
  const [activeTab,    setActiveTab]    = useState<Tab>("99acres");
  const [copied,       setCopied]       = useState(false);
  const [testResult,   setTestResult]   = useState<string | null>(null);
  const [testParsed,   setTestParsed]   = useState<Record<string, string | number | null> | null>(null);
  const [testing,      setTesting]      = useState(false);
  const [setupError,   setSetupError]   = useState<string | null>(null);
  const [gmailMsg,     setGmailMsg]     = useState<string | null>(null);

  useEffect(() => {
    // Show feedback from OAuth redirect
    const connected = searchParams.get("gmail_connected");
    const err       = searchParams.get("gmail_error");
    if (connected) setGmailMsg("✅ Gmail connected! Leads will start appearing automatically.");
    if (err === "denied")           setGmailMsg("❌ You denied Gmail access. Try again.");
    if (err === "no_refresh_token") setGmailMsg("❌ Go to myaccount.google.com/permissions → remove EstatePro → reconnect.");
    if (err && err !== "denied" && err !== "no_refresh_token") setGmailMsg(`❌ Connection failed: ${err}`);
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);

      // Load webhook inbox token
      const { data: inbox, error: inboxErr } = await supabase
        .from("user_inboxes")
        .select("unique_id")
        .eq("user_id", user.id)
        .single();

      if (inboxErr && inboxErr.code !== "PGRST116") {
        setSetupError("Run supabase/auto-capture-migration.sql first, then refresh.");
      } else if (inbox) {
        setUniqueId(inbox.unique_id);
      } else {
        const { data: created } = await supabase
          .from("user_inboxes")
          .insert({ user_id: user.id })
          .select("unique_id")
          .single();
        if (created) setUniqueId(created.unique_id);
      }

      // Load Gmail connection
      const { data: gmail } = await supabase
        .from("gmail_connections")
        .select("google_email, last_checked_at, leads_captured, active")
        .eq("user_id", user.id)
        .single();
      if (gmail) setGmailConn(gmail as GmailConnection);

      setLoading(false);
    }
    load();
  }, [router]);

  const webhookUrl = uniqueId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/inbound-email?id=${uniqueId}`
    : "";

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleConnect() {
    if (!userId) return;
    setConnecting(true);
    window.location.href = `/api/auth/google?user_id=${userId}`;
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Gmail? Auto-capture will stop until you reconnect.")) return;
    setDisconnecting(true);
    await supabase.from("gmail_connections").delete().eq("user_id", userId);
    setGmailConn(null);
    setDisconnecting(false);
  }

  async function runTest() {
    if (!webhookUrl) return;
    setTesting(true);
    setTestResult(null);
    setTestParsed(null);
    try {
      const res  = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from:    "noreply@99acres.com",
          subject: "New Lead for Your Property",
          text:    "Name: Test Lead\nPhone: 9876543210\nEmail: testlead@gmail.com\nCity: Mumbai\nBudget: Rs. 50 Lac - Rs. 1 Cr\nBedrooms: 2 BHK\nMessage: Test auto-capture lead",
          html:    "",
        }),
      });
      const json = await res.json();
      if (json.parsed) setTestParsed(json.parsed);
      if (json.success)      setTestResult("✅ Lead created! Check your Leads page.");
      else if (json.skipped) setTestResult(`⚠️ ${json.reason} — system working correctly.`);
      else                   setTestResult(`❌ Error: ${json.error || "Unknown"}`);
    } catch {
      setTestResult("❌ Could not reach API — use your Vercel URL, not localhost.");
    }
    setTesting(false);
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
    </div>
  );

  if (setupError) return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-28">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <p className="text-sm font-bold text-red-800 mb-2">⚠️ Migration needed</p>
        <p className="text-xs text-red-700">{setupError}</p>
      </div>
    </div>
  );

  const lastChecked = gmailConn?.last_checked_at
    ? new Date(gmailConn.last_checked_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="p-4 sm:p-6 pb-28 sm:pb-10 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">⚡</span>
          <h1 className="text-xl font-bold text-gray-900">Auto Lead Capture</h1>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wide">FREE</span>
        </div>
        <p className="text-sm text-gray-500">
          Leads from 99acres, MagicBricks, Housing &amp; 15 more portals appear automatically — zero manual entry.
        </p>
      </div>

      {/* Gmail feedback message */}
      {gmailMsg && (
        <div className={`mb-4 px-4 py-3 rounded-2xl text-sm font-medium border ${
          gmailMsg.startsWith("✅") ? "bg-emerald-50 border-emerald-100 text-emerald-800"
          : "bg-red-50 border-red-100 text-red-700"
        }`}>
          {gmailMsg}
        </div>
      )}

      {/* ── Gmail Connect Card ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
        {gmailConn ? (
          /* Connected state */
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg shrink-0">
                  📧
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    Gmail Connected
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  </p>
                  <p className="text-xs text-gray-500">{gmailConn.google_email}</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors shrink-0"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-[10px] text-gray-400 uppercase font-medium">Leads Captured</p>
                <p className="text-lg font-bold text-gray-900">{gmailConn.leads_captured ?? 0}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-[10px] text-gray-400 uppercase font-medium">Last Checked</p>
                <p className="text-sm font-bold text-gray-900">{lastChecked ?? "Never"}</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              📡 Your Gmail is scanned every 5 minutes automatically. New portal leads appear instantly.
            </p>
          </div>
        ) : (
          /* Not connected state */
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-2xl mx-auto mb-3">
              📧
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">Connect Your Gmail</p>
            <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">
              One click. We read portal lead emails automatically every 5 minutes. Read-only access — we can never send or delete anything.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-3 text-sm font-bold text-white rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              style={{ background: "#1BC47D" }}
            >
              {connecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <GoogleIcon />
                  Connect Gmail — 1 Click
                </>
              )}
            </button>
            <p className="text-[11px] text-gray-400 mt-2">
              Only reads emails from property portals. Disconnect anytime.
            </p>
          </div>
        )}
      </div>

      {/* How it works — updated */}
      <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
        <div className="flex items-center gap-1 text-lg shrink-0">
          <span>📩</span>
          <span className="text-gray-400 text-xs mx-1">→</span>
          <span>⚡</span>
          <span className="text-gray-400 text-xs mx-1">→</span>
          <span>👤</span>
        </div>
        <p className="text-xs text-blue-700 font-medium">
          Portal email → EstatePro reads Gmail every 5 min → Lead created automatically
        </p>
      </div>

      {/* Portals covered */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Portals Covered (18)</p>
        <div className="flex flex-wrap gap-1.5">
          {["99acres","MagicBricks","Housing.com","NoBroker","PropTiger","SquareYards",
            "CommonFloor","Makaan","JustDial","Sulekha","OLX","Quikr",
            "NestAway","Anarock","Zameen","Bayut","Facebook","Instagram"].map(p => (
            <span key={p} className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-[11px] text-gray-600 font-medium">
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Portal notification tabs */}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
        Enable email notifications on each portal
      </p>
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-4 overflow-x-auto">
        {([
          { key: "99acres"     as Tab, label: "99acres"     },
          { key: "magicbricks" as Tab, label: "MagicBricks" },
          { key: "housing"     as Tab, label: "Housing.com" },
          { key: "test"        as Tab, label: "🧪 Test"     },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "99acres" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500">Make sure 99acres sends lead notifications to the Gmail you connected above.</p>
          <StepCard step={1} title="Log in to 99acres.com">Go to <strong>My Account → Account Settings → Notification Settings</strong>.</StepCard>
          <StepCard step={2} title="Set notification email">Set it to the same Gmail you just connected above.</StepCard>
          <StepCard step={3} title="Enable email notifications">Turn ON <strong>New Lead Notifications</strong> and <strong>Enquiry Emails</strong>. Save.</StepCard>
        </div>
      )}

      {activeTab === "magicbricks" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500">Enable email notifications in your MagicBricks broker account.</p>
          <StepCard step={1} title="Log in to MagicBricks">Go to <strong>My Account → Manage Account → Communication Preferences</strong>.</StepCard>
          <StepCard step={2} title="Enable lead notifications">Turn ON <strong>New Buyer Enquiry</strong> email to the connected Gmail.</StepCard>
        </div>
      )}

      {activeTab === "housing" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500">Enable email notifications in your Housing.com account.</p>
          <StepCard step={1} title="Log in to Housing.com">Go to <strong>My Listings → Notification Settings</strong>.</StepCard>
          <StepCard step={2} title="Enable email alerts">Turn ON <strong>New Enquiry Email</strong> to the connected Gmail.</StepCard>
        </div>
      )}

      {activeTab === "test" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">Send a fake lead to verify parsing is working correctly.</p>
          <div className="bg-gray-50 rounded-2xl p-4 font-mono text-xs text-gray-600 border border-gray-200">
            <p className="text-gray-400 mb-1">// Simulates a 99acres lead email</p>
            <p>Name: Test Lead · Phone: 9876543210</p>
            <p>City: Mumbai · Budget: ₹50L–₹1Cr · 2 BHK</p>
          </div>
          <button
            onClick={runTest}
            disabled={testing}
            className="py-3 text-sm font-bold text-white rounded-2xl transition-all disabled:opacity-60 active:scale-95"
            style={{ background: "#1BC47D" }}
          >
            {testing ? "Sending…" : "🧪 Send Test Lead"}
          </button>

          {testResult && (
            <div className={`px-4 py-3 rounded-2xl text-sm font-medium border ${
              testResult.startsWith("✅") ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : testResult.startsWith("⚠️") ? "bg-amber-50 border-amber-100 text-amber-800"
              : "bg-red-50 border-red-100 text-red-800"
            }`}>
              {testResult}
            </div>
          )}

          {testParsed && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Parser Debug</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { key: "name", label: "Name" }, { key: "phone", label: "Phone" },
                  { key: "email", label: "Email" }, { key: "location", label: "City" },
                  { key: "budget_max", label: "Budget" }, { key: "property_interest", label: "BHK" },
                  { key: "source", label: "Portal" }, { key: "message", label: "Message" },
                ].map(({ key, label }) => {
                  const val    = testParsed[key];
                  const hasVal = val !== null && val !== undefined && val !== 0 && val !== "";
                  return (
                    <div key={key} className="flex items-start gap-2 min-w-0">
                      <span className={`text-sm shrink-0 ${hasVal ? "text-emerald-500" : "text-red-400"}`}>{hasVal ? "✓" : "✗"}</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase font-medium">{label}</p>
                        <p className={`text-xs font-semibold truncate ${hasVal ? "text-gray-800" : "text-gray-300"}`}>
                          {hasVal ? String(val) : "not found"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-white border border-gray-100 rounded-2xl p-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">{step}</div>
      <div>
        <p className="text-sm font-bold text-gray-800 mb-0.5">{title}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
