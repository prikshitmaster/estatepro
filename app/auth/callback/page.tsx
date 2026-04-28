// app/auth/callback/page.tsx — OAuth redirect landing page
//
// 🧠 WHAT THIS PAGE DOES (simple explanation):
//    When a user clicks "Continue with Google" or "Continue with Facebook",
//    their browser leaves our app and goes to Google/Facebook to log in.
//    After they approve, Google/Facebook sends them BACK to this URL.
//    This page's only job is to:
//      1. Wait for Supabase to detect the login (it happens automatically)
//      2. Redirect the user to the dashboard
//
//    Think of it like an airport arrivals hall — you land here briefly,
//    then get directed to where you actually want to go.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Step 1: Check if Supabase already has a session ready (implicit flow — hash in URL)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // We have a session — go to dashboard right away
        router.replace("/dashboard");
      }
    });

    // Step 2: Also listen for the SIGNED_IN event (PKCE flow — code in URL query string)
    // Supabase automatically exchanges the code for a session and fires this event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe(); // stop listening — we only need it once
        router.replace("/dashboard");
      }
    });

    return () => subscription.unsubscribe(); // cleanup if component unmounts
  }, [router]);

  // While we wait, show a simple loading screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {/* App logo */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4">
          <span className="text-white font-bold text-xl">E</span>
        </div>
        {/* Spinner */}
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
          <svg
            className="animate-spin h-4 w-4 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Signing you in...
        </div>
      </div>
    </div>
  );
}
