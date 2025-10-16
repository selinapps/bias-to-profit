-- SIMPLE CHALLENGE MIGRATION - Run this in Supabase SQL Editor

-- Step 1: Create the table only
CREATE TABLE IF NOT EXISTS public.challenge_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prop_firm text NOT NULL CHECK (prop_firm IN ('Funded Hive', 'Topstep')),
  phase text NOT NULL CHECK (phase IN ('1', '2', 'Funded')) DEFAULT '1',
  starting_balance numeric(18,2) NOT NULL CHECK (starting_balance > 0),
  target_profit numeric(18,2) NOT NULL CHECK (target_profit > 0),
  user_reported_current_balance numeric(18,2) CHECK (user_reported_current_balance >= 0),
  status text NOT NULL CHECK (status IN ('active', 'passed', 'failed', 'halted')) DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
