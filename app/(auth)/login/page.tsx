// app/(auth)/login/page.tsx — Login page
//
// 🧠 HOW LOGIN WORKS:
//    Option A — Social login (Google / Facebook):
//      1. User clicks "Continue with Google" (or Facebook)
//      2. Browser goes to Google/Facebook website to verify identity
//      3. After approval, Google/Facebook sends user back to /auth/callback
//      4. That page detects the login and redirects to /dashboard
//      → No password needed! Zero friction.
//
//    Option B — Email + password:
//      1. User types email + password
//      2. Supabase checks the credentials
//      3. If correct → redirect to /dashboard
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Tracks which OAuth button is mid-redirect ("google", "facebook", or null)
  const [oauthLoading, setOauthLoading] = useState<"google" | "facebook" | null>(null);

  // ─── Social login handler ─────────────────────────────────────────────────
  // This function sends the user to Google or Facebook to log in.
  // It does NOT wait for a response — the browser just navigates away.
  // After login, the provider redirects back to /auth/callback.
  async function handleOAuth(provider: "google" | "facebook") {
    setError("");
    setOauthLoading(provider); // show "Redirecting..." on the clicked button

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // After Google/Facebook approves, send the user to our callback page
        // window.location.origin = "http://localhost:3000" in dev,
        //                          "https://your-app.vercel.app" in production
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      // Something went wrong before even reaching the provider
      setError(oauthError.message);
      setOauthLoading(null);
    }
    // If no error: the browser is already redirecting — nothing else to do here
  }

  // ─── Email + password login handler ──────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  const anyLoading = loading || oauthLoading !== null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F7FA' }}>
      <div className="w-full max-w-md">

        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4" style={{ background: '#1BC47D' }}>
            <span className="text-white font-bold text-xl">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EstatePro CRM</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl p-8" style={{ border: '1px solid #EEF1F6', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* ── Social login buttons ── */}
          <div className="flex flex-col gap-3">

            {/* Google button */}
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={anyLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-medium rounded-xl transition-colors text-sm"
            >
              {/* Google coloured "G" logo */}
              <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
              </svg>
              {oauthLoading === "google" ? "Redirecting…" : "Continue with Google"}
            </button>

            {/* Facebook button */}
            <button
              type="button"
              onClick={() => handleOAuth("facebook")}
              disabled={anyLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-60 text-white font-medium rounded-xl transition-colors text-sm"
            >
              {/* Facebook "f" logo */}
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="white">
                <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07z"/>
              </svg>
              {oauthLoading === "facebook" ? "Redirecting…" : "Continue with Facebook"}
            </button>
          </div>

          {/* ── "or" divider ── */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Email + password form ── */}
          <form onSubmit={handleLogin} className="flex flex-col gap-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none text-sm" style={{ border: '1px solid #EEF1F6' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none text-sm" style={{ border: '1px solid #EEF1F6' }}
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={anyLoading}
              className="w-full py-3 px-4 text-white font-semibold rounded-xl transition-colors text-sm" style={{ background: '#1BC47D' }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Link to signup */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium hover:underline" style={{ color: '#1BC47D' }}>
              Sign up
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
