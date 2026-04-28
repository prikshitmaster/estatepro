# EstatePro CRM

A real estate broker CRM built in 15 days. Manage leads, properties, clients, tasks, and analytics — all in one place.

---

## Live App

Deployed on Vercel — auto-updates on every push to `main`.

---

## Features

| Module | What it does |
|---|---|
| **Dashboard** | Stats overview, leads pipeline, pending tasks, live search |
| **Leads** | Full CRUD — add, view, edit, delete. Quick stage change by tapping the stage badge |
| **Properties** | Full CRUD with optional photo upload to Supabase Storage |
| **Clients** | Separate from leads — repeat buyers/sellers with deal count tracking |
| **Tasks** | Add tasks linked to leads, complete/delete, filter by pending/done, overdue badge |
| **Analytics** | Bar charts for leads by stage and source, pipeline value, conversion rate, top leads |
| **AI Tools** | Follow-up message generator — picks lead → generates WhatsApp/Email/SMS message |
| **Settings** | Update profile name, change password |

---

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS v4**
- **Supabase** (auth + database + storage)
- **TypeScript**
- **Vercel** (deployment)

---

## Database Setup

Run this SQL in **Supabase → SQL Editor** before using the app:

### Day 1–4: Core tables

```sql
-- Leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text not null,
  email text default '',
  source text not null default 'website',
  budget_min bigint default 0,
  budget_max bigint default 0,
  location text default '',
  property_interest text,
  stage text not null default 'new',
  notes text default '',
  created_at timestamp with time zone default now()
);
alter table public.leads enable row level security;
create policy "leads_select" on public.leads for select using (auth.uid() = user_id);
create policy "leads_insert" on public.leads for insert with check (auth.uid() = user_id);
create policy "leads_update" on public.leads for update using (auth.uid() = user_id);
create policy "leads_delete" on public.leads for delete using (auth.uid() = user_id);

-- Properties
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  type text not null default 'apartment',
  location text not null,
  price bigint default 0,
  status text not null default 'available',
  image_url text,
  created_at timestamp with time zone default now()
);
alter table public.properties enable row level security;
create policy "props_select" on public.properties for select using (auth.uid() = user_id);
create policy "props_insert" on public.properties for insert with check (auth.uid() = user_id);
create policy "props_update" on public.properties for update using (auth.uid() = user_id);
create policy "props_delete" on public.properties for delete using (auth.uid() = user_id);
```

### Day 6: Tasks table

```sql
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  lead_id uuid,
  lead_name text not null,
  lead_phone text default '',
  type text not null default 'Call',
  priority text not null default 'medium',
  due_date timestamp with time zone not null,
  completed boolean default false,
  created_at timestamp with time zone default now()
);
alter table public.tasks enable row level security;
create policy "tasks_select" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update" on public.tasks for update using (auth.uid() = user_id);
create policy "tasks_delete" on public.tasks for delete using (auth.uid() = user_id);
```

### Day 7: Property image storage

```sql
insert into storage.buckets (id, name, public) values ('property-images', 'property-images', true);
create policy "storage_insert" on storage.objects for insert with check (bucket_id = 'property-images');
create policy "storage_select" on storage.objects for select using (bucket_id = 'property-images');
create policy "storage_update" on storage.objects for update using (bucket_id = 'property-images');
create policy "storage_delete" on storage.objects for delete using (bucket_id = 'property-images');
```

### Day 9: Clients table

```sql
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text not null,
  email text default '',
  type text not null default 'buyer' check (type in ('buyer', 'seller', 'both')),
  notes text default '',
  total_deals integer default 0,
  created_at timestamp with time zone default now()
);
alter table public.clients enable row level security;
create policy "clients_select" on public.clients for select using (auth.uid() = user_id);
create policy "clients_insert" on public.clients for insert with check (auth.uid() = user_id);
create policy "clients_update" on public.clients for update using (auth.uid() = user_id);
create policy "clients_delete" on public.clients for delete using (auth.uid() = user_id);
```

---

## Environment Variables

Create `.env.local` in the `estatepro/` folder:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Run Locally

```bash
cd estatepro
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Testing Checklist (for teammates)

- [ ] Sign up with a new account
- [ ] Add a lead → view it → edit it → change stage via the badge dropdown
- [ ] Add a property → upload a photo → view details → edit → delete
- [ ] Add a client (buyer/seller/both) → view → edit → delete
- [ ] Add a task linked to a lead → mark it done → delete it
- [ ] Check Analytics page — charts show real data
- [ ] Open AI Tools → pick a lead → generate a WhatsApp message → copy it
- [ ] Go to Settings → change your display name → check it updates in the sidebar
- [ ] Test on mobile — bottom nav tabs should work, all pages scroll properly

---

## Project Structure

```
estatepro/
  app/
    (auth)/login + signup     ← Supabase auth
    (dashboard)/
      dashboard/              ← home with stats + search
      leads/                  ← full CRUD + stage dropdown
      properties/             ← full CRUD + image upload
      clients/                ← full CRUD
      tasks/                  ← add/complete/delete/filter
      analytics/              ← CSS bar charts from real data
      ai-tools/               ← message generator
      settings/               ← profile + password
    _components/              ← Sidebar, MobileBottomNav, ImageUpload, etc.
    error.tsx                 ← global crash page
    not-found.tsx             ← 404 page
  lib/
    supabase.ts               ← single Supabase client
    types.ts                  ← Lead, Property, Task, Client types
    mock-data.ts              ← formatPrice + initials helpers
    db/                       ← leads.ts, properties.ts, tasks.ts, clients.ts
```
