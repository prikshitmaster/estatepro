// app/(dashboard)/settings/page.tsx — Account settings
//
// 🧠 WHAT THIS PAGE DOES (explain like I'm 5):
//    This is your account settings page — like your profile on any app.
//    It has TWO separate sections:
//
//    1. PROFILE — Change your display name
//       Your name shows in the sidebar and on the dashboard ("Welcome back, Prikshit")
//       You can update it here and it changes everywhere instantly.
//
//    2. SECURITY — Change your password
//       You type a new password twice (to confirm you didn't mistype it)
//       If they match, Supabase updates your password.
//
//    HOW SAVING WORKS:
//      Profile → supabase.auth.updateUser({ data: { full_name: "New Name" } })
//      Password → supabase.auth.updateUser({ password: "newpassword" })
//      Both are Supabase built-in functions — we don't store passwords ourselves.
//
//    Each section has its own Save button and its own success/error message.
//    They work completely independently.
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  // ── User info loaded from Supabase ────────────────────────────────────────
  const [email, setEmail]       = useState("");   // read-only — can't change email
  const [initials, setInitials] = useState("…");  // for the avatar circle

  // ── Profile section state ─────────────────────────────────────────────────
  const [name, setName]               = useState("");
  const [nameSaving, setNameSaving]   = useState(false);
  const [nameSuccess, setNameSuccess] = useState("");
  const [nameError, setNameError]     = useState("");

  // ── Password section state ────────────────────────────────────────────────
  const [newPass, setNewPass]         = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passSaving, setPassSaving]   = useState(false);
  const [passSuccess, setPassSuccess] = useState("");
  const [passError, setPassError]     = useState("");

  // ── Load current user data on page open ───────────────────────────────────
  // We ask Supabase "who is logged in?" and fill in the form with their details
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fullName = user.user_metadata?.full_name ?? "";
        const userEmail = user.email ?? "";

        setName(fullName);
        setEmail(userEmail);

        // Build initials from name, or fallback to first letter of email
        if (fullName) {
          setInitials(
            fullName.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
          );
        } else if (userEmail) {
          setInitials(userEmail[0].toUpperCase());
        }
      }
    }
    loadUser();
  }, []);

  // ── Save profile name ─────────────────────────────────────────────────────
  // Calls supabase.auth.updateUser() to update the full_name in user_metadata
  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setNameError("");
    setNameSuccess("");
    setNameSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim() }, // user_metadata.full_name
      });

      if (error) throw error;

      // Update the initials in the avatar circle too
      setInitials(
        name.trim().split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "…"
      );

      setNameSuccess("Name updated successfully!");
      // Clear success message after 3 seconds
      setTimeout(() => setNameSuccess(""), 3000);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed to update name.");
    } finally {
      setNameSaving(false);
    }
  }

  // ── Save new password ─────────────────────────────────────────────────────
  // First checks that both fields match, then calls supabase.auth.updateUser()
  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    // Basic validation BEFORE calling Supabase
    if (newPass.length < 6) {
      setPassError("Password must be at least 6 characters.");
      return;
    }
    if (newPass !== confirmPass) {
      setPassError("Passwords do not match. Please retype them carefully.");
      return;
    }

    setPassSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPass, // Supabase handles the hashing — never stored in plain text
      });

      if (error) throw error;

      setPassSuccess("Password updated successfully!");
      setNewPass("");      // clear the fields after success
      setConfirmPass("");
      setTimeout(() => setPassSuccess(""), 3000);
    } catch (err) {
      setPassError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPassSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6 space-y-5">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your account</p>
      </div>

      {/* ── Profile section ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">

        {/* Section title */}
        <h2 className="text-sm font-semibold text-gray-900 mb-5">Profile</h2>

        {/* Avatar + email display at the top */}
        <div className="flex items-center gap-4 mb-6">
          {/* Big avatar circle with initials */}
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{name || "—"}</p>
            {/* Email is shown but not editable */}
            <p className="text-xs text-gray-400 mt-0.5">{email}</p>
            <p className="text-[10px] text-gray-300 mt-0.5">Email cannot be changed</p>
          </div>
        </div>

        {/* Name update form */}
        <form onSubmit={handleNameSave} className="flex flex-col gap-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Prikshit Sharma"
              className={inp}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address
            </label>
            {/* Read-only — changing email requires re-verification, skip for now */}
            <input
              type="email"
              value={email}
              readOnly
              className={`${inp} bg-gray-50 text-gray-400 cursor-not-allowed`}
            />
          </div>

          {/* Success / error feedback */}
          {nameSuccess && (
            <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-xl flex items-center gap-2">
              <CheckIcon /> {nameSuccess}
            </p>
          )}
          {nameError && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{nameError}</p>
          )}

          <button
            type="submit"
            disabled={nameSaving || !name.trim()}
            className="w-full sm:w-auto sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {nameSaving ? "Saving..." : "Save Profile"}
          </button>

        </form>
      </div>

      {/* ── Security section ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">

        <h2 className="text-sm font-semibold text-gray-900 mb-5">Security</h2>

        <form onSubmit={handlePasswordSave} className="flex flex-col gap-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              className={inp}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Type the same password again"
              autoComplete="new-password"
              className={inp}
            />
            {/* Live match indicator — shows as the user types */}
            {confirmPass.length > 0 && (
              <p className={`text-xs mt-1.5 ${newPass === confirmPass ? "text-green-500" : "text-red-400"}`}>
                {newPass === confirmPass ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          {/* Success / error feedback */}
          {passSuccess && (
            <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-xl flex items-center gap-2">
              <CheckIcon /> {passSuccess}
            </p>
          )}
          {passError && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{passError}</p>
          )}

          <button
            type="submit"
            disabled={passSaving || !newPass || !confirmPass}
            className="w-full sm:w-auto sm:px-8 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {passSaving ? "Updating..." : "Update Password"}
          </button>

        </form>
      </div>

      {/* ── App info section ── */}
      {/* Shows version info — useful for your teammate to know which build they're on */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">About</h2>
        <div className="space-y-2">
          <Row label="App" value="EstatePro CRM" />
          <Row label="Version" value="Day 12 build" />
          <Row label="Stack" value="Next.js + Supabase" />
        </div>
      </div>

    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-gray-700 font-medium">{value}</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";
