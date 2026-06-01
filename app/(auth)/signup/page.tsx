"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [name,          setName]          = useState("");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState(false);

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    // Inside the Capacitor app, use the custom deep-link scheme so Android routes
    // the OAuth callback back INTO the app instead of opening a browser tab.
    const inApp = !!(window as unknown as Record<string, unknown>).Capacitor;
    const redirectTo = inApp
      ? "com.rateperfeet.app://auth/callback"
      : `${window.location.origin}/auth/callback`;
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (e) { setError(e.message); setGoogleLoading(false); }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    if (authError) { setError(authError.message); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) { router.push("/dashboard"); return; }
    setSuccess(true);
    setLoading(false);
  }

  const anyLoading = loading || googleLoading;

  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F5F7FA" }}>
      <div className="w-full max-w-md text-center bg-white rounded-2xl p-10" style={{ border: "1px solid #EEF1F6" }}>
        <div className="text-4xl mb-4">📧</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-sm text-gray-500 mb-6">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to log in.
        </p>
        <Link href="/login" className="text-sm font-semibold hover:underline" style={{ color: "#1BC47D" }}>
          Go to Login →
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center px-4 py-8 overflow-y-auto safe-area-top" style={{ background: "#F5F7FA" }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4" style={{ background: "#1BC47D" }}>
            <span className="text-white font-bold text-sm tracking-tight">RPF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">RatePerFeet CRM</h1>
          <p className="text-gray-500 text-sm mt-1">Create your free account</p>
        </div>

        <div className="bg-white rounded-2xl p-8" style={{ border: "1px solid #EEF1F6", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

          {/* Google */}
          <button type="button" onClick={handleGoogle} disabled={anyLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-medium rounded-xl transition-colors text-sm">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
            </svg>
            {googleLoading ? "Redirecting…" : "Sign up with Google"}
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="name">Full name</label>
              <input id="name" type="text" autoComplete="name" required value={name}
                onChange={(e) => setName(e.target.value)} placeholder="Jay Patel"
                className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 text-sm"
                style={{ border: "1px solid #EEF1F6" }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">Email address</label>
              <input id="email" type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 text-sm"
                style={{ border: "1px solid #EEF1F6" }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="new-password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters"
                className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 text-sm"
                style={{ border: "1px solid #EEF1F6" }} />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={anyLoading}
              className="w-full py-3 text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-60"
              style={{ background: "#1BC47D" }}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="font-medium hover:underline" style={{ color: "#1BC47D" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
