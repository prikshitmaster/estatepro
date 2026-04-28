// app/not-found.tsx — 404 Page
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    If someone types a URL that doesn't exist — like /leads/abc999 where
//    abc999 is not a real lead — Next.js shows THIS page automatically.
//
//    Like going to a shop and asking for a product that doesn't exist.
//    The shopkeeper says "Sorry, we don't have that. Here's what we DO have."
//
//    This is called a 404 page (404 = "Not Found" in internet language).

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">

        {/* Big 404 number */}
        <p className="text-6xl font-black text-gray-200 mb-2">404</p>

        <h1 className="text-lg font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 text-sm mb-6">
          The page you are looking for does not exist or may have been deleted.
        </p>

        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors block"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/leads"
            className="w-full py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors block"
          >
            View Leads
          </Link>
        </div>

      </div>
    </div>
  );
}
