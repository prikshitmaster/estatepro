-- supabase/subscriptions-migration.sql
-- Run this in Supabase SQL Editor before enabling Razorpay

-- Add subscription columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial',
  -- 'trial' | 'starter' | 'pro' | 'expired'
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,         -- Razorpay subscription ID
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,     -- 'active' | 'cancelled' | 'halted'
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_ends_at TIMESTAMPTZ;

-- Index for quick plan lookups
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);
