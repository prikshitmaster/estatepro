// app/(dashboard)/ai-tools/page.tsx — AI Follow-up Message Generator
//
// 🧠 WHAT THIS PAGE DOES (explain like I'm 5):
//    Imagine you have 30 leads and you need to message all of them.
//    Writing "Hi Rohan, I saw you're looking for a 2BHK in Andheri..."
//    for each one is tiring and slow.
//
//    This tool does it for you:
//      1. You pick a lead from the dropdown
//      2. The tool reads their name, stage, location, budget
//      3. It instantly writes a ready-to-send message personalised for them
//      4. You pick WhatsApp or Email
//      5. Click "Copy" → paste it in your phone → done!
//
//    HOW THE MESSAGES ARE MADE:
//      We have 3 different message templates for each stage (6 stages × 3 = 18 templates).
//      The lead's real data (name, budget, location etc.) gets filled into the template.
//      "Try Another" shows a different variant so you're not always sending the same text.
//      This is called "template-based generation" — smart patterns, no AI API needed.
//
// "use client" is needed because we use useState and useEffect
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PlanGate from "@/app/_components/PlanGate";
import { getAllLeads } from "@/lib/db/leads";
import { formatPrice } from "@/lib/mock-data";
import { Lead, LeadStage } from "@/lib/types";

// ── Message channel options ───────────────────────────────────────────────────
// The user can pick WhatsApp, Email, or SMS
// Each has a slightly different tone in the message
type Channel = "whatsapp" | "email" | "sms";

// ── Stage badge colours (same as leads page) ──────────────────────────────────
const STAGE_STYLE: Record<LeadStage, string> = {
  new:         "bg-blue-50 text-blue-600",
  contacted:   "bg-amber-50 text-amber-600",
  viewing:     "bg-violet-50 text-violet-600",
  negotiating: "bg-orange-50 text-orange-600",
  closed:      "bg-green-50 text-green-600",
  lost:        "bg-red-50 text-red-600",
};

// ── Message templates ─────────────────────────────────────────────────────────
//
// 🧠 HOW TEMPLATES WORK:
//    Each template is a function that takes the lead's data and returns a string.
//    e.g. (lead) => `Hi ${lead.name}, I saw you're looking for...`
//    The ${lead.name} gets replaced with the actual name when the function runs.
//
//    For each stage, there are 3 variants.
//    "Try Another" button increments the variant index (0 → 1 → 2 → back to 0).
//
// Channel affects the opening:
//    WhatsApp → casual, short, uses emoji
//    Email    → formal, full sentences, no emoji in subject
//    SMS      → very short, no fluff

type TemplateFn = (lead: Lead, channel: Channel) => string;

// Helper: formats budget nicely e.g. "₹50L – ₹1Cr"
function budgetRange(lead: Lead) {
  return `${formatPrice(lead.budget_min)} – ${formatPrice(lead.budget_max)}`;
}

// Helper: greeting changes based on channel
function greeting(lead: Lead, channel: Channel) {
  if (channel === "email") return `Dear ${lead.name},`;
  if (channel === "sms")   return `Hi ${lead.name},`;
  return `Hi ${lead.name} 👋`;
}

// Helper: sign-off changes based on channel
function signoff(channel: Channel) {
  if (channel === "email") return "\n\nBest regards,\n[Your Name]\nEstatePro";
  if (channel === "sms")   return " – [Your Name]";
  return "\n\n– [Your Name], EstatePro";
}

