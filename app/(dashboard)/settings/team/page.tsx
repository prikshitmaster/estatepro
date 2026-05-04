"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Role = "admin" | "agent" | "viewer";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: Role;
  invited_at: string;
  status: "pending" | "active";
}

const ROLE_COLOR: Record<Role, { bg: string; text: string }> = {
  admin:  { bg: "#F5F3FF", text: "#6D28D9" },
  agent:  { bg: "#EFF6FF", text: "#1D4ED8" },
  viewer: { bg: "#F3F4F6", text: "#4B5563" },
};

const ROLE_DESC: Record<Role, string> = {
  admin:  "Full access — can manage leads, properties, and team",
  agent:  "Can add and manage leads and properties",
  viewer: "Read-only — can view but not edit anything",
};

export default function TeamPage() {
  const [members,      setMembers]      = useState<TeamMember[]>([]);
  const [inviteEmail,  setInviteEmail]  = useState("");
  const [inviteRole,   setInviteRole]   = useState<Role>("agent");
  const [inviting,     setInviting]     = useState(false);
  const [inviteErr,    setInviteErr]    = useState("");
  const [inviteOk,     setInviteOk]     = useState("");
  const [currentUser,  setCurrentUser]  = useState<{ email: string; name: string } | null>(null);
  const [removing,     setRemoving]     = useState<string | null>(null);

  useEffect(() => { loadTeam(); }, []);

  async function loadTeam() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser({
      email: user.email ?? "",
      name:  user.user_metadata?.full_name ?? user.email ?? "",
    });
    setMembers((user.user_metadata?.team_members as TeamMember[]) ?? []);
  }

  async function persistTeam(updated: TeamMember[]) {
    await supabase.auth.updateUser({ data: { team_members: updated } });
    setMembers(updated);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteErr(""); setInviteOk("");
    const email = inviteEmail.trim().toLowerCase();

    if (!email.includes("@")) { setInviteErr("Enter a valid email address."); return; }
    if (members.some((m) => m.email === email)) { setInviteErr("This person is already invited."); return; }
    if (email === currentUser?.email?.toLowerCase()) { setInviteErr("You are already the owner."); return; }

    setInviting(true);

    // Send real invite email via Supabase Auth
    const res = await fetch("/api/team/invite", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, role: inviteRole }),
    });
    const json = await res.json();

    if (!res.ok) {
      setInviteErr(json.error ?? "Failed to send invite.");
      setInviting(false);
      return;
    }

    // Save to owner's team list
    const newMember: TeamMember = {
      id:         crypto.randomUUID(),
      email,
      name:       email.split("@")[0],
      role:       inviteRole,
      invited_at: new Date().toISOString(),
      status:     "pending",
    };
    await persistTeam([...members, newMember]);

    setInviteEmail("");
    setInviteOk(`Invite sent to ${email}. They will receive an email with a sign-up link.`);
    setInviting(false);
    setTimeout(() => setInviteOk(""), 8000);
  }

  async function changeRole(id: string, role: Role) {
    await persistTeam(members.map((m) => m.id === id ? { ...m, role } : m));
  }

  async function removeMember(id: string) {
    setRemoving(id);
    await persistTeam(members.filter((m) => m.id !== id));
    setRemoving(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/settings"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-400">Invite agents and colleagues to EstatePro</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-sm font-semibold text-blue-900 mb-3">How team invites work</p>
        <div className="space-y-3">
          {[
            { step: "1", title: "You enter their email and click Invite", desc: "We send them a sign-up link by email — no manual sharing needed." },
            { step: "2", title: "They receive an email from EstatePro", desc: "The email has a button to set their password and create their account." },
            { step: "3", title: "They sign in and start using the app", desc: "Each team member manages their own leads and data independently." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">{title}</p>
                <p className="text-xs text-blue-600 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-blue-200">
          <p className="text-xs text-blue-500">
            <span className="font-semibold">Note:</span> Right now each member has their own separate leads and data.
            Shared workspace where everyone sees the same leads is coming in a future update.
          </p>
        </div>
      </div>

      {/* Members list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">
            Members <span className="text-gray-400 font-normal">({1 + members.length})</span>
          </p>
        </div>

        {/* Owner row */}
        {currentUser && (
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50">
            <Avatar name={currentUser.name} bg="#1BC47D" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 shrink-0">
              Owner
            </span>
          </div>
        )}

        {members.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">No team members yet</p>
            <p className="text-xs text-gray-300 mt-1">Use the form below to invite your first agent</p>
          </div>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0">
              <Avatar name={m.name} bg="#6366F1" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                <p className="text-xs text-gray-400 truncate">{m.email}</p>
              </div>

              {/* Pending badge — invite email sent, awaiting sign-up */}
              {m.status === "pending" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100 shrink-0">
                  Email sent
                </span>
              )}

              {/* Role selector */}
              <select
                value={m.role}
                onChange={(e) => changeRole(m.id, e.target.value as Role)}
                className="text-xs font-semibold px-2.5 py-1 rounded-full border-0 focus:outline-none cursor-pointer shrink-0"
                style={{ background: ROLE_COLOR[m.role].bg, color: ROLE_COLOR[m.role].text }}>
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>

              {/* Remove */}
              <button onClick={() => removeMember(m.id)} disabled={removing === m.id}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40 shrink-0">
                {removing === m.id ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Send Invite</h2>
        <p className="text-xs text-gray-400 mb-4">
          Enter their email address — they will receive a sign-up link immediately
        </p>

        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="agent@example.com"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteErr(""); }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1BC47D] bg-white"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1BC47D] bg-white text-gray-700">
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {/* Role description */}
          <p className="text-xs text-gray-400 pl-1">{ROLE_DESC[inviteRole]}</p>

          {/* Error */}
          {inviteErr && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {inviteErr}
            </div>
          )}

          {/* Success */}
          {inviteOk && (
            <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 px-4 py-3 rounded-xl border border-green-100">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>
                <strong>Invite sent!</strong> {inviteOk.replace("Invite sent to ", "").split(".")[0]} will receive
                an email with a link to create their EstatePro account.
              </span>
            </div>
          )}

          <button type="submit" disabled={inviting || !inviteEmail.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40 hover:opacity-90"
            style={{ background: "#1BC47D" }}>
            {inviting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Invite Email
              </>
            )}
          </button>
        </form>
      </div>

      {/* Role reference */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Role Permissions</h2>
        <div className="space-y-2.5">
          {(Object.keys(ROLE_DESC) as Role[]).map((r) => (
            <div key={r} className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 min-w-[56px] text-center"
                style={{ background: ROLE_COLOR[r].bg, color: ROLE_COLOR[r].text }}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </span>
              <p className="text-xs text-gray-500">{ROLE_DESC[r]}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function Avatar({ name, bg }: { name: string; bg: string }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?";
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ background: bg }}>
      {initials}
    </div>
  );
}
