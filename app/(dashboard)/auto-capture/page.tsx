"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const MAILGUN_DOMAIN = "mg.rateperfeet.com";

const PORTALS = [
  "99acres","MagicBricks","Housing.com","NoBroker","PropTiger","SquareYards",
  "CommonFloor","Makaan","JustDial","Sulekha","OLX","Quikr",
  "NestAway","Anarock","Zameen","Bayut","Facebook","Instagram",
];

const GMAIL_FILTER = [
  "*@99acres.com",
  "*@magicbricks.com",
  "*@housing.com",
  "*@nobroker.in",
  "*@proptiger.com",
  "*@squareyards.com",
  "*@commonfloor.com",
  "*@makaan.com",
  "*@justdial.com",
  "*@sulekha.com",
  "*@olx.in",
  "*@quikr.com",
  "*@nestaway.com",
  "*@anarock.com",
  "*@zameen.com",
  "*@bayut.com",
].join(" OR ");

export default function AutoCapturePage() {
  const router = useRouter();

  const [uniqueId,    setUniqueId]    = useState("");
  const [loading,     setLoading]     = useState(true);
  const [setupError,  setSetupError]  = useState<string | null>(null);
  const [copied,      setCopied]      = useState<"email" | "filter" | null>(null);
  const [testResult,  setTestResult]  = useState<string | null>(null);
  const [testParsed,  setTestParsed]  = useState<Record<string, string | number | null> | null>(null);
  const [testing,     setTesting]     = useState(false);
  const [leadCount,   setLeadCount]   = useState<number>(0);
  const [activeStep,  setActiveStep]  = useState<1 | 2 | 3>(1);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      // Load or create inbox token
      const { data: inbox, error: inboxErr } = await supabase
        .from("user_inboxes")
        .select("unique_id")
        .eq("user_id", user.id)
        .single();

      if (inboxErr && inboxErr.code !== "PGRST116") {
        setSetupError("Database migration needed. Run supabase/auto-capture-migration.sql then refresh.");
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

      // Count captured leads (source = ad = portal leads)
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("source", "ad");
      setLeadCount(count ?? 0);

      setLoading(false);
    }
    load();
  }, [router]);

  const crmEmail = uniqueId ? `capture-${uniqueId}@${MAILGUN_DOMAIN}` : "";

  function copy(type: "email" | "filter", text: string) {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  async function runTest() {
    if (!uniqueId) return;
    setTesting(true);
    setTestResult(null);
    setTestParsed(null);
    try {
      const webhookUrl = `/api/inbound-email?id=${uniqueId}`;
      // Random 10-digit number starting with 9 to avoid duplicates on repeat tests
      const randomPhone = "9" + Math.floor(100000000 + Math.random() * 900000000);
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from:    "noreply@99acres.com",
          subject: "New Lead for Your Property",
          text:    `Name: Rahul Sharma\nPhone: ${randomPhone}\nEmail: rahul${randomPhone}@gmail.com\nCity: Mumbai\nBudget: Rs. 50 Lac - Rs. 1 Cr\nBedrooms: 2 BHK\nMessage: Looking for a flat in Andheri West`,
          html:    "",
        }),
      });
      const json = await res.json();
      if (json.parsed) setTestParsed(json.parsed);
      if (json.success)      setTestResult("✅ Lead created! Check your Leads page.");
      else if (json.skipped) setTestResult(`⚠️ ${json.reason} — system is working correctly.`);
      else                   setTestResult(`❌ Error: ${json.error || "Unknown"}`);
    } catch {
      setTestResult("❌ Could not reach API.");
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
        <p className="text-sm font-bold text-red-800 mb-1">⚠️ Migration needed</p>
        <p className="text-xs text-red-700">{setupError}</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 pb-28 sm:pb-10 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#D1FAE5" }}>
            <svg className="w-5 h-5" style={{ color: "#1BC47D" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Auto Lead Capture</h1>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wide">FREE</span>
        </div>
        <p className="text-sm text-gray-500">
          Portal leads land in your CRM automatically — no manual entry, no missed leads.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Leads Captured</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{leadCount}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Portals Covered</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-0.5">18</p>
        </div>
      </div>

      {/* Your CRM Email */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#EEF2FF" }}>
            <svg className="w-4 h-4" style={{ color: "#6366F1" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Your CRM Email</p>
            <p className="text-xs text-gray-400">Unique address — only yours</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 mb-3">
          <p className="flex-1 text-xs font-mono text-gray-700 break-all select-all">{crmEmail}</p>
          <button
            onClick={() => copy("email", crmEmail)}
            className="shrink-0 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all"
            style={{ background: copied === "email" ? "#1BC47D" : "#E5E7EB", color: copied === "email" ? "#fff" : "#374151" }}
          >
            {copied === "email" ? "Copied!" : "Copy"}
          </button>
        </div>

        <p className="text-[11px] text-gray-400">
          Portal emails forwarded here are read by AI, parsed, and added as leads instantly.
          Mailgun retries for 8 hours if anything fails — zero lead loss.
        </p>
      </div>

      {/* 3-step setup */}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">One-time Setup (5 minutes)</p>

      {/* Step tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-4">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            onClick={() => setActiveStep(n)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeStep === n ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            Step {n}
          </button>
        ))}
      </div>

      {activeStep === 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500 px-1">Open Gmail on your laptop — takes 2 minutes.</p>

          <StepCard step="1" title="Open Gmail Settings">
            Click the <strong>gear icon ⚙️</strong> (top right) → click <strong>"See all settings"</strong>
          </StepCard>

          <StepCard step="2" title="Go to Filters tab">
            Click the <strong>"Filters and Blocked Addresses"</strong> tab → click <strong>"Create a new filter"</strong>
          </StepCard>

          <StepCard step="3" title="Paste this in the From field">
            Copy and paste this exactly into the <strong>"From"</strong> box:
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="font-mono text-[10px] text-gray-600 break-words leading-relaxed">{GMAIL_FILTER}</p>
            </div>
            <button
              onClick={() => copy("filter", GMAIL_FILTER)}
              className="mt-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
              style={{ background: copied === "filter" ? "#1BC47D" : "#E5E7EB", color: copied === "filter" ? "#fff" : "#374151" }}
            >
              {copied === "filter" ? "Copied!" : "Copy Filter Text"}
            </button>
          </StepCard>

          <button
            onClick={() => setActiveStep(2)}
            className="w-full py-3 text-sm font-bold text-white rounded-2xl"
            style={{ background: "#1BC47D" }}
          >
            Next: Set Forward Address →
          </button>
        </div>
      )}

      {activeStep === 2 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500 px-1">Still in Gmail filter creation — step 2 of 2.</p>

          <StepCard step="1" title="Click 'Create filter'">
            After pasting the From addresses, click the blue <strong>"Create filter"</strong> button.
          </StepCard>

          <StepCard step="2" title="Check 'Forward it to'">
            Tick the checkbox next to <strong>"Forward it to"</strong>. Then click <strong>"Add forwarding address"</strong>.
          </StepCard>

          <StepCard step="3" title={`Paste your CRM email`}>
            Paste this address:
            <div className="mt-2 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <p className="flex-1 font-mono text-[11px] text-gray-700 break-all">{crmEmail}</p>
              <button
                onClick={() => copy("email", crmEmail)}
                className="shrink-0 px-2 py-1 text-[10px] font-bold rounded-lg transition-all"
                style={{ background: copied === "email" ? "#1BC47D" : "#E5E7EB", color: copied === "email" ? "#fff" : "#374151" }}
              >
                {copied === "email" ? "✓" : "Copy"}
              </button>
            </div>
            Gmail sends a verification email — check <strong>rateperfeet.com email</strong> inbox and click confirm.
          </StepCard>

          <StepCard step="4" title="Save the filter">
            After verifying, come back to the filter and click <strong>"Create filter"</strong>. Done forever.
          </StepCard>

          <div className="flex gap-2">
            <button onClick={() => setActiveStep(1)} className="flex-1 py-3 text-sm font-bold rounded-2xl border border-gray-200 text-gray-600">← Back</button>
            <button onClick={() => setActiveStep(3)} className="flex-1 py-3 text-sm font-bold text-white rounded-2xl" style={{ background: "#1BC47D" }}>Next: Test It →</button>
          </div>
        </div>
      )}

      {activeStep === 3 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500 px-1">Verify everything is working with a test lead.</p>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-2">Test Email Preview</p>
            <div className="font-mono text-xs text-gray-600 space-y-0.5">
              <p><span className="text-gray-400">From:</span> noreply@99acres.com</p>
              <p><span className="text-gray-400">Name:</span> Rahul Sharma</p>
              <p><span className="text-gray-400">Phone:</span> random (new each test)</p>
              <p><span className="text-gray-400">City:</span> Mumbai · 2 BHK · ₹50L–₹1Cr</p>
            </div>
          </div>

          <button
            onClick={runTest}
            disabled={testing}
            className="w-full py-3 text-sm font-bold text-white rounded-2xl transition-all disabled:opacity-60 active:scale-95"
            style={{ background: "#1BC47D" }}
          >
            {testing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sending…
              </span>
            ) : "Send Test Lead"}
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
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">AI Parser Result</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { key: "name", label: "Name" }, { key: "phone", label: "Phone" },
                  { key: "email", label: "Email" }, { key: "location", label: "City" },
                  { key: "budget_max", label: "Budget" }, { key: "property_interest", label: "BHK" },
                  { key: "source", label: "Portal" }, { key: "message", label: "Message" },
                  { key: "parser", label: "Engine" },
                ].map(({ key, label }) => {
                  const val    = testParsed[key];
                  const hasVal = val !== null && val !== undefined && val !== 0 && val !== "";
                  return (
                    <div key={key} className="flex items-start gap-2">
                      <span className={`text-sm shrink-0 ${hasVal ? "text-emerald-500" : "text-red-400"}`}>{hasVal ? "✓" : "✗"}</span>
                      <div>
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

          <button onClick={() => setActiveStep(2)} className="w-full py-3 text-sm font-bold rounded-2xl border border-gray-200 text-gray-600">← Back</button>
        </div>
      )}

      {/* Portals covered */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mt-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Portals Covered (18)</p>
        <div className="flex flex-wrap gap-1.5">
          {PORTALS.map(p => (
            <span key={p} className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-[11px] text-gray-600 font-medium">
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="flex items-center gap-3 mt-5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
        <p className="text-xs text-blue-700 font-medium leading-relaxed">
          <strong>How it works:</strong> Portal sends email → your Gmail auto-forwards →
          Mailgun catches it → AI reads any format → lead in CRM. Mailgun retries 8 hours if your server is down.
        </p>
      </div>

    </div>
  );
}

function StepCard({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-white border border-gray-100 rounded-2xl p-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
        {step}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-800 mb-0.5">{title}</p>
        <div className="text-xs text-gray-500 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
