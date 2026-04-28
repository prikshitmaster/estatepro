// app/_components/ComingSoon.tsx — Placeholder page for features not built yet
//
// 🧠 WHAT THIS DOES:
//    When your friend clicks "Tasks" or "Analytics" in the sidebar,
//    instead of getting a scary 404 error, they see a nice page that says
//    "This feature is coming soon!" with a description of what it will do.
//
//    Every unfinished page imports this component and passes in a title + description.

import Link from "next/link";

interface Props {
  title:       string; // e.g. "Tasks"
  description: string; // e.g. "Track follow-ups and site visits"
  icon:        string; // emoji e.g. "✅"
}

export default function ComingSoon({ title, description, icon }: Props) {
  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">

      {/* Big icon circle */}
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-4xl mb-5">
        {icon}
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>

      <p className="text-gray-500 text-sm max-w-sm mb-1">{description}</p>
      <p className="text-blue-500 text-sm font-medium mb-8">Coming in a future update</p>

      {/* Give them somewhere to go instead of being stuck */}
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/leads"
          className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors"
        >
          View Leads
        </Link>
      </div>

    </div>
  );
}
