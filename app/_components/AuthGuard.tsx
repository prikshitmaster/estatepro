// app/_components/AuthGuard.tsx — protects all dashboard pages
//
// 🧠 WHAT THIS DOES (simple explanation):
//    Think of this like a security guard standing at the door of every
//    dashboard page. Before any page loads, this component asks Supabase:
//    "Is there a logged-in user right now?"
//
//    YES → let them in, show the page
//    NO  → immediately send them to /login (like a bouncer)
//
//    This runs on EVERY dashboard page automatically because it is
//    wrapped around the dashboard layout (layout.tsx).
//    You never need to add auth checks to individual pages.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // "checking" = true while we are asking Supabase if there's a logged-in user
  // We show a loading screen during this time so the page doesn't flash briefly
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Ask Supabase: "is there an active session (logged-in user) right now?"
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // No session = not logged in → kick them to the login page
        router.replace("/login");
      } else {
        // Session found = logged in → stop loading, show the dashboard
        setChecking(false);
      }
    });

    // Also watch for sign-out events (e.g., user signs out in another browser tab)
    // This ensures the current tab also redirects to login immediately
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/login");
      }
    });

    // Cleanup: stop listening when this component is removed from the page
    return () => subscription.unsubscribe();
  }, [router]);

  // While we are still checking — show a full-screen loading spinner
  // This prevents ANY content from flashing before we confirm login status
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          {/* App logo */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600">
            <span className="text-white font-bold text-xl">E</span>
          </div>
          {/* Spinner */}
          <div className="flex items-center gap-2 text-gray-500 text-sm">
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
            Loading…
          </div>
        </div>
      </div>
    );
  }

  // User is confirmed logged in — render the actual dashboard page
  return <>{children}</>;
}
