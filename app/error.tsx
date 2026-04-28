// app/error.tsx — Global crash page
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    Imagine the app is a car. Sometimes the car breaks down.
//    WITHOUT this file: the car just stops, screen goes white, friend is confused.
//    WITH this file: a helpful sign pops up saying "Engine trouble! Click here to try again."
//
//    Next.js automatically shows THIS page whenever the app crashes.
//    It gives the friend a "Try Again" button instead of a blank screen.
//
//    This file gets the actual error message from Next.js so you can
//    copy it and send it to the developer (you) to fix.
//
// "use client" is REQUIRED — Next.js error pages must be client components
"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string }; // the actual error that happened
  reset: () => void;                   // function that tries to reload the page
}

export default function GlobalError({ error, reset }: Props) {
  // Log the error to the browser console so the developer can see it
  // Open DevTools → Console tab to see the full details
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 max-w-md w-full text-center">

        {/* Big warning icon */}
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h1 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500 text-sm mb-5">
          The app hit an unexpected error. This has been logged. You can try again or go back to the dashboard.
        </p>

        {/* Show the error message in a box so it's easy to copy and send */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5 text-left">
          <p className="text-xs text-gray-400 font-medium mb-1">Error details (copy this to share with your developer):</p>
          <p className="text-xs text-red-600 font-mono break-all">
            {error.message || "Unknown error"}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 font-mono mt-1">ID: {error.digest}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="w-full py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors block"
          >
            Go to Dashboard
          </a>
        </div>

      </div>
    </div>
  );
}
