"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Step = "welcome" | "workspace" | "invite" | "whatsapp" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const [step,          setStep]        = useState<Step>("welcome");
  const [workspaceName, setWorkspaceNm] = useState("");
  const [inviteEmails,  setInviteEmails]= useState("");
  const [waPhoneId,     setWaPhoneId]   = useState("");
  const [waToken,       setWaToken]     = useState("");
  const [saving,        setSaving]      = useState(false);

  const STEPS: Step[] = ["welcome", "workspace", "invite", "whatsapp", "done"];
  const stepIdx = STEPS.indexOf(step);

  async function finish() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const invites = inviteEmails.split(/[\n,;]+/).map((e) => e.trim()).filter((e) => e.includes("@"));
      await supabase.auth.updateUser({
        data: {
          workspace_name: workspaceName || `${user.email?.split("@")[0]}'s Workspace`,
          wa_config: waPhoneId && waToken ? { phone_id: waPhoneId, token: waToken, test_phone: "" } : undefined,
          team_invites: invites,
          onboarding_done: true,
        },
      });
    }
    setSaving(false);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8FAFC" }}>
      {/* Top bar */}
      <header className="h-14 flex items-center px-6" style={{ background: "#1e293b" }}>
        <div className="flex items-end gap-0.5 mr-2">
          <div style={{ width: 7, height: 16, borderRadius: 3, background: "#1BC47D" }} />
          <div style={{ width: 7, height: 11, borderRadius: 3, background: "#1BC47D55" }} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>EstatePro</span>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">

          {/* Progress dots */}
          <div className="flex items-center gap-2 mb-8 justify-center">
            {["Setup", "Workspace", "Team", "WhatsApp", "Done"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: i < stepIdx ? "#1BC47D" : i === stepIdx ? "#1BC47D" : "#E5E7EB",
                      color: i <= stepIdx ? "#fff" : "#9CA3AF",
                    }}>
                    {i < stepIdx ? <CheckSVG /> : i + 1}
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: i === stepIdx ? "#1BC47D" : "#9CA3AF" }}>{label}</span>
                </div>
                {i < 4 && <div className="w-8 h-0.5 mb-3 rounded" style={{ background: i < stepIdx ? "#1BC47D" : "#E5E7EB" }} />}
              </div>
            ))}
          </div>

          {/* ── Step: Welcome ── */}
          {step === "welcome" && (
            <Card>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "#D1FAE5" }}>
                  <svg className="w-8 h-8" style={{ color: "#1BC47D" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to EstatePro</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Your AI-powered real estate CRM. Let's get you set up in 2 minutes so you can start closing more deals.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { icon: "📋", title: "Manage Leads", desc: "Track every enquiry from any portal" },
                  { icon: "💬", title: "WhatsApp First", desc: "Message leads directly from the CRM" },
                  { icon: "📊", title: "Smart Insights", desc: "See which leads need attention now" },
                  { icon: "👥", title: "Team Mode", desc: "Invite agents to your workspace" },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-lg mb-1">{icon}</p>
                    <p className="text-xs font-semibold text-gray-800">{title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep("workspace")}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ background: "#1BC47D" }}>
                Get Started →
              </button>
            </Card>
          )}

          {/* ── Step: Workspace Name ── */}
          {step === "workspace" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Name your workspace</h2>
              <p className="text-sm text-gray-400 mb-6">This is your brokerage name. Team members will see it when they join.</p>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Workspace / Brokerage Name</label>
              <input
                type="text"
                placeholder="e.g. Sharma Realty, Prikshit & Associates"
                value={workspaceName}
                onChange={(e) => setWorkspaceNm(e.target.value)}
                className={inp}
                autoFocus
              />
              <p className="text-[11px] text-gray-400 mt-2">You can change this later in Settings</p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep("welcome")} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button onClick={() => setStep("invite")}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
                  style={{ background: "#1BC47D" }}>
                  Continue →
                </button>
              </div>
            </Card>
          )}

          {/* ── Step: Invite Team ── */}
          {step === "invite" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Invite your team</h2>
              <p className="text-sm text-gray-400 mb-6">Add your agents' email addresses. They'll be added as team members when they sign up.</p>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Team emails <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                rows={4}
                placeholder={"agent1@example.com\nagent2@example.com"}
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                className={`${inp} resize-none`}
              />
              <p className="text-[11px] text-gray-400 mt-2">One email per line, or separated by commas</p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep("workspace")} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button onClick={() => setStep("whatsapp")}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
                  style={{ background: "#1BC47D" }}>
                  Continue →
                </button>
              </div>
              <button onClick={() => setStep("whatsapp")} className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 py-1">
                Skip for now
              </button>
            </Card>
          )}

          {/* ── Step: WhatsApp ── */}
          {step === "whatsapp" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Connect WhatsApp Business</h2>
              <p className="text-sm text-gray-400 mb-2">Optional — you can connect later in Settings → WhatsApp</p>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 text-xs text-blue-700">
                Get your <strong>Phone Number ID</strong> and <strong>Access Token</strong> from{" "}
                <strong>developers.facebook.com</strong> → Your App → WhatsApp → API Setup
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number ID</label>
                  <input type="text" placeholder="123456789012345" value={waPhoneId}
                    onChange={(e) => setWaPhoneId(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Access Token</label>
                  <input type="password" placeholder="EAA..." value={waToken}
                    onChange={(e) => setWaToken(e.target.value)} className={inp} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep("invite")} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button onClick={finish} disabled={saving}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: "#1BC47D" }}>
                  {saving ? "Saving…" : "Finish Setup →"}
                </button>
              </div>
              <button onClick={finish} disabled={saving} className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 py-1 disabled:opacity-60">
                Skip for now
              </button>
            </Card>
          )}

          {/* ── Step: Done ── */}
          {step === "done" && (
            <Card>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "#D1FAE5" }}>
                  <svg className="w-8 h-8" style={{ color: "#1BC47D" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h2>
                <p className="text-sm text-gray-400 mb-6">Your workspace is ready. Start adding leads and close more deals.</p>
                <button onClick={() => router.push("/dashboard")}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm"
                  style={{ background: "#1BC47D" }}>
                  Go to Dashboard →
                </button>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      {children}
    </div>
  );
}

function CheckSVG() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1BC47D] focus:border-transparent bg-white";
