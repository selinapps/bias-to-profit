-- CHALLENGE PHASES MIGRATION
-- Copy and paste this entire content into your Supabase SQL Editor

-- Create the challenge_phases table
CREATE TABLE IF NOT EXISTS public.challenge_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prop_firm text NOT NULL CHECK (prop_firm IN ('Funded Hive', 'Topstep')),
  phase text NOT NULL CHECK (phase IN ('1', '2', 'Funded')) DEFAULT '1', -- Phase 1, Phase 2, Funded
  starting_balance numeric(18,2) NOT NULL CHECK (starting_balance > 0),
  target_profit numeric(18,2) NOT NULL CHECK (target_profit > 0),
  user_reported_current_balance numeric(18,2) CHECK (user_reported_current_balance >= 0),
  status text NOT NULL CHECK (status IN ('active', 'passed', 'failed', 'halted')) DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenge_active ON public.challenge_phases(user_id, status);
CREATE INDEX IF NOT EXISTS idx_challenge_user_prop_firm ON public.challenge_phases(user_id, prop_firm);
CREATE INDEX IF NOT EXISTS idx_challenge_started_at ON public.challenge_phases(started_at);

-- Create a function to ensure only one active phase per user
CREATE OR REPLACE FUNCTION ensure_single_active_challenge()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated phase is being set to 'active'
  IF NEW.status = 'active' THEN
    -- Deactivate any other active phases for this user
    UPDATE public.challenge_phases 
    SET status = 'halted', 
        ended_at = now(),
        updated_at = now()
    WHERE user_id = NEW.user_id 
      AND id != COALESCE(NEW.id, gen_random_uuid()) 
      AND status = 'active';
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one active challenge per user
DROP TRIGGER IF EXISTS trigger_ensure_single_active_challenge ON public.challenge_phases;
CREATE TRIGGER trigger_ensure_single_active_challenge
  BEFORE INSERT OR UPDATE ON public.challenge_phases
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_challenge();

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS get_challenge_summary(uuid);

-- Create a function to get challenge summary with calculations
CREATE FUNCTION get_challenge_summary(p_user_id uuid)
RETURNS TABLE (
  phase_id uuid,
  prop_firm text,
  phase text,
  starting_balance numeric,
  target_profit numeric,
  current_balance numeric,
  net_profit numeric,
  realized_today numeric,
  distance_to_pass numeric,
  distance_in_r jsonb,
  progress_pct numeric,
  state text
) AS $$
DECLARE
  challenge_record RECORD;
  today_start timestamptz;
  calculated_net_profit numeric;
  calculated_current_balance numeric;
  distance_to_pass_val numeric;
  progress_pct_val numeric;
  state_val text;
  distance_in_r_json jsonb;
  realized_today_val numeric;
BEGIN
  -- Get the active challenge for the user
  SELECT * INTO challenge_record
  FROM public.challenge_phases
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  -- If no active challenge, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate today's start timestamp
  today_start := date_trunc('day', now());

  -- Calculate realized PnL from trades today
  SELECT COALESCE(SUM(pnl), 0) INTO realized_today_val
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND exit_time >= today_start
    AND exit_time < today_start + interval '1 day';

  -- Calculate net profit from trades since challenge start
  SELECT COALESCE(SUM(pnl), 0) INTO calculated_net_profit
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND exit_time >= challenge_record.started_at;

  -- Determine current balance
  IF challenge_record.user_reported_current_balance IS NOT NULL THEN
    calculated_current_balance := challenge_record.user_reported_current_balance;
  ELSE
    calculated_current_balance := challenge_record.starting_balance + calculated_net_profit;
  END IF;

  -- Calculate metrics
  distance_to_pass_val := challenge_record.target_profit - calculated_net_profit;
  progress_pct_val := (calculated_current_balance - challenge_record.starting_balance) / challenge_record.target_profit;
  
  -- Determine state
  IF calculated_current_balance >= challenge_record.starting_balance + challenge_record.target_profit THEN
    state_val := 'PASSED';
  ELSE
    state_val := 'ACTIVE';
  END IF;

  -- Calculate distance in R for different risk amounts
  distance_in_r_json := jsonb_build_array(
    jsonb_build_object('risk', 250, 'rLeft', CASE WHEN 250 > 0 THEN distance_to_pass_val / 250 ELSE 0 END),
    jsonb_build_object('risk', 500, 'rLeft', CASE WHEN 500 > 0 THEN distance_to_pass_val / 500 ELSE 0 END),
    jsonb_build_object('risk', 1000, 'rLeft', CASE WHEN 1000 > 0 THEN distance_to_pass_val / 1000 ELSE 0 END)
  );

  -- Return the calculated values
  RETURN QUERY SELECT
    challenge_record.id,
    challenge_record.prop_firm,
    challenge_record.phase,
    challenge_record.starting_balance,
    challenge_record.target_profit,
    calculated_current_balance,
    calculated_net_profit,
    realized_today_val,
    distance_to_pass_val,
    distance_in_r_json,
    progress_pct_val,
    state_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.challenge_phases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own challenges" ON public.challenge_phases;
DROP POLICY IF EXISTS "Users can insert their own challenges" ON public.challenge_phases;
DROP POLICY IF EXISTS "Users can update their own challenges" ON public.challenge_phases;
DROP POLICY IF EXISTS "Users can delete their own challenges" ON public.challenge_phases;

-- Create RLS policies
CREATE POLICY "Users can view their own challenges" ON public.challenge_phases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges" ON public.challenge_phases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges" ON public.challenge_phases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenges" ON public.challenge_phases
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.challenge_phases TO authenticated;
GRANT EXECUTE ON FUNCTION get_challenge_summary(uuid) TO authenticated;
