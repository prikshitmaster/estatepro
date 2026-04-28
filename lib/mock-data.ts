// lib/mock-data.ts — shared helper functions
//
// 🧠 NOTE: The mock lead/property/task arrays that used to be here were
//    removed on Day 14. All pages now use real Supabase data.
//    Only the two helper functions below are kept — they are used everywhere.

// Formats a number as Indian rupee shorthand:
//   10000000 → ₹1.0Cr
//   500000   → ₹5.0L
//   45000    → ₹45,000
export function formatPrice(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

// Returns initials from a full name:
//   "Rahul Sharma" → "RS"
//   "Priya"        → "P"
export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
