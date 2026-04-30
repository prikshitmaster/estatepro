// lib/format-price.ts — Indian number formatting for price fields
//
// 🧠 WHAT THIS FILE DOES:
//    Indian number system uses commas differently from Western:
//      Western:  1,234,567  (groups of 3)
//      Indian:   12,34,567  (first group 3, then groups of 2)
//
//    This file has two functions:
//      formatPriceDisplay(raw)  →  "₹12,34,567 (12.35 Lakh)"   (used in forms as live preview)
//      formatPriceFull(num)     →  "₹12,34,567 (12.35 Lakh)"   (used in detail page)

// Formats a raw number string (as user types) into Indian format with label in brackets.
// Returns "" if the input is empty or zero.
export function formatPriceDisplay(raw: string): string {
  const num = parseInt(raw, 10);
  if (!raw || isNaN(num) || num <= 0) return "";
  return formatPriceFull(num);
}

// Formats a number into Indian format with label in brackets.
export function formatPriceFull(num: number): string {
  if (!num || isNaN(num) || num <= 0) return "";

  // Indian locale gives the right comma positions: 12,34,567
  const formatted = num.toLocaleString("en-IN");

  const label = getLabel(num);
  return `₹${formatted}${label ? ` (${label})` : ""}`;
}

function getLabel(num: number): string {
  if (num >= 1_00_00_000) {
    // 1 Crore = 1,00,00,000
    const cr = num / 1_00_00_000;
    return `${stripZeros(cr)} Cr`;
  }
  if (num >= 1_00_000) {
    // 1 Lakh = 1,00,000
    const l = num / 1_00_000;
    return `${stripZeros(l)} Lakh`;
  }
  return "";
}

// Removes trailing zeros: 12.50 → "12.5", 12.00 → "12"
function stripZeros(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}
