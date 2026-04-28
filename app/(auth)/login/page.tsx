// app/(auth)/login/page.tsx — Login page with REAL Supabase auth
//
// 🧠 HOW LOGIN WORKS (simple explanation):
//    1. User types email + password and clicks "Sign in"
//    2. We send those to Supabase (like a security guard)
//    3. Supabase checks: "do these match a real account?"
//    4. If YES → redirect to /dashboard
//    5. If NO  → show an error message
//
// The "use client" line at the top means this page runs in the browser.
// Pages that have buttons, forms, or useState MUST have "use client".
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; // our Supabase connection

export default function LoginPage() {
  const router = useRouter(); // router lets us redirect the user to another page

  // useState creates a "box" that holds a value and updates the screen when it changes
  const [email, setEmail]       = useState(""); // box for email text
  const [password, setPassword] = useState(""); // box for password text
  const [loading, setLoading]   = useState(false); // true while waiting for Supabase
  const [error, setError]       = useState("");    // holds any error message to show

  // This function runs when the form is submitted (user clicks "Sign in")
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); // stop the browser from refreshing the page on form submit
    setError("");        // clear any old error
    setLoading(true);   // show "Signing in..." on the button

    // Ask Supabase to check the email + password
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Something went wrong — show the error to the user
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Login worked! Send the user to the dashboard
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">

        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4">
            <span className="text-white font-bold text-xl">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EstatePro CRM</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* The login form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* onSubmit → calls handleLogin when user clicks the submit button */}
          <form onSubmit={handleLogin} className="flex flex-col gap-5">

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}                           // show current value from state
                onChange={(e) => setEmail(e.target.value)} // update state when user types
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Password field */}
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
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Error box — only shows when there IS an error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading} // can't click again while waiting
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {/* Show different text while loading */}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Link to signup */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-blue-600 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
