"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Team management is stored in user_metadata of each broker's Supabase account.
// For a real multi-user workspace, this would need a DB table + Supabase invite emails.
// Phase 2 MVP: store pending invites + roles in the owner's user_metadata.
// Team members log in with their own accounts and the owner can see them here.

type Role = "admin" | "agent" | "viewer";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: Role;
  invited_at: string;
  status: "pending" | "active";
}

const ROLE_LABEL: Record<Role, string> = {
  admin:  "Admin",
  agent:  "Agent",
  viewer: "Viewer",
};

const ROLE_DESC: Record<Role, string> = {
  admin:  "Can manage leads, properties, team members",
  agent:  "Can manage leads and properties",
  viewer: "Read-only access",
};

const ROLE_COLOR: Record<Role, string> = {
  admin:  "bg-purple-50 text-purple-700",
  agent:  "bg-blue-50 text-blue-700",
  viewer: "bg-gray-100 text-gray-600",
};

export default function TeamPage() {
  const [members, setMembers]     = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole,  setInviteRole]  = useState<Role>("agent");
  const [inviting,    setInviting]    = useState(false);
  const [inviteErr,   setInviteErr]   = useState("");
  const [inviteOk,    setInviteOk]    = useState("");
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
  const [removing,    setRemoving]    = useState<string | null>(null);

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser({
      email: user.email ?? "",
      name: user.user_metadata?.full_name ?? user.email ?? "",
    });
    const saved = user.user_metadata?.team_members as TeamMember[] | undefined;
    setMembers(saved ?? []);
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
    if (members.some((m) => m.email === email)) { setInviteErr("This person is already on your team."); return; }
    if (email === currentUser?.email?.toLowerCase()) { setInviteErr("You are already the owner."); return; }

    setInviting(true);
    const newMember: TeamMember = {
      id:         crypto.randomUUID(),
      email,
      name:       email.split("@")[0],
      role:       inviteRole,
      invited_at: new Date().toISOString(),
      status:     "pending",
    };
    const updated = [...members, newMember];
    await persistTeam(updated);

    // In a real system: send an actual invite email via Supabase Auth
    // For now, show instructions to share the login link manually
    setInviting(false);
    setInviteEmail("");
    setInviteOk(`Invite recorded for ${email}. Share your app URL and ask them to sign up with this email.`);
    setTimeout(() => setInviteOk(""), 6000);
  }

  async function changeRole(id: string, role: Role) {
    const updated = members.map((m) => m.id === id ? { ...m, role } : m);
    await persistTeam(updated);
  }

  async function removeMember(id: string) {
    setRemoving(id);
    const updated = members.filter((m) => m.id !== id);
    await persistTeam(updated);
    setRemoving(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-400">Manage who has access to your EstatePro workspace</p>
        </div>
      </div>

      {/* Current members */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Members ({1 + members.length})</p>
        </div>

        {/* Owner row */}
        {currentUser && (
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50">
            <Avatar name={currentUser.name} color="bg-blue-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">Owner</span>
          </div>
        )}

        {/* Invited members */}
        {members.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">No team members yet. Invite someone below.</p>
          </div>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0">
              <Avatar name={m.name} color="bg-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                <p className="text-xs text-gray-400 truncate">{m.email}</p>
              </div>
              {/* Status badge */}
              {m.status === "pending" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100 shrink-0">
                  Pending
                </span>
              )}
              {/* Role selector */}
              <select
                value={m.role}
                onChange={(e) => changeRole(m.id, e.target.value as Role)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${ROLE_COLOR[m.role]}`}>
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
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
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Invite Team Member</h2>
        <p className="text-xs text-gray-400 mb-4">They will need to sign up with this email to access the workspace</p>

        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteErr(""); }}
              className={`${inp} flex-1`}
            />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700">
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {inviteErr && <p className="text-xs text-red-600 bg-red-50 px-4 py-2 rounded-xl">{inviteErr}</p>}
          {inviteOk  && <p className="text-xs text-green-600 bg-green-50 px-4 py-2 rounded-xl flex items-start gap-2"><CheckIcon /><span>{inviteOk}</span></p>}

          <button type="submit" disabled={inviting || !inviteEmail.trim()}
            className="w-full sm:w-auto sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl transition-colors">
            {inviting ? "Saving…" : "Add to Team"}
          </button>
        </form>
      </div>

      {/* Role descriptions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Role Permissions</h2>
        <div className="space-y-2">
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
            <div key={r} className="flex items-start gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${ROLE_COLOR[r]}`}>{ROLE_LABEL[r]}</span>
              <p className="text-xs text-gray-500 pt-1">{ROLE_DESC[r]}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?";
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";
