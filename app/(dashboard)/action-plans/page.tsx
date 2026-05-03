"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface PlanStep {
  day: number;
  type: "call" | "whatsapp" | "email" | "visit" | "note";
  message: string;
}

interface ActionPlan {
  id: string;
  name: string;
  description: string;
  steps: PlanStep[];
  created_at: string;
}

const TYPE_LABEL: Record<PlanStep["type"], string> = {
  call:      "Call",
  whatsapp:  "WhatsApp",
  email:     "Email",
  visit:     "Site Visit",
  note:      "Note/Task",
};

const TYPE_COLOR: Record<PlanStep["type"], { bg: string; text: string }> = {
  call:     { bg: "#D1FAE5", text: "#059669" },
  whatsapp: { bg: "#DCFCE7", text: "#16A34A" },
  email:    { bg: "#DBEAFE", text: "#1D4ED8" },
  visit:    { bg: "#EDE9FE", text: "#7C3AED" },
  note:     { bg: "#F3F4F6", text: "#6B7280" },
};

const STARTER_PLANS: Omit<ActionPlan, "id" | "created_at">[] = [
  {
    name: "New Lead Follow-Up",
    description: "7-day sequence for fresh enquiries",
    steps: [
      { day: 0, type: "whatsapp", message: "Hi {name}! I'm {agent}. Saw your enquiry for a property in {location}. I have some great options for you. When can we talk?" },
      { day: 1, type: "call",     message: "Follow-up call — introduce yourself and understand requirements" },
      { day: 3, type: "whatsapp", message: "Hi {name}, sharing a few properties that match your budget of ₹{budget}. Let me know if you'd like to schedule a visit!" },
      { day: 5, type: "call",     message: "Call to check if they viewed the shared properties" },
      { day: 7, type: "whatsapp", message: "Hi {name}, any update on the property search? I'm here to help anytime." },
    ],
  },
  {
    name: "Site Visit Booked",
    description: "Before and after a property visit",
    steps: [
      { day: 0, type: "whatsapp", message: "Hi {name}, your site visit is confirmed for {date} at {time}. The property is at {address}. See you there!" },
      { day: 0, type: "visit",    message: "Conduct site visit" },
      { day: 1, type: "call",     message: "Post-visit feedback call — what did they like/dislike?" },
      { day: 2, type: "whatsapp", message: "Hi {name}, great meeting you yesterday! Based on your feedback I have a couple more options. Can I share?" },
      { day: 5, type: "call",     message: "Check if they're ready to move forward or need more options" },
    ],
  },
  {
    name: "Negotiation Stage",
    description: "Keep deal alive while negotiating",
    steps: [
      { day: 0, type: "call",     message: "Discuss offer — understand their walk-away number" },
      { day: 1, type: "whatsapp", message: "Hi {name}, I've spoken with the seller. They can come down to ₹{price}. What do you think?" },
      { day: 3, type: "call",     message: "Follow up on counter-offer" },
      { day: 5, type: "whatsapp", message: "Hi {name}, the seller is willing to include {amenity} in the deal. This is a great offer — shall we proceed?" },
      { day: 7, type: "call",     message: "Final decision call" },
    ],
  },
];

