"use client";

// app/(dashboard)/auto-capture/page.tsx
//
// Setup page for Auto Lead Capture.
// Shows the user their unique webhook URL and step-by-step instructions
// for Gmail automation (Google Apps Script) — completely free.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tab = "gmail" | "99acres" | "magicbricks" | "housing" | "test";

export default function AutoCapturePage() {
  const router = useRouter();

  const [uniqueId,    setUniqueId]    = useState("");
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [setupError,  setSetupError]  = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<Tab>("gmail");
  const [copied,      setCopied]      = useState(false);
  const [testResult,  setTestResult]  = useState<string | null>(null);
  const [testParsed,  setTestParsed]  = useState<Record<string, string | number | null> | null>(null);
  const [testing,     setTesting]     = useState(false);

  // Get or create the user's inbox token
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      // Check if inbox already exists
      const { data: existing, error: fetchErr } = await supabase
        .from("user_inboxes")
        .select("unique_id")
        .eq("user_id", user.id)
        .single();

      if (fetchErr && fetchErr.code !== "PGRST116") {
        // PGRST116 = row not found (normal). Anything else = table missing or DB error.
        setSetupError("Database table missing. Run the SQL migration first (see instructions below).");
        setLoading(false);
        return;
      }

      if (existing) {
        setUniqueId(existing.unique_id);
      } else {
        // Create one
        setCreating(true);
        const { data: created, error: insertErr } = await supabase
          .from("user_inboxes")
          .insert({ user_id: user.id })
          .select("unique_id")
          .single();
        if (insertErr) {
          setSetupError("Could not create inbox. Run the SQL migration first (see instructions below).");
        } else if (created) {
          setUniqueId(created.unique_id);
        }
        setCreating(false);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const webhookUrl = uniqueId
    ? `${typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app"}/api/inbound-email?id=${uniqueId}`
    : "";

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      if (json.success)                      setTestResult("✅ Lead created! Check your Leads page.");
      else if (json.skipped)                 setTestResult(`⚠️ Skipped: ${json.reason} — system is working correctly.`);
      else if (json.error === "Invalid token")  setTestResult("❌ Invalid token — refresh the page and try again.");
      else if (json.error === "Inbox disabled") setTestResult("❌ Inbox disabled.");
      else                                   setTestResult(`❌ Error: ${json.error || "Unknown (status " + res.status + ")"}`);
    } catch {
      setTestResult("❌ Could not reach API — make sure you are on the Vercel URL, not localhost.");
    }
    setTesting(false);
  }

  const appsScript = `// PropOS Auto Lead Capture — Google Apps Script
// Paste this in: script.google.com → New Project → paste → Save → Run → Set trigger
// Trigger: checkNewLeads() → Time-driven → Every 5 minutes

var WEBHOOK_URL = "${webhookUrl}";

function checkNewLeads() {
  // All Indian real estate portals — major + small
  var query = [
    'from:magicbricks.com', 'from:99acres.com', 'from:housing.com',
    'from:nobroker.in',     'from:proptiger.com', 'from:squareyards.com',
    'from:commonfloor.com', 'from:makaan.com',  'from:justdial.com',
    'from:sulekha.com',     'from:olx.in',      'from:quikr.com',
    'from:nestaway.com',    'from:anarock.com',  'from:zameen.com',
    'from:bayut.com',       'from:indiabulls.com',
    'subject:"new lead"',   'subject:"new enquiry"', 'subject:"enquiry"',
    'subject:"buyer enquiry"', 'subject:"property enquiry"',
    'subject:"new query"',  'subject:"lead alert"', 'subject:"lead notification"',
    'subject:"new interest"', 'subject:"property interest"'
  ].join(' OR ') + ' is:unread newer_than:15m';

  var threads = GmailApp.search(query);

  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(message) {
      if (!message.isUnread()) return;

      var payload = {
        from:    message.getFrom(),
        subject: message.getSubject(),
        text:    message.getPlainBody(),
        html:    message.getBody(),
        date:    message.getDate().toISOString()
      };

      try {
        UrlFetchApp.fetch(WEBHOOK_URL, {
          method:             'post',
          contentType:        'application/json',
          payload:            JSON.stringify(payload),
          muteHttpExceptions: true
        });
        message.markRead(); // Mark as read so we don't process it again
      } catch(e) {
        Logger.log('Error sending lead: ' + e.toString());
      }
    });
  });
}`;

  if (loading || creating) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
      <p className="text-sm text-gray-400">{creating ? "Setting up your inbox…" : "Loading…"}</p>
    </div>
  );

  if (setupError) return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-28">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5">
        <p className="text-sm font-bold text-red-800 mb-1">⚠️ Setup Required</p>
        <p className="text-sm text-red-700 mb-4">{setupError}</p>
        <p className="text-xs font-bold text-red-800 mb-2">Run this SQL in Supabase → SQL Editor:</p>
        <div className="bg-red-900 rounded-xl p-3 font-mono text-xs text-red-100 whitespace-pre overflow-x-auto">{`CREATE TABLE IF NOT EXISTS user_inboxes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unique_id  TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_inboxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own inbox" ON user_inboxes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS user_inboxes_unique_id_idx ON user_inboxes(unique_id);`}</div>
        <p className="text-xs text-red-600 mt-3">After running: refresh this page.</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 pb-28 sm:pb-10 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">⚡</span>
          <h1 className="text-xl font-bold text-gray-900">Auto Lead Capture</h1>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wide">FREE</span>
        </div>
        <p className="text-sm text-gray-500">
          Leads from 99acres, MagicBricks, Housing.com appear in your dashboard automatically — zero manual entry.
        </p>
      </div>

      {/* ── Your Webhook URL ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Your Unique Capture URL</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
            <p className="text-xs font-mono text-gray-600 truncate">{webhookUrl}</p>
          </div>
          <button
            onClick={copyUrl}
            className="shrink-0 px-4 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95"
            style={{ background: copied ? "#D1FAE5" : "#1BC47D", color: copied ? "#065F46" : "white" }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          ⚠️ Keep this URL private — anyone with it can send leads to your account.
        </p>
      </div>

      {/* ── How it works banner ── */}
      <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
        <div className="flex items-center gap-1 text-lg">
          <span>📩</span>
          <span className="text-gray-400 text-xs mx-1">→</span>
          <span>📜</span>
          <span className="text-gray-400 text-xs mx-1">→</span>
          <span>⚡</span>
          <span className="text-gray-400 text-xs mx-1">→</span>
          <span>👤</span>
        </div>
        <p className="text-xs text-blue-700 font-medium">
          Portal email → Gmail → Apps Script (every 5 min) → Your webhook → Lead created instantly
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-5 overflow-x-auto">
        {([
          { key: "gmail"       as Tab, label: "📜 Gmail Setup" },
          { key: "99acres"     as Tab, label: "99acres"        },
          { key: "magicbricks" as Tab, label: "MagicBricks"    },
          { key: "housing"     as Tab, label: "Housing.com"    },
          { key: "test"        as Tab, label: "🧪 Test"        },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Gmail Setup Tab ── */}
      {activeTab === "gmail" && (
        <div className="flex flex-col gap-4">
          <StepCard step={1} title="Open Google Apps Script">
            Go to <a href="https://script.google.com" target="_blank" rel="noopener noreferrer"
              className="text-blue-600 underline font-semibold">script.google.com</a> — sign in with the same Gmail that receives 99acres / MagicBricks emails.
          </StepCard>

          <StepCard step={2} title="Create a new project">
            Click <strong>New Project</strong>. Delete the empty function inside. Paste the script below.
          </StepCard>

          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <span className="text-xs font-mono text-gray-400">Code.gs</span>
              <button
                onClick={() => { navigator.clipboard.writeText(appsScript); }}
                className="text-xs text-emerald-400 font-semibold hover:text-emerald-300"
              >
                Copy Script
              </button>
            </div>
            <pre className="p-4 text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {appsScript}
            </pre>
          </div>

          <StepCard step={3} title="Save and run once">
            Press <strong>Ctrl+S</strong> to save. Click <strong>Run → Run function → checkNewLeads</strong>.
            Accept the Gmail permission popup.
          </StepCard>

          <StepCard step={4} title="Set the trigger (every 5 minutes)">
            Click the <strong>⏰ clock icon</strong> (Triggers) in the left sidebar → <strong>+ Add Trigger</strong>.
            Set: Function = <code className="bg-gray-100 px-1 rounded text-xs">checkNewLeads</code>,
            Event = <code className="bg-gray-100 px-1 rounded text-xs">Time-driven</code>,
            Interval = <code className="bg-gray-100 px-1 rounded text-xs">Every 5 minutes</code>. Save.
          </StepCard>

          <div className="px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <p className="text-sm font-bold text-emerald-800 mb-1">✅ Done! You&apos;re all set.</p>
            <p className="text-xs text-emerald-700">
              Every 5 minutes Gmail will check for new portal lead emails and send them to your dashboard automatically. Zero cost.
            </p>
          </div>
        </div>
      )}

      {/* ── 99acres Tab ── */}
      {activeTab === "99acres" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">Make sure your 99acres account sends lead notifications to your Gmail.</p>
          <StepCard step={1} title="Log in to 99acres.com">
            Go to your broker account → <strong>My Account → Account Settings → Notification Settings</strong>.
          </StepCard>
          <StepCard step={2} title="Set notification email">
            Ensure the notification email is your Gmail. If it&apos;s not, change it to the Gmail you used for the Apps Script.
          </StepCard>
          <StepCard step={3} title="Enable email notifications">
            Turn ON <strong>New Lead Notifications</strong> and <strong>Enquiry Emails</strong>. Save.
          </StepCard>
          <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl">
            <p className="text-xs text-amber-700 font-medium">
              💡 <strong>Tip:</strong> Test by making an enquiry from a different account. Within 5 minutes it should appear in your leads.
            </p>
          </div>
        </div>
      )}

      {/* ── MagicBricks Tab ── */}
      {activeTab === "magicbricks" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">Enable email notifications in MagicBricks broker portal.</p>
          <StepCard step={1} title="Log in to MagicBricks">
            Go to <strong>My Account → Manage Account → Communication Preferences</strong>.
          </StepCard>
          <StepCard step={2} title="Enable lead notifications">
            Turn ON <strong>New Buyer Enquiry</strong> email notifications. Ensure it goes to your Gmail.
          </StepCard>
          <StepCard step={3} title="Verify sender address">
            MagicBricks sends from <code className="bg-gray-100 px-1 rounded text-xs">noreply@magicbricks.com</code>.
            The Apps Script already watches for this address.
          </StepCard>
        </div>
      )}

      {/* ── Housing Tab ── */}
      {activeTab === "housing" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">Enable email notifications in Housing.com seller account.</p>
          <StepCard step={1} title="Log in to Housing.com">
            Go to <strong>My Listings → Notification Settings</strong>.
          </StepCard>
          <StepCard step={2} title="Enable email alerts">
            Turn ON <strong>New Enquiry Email</strong>. Housing.com sends from <code className="bg-gray-100 px-1 rounded text-xs">noreply@housing.com</code>.
          </StepCard>
        </div>
      )}

      {/* ── Test Tab ── */}
      {activeTab === "test" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Send a fake test lead to verify your webhook is working correctly.
          </p>
          <div className="bg-gray-50 rounded-2xl p-4 font-mono text-xs text-gray-600 border border-gray-200">
            <p className="text-gray-400 mb-2">// Test payload (simulates 99acres email)</p>
            <p>from: &quot;noreply@99acres.com&quot;</p>
            <p>Name: Test Lead</p>
            <p>Phone: 9876543210</p>
            <p>City: Mumbai | Budget: ₹50L–₹1Cr | 2 BHK</p>
          </div>

          <button
            onClick={runTest}
            disabled={testing}
            className="py-3 text-sm font-bold text-white rounded-2xl transition-all disabled:opacity-60 active:scale-95"
            style={{ background: "#1BC47D" }}
          >
            {testing ? "Sending test…" : "🧪 Send Test Lead"}
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

          {/* Debug parsed output */}
          {testParsed && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Parser Debug — what was extracted</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { key: "name",              label: "Name"      },
                  { key: "phone",             label: "Phone"     },
                  { key: "email",             label: "Email"     },
                  { key: "location",          label: "City"      },
                  { key: "budget_min",        label: "Budget Min"},
                  { key: "budget_max",        label: "Budget Max"},
                  { key: "property_interest", label: "BHK/Type"  },
                  { key: "source",            label: "Portal"    },
                  { key: "message",           label: "Message"   },
                ].map(({ key, label }) => {
                  const val = testParsed[key];
                  const hasVal = val !== null && val !== undefined && val !== 0 && val !== "";
                  return (
                    <div key={key} className="flex items-start gap-2 min-w-0">
                      <span className={`text-sm shrink-0 mt-0.5 ${hasVal ? "text-emerald-500" : "text-red-400"}`}>
                        {hasVal ? "✓" : "✗"}
                      </span>
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

// ── Step card component ───────────────────────────────────────────────────────

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-white border border-gray-100 rounded-2xl p-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
        {step}
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800 mb-1">{title}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
