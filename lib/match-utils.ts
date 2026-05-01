// lib/match-utils.ts
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    This is the "matchmaking brain" of EstatePro.
//    It matches leads to properties using 3 rules: budget, location, type.
//
//    TWO TIERS of matching:
//      ✅ Perfect Match — location + type match AND price is inside the budget
//      🟡 Close Match  — location + type match AND price is up to 15% above/below budget
//
//    Two functions:
//      matchPropertiesToLead()  → "which properties fit this lead?"
//      matchLeadsToProperty()   → "which leads are looking for this property?"

import { Lead, Property } from "./types";

// How much above/below budget is still considered a "close match" (15%)
const CLOSE_TOLERANCE = 0.15;

// ── Result shape returned by both match functions ─────────────────────────────
export interface MatchResult<T> {
  perfect: T[];   // price is exactly within budget
  close:   T[];   // price is within ±15% of budget range
}

// ── Rule: Does property TYPE match what the lead wants? ───────────────────────
function typeMatches(interest: string, property: Property): boolean {
  const i      = interest.toLowerCase().replace(/\s+/g, "");
  const pType  = (property.type     ?? "").toLowerCase().replace(/\s+/g, "");
  const pTitle = (property.title    ?? "").toLowerCase().replace(/\s+/g, "");
  const pBed   = (property.bedrooms ?? "").toLowerCase().replace(/\s+/g, "");

  const bhkNum = i.match(/(\d)bhk/)?.[1];
  if (bhkNum) {
    return (
      pType.includes(bhkNum + "bhk") ||
      pTitle.includes(bhkNum + "bhk") ||
      pBed.includes(bhkNum)
    );
  }

  for (const kw of ["villa", "plot", "commercial", "office"]) {
    if (i.includes(kw)) return pType.includes(kw) || pTitle.includes(kw);
  }

  return false;
}

// ── Rule: Does LOCATION partially match? ──────────────────────────────────────
function locationMatches(a: string, b: string): boolean {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  return la.includes(lb) || lb.includes(la);
}

// ── Helper: how much is the price over/under budget? ─────────────────────────
// Returns positive number if over max, negative if under min, 0 if inside
export function budgetDiff(price: number, budgetMin: number, budgetMax: number): number {
  if (price > budgetMax) return price - budgetMax;   // e.g. +500000 means ₹5L above
  if (price < budgetMin) return price - budgetMin;   // e.g. -300000 means ₹3L below
  return 0;
}

// ── matchPropertiesToLead ─────────────────────────────────────────────────────
// Given a lead, returns { perfect, close } property arrays
export function matchPropertiesToLead(lead: Lead, properties: Property[]): MatchResult<Property> {
  const perfect: Property[] = [];
  const close:   Property[] = [];

  for (const p of properties) {
    if (p.status !== "available") continue;

    // Location + Type must match for BOTH tiers
    if (lead.location && p.location && !locationMatches(lead.location, p.location)) continue;
    if (lead.property_interest && !typeMatches(lead.property_interest, p)) continue;

    if (lead.budget_min && lead.budget_max) {
      const inPerfect = p.price >= lead.budget_min && p.price <= lead.budget_max;
      const inClose   =
        (p.price > lead.budget_max && p.price <= lead.budget_max * (1 + CLOSE_TOLERANCE)) ||
        (p.price < lead.budget_min && p.price >= lead.budget_min * (1 - CLOSE_TOLERANCE));

      if      (inPerfect) perfect.push(p);
      else if (inClose)   close.push(p);
    } else {
      // No budget set on lead — treat as perfect match
      perfect.push(p);
    }
  }

  return { perfect, close };
}

// ── matchLeadsToProperty ──────────────────────────────────────────────────────
// Given a property, returns { perfect, close } lead arrays
export function matchLeadsToProperty(property: Property, leads: Lead[]): MatchResult<Lead> {
  const perfect: Lead[] = [];
  const close:   Lead[] = [];

  for (const lead of leads) {
    if (lead.stage === "closed" || lead.stage === "lost") continue;

    // Location + Type must match for BOTH tiers
    if (lead.location && property.location && !locationMatches(lead.location, property.location)) continue;
    if (lead.property_interest && !typeMatches(lead.property_interest, property)) continue;

    if (lead.budget_min && lead.budget_max) {
      const inPerfect = property.price >= lead.budget_min && property.price <= lead.budget_max;
      const inClose   =
        (property.price > lead.budget_max && property.price <= lead.budget_max * (1 + CLOSE_TOLERANCE)) ||
        (property.price < lead.budget_min && property.price >= lead.budget_min * (1 - CLOSE_TOLERANCE));

      if      (inPerfect) perfect.push(lead);
      else if (inClose)   close.push(lead);
    } else {
      perfect.push(lead);
    }
  }

  return { perfect, close };
}