export default function ActionPlansPage() {
  const [plans,       setPlans]       = useState<ActionPlan[]>([]);
  const [showNew,     setShowNew]     = useState(false);
  const [editingPlan, setEditingPlan] = useState<ActionPlan | null>(null);
  const [saving,      setSaving]      = useState(false);

  // Load from user_metadata (no DB migration needed for MVP)
  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const saved = user.user_metadata?.action_plans as ActionPlan[] | undefined;
    if (saved?.length) { setPlans(saved); return; }
    // Seed with starter plans on first load
    const seeded: ActionPlan[] = STARTER_PLANS.map((p, i) => ({
      ...p,
      id: `starter-${i}`,
      created_at: new Date().toISOString(),
    }));
    setPlans(seeded);
    await supabase.auth.updateUser({ data: { action_plans: seeded } });
  }

  async function savePlan(plan: ActionPlan) {
    setSaving(true);
    const existing = plans.find((p) => p.id === plan.id);
    const updated = existing
      ? plans.map((p) => p.id === plan.id ? plan : p)
      : [...plans, plan];
    setPlans(updated);
    await supabase.auth.updateUser({ data: { action_plans: updated } });
    setSaving(false);
    setShowNew(false);
    setEditingPlan(null);
  }

  async function deletePlan(id: string) {
    const updated = plans.filter((p) => p.id !== id);
    setPlans(updated);
    await supabase.auth.updateUser({ data: { action_plans: updated } });
  }

  const planToEdit = editingPlan ?? (showNew ? { id: crypto.randomUUID(), name: "", description: "", steps: [], created_at: new Date().toISOString() } : null);

  if (planToEdit) {
    return (
      <PlanEditor
        plan={planToEdit}
        saving={saving}
        onSave={savePlan}
        onCancel={() => { setShowNew(false); setEditingPlan(null); }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Action Plans</h1>
          <p className="text-sm text-gray-400 mt-0.5">Follow-up sequences you can assign to any lead</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: "#1BC47D" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">No action plans yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-start gap-4 p-5">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
                  {plan.description && <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[11px] text-gray-400">{plan.steps.length} steps</span>
                    {plan.steps.length > 0 && (
                      <span className="text-[11px] text-gray-400">·</span>
                    )}
                    {plan.steps.length > 0 && (
                      <span className="text-[11px] text-gray-400">
                        {plan.steps[plan.steps.length - 1].day} day sequence
                      </span>
                    )}
                    <div className="flex gap-1 flex-wrap">
                      {[...new Set(plan.steps.map((s) => s.type))].map((t) => (
                        <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: TYPE_COLOR[t].bg, color: TYPE_COLOR[t].text }}>
                          {TYPE_LABEL[t]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setEditingPlan(plan)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => deletePlan(plan.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Steps preview */}
              {plan.steps.length > 0 && (
                <div className="border-t border-gray-50 px-5 py-3 overflow-x-auto">
                  <div className="flex items-center gap-2 min-w-max">
                    {plan.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-gray-400 mb-1">Day {step.day}</span>
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap"
                            style={{ background: TYPE_COLOR[step.type].bg, color: TYPE_COLOR[step.type].text }}>
                            {TYPE_LABEL[step.type]}
                          </span>
                        </div>
                        {i < plan.steps.length - 1 && (
                          <svg className="w-3 h-3 text-gray-300 mt-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-800">How to use Action Plans</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Open any lead → scroll to "Action Plan" → choose a plan to assign. The CRM will remind you of each step at the right time.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Plan Editor ────────────────────────────────────────────────────────────────

function PlanEditor({ plan, saving, onSave, onCancel }: {
  plan: ActionPlan;
  saving: boolean;
  onSave: (p: ActionPlan) => void;
  onCancel: () => void;
}) {
  const [name,  setName]  = useState(plan.name);
  const [desc,  setDesc]  = useState(plan.description);
  const [steps, setSteps] = useState<PlanStep[]>(plan.steps);

  function addStep() {
    const lastDay = steps.length > 0 ? steps[steps.length - 1].day : -1;
    setSteps((prev) => [...prev, { day: lastDay + 1, type: "call", message: "" }]);
  }

  function updateStep(i: number, field: keyof PlanStep, value: string | number) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveStep(i: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const temp = next[i];
      next[i] = next[i + dir];
      next[i + dir] = temp;
      return next;
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">{plan.name || "New Action Plan"}</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 flex flex-col gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan Name *</label>
          <input type="text" placeholder="e.g. New Lead Follow-Up" value={name}
            onChange={(e) => setName(e.target.value)} className={inp} autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <input type="text" placeholder="e.g. 7-day sequence for fresh enquiries" value={desc}
            onChange={(e) => setDesc(e.target.value)} className={inp} />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2 mb-4">
        {steps.map((step, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3">
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => i > 0 && moveStep(i, -1)} disabled={i === 0}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-gray-600 disabled:opacity-20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              </button>
              <button onClick={() => i < steps.length - 1 && moveStep(i, 1)} disabled={i === steps.length - 1}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-gray-600 disabled:opacity-20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase">Day</label>
                  <input type="number" min={0} value={step.day}
                    onChange={(e) => updateStep(i, "day", parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1BC47D]" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase">Action Type</label>
                  <select value={step.type} onChange={(e) => updateStep(i, "type", e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1BC47D] bg-white">
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase">Message / Task Note</label>
                <textarea rows={2} value={step.message} placeholder="What to say or do..."
                  onChange={(e) => updateStep(i, "message", e.target.value)}
                  className={`${inp} resize-none text-xs`} />
              </div>
            </div>
            <button onClick={() => removeStep(i)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0 mt-5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        <button onClick={addStep}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-[#1BC47D] hover:text-[#1BC47D] transition-colors flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Step
        </button>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={() => onSave({ ...plan, name, description: desc, steps })}
          disabled={saving || !name.trim()}
          className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: "#1BC47D" }}>
          {saving ? "Saving…" : "Save Plan"}
        </button>
      </div>
    </div>
  );
}

const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1BC47D] focus:border-transparent bg-white";