// ── All templates, grouped by stage ──────────────────────────────────────────
const TEMPLATES: Record<LeadStage, TemplateFn[]> = {

  // NEW — first time reaching out to this lead
  new: [
    (lead, ch) =>
      `${greeting(lead, ch)}\n\nI noticed you're looking for ${lead.property_interest ?? "a property"} in ${lead.location || "your preferred area"} with a budget of ${budgetRange(lead)}.\n\nI have some great options that match exactly what you're looking for. Could we schedule a quick 10-minute call this week?${signoff(ch)}`,

    (lead, ch) =>
      `${greeting(lead, ch)}\n\nWelcome! I'm reaching out because I specialise in properties in ${lead.location || "your area"} and I believe I can find you the perfect ${lead.property_interest ?? "property"} within your budget.\n\nWhen would be a good time to connect?${signoff(ch)}`,

    (lead, ch) =>
      `${greeting(lead, ch)}\n\nI have ${lead.property_interest ?? "some properties"} available in ${lead.location || "the area"} that fit your budget of ${budgetRange(lead)}.\n\nI'd love to share the details — are you free for a quick call today or tomorrow?${signoff(ch)}`,
  ],

  // CONTACTED — already spoken once, following up
  contacted: [
    (lead, ch) =>
      `${greeting(lead, ch)}\n\nJust following up on our last conversation. Have you had a chance to think about the properties we discussed in ${lead.location || "the area"}?\n\nI have a couple of new listings that just came in — they match your budget of ${budgetRange(lead)} perfectly. Happy to share the details!${signoff(ch)}`,

    (lead, ch) =>
      `${greeting(lead, ch)}\n\nHope you're doing well! I wanted to check in — are you still exploring ${lead.property_interest ?? "property"} options in ${lead.location || "your preferred area"}?\n\nI'd be happy to set up a site visit at your convenience. No pressure — just want to make sure you have all the information you need.${signoff(ch)}`,

    (lead, ch) =>
      `${greeting(lead, ch)}\n\nQuick follow-up from my side! The ${lead.property_interest ?? "property"} market in ${lead.location || "the area"} is moving fast right now.\n\nI don't want you to miss out on something great within your budget of ${budgetRange(lead)}. Can we reconnect soon?${signoff(ch)}`,
  ],

  // VIEWING — about to visit or just visited a property
  viewing: [
    (lead, ch) =>
      `${greeting(lead, ch)}\n\nLooking forward to the property viewing! I'll send you the full details and directions shortly.\n\nPlease feel free to ask me anything before we meet. I want to make sure you have a great experience.${signoff(ch)}`,

    (lead, ch) =>
      `${greeting(lead, ch)}\n\nFollowing up on the property viewing — what did you think? I'd love to hear your feedback.\n\nIf you'd like to see more options in ${lead.location || "the area"} within ${budgetRange(lead)}, I have a few more lined up that I think you'll love.${signoff(ch)}`,

    (lead, ch) =>
      `${greeting(lead, ch)}\n\nThank you for taking the time to visit the property! Your thoughts and feedback matter a lot to me.\n\nIf there's anything specific you're looking for that you didn't see today, just let me know — I'll find it for you.${signoff(ch)}`,
  ],

  // NEGOTIATING — in the middle of closing a deal
  negotiating: [
    (lead, ch) =>
      `${greeting(lead, ch)}\n\nI've spoken with the seller and they are open to discussing your offer. Things are looking positive!\n\nCould we schedule a quick call today to finalise the details? I want to make sure we lock this in for you.${signoff(ch)}`,

    (lead, ch) =>
      `${greeting(lead, ch)}\n\nJust checking in on the negotiation. I'm working hard to get you the best possible deal on the ${lead.property_interest ?? "property"} in ${lead.location || "the area"}.\n\nCan we connect today to review the latest offer?${signoff(ch)}`,

    (lead, ch) =>
      `${greeting(lead, ch)}\n\nGreat news — there's been some movement on the offer! The seller is keen to close this deal.\n\nLet's not let this opportunity slip away. Are you available for a quick call in the next few hours?${signoff(ch)}`,
  ],

  // CLOSED — deal is done, thank the client
  closed: [
    (lead, ch) =>
      `${greeting(lead, ch)}\n\nCongratulations on your new ${lead.property_interest ?? "property"}! 🎉 It was an absolute pleasure working with you.\n\nPlease don't hesitate to reach out if you need anything in the future — whether it's documentation, interiors, or anything else. Wishing you all the best!${signoff(ch)}`,

    (lead, ch) =>
      `${greeting(lead, ch)}\n\nThank you so much for trusting me with such an important decision. I hope your new ${lead.property_interest ?? "home"} brings you years of happiness.\n\nIf you know anyone looking for property in ${lead.location || "the area"}, I'd be grateful for the referral. Take care!${signoff(ch)}`,

    (lead, ch) =>
      `${greeting(lead, ch)}\n\nIt's been a wonderful journey helping you find your ${lead.property_interest ?? "property"}! Enjoy settling in.\n\nRemember, I'm always just a message away for any future property needs. Thank you for choosing EstatePro!${signoff(ch)}`,
  ],

  // LOST — didn't close, trying to stay connected for the future
  lost: [
    (lead, ch) =>
      `${greeting(lead, ch)}\n\nI understand things didn't work out this time, and that's completely okay. I hope you found what you were looking for!\n\nIf you're ever back in the market for ${lead.property_interest ?? "property"} in ${lead.location || "your area"}, please don't hesitate to reach out. I'll always be here to help.${signoff(ch)}`,

    (lead, ch) =>
      `${greeting(lead, ch)}\n\nJust wanted to check in and wish you well! Sometimes timing isn't right, but good things come to those who wait.\n\nIf your requirements change or you're ready to explore again, I'd love the chance to help you find the perfect ${lead.property_interest ?? "property"}.${signoff(ch)}`,

    (lead, ch) =>
      `${greeting(lead, ch)}\n\nThank you for considering us, even if we couldn't close the deal this time. Your experience and feedback mean a lot.\n\nThe market in ${lead.location || "your area"} is always changing — I'll keep an eye out for options that match your budget of ${budgetRange(lead)} and reach out if something great comes up.${signoff(ch)}`,
  ],
};

