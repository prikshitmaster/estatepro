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

- **Standalone requirements** (not attached to a lead) + a dedicated Requirements
  nav screen. Requirements are created **from a buyer lead only** for now.
- Linking properties to the `clients` table (richer owner relationship). Later.
- WhatsApp/email push or background match jobs. Matches are computed on page load.
- "New since last visit" / seen-unseen tracking. Dashboard shows current matches only.
- Rent-side matching. Buyers = sale intent only for now.

## Design

Five parts. Schema changes: three columns on `properties` + one new
`buyer_requirements` table.

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

### Part 2 — Buyer requirements as a DB record

A buyer requirement is a first-class row (not just the lead's fields), so one buyer
can have several and each has its own status.

- **DB migration** (`supabase/buyer-requirements-migration.sql`):
  ```sql
  CREATE TABLE IF NOT EXISTS buyer_requirements (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id   uuid REFERENCES leads(id) ON DELETE SET NULL,  -- the buyer person
    label     text,
    budget_min bigint DEFAULT 0,
    budget_max bigint DEFAULT 0,
    location   text,
    property_interest text,        -- "2BHK", "Villa", "Plot"…
    status    text DEFAULT 'active' CHECK (status IN ('active','fulfilled','archived')),
    notes     text,
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE buyer_requirements ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "own requirements" ON buyer_requirements FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  ```
- **Type** (`lib/types.ts`): `BuyerRequirement`.
- **DB layer** (`lib/db/buyer-requirements.ts`): `getRequirementsForLead`, `getActiveRequirements`,
  `addRequirement`, `updateRequirement`, `deleteRequirement`.
- **Created from a buyer lead only** (no standalone screen yet): the lead page has a
  "Buyer Requirements" section where the broker adds one or more, pre-filled from the
  lead's `budget_min/max`, `location`, `property_interest`. Editable; status can be set
  to `fulfilled`/`archived`.

### Part 3 — Matching looks at the market too

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
- A function `getBuyerMatches(requirement, properties, newspaperLeads): { perfect, close }`
  returning `PropertyMatch[]`, reusing the existing budget/location/type rules. The
  `requirement` supplies `budget_min/max`, `location`, `property_interest` — the same
  shape the matcher already consumes from a lead.

### Part 4 — On the lead (buyer) page

- A **"Buyer Requirements"** section in `app/(dashboard)/leads/[id]/page.tsx`: list this
  lead's requirements (Part 2), add/edit, mark fulfilled.
- Under each `active` requirement, render its `PropertyMatch[]` from both sources.
- Each match item: title · price · location · a **"Your listing" / "From market"** tag ·
  and a **Call / WhatsApp owner** button when `contactPhone` exists. Own listings also
  link to the property detail page.

### Part 5 — Dashboard "Buyers to match" (the in-app alert)

- New section on `app/(dashboard)/dashboard/page.tsx`: list **active buyer requirements**
  that have **≥1 callable match right now**, grouped by buyer (lead), with the match
  count; click → the lead. Computed live from the requirements + properties + newspaper
  pools already loaded (no new query pattern, no job).

## Data Flow

```
Lead (buyer person)
   └─ BuyerRequirement(s)  [DB table, created from the lead]
            │
            ▼
   getBuyerMatches(requirement, ownProperties, newspaperLeads)
            │  reuse budget/location/type rules (match-utils)
            ▼
   PropertyMatch[]  ──►  Lead page  : requirement + matches + Call owner
                    └─►  Dashboard  : "Buyers to match" (active requirements w/ matches)
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
- Manual: add a property with owner phone → confirm Call button on detail; on a buyer
  lead, add a requirement that matches → confirm matches appear under it on the lead
  page and in the dashboard "Buyers to match" section with a working Call button; mark
  the requirement `fulfilled` → confirm it drops off the dashboard.

## Glossary (avoid confusing the customer)

- **Lead** = a *person* who wants to buy. The lead's own budget/location/BHK still feed
  the seller-side "which leads fit this property" view.
- **Buyer requirement** = a saved buy-side brief (budget/location/BHK + status), created
  from a lead. A lead can have several. This is what buy-side matching runs on.
- **Property** = a *listing* (an asset). The broker's own. Now also carries an owner contact.
- **Newspaper lead** = a *market property* from a newspaper/portal ad — someone else's,
  already callable (has a phone).
- **Client** = a saved contact (buyer/seller/both). Not used by this feature yet.
- **Owner / Listed-by** = who to call about a property (owner, broker, or builder).
