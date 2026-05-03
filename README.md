# EstatePro CRM

A full-featured real estate broker CRM built for Indian brokers. Manages leads, properties, clients, site visits, commissions, and auto-captures leads from portal emails — all in one place.

**Live:** [rateperfeet.com](https://rateperfeet.com) · **Stack:** Next.js 16 + Supabase + Tailwind CSS v4

---

## What This App Does

EstatePro replaces WhatsApp chaos and spreadsheets for real estate brokers. Core value:

1. **Auto Lead Capture** — connects to the broker's Gmail, reads portal emails (MagicBricks, 99acres, Housing.com, etc.) every minute, extracts lead data using a regex parser, and creates leads automatically — zero manual entry
2. **Lead Pipeline** — tracks every lead from New Enquiry → Contacted → Site Visit → In Talks → Deal Done
3. **Smart Property Matching** — automatically matches leads to properties based on budget, location, and BHK type (2-tier: perfect match + 15% close match)
4. **My Calls** — flash card call system showing one lead at a time, log outcome (Called / No Answer / Busy / Snooze)
5. **Site Visit Scheduler** — schedule and track property visits, send WhatsApp reminders
6. **Commission Tracker** — log closed deals, track commission per deal, monthly/yearly stats
7. **Secure Property Links** — shareable property links with watermark, expiry, max views — for sending to buyers via WhatsApp
8. **Newspaper Leads** — bulk import leads from newspaper ads via CSV/JSON/PDF upload
9. **AI Message Templates** — generate WhatsApp/Email/SMS messages for leads

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.4 (App Router) + React 19 |
| Language | TypeScript throughout |
| Styling | Tailwind CSS v4 — uses `@import "tailwindcss"`, no `tailwind.config.js` |
| Backend/DB | Supabase (Postgres + Auth + Storage) |
| Auth | Supabase Auth — email+password, Google OAuth, Facebook OAuth, Microsoft/Azure OAuth |
| Payments | Razorpay (lazy init — never at module level) |
| Deployment | Vercel — auto-deploys on `git push origin main` |
| Cron | cron-job.org — calls `/api/cron/gmail-poll` every 1 minute |
| Font | Plus Jakarta Sans |

### Critical Next.js 16 Rules
- `params` is a **Promise** — always `await params` in dynamic route pages
- `viewport` must be a **separate named export** from `metadata`
- Never use `new Razorpay()` at module level — use `getRazorpay()` lazy init from `lib/razorpay.ts`

---

## All Features

### Auth (`/login`, `/signup`)
- Email + password login/signup
- Social login: Google, Facebook, Microsoft/Outlook (Supabase OAuth)
- On signup: if email confirmation is OFF → goes straight to dashboard; if ON → shows "check your email" screen
- OAuth callback at `/auth/callback`

### Dashboard (`/dashboard`)
- KPI cards: total leads, properties, tasks due today, commissions this month
- Lead stage funnel (New → Closed)
- Pending tasks list
- Global search across leads + properties

### Leads (`/leads`, `/leads/[id]`, `/leads/new`, `/leads/[id]/edit`)
- Full CRUD — add, edit, delete leads
- Stage pipeline: New Enquiry → Contacted → Site Visit → In Talks → Deal Done → Not Interested
- Inline stage change on list page
- **Lead Quality Score** (computed client-side, no DB column):
  - Has phone: +3 | Real name: +2 | Has budget: +1 | Has location: +1 | Has email: +1 | Has BHK: +1 | Has notes: +1
  - Hot = 7–10 | Warm = 4–6 | Cold = 0–3
  - Filter buttons: All Quality / Hot / Warm / Cold
- **Source Portal Badges**: auto-captured leads show colored badge (e.g. "⚡ MagicBricks") from notes field
- **Lead Detail page**: stage chips, inline budget/location/type editing, matched properties (2-tier), activity feed, quick actions (Schedule Visit, Add Deal)
- **Property Matcher** (reactive): recomputes on every budget/location/type change — shows "Perfect Match" and "Close Match" (±15%) property cards; shows empty state message if no matches

### Properties (`/properties`, `/properties/[id]`, `/properties/new`, `/properties/[id]/edit`)
- Full CRUD — shared `PropertyForm` component (title, type, location, price, status, BHK, area, furnishing, amenities, description, floor, facing, possession)
- **Multi-media upload**: upload up to 10 images + videos per property (`property-media` storage path)
- **Video compression**: ffmpeg.wasm compresses uploaded videos in the browser — progress bar shown on detail page while processing runs in background
- Property detail: swipeable media carousel (images + videos), specs, interested leads (2-tier matching), WhatsApp share message
- Status: Available / Sold / Rented / Off-Market

### My Calls (`/follow-ups`)
- Flash card call system — shows one lead at a time, highest priority first
- **3 tabs**: Pending (overdue first) / Called today / Snoozed
- **Outcome actions**: Called ✅ / No Answer 📵 / Busy 🔴 / Callback Requested 🔄 / Site Visit Done 🏠 / Add Note 📝
- Snooze with duration (tomorrow / 3 days / 1 week) — undo toast (5-second window)
- **Progress bar**: shows how many leads called today vs. total
- Overdue logic per stage: Negotiating = 1 day, New = 1 day, Viewing = 2 days, Contacted = 4 days

### Reminders / Tasks (`/tasks`)
- Full CRUD with priority (Low/Medium/High), due date, overdue badge
- One-click complete toggle

### Site Visits (`/visits`)
- Schedule visits with lead, property, date/time
- 3 tabs: Upcoming / Completed / All
- WhatsApp reminder link (pre-filled message)
- Mark done / cancel / edit

### Commission Tracker (`/deals`)
- Log closed deals: property, sale price, commission %
- Commission amount auto-calculated
- This-month and this-year stats
- Default commission % saved in localStorage (`ep_commission_pct`)

### Clients (`/clients`, `/clients/[id]`)
- Separate from leads — repeat buyers/sellers
- Type: Buyer / Seller / Both
- Total deals counter

### Analytics / Reports (`/analytics`)
- CSS bar charts from real Supabase data
- Leads by source, stage distribution, monthly trend

### AI Message Templates (`/ai-tools`)
- Generate WhatsApp / Email / SMS messages for a lead
- Templates for: Follow up, Property sharing, Appointment confirmation, etc.

### Secure Property Links (`/secure-share`, `/secure-share/create`)
- Create shareable links for property media (images/video/PDF)
- Settings per link: expiry date, max views, watermark (custom text + 40% opacity), password protection
- Public viewer at `/share/[token]` — watermark overlay, anti-screenshot hints
- WhatsApp share button (pre-filled message)
- View analytics: who viewed, when, IP

### Auto Capture (`/auto-capture`)
Two integration paths:

**Path 1 — Gmail OAuth (preferred, one-click):**
- Broker clicks "Connect Gmail" → Google OAuth → tokens saved to `gmail_connections`
- Cron at `/api/cron/gmail-poll` runs every 1 minute — polls Gmail for all connected accounts
- Parses portal emails + direct buyer emails
- Creates leads automatically, deduplicates by phone then email
- Disconnect button removes connection (RLS protected)

**Path 2 — Legacy Apps Script webhook:**
- Webhook URL: `POST /api/inbound-email?id=TOKEN`
- Broker runs a Google Apps Script in their Gmail that forwards emails to this URL
- Token stored in `user_inboxes` table

**Parser supports 18 portals** (regex-based, zero API cost):
99acres, MagicBricks, Housing.com, NoBroker, PropTiger, SquareYards, CommonFloor, Makaan, JustDial, Sulekha, OLX, Quikr, NestAway, Anarock, Zameen, Bayut, Facebook, Instagram

**Direct buyer email subjects captured**: bhk, flat, property, house, home, apartment, villa, plot, office, shop, looking, need, want, buy, rent, enquiry, interested, require

**Deduplication**: skips if phone already exists for that user (fallback: email)

**Sold property check**: when lead comes in, checks if any sold/rented/off-market property matches location+BHK+budget. If match: still creates lead but appends warning note.

### Newspaper Leads (`/newspaper`)
- Upload CSV, JSON, or PDF of leads from newspaper ads
- Bulk import with deduplication
- Mark contacted / converted

---

## Database Schema (Supabase)

All tables have Row Level Security (RLS) — each broker only sees their own data via `user_id`.

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `leads` | All leads | id, user_id, name, phone, email, source, budget_min, budget_max, location, property_interest, stage, notes, next_follow_up_at |
| `properties` | Property listings | id, user_id, title, type, location, price, status, image_url, media_urls (array), media_processing, bedrooms, bathrooms, area_sqft, furnishing, parking, floor_no, total_floors, facing, possession, amenities, description |
| `clients` | Repeat buyers/sellers | id, user_id, name, phone, email, type (buyer/seller/both), total_deals |
| `tasks` | Reminders/tasks | id, user_id, lead_id, type, priority, due_date, completed |
| `follow_up_logs` | Call outcome history | id, user_id, lead_id, outcome, note, created_at |
| `deals` | Closed deals + commission | id, user_id, lead_id, property_title, sale_price, commission_pct, commission_amt, deal_date |
| `site_visits` | Scheduled visits | id, user_id, lead_id, lead_phone, property_title, scheduled_at, status (scheduled/completed/cancelled) |
| `secure_share_links` | Shareable property links | id, user_id, token, title, expires_at, max_views, view_count, is_active, watermark_enabled, watermark_text |
| `share_media` | Files for secure links | id, link_id, storage_path, external_url, media_type |
| `share_views_log` | Link view analytics | id, link_id, viewed_at, ip_address, user_agent |
| `user_inboxes` | Webhook tokens (legacy) | id, user_id, unique_id, active |
| `gmail_connections` | Gmail OAuth tokens | id, user_id, google_email, access_token, refresh_token, token_expiry, last_checked_at, leads_captured |
| `newspaper_leads` | Bulk-imported leads | (from CSV/JSON/PDF uploads) |
| `profiles` | User profile data | id (= auth.users.id), email, full_name — auto-created by trigger |

**Storage buckets:**
- `property-images` (public) — property images and videos (`property-media/` path)
- `secure-share-media` (private) — files for secure share links; signed URLs generated server-side

**DB functions:**
- `handle_new_user()` — trigger on `auth.users` INSERT, creates profile row. Uses `SET search_path = public` (required for SECURITY DEFINER)
- `increment_gmail_leads(connection_id, amount)` — safely increments leads_captured counter

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/inbound-email` | POST | Legacy webhook — receives forwarded email, parses, creates lead. `?id=TOKEN` validates against `user_inboxes` |
| `/api/inbound-email` | GET | Health check |
| `/api/auth/google` | GET | Starts Gmail OAuth flow (for reading Gmail, not for user login) |
| `/api/auth/google/callback` | GET | Gmail OAuth callback — exchanges code for tokens, saves to `gmail_connections` |
| `/api/cron/gmail-poll` | POST | Protected by `x-cron-secret` header. Polls Gmail for all connected users, creates leads |
| `/api/cron/gmail-poll` | GET | Same as POST (for manual testing with `?secret=...`) |
| `/api/share/[token]` | GET | Validates share token, returns signed media URLs, logs view |
| `/api/razorpay/create-order` | POST | Creates Razorpay payment order |
| `/api/razorpay/verify` | POST | Verifies Razorpay payment signature |

---

## File Structure

```
estatepro/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login — email + Google/Facebook/Microsoft
│   │   └── signup/page.tsx         # Signup — same social options
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Dashboard shell — Sidebar + MobileTopBar + MobileBottomNav
│   │   ├── dashboard/page.tsx      # KPI cards, funnel, tasks, search
│   │   ├── leads/
│   │   │   ├── page.tsx            # Lead list — filter, sort, quality score, source badges
│   │   │   ├── new/page.tsx        # Create lead form
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Lead detail — reactive property matcher
│   │   │       └── edit/page.tsx   # Edit lead form
│   │   ├── properties/
│   │   │   ├── page.tsx            # Property grid
│   │   │   ├── new/page.tsx        # Create property + image upload
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Property detail + interested leads
│   │   │       └── edit/page.tsx   # Edit property form
│   │   ├── follow-ups/page.tsx     # My Calls — flash card, outcome logging
│   │   ├── tasks/page.tsx          # Reminders — CRUD + overdue
│   │   ├── visits/page.tsx         # Site Visit Scheduler
│   │   ├── deals/page.tsx          # Commission Tracker
│   │   ├── clients/[id]/page.tsx   # Client detail
│   │   ├── analytics/page.tsx      # Reports — CSS bar charts
│   │   ├── ai-tools/page.tsx       # Message template generator
│   │   ├── secure-share/
│   │   │   ├── page.tsx            # All secure links dashboard
│   │   │   └── create/page.tsx     # Create new secure link
│   │   ├── auto-capture/page.tsx   # Gmail Connect + legacy webhook
│   │   ├── newspaper/page.tsx      # Newspaper leads — CSV/JSON/PDF upload
│   │   └── settings/page.tsx       # Profile — name, password change
│   ├── _components/
│   │   ├── Sidebar.tsx             # Desktop left nav — collapsible Tools group, overdue badge
│   │   ├── MobileBottomNav.tsx     # Mobile — 4 main tabs (Home/Leads/My Calls/Tasks) + More drawer (10 tools in grid)
│   │   ├── MobileTopBar.tsx        # Mobile sticky top bar
│   │   ├── AuthGuard.tsx           # Redirects to /login if no Supabase session
│   │   ├── ImageUpload.tsx         # Single image upload to Supabase Storage
│   │   └── PropertyForm.tsx        # Shared property form — media upload, specs, amenities
│   ├── share/[token]/
│   │   ├── page.tsx                # Public viewer — WhatsApp/OG meta tags
│   │   └── ViewerClient.tsx        # Media viewer — watermark, anti-theft, PDF/video support
│   ├── api/                        # (see API Routes table above)
│   ├── auth/callback/route.ts      # Supabase OAuth callback (for user login)
│   ├── layout.tsx                  # Root HTML — Plus Jakarta Sans font
│   └── page.tsx                    # Redirects / → /login
├── lib/
│   ├── supabase.ts                 # Anon client — use in client components
│   ├── supabase-admin.ts           # Service-role client — server-side ONLY
│   ├── types.ts                    # All TypeScript interfaces
│   ├── mock-data.ts                # formatPrice(n), initials(name), STAGE_LABEL
│   ├── format-price.ts             # formatPriceFull(n) — "₹1.25 Crore", "₹45 Lakh"
│   ├── match-utils.ts              # Lead↔Property matching — 2-tier (perfect + ±15% close)
│   ├── email-parser.ts             # 18-portal regex parser — extracts name/phone/budget/location/BHK
│   ├── compress-image.ts           # Client-side image compression before upload
│   ├── compress-video.ts           # ffmpeg.wasm video compression with progress callback
│   ├── razorpay.ts                 # getRazorpay() lazy init — NEVER at module level
│   └── db/
│       ├── leads.ts                # getAllLeads, getLeadById, addLead, updateLead, deleteLead
│       ├── properties.ts           # getAllProperties, getPropertyById, addProperty, updateProperty, deleteProperty
│       ├── clients.ts              # getAllClients, getClientById, addClient, updateClient, deleteClient
│       ├── tasks.ts                # getAllTasks, addTask, updateTask, deleteTask, getOverdueTasks
│       ├── follow-ups.ts           # addFollowUp, getFollowUpLogs, logFollowUp, snoozeFollowUp
│       ├── secure-share.ts         # createSecureShareLink, getSecureShareLinks, toggleShareLinkActive
│       ├── deals.ts                # getAllDeals, addDeal, updateDeal, deleteDeal
│       └── site-visits.ts          # getAllSiteVisits, addSiteVisit, updateSiteVisit
└── supabase/
    └── COMPLETE-SETUP.sql          # Master migration — all 16 tables + 2 buckets + functions. Safe to re-run.
```

---

## Design System

| Token | Value | Used for |
|-------|-------|---------|
| Primary green | `#1BC47D` | CTA buttons, active nav, toggles |
| Indigo | `#6366F1` | Secure Share feature only |
| Page bg | `#F5F7FA` | Dashboard background |
| Card bg | `#FFFFFF` | All cards |
| Card border | `#EEF1F6` | Card outlines |
| Heading text | `#1A1D23` | H1, H2 |
| Body text | `#374151` | Paragraphs |
| Muted text | `#6B7280` | Labels, subtitles |
| Font | Plus Jakarta Sans | Entire app |

---

## Enums

**Lead Source:** `website` | `referral` | `social` | `walk-in` | `ad` | `other`
- Portal leads → `ad` | Facebook/Instagram → `social` | Direct emails → `other`

**Lead Stage:** `new` → `contacted` → `viewing` → `negotiating` → `closed` | `lost`

**Property Interest:** `1BHK` | `2BHK` | `3BHK` | `4BHK` | `Villa` | `Plot` | `Commercial`

**Property Status:** `available` | `sold` | `rented` | `off-market`

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://ljsuktxbubvmvrxgmgqd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
GOOGLE_CLIENT_ID=...          # For Gmail OAuth (reading emails — separate from Supabase login OAuth)
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=https://rateperfeet.com   # Must match exactly — used in OAuth redirect URIs
CRON_SECRET=...               # Sent as x-cron-secret header by cron-job.org
```

All 9 vars must also be set in Vercel project settings.

---

## Key Coding Patterns

```ts
// Dynamic route — params is a Promise in Next.js 16
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// Always get current user before any DB write
const { data: { user } } = await supabase.auth.getUser();
if (!user) return;

// Mobile bottom nav clearance — all dashboard pages
<div className="p-4 pb-24 sm:pb-6">

// Razorpay — never at module level
import { getRazorpay } from "@/lib/razorpay";
const razorpay = getRazorpay();

// Supabase admin — server-side API routes only
import { supabaseAdmin } from "@/lib/supabase-admin";
```

---

## Production Status (rateperfeet.com)

| Item | Status |
|------|--------|
| All Vercel env vars set | ✅ |
| Google OAuth (login) configured in Supabase | ✅ |
| Gmail OAuth connected (`prikshitcorp@gmail.com`) | ✅ |
| Google Cloud redirect URIs: Supabase callback + app Gmail callback | ✅ |
| cron-job.org — POST rateperfeet.com/api/cron/gmail-poll every 1 min | ✅ |
| `gmail_connections` UNIQUE constraint on `user_id` | ✅ |
| `handle_new_user()` trigger with `SET search_path = public` | ✅ |
| All SQL migrations via `supabase/COMPLETE-SETUP.sql` | ✅ |

---

## Run Locally

```bash
cd estatepro
npm install
# create .env.local with all 9 variables above
npm run dev
# open http://localhost:3000
```

For a new Supabase project: run `supabase/COMPLETE-SETUP.sql` in the SQL editor — creates all tables, storage buckets, and functions in one shot.
