-- supabase/schema.sql
--
-- 🧠 WHAT THIS FILE DOES (simple explanation):
--    This is a blueprint for your database tables.
--    A "table" is like a spreadsheet — it has rows (one per lead)
--    and columns (name, phone, email, etc.)
--
-- HOW TO USE THIS:
--    1. Open your Supabase project at https://supabase.com
--    2. Go to: SQL Editor (left sidebar)
--    3. Click "New Query"
--    4. Copy ALL of this file and paste it there
--    5. Click "Run"
--    Done! Your tables are created.
--
-- Lines starting with -- are comments (Supabase ignores them)

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: leads
-- Each row = one lead (a person interested in buying/renting a property)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists leads (
  -- id: a unique number given automatically to each lead (like a roll number)
  id          uuid primary key default gen_random_uuid(),

  -- user_id: which broker/agent this lead belongs to
  -- references auth.users means it must match a real user account
  user_id     uuid references auth.users(id) on delete cascade not null,

  -- basic contact info
  name        text not null,
  phone       text not null,
  email       text,
  source      text not null default 'other',  -- how the lead came (website/referral/etc)

  -- budget: minimum and maximum price they can pay (in rupees)
  budget_min  numeric default 0,
  budget_max  numeric default 0,

  -- what city/area they are looking in
  location    text,

  -- what type of property (3BHK, Villa, etc.)
  property_interest text,

  -- stage: where in the sales process this lead is
  -- can only be one of these exact values (like a dropdown)
  stage       text not null default 'new'
              check (stage in ('new','contacted','viewing','negotiating','closed','lost')),

  -- any extra notes the broker writes
  notes       text default '',

  -- created_at: automatically set to current time when lead is added
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: properties
-- Each row = one property listing
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists properties (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  type        text not null default 'apartment',
  location    text not null,
  price       numeric not null default 0,
  status      text not null default 'available'
              check (status in ('available','sold','rented','off-market')),
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
--
-- 🧠 Simple explanation: RLS is like a lock on each drawer.
--    Without it, ANY logged-in user could see ALL leads from ALL brokers.
--    With it, each broker only sees THEIR OWN leads.
-- ─────────────────────────────────────────────────────────────────────────────

-- Turn on the lock
alter table leads      enable row level security;
alter table properties enable row level security;

-- Rule: "You can only see/edit leads where user_id matches YOUR login"
create policy "Leads: users manage their own"
  on leads for all
  using      (auth.uid() = user_id)   -- read check: is this your lead?
  with check (auth.uid() = user_id);  -- write check: are you saving as yourself?

create policy "Properties: users manage their own"
  on properties for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);