// ── Main page component ───────────────────────────────────────────────────────
export default function AIToolsPage() {
  return <PlanGate requires="starter" feature="Message Templates"><AIToolsPageInner /></PlanGate>;
}

function AIToolsPageInner() {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [loading, setLoading]     = useState(true);

  // Which lead is currently selected
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Which message channel the user picked
  const [channel, setChannel]     = useState<Channel>("whatsapp");

  // Which variant (0, 1, or 2) — "Try Another" increases this
  const [variant, setVariant]     = useState(0);

  // copied = true for 2 seconds after clicking Copy
  const [copied, setCopied]       = useState(false);

  // ── Load leads from Supabase ────────────────────────────────────────────
  useEffect(() => {
    getAllLeads().then((data) => {
      setLeads(data);
      // Auto-select the first lead so the page isn't empty on load
      if (data.length > 0) setSelectedLead(data[0]);
    }).finally(() => setLoading(false));
  }, []);

  // ── Generate message from template ─────────────────────────────────────
  // This runs every time selected lead, channel, or variant changes
  const message = selectedLead
    ? TEMPLATES[selectedLead.stage][variant % TEMPLATES[selectedLead.stage].length](selectedLead, channel)
    : "";

  // ── Handle lead selection from dropdown ────────────────────────────────
  function handleLeadChange(id: string) {
    const lead = leads.find((l) => l.id === id) ?? null;
    setSelectedLead(lead);
    setVariant(0); // reset to variant 0 when switching leads
    setCopied(false);
  }

  // ── Handle channel change ───────────────────────────────────────────────
  function handleChannelChange(ch: Channel) {
    setChannel(ch);
    setCopied(false);
  }

  // ── Copy message to clipboard ───────────────────────────────────────────
  // navigator.clipboard.writeText puts the text on the device clipboard
  // Then we show "Copied!" for 2 seconds, then revert back to "Copy"
  async function handleCopy() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Try another variant ─────────────────────────────────────────────────
  function handleTryAnother() {
    setVariant((v) => v + 1); // increment — modulo applied in message generation
    setCopied(false);
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-40" />
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="h-10 bg-gray-100 rounded-xl" />
          <div className="h-48 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── No leads yet ────────────────────────────────────────────────────────
  if (leads.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-20">
        <p className="text-gray-400 text-sm mb-3">No leads yet — add one first to use the message generator.</p>
        <Link
          href="/leads/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          + Add Your First Lead
        </Link>
      </div>
    );
  }

  // ── Main page ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 sm:pb-6 space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Message Templates</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Generate personalised follow-up messages for your leads instantly
        </p>
      </div>

      {/* ── Main card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-5">

        {/* ── Step 1: Pick a lead ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            1. Pick a lead
          </label>
          <select
            value={selectedLead?.id ?? ""}
            onChange={(e) => handleLeadChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name} — {lead.stage.charAt(0).toUpperCase() + lead.stage.slice(1)} ({lead.location || "no location"})
              </option>
            ))}
          </select>
        </div>

        {/* ── Selected lead preview card ── */}
        {/* Shows key info about the picked lead so you know exactly who you're messaging */}
        {selectedLead && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{selectedLead.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedLead.phone}
                {selectedLead.location && ` · ${selectedLead.location}`}
                {selectedLead.property_interest && ` · ${selectedLead.property_interest}`}
              </p>
              <p className="text-xs text-gray-400">
                Budget: {formatPrice(selectedLead.budget_min)} – {formatPrice(selectedLead.budget_max)}
              </p>
            </div>
            {/* Stage badge */}
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize shrink-0 ${STAGE_STYLE[selectedLead.stage]}`}>
              {selectedLead.stage}
            </span>
          </div>
        )}

        {/* ── Step 2: Pick channel ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            2. Choose channel
          </label>
          {/* Three toggle buttons — only one can be active at a time */}
          <div className="flex gap-2">
            {(["whatsapp", "email", "sms"] as Channel[]).map((ch) => (
              <button
                key={ch}
                onClick={() => handleChannelChange(ch)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                  channel === ch
                    ? "bg-blue-600 text-white"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {ch === "whatsapp" ? "💬 WhatsApp" : ch === "email" ? "✉️ Email" : "📱 SMS"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Step 3: The generated message ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">
              3. Your message
            </label>
            {/* Variant indicator — e.g. "Variant 1 of 3" */}
            {selectedLead && (
              <span className="text-xs text-gray-400">
                Variant {(variant % 3) + 1} of 3
              </span>
            )}
          </div>

          {/* Message text area — read-only, the user copies from here */}
          <textarea
            readOnly
            value={message}
            rows={10}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 bg-gray-50 resize-none focus:outline-none leading-relaxed font-mono"
          />
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-3">

          {/* Copy button — shows "Copied!" for 2 seconds after clicking */}
          <button
            onClick={handleCopy}
            disabled={!message}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              copied
                ? "bg-green-600 text-white"          // green when just copied
                : "bg-blue-600 hover:bg-blue-700 text-white" // blue normally
            }`}
          >
            {copied ? (
              <>
                <CheckIcon />
                Copied!
              </>
            ) : (
              <>
                <CopyIcon />
                Copy Message
              </>
            )}
          </button>

          {/* Try Another — shows a different template variant */}
          <button
            onClick={handleTryAnother}
            disabled={!message}
            className="flex-1 py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Try Another
          </button>

        </div>

      </div>

      {/* ── Tips section ── */}
      {/* Small tips to help the broker use the tool better */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-xs font-semibold text-blue-700 mb-2">💡 Tips for best results</p>
        <ul className="space-y-1 text-xs text-blue-600">
          <li>→ Make sure the lead's stage is up to date before generating</li>
          <li>→ Add location and property interest to the lead for more personalised messages</li>
          <li>→ Use "Try Another" to pick the variant that sounds most like you</li>
          <li>→ Always personalise the [Your Name] at the end before sending</li>
        </ul>
      </div>

    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}
