"use client";

import Link from "next/link";

// 🧠 Pre-launch billing page.
//    Only one plan exists right now: the 1-month FREE TRIAL with full access.
//    Paid plans (Starter / Pro) are hidden until billing is switched on later —
//    the old plan grid + Razorpay checkout live in git history and can be
//    restored when getUserPlan()'s TRIAL_FULL_ACCESS flag is turned off.

// Everything the trial unlocks (i.e. the whole app).
const TRIAL_FEATURES = [
  "Unlimited leads",
  "Unlimited properties",
  "Auto lead capture from portals",
  "Secure property share links",
  "Newspaper lead import",
  "Site visit tracking",
  "Commission & deals tracking",
  "Reports & analytics",
  "WhatsApp Business API",
  "Action plans & follow-up tasks",
];

export default function BillingPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/settings"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Plans & Billing</h1>
          <p className="text-sm text-gray-400">You&apos;re on the free trial</p>
        </div>
      </div>

      {/* Trial card */}
      <div className="relative bg-white rounded-2xl overflow-hidden mb-6"
        style={{ border: "2px solid #1BC47D" }}>
        <div className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
          style={{ background: "#1BC47D" }}>
          Active
        </div>

        <div className="p-6">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#1BC47D" }}>
            Free Trial
          </p>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-4xl font-black text-gray-900">Full access</span>
          </div>
          <p className="text-sm text-gray-400 mb-5">
            Every feature unlocked — free for now, no card required.
          </p>

          <div className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
            style={{ background: "#F0FDF9", border: "1px solid #BBF7D0" }}>
            <span className="text-lg">🎉</span>
            <p className="text-sm font-medium" style={{ color: "#15803D" }}>
              You have the entire app unlocked. Enjoy!
            </p>
          </div>

          <ul className="grid sm:grid-cols-2 gap-2">
            {TRIAL_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#1BC47D" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Paid plans coming soon */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-800">Paid plans are coming soon</p>
          <p className="text-xs text-blue-600 mt-0.5">
            For now everything is free. We&apos;ll give you plenty of notice before any plan starts.
          </p>
        </div>
      </div>

      {/* Current subscription info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Current Subscription</h2>
        <div className="space-y-2">
          <Row label="Plan"           value="Free Trial — Full Access" />
          <Row label="Status"         value="Active" valueColor="#1BC47D" />
          <Row label="Price"          value="Free" />
          <Row label="Payment Method" value="—" />
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Questions about billing? Contact us at{" "}
          <a href="mailto:support@rateperfeet.com" className="text-blue-600 hover:underline">support@rateperfeet.com</a>
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium" style={{ color: valueColor ?? "#111827" }}>{value}</span>
    </div>
  );
}
