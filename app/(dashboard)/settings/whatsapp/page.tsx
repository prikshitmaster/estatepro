"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// WhatsApp Business Cloud API credentials live in user_metadata
// so we don't need a new DB table.
interface WAConfig {
  phone_id: string;   // WhatsApp Phone Number ID (from Meta dashboard)
  token: string;      // Permanent System User access token
  test_phone: string; // broker's own number to send a test message
}

export default function WhatsAppSettingsPage() {
  const [config, setConfig] = useState<WAConfig>({ phone_id: "", token: "", test_phone: "" });
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState("");
  const [testing,  setTesting]  = useState(false);
  const [testMsg,  setTestMsg]  = useState("");
  const [testErr,  setTestErr]  = useState("");
  const [showToken, setShowToken] = useState(false);

  // Load saved config from user_metadata
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.wa_config) {
        setConfig(user.user_metadata.wa_config);
      }
    });
  }, []);

  function set(field: keyof WAConfig, value: string) {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveErr(""); setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { wa_config: config },
    });
    setSaving(false);
    if (error) { setSaveErr(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleTest() {
    if (!config.phone_id || !config.token || !config.test_phone) {
      setTestErr("Fill in Phone ID, Token, and test phone number first."); return;
    }
    setTesting(true); setTestMsg(""); setTestErr("");

    // Call WhatsApp Cloud API — send a text message to broker's own phone
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${config.phone_id}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: config.test_phone.replace(/\D/g, ""),
            type: "text",
            text: { body: "EstatePro CRM: WhatsApp connection successful! ✅" },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "API error");
      setTestMsg("Test message sent! Check your WhatsApp.");
    } catch (err) {
      setTestErr(err instanceof Error ? err.message : "Failed to send test message.");
    } finally {
      setTesting(false);
    }
  }

  const isConnected = !!(config.phone_id && config.token);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">WhatsApp Business API</h1>
          <p className="text-sm text-gray-400">Connect your business number to send messages directly from EstatePro</p>
        </div>
        {/* Connection status badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${isConnected ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-300"}`} />
          {isConnected ? "Connected" : "Not connected"}
        </div>
      </div>

      {/* How to get credentials */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-2">Where to get these credentials</p>
        <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
          <li>Go to <strong>developers.facebook.com</strong> → My Apps → your app</li>
          <li>In the left menu click <strong>WhatsApp → API Setup</strong></li>
          <li>Copy your <strong>Phone Number ID</strong> (not the number itself)</li>
          <li>Under "Temporary access token" click <strong>Generate</strong> — or create a <strong>System User</strong> for a permanent token</li>
          <li>Paste both below and click <strong>Save</strong></li>
        </ol>
      </div>

      {/* Credentials form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">API Credentials</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number ID</label>
            <input
              type="text"
              placeholder="e.g. 123456789012345"
              value={config.phone_id}
              onChange={(e) => set("phone_id", e.target.value)}
              className={inp}
            />
            <p className="text-[11px] text-gray-400 mt-1">Found in Meta for Developers → WhatsApp → API Setup</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Access Token</label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                placeholder="EAA..."
                value={config.token}
                onChange={(e) => set("token", e.target.value)}
                className={`${inp} pr-12`}
              />
              <button type="button" onClick={() => setShowToken((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showToken ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {saveErr && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{saveErr}</p>}
          {saved   && <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-xl flex items-center gap-2"><CheckIcon /> Credentials saved!</p>}

          <button type="submit" disabled={saving || !config.phone_id || !config.token}
            className="w-full sm:w-auto sm:px-8 py-3 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40"
            style={{ background: "#1BC47D" }}>
            {saving ? "Saving…" : "Save Credentials"}
          </button>

        </form>
      </div>

      {/* Test connection */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Test Connection</h2>
        <p className="text-xs text-gray-400 mb-4">Send a test WhatsApp message to your own number</p>
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="Your phone with country code, e.g. 919876543210"
            value={config.test_phone}
            onChange={(e) => set("test_phone", e.target.value)}
            className={`${inp} flex-1`}
          />
          <button onClick={handleTest} disabled={testing || !isConnected}
            className="shrink-0 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: "#25D366" }}>
            {testing ? "Sending…" : "Send Test"}
          </button>
        </div>
        {testMsg && <p className="mt-3 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-xl flex items-center gap-2"><CheckIcon /> {testMsg}</p>}
        {testErr && <p className="mt-3 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{testErr}</p>}
      </div>

      {/* Message templates info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Quick Message Templates</h2>
        <p className="text-xs text-gray-400 mb-3">These templates are available when you message a lead from their profile</p>
        <div className="space-y-2">
          {TEMPLATES.map((t) => (
            <div key={t.name} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "#DCF8C6" }}>
                <svg className="w-4 h-4" style={{ color: "#25D366" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.657 0-3.213-.448-4.548-1.232l-.326-.192-3.373 1.003 1.003-3.373-.192-.326A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700">{t.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

const TEMPLATES = [
  {
    name: "Introduction",
    text: "Hello {name}! I'm your real estate consultant. I saw your enquiry for a property in {location}. I have some great options for you. When would be a good time to talk?",
  },
  {
    name: "Property Share",
    text: "Hi {name}, I found a property that matches your requirement — {property}. Price: ₹{price}. Want me to arrange a visit?",
  },
  {
    name: "Follow Up",
    text: "Hi {name}, just checking in on your property search. Have you had a chance to think about the options I shared? I'm here if you have any questions.",
  },
  {
    name: "Site Visit Reminder",
    text: "Hi {name}, just a reminder about your site visit tomorrow at {time}. Please let me know if you need to reschedule.",
  },
];

function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1BC47D] focus:border-transparent bg-white";
