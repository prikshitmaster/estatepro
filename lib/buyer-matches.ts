// lib/buyer-matches.ts — match a buyer requirement to callable properties
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    Given what a buyer wants (budget / location / type), find properties that
//    fit — from BOTH the broker's own listings AND the newspaper market pool —
//    and tell the broker WHO to call for each one.
//
//    Same rules as lib/match-utils.ts:
//      ✅ Perfect — location + type match AND price is inside budget
//      🟡 Close   — same, but price is within ±15% of budget
//
//    Output is a single PropertyMatch[] where each item is "callable": it carries
//    a phone (your owner_phone, or the newspaper ad's phone) and a source tag.

import { Property, NewspaperLead } from "@/lib/types";

const CLOSE_TOLERANCE = 0.15; // ±15% of budget still counts as a "close" match

export type MatchSource  = "mine" | "market";
export type ContactKind  = "owner" | "broker" | "builder" | "unknown";

export interface PropertyMatch {
  source:       MatchSource;   // your listing vs the newspaper pool
  id:           string;
  title:        string;
  location:     string;
  price:        number;
  bedrooms?:    string;
  tier:         "perfect" | "close";
  contactName?: string;        // owner_name (own) — newspaper has none
  contactPhone?: string;       // owner_phone / newspaper phone — makes it callable
  contactKind:  ContactKind;
  href?:        string;        // link to /properties/[id] for own listings
}

export interface BuyerMatchResult {
  perfect: PropertyMatch[];
  close:   PropertyMatch[];
}

// What the requirement needs to provide for matching (a Lead also fits this shape)
export interface MatchableRequirement {
  budget_min:         number;
  budget_max:         number;
  location?:          string | null;
  property_interest?: string | null;
}

// ── Normalised candidate (before budget tiering) ──────────────────────────────
interface Candidate {
  source:       MatchSource;
  id:           string;
  title:        string;
  location:     string;
  price:        number;
  bedrooms?:    string;
  type?:        string;        // type keyword used for matching only
  contactName?: string;
  contactPhone?: string;
  contactKind:  ContactKind;
  href?:        string;
}

// ── Rules (mirror lib/match-utils.ts) ─────────────────────────────────────────
function locationMatches(a: string, b: string): boolean {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (!la || !lb) return false;
  return la.includes(lb) || lb.includes(la);
}

function interestMatches(interest: string, c: Candidate): boolean {
  const i      = interest.toLowerCase().replace(/\s+/g, "");
  const pType  = (c.type     ?? "").toLowerCase().replace(/\s+/g, "");
  const pTitle = (c.title    ?? "").toLowerCase().replace(/\s+/g, "");
  const pBed   = (c.bedrooms ?? "").toLowerCase().replace(/\s+/g, "");

  const bhk = i.match(/(\d)bhk/)?.[1];
  if (bhk) return pType.includes(bhk + "bhk") || pTitle.includes(bhk + "bhk") || pBed.includes(bhk);

  for (const kw of ["villa", "plot", "commercial", "office"]) {
    if (i.includes(kw)) return pType.includes(kw) || pTitle.includes(kw);
  }
  return false;
}

// ── Adapters → Candidate ──────────────────────────────────────────────────────
function fromProperty(p: Property): Candidate | null {
  if (p.status !== "available") return null;
  return {
    source:       "mine",
    id:           p.id,
    title:        p.title,
    location:     p.location ?? "",
    price:        p.price,
    bedrooms:     p.bedrooms,
    type:         p.type,
    contactName:  p.owner_name,
    contactPhone: p.owner_phone,
    contactKind:  p.listed_by ?? "owner",
    href:         `/properties/${p.id}`,
  };
}

function fromNewspaper(n: NewspaperLead): Candidate | null {
  if (!n.is_active) return null;
  if (n.intent !== "sale") return null; // buyers are buying, not renting
  const loc   = [n.area, n.city].filter(Boolean).join(", ");
  const title = ([n.bhk, n.property_type].filter(Boolean).join(" ")
    + (n.area ? ` in ${n.area}` : "")).trim();
  return {
    source:       "market",
    id:           n.id,
    title:        title || "Market property",
    location:     loc,
    price:        n.price,
    bedrooms:     n.bhk,
    type:         n.property_type,
    contactName:  undefined,
    contactPhone: n.phone,
    contactKind:  n.owner_type === "broker" ? "broker" : n.owner_type === "owner" ? "owner" : "unknown",
    href:         undefined,
  };
}

// ── Main: match a requirement against own listings + the market ───────────────
export function getBuyerMatches(
  req: MatchableRequirement,
  properties: Property[],
  newspaperLeads: NewspaperLead[],
): BuyerMatchResult {
  const candidates = [
    ...properties.map(fromProperty),
    ...newspaperLeads.map(fromNewspaper),
  ].filter((c): c is Candidate => c !== null);

  const perfect: PropertyMatch[] = [];
  const close:   PropertyMatch[] = [];

  for (const c of candidates) {
    if (req.location && c.location && !locationMatches(req.location, c.location)) continue;
    if (req.property_interest && !interestMatches(req.property_interest, c)) continue;

    let tier: "perfect" | "close" | null;
    if (req.budget_min && req.budget_max) {
      if (c.price >= req.budget_min && c.price <= req.budget_max) {
        tier = "perfect";
      } else if (
        (c.price > req.budget_max && c.price <= req.budget_max * (1 + CLOSE_TOLERANCE)) ||
        (c.price < req.budget_min && c.price >= req.budget_min * (1 - CLOSE_TOLERANCE))
      ) {
        tier = "close";
      } else {
        tier = null;
      }
    } else {
      tier = "perfect"; // no budget set → treat as a match
    }
    if (!tier) continue;

    (tier === "perfect" ? perfect : close).push({
      source: c.source, id: c.id, title: c.title, location: c.location,
      price: c.price, bedrooms: c.bedrooms, tier,
      contactName: c.contactName, contactPhone: c.contactPhone,
      contactKind: c.contactKind, href: c.href,
    });
  }

  perfect.sort((a, b) => a.price - b.price);
  close.sort((a, b) => a.price - b.price);
  return { perfect, close };
}

// Total match count for a requirement (used by the dashboard alert)
export function totalMatches(r: BuyerMatchResult): number {
  return r.perfect.length + r.close.length;
}
