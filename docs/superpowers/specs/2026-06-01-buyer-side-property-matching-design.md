# Buy-Side Property Matching — Design Spec

**Date:** 2026-06-01
**Status:** Approved (ready for implementation plan)
**App:** EstatePro / RatePerFeet CRM (Next.js 16 + Supabase, Indian real estate brokers)

## Problem

The CRM is built around **selling**: a broker adds *properties* (their own listings)
and tracks *leads* (buyers with requirements). The buy-side — a broker **finding a
property for a client** — is only half-built:

- A **Lead** already holds buyer requirements: `budget_min/max`, `location`, `property_interest`.
- `lib/match-utils.ts` already matches a buyer lead to properties — **but only the
  broker's own listings**, a small pool.
- The **Add Property** form captures the *asset* (title, type, price, BHK, photos)
  but **no owner/seller contact** — so a matched property is a dead end: the broker
  has nobody to call.
- The **newspaper_leads** pool is a large set of *other people's* market properties
  that already carry a phone number — but buyer matching never looks at it.

## Goal

When a broker has a buyer client, the app should automatically surface **callable**
property matches — from the broker's own listings *and* the market (newspaper pool) —
each showing **who to call**.

## Non-Goals (YAGNI — explicitly deferred)

- Linking properties to the `clients` table (richer owner relationship). Later.
- WhatsApp/email push or background match jobs. Matches are computed on page load.
- "New since last visit" / seen-unseen tracking. Dashboard shows current matches only.
- Rent-side matching. Buyers = sale intent only for now.

## Design

Four parts. The only schema change is three columns on `properties`.

### Part 1 — Owner contact on a property (the foundation)

Add three **optional** fields to the property, mirroring the shape the newspaper pool
already uses (`phone` + `owner_type`), so one matching engine works across both sources.

- **DB migration** (`supabase/property-owner-contact-migration.sql`):
  ```sql
  ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_name  text;
  ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_phone text;
  ALTER TABLE properties ADD COLUMN IF NOT EXISTS listed_by   text DEFAULT 'owner';
  -- listed_by ∈ ('owner','broker','builder')
  ```
- **Type** (`lib/types.ts` `Property`): add `owner_name?`, `owner_phone?`, `listed_by?`.
- **Form** (`app/_components/PropertyForm.tsx`): a small "Owner / Contact" section —
  Owner name, Owner phone, Listed-by tag (Owner · Broker · Builder, default Owner).
- **Property detail** (`app/(dashboard)/properties/[id]/page.tsx`): show **Call owner**
  (`tel:`) and **WhatsApp owner** (`wa.me`) buttons when `owner_phone` is present.

### Part 2 — Matching looks at the market too

- New adapter in `lib/match-utils.ts` (or a small `lib/buyer-matches.ts`):
  map a `NewspaperLead` (sale intent, active) → the minimal shape the matcher needs
  (`location` = area + city, `price`, `bedrooms` = bhk, `type` = property_type).
- A unified result item — `PropertyMatch`:
  ```ts
  interface PropertyMatch {
    source: "mine" | "market";   // your listing vs newspaper pool
    id: string;
    title: string;               // property title or a synthesized "2BHK in Andheri"
    location: string;
    price: number;
    bedrooms?: string;
    tier: "perfect" | "close";   // reuse existing budget tolerance (±15%)
    contactName?: string;        // owner_name / newspaper owner
    contactPhone?: string;       // owner_phone / newspaper phone — what makes it callable
    contactKind: "owner" | "broker" | "builder" | "unknown";
    href?: string;               // link to /properties/[id] for own listings
  }
  ```
- A function `getBuyerMatches(lead, properties, newspaperLeads): { perfect, close }`
  returning `PropertyMatch[]`, reusing the existing budget/location/type rules.

### Part 3 — On the lead (buyer) page

- Extend the existing "Matching Properties" section in
  `app/(dashboard)/leads/[id]/page.tsx` to render `PropertyMatch[]` from both sources.
- Each item: title · price · location · a **"Your listing" / "From market"** tag · and
  a **Call / WhatsApp owner** button when `contactPhone` exists. Own listings also link
  to the property detail page.

### Part 4 — Dashboard "Buyers to match" (the in-app alert)

- New section on `app/(dashboard)/dashboard/page.tsx`: list active buyer leads
  (`stage` not closed/lost) that have **≥1 callable match right now**, with the match
  count; click → the lead. Computed live from the leads + properties + newspaper pools
  already loaded (no new query pattern, no job).

## Data Flow

```
Lead (buyer requirement)
        │
        ▼
getBuyerMatches(lead, ownProperties, newspaperLeads)
        │  reuse budget/location/type rules (match-utils)
        ▼
PropertyMatch[]  ──►  Lead page  : "Matching Properties" + Call owner
                 └─►  Dashboard  : "Buyers to match" section
```

## Error / Edge Handling

- Missing `owner_phone` → no Call button; match still listed (broker can edit later).
- Empty newspaper pool / table missing → matching falls back to own listings only
  (wrap the newspaper fetch in try/catch, mirror existing `Promise.allSettled` style).
- Lead with no budget/location/type → existing matcher behaviour (treats as broad match);
  unchanged.

## Testing

- `getBuyerMatches` is a pure function → unit-test: own-only, market-only, mixed,
  perfect vs close tiers, sale-vs-rent filtering, missing-phone items.
- Manual: add a property with owner phone → confirm Call button on detail; create a
  buyer lead that matches → confirm it appears on the lead page and in the dashboard
  "Buyers to match" section with a working Call button.

## Glossary (avoid confusing the customer)

- **Lead** = a *person* who wants to buy; carries the requirement (budget/location/BHK).
- **Property** = a *listing* (an asset). The broker's own. Now also carries an owner contact.
- **Newspaper lead** = a *market property* from a newspaper/portal ad — someone else's,
  already callable (has a phone).
- **Client** = a saved contact (buyer/seller/both). Not used by this feature yet.
- **Owner / Listed-by** = who to call about a property (owner, broker, or builder).
