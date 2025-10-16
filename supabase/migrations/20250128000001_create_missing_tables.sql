-- Fix missing tables and foreign key constraints

-- Create user_settings table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  notifications_enabled boolean DEFAULT true,
  offline_mode boolean DEFAULT false,
  daily_wrap_time text,
  last_model text,
  last_risk_tier text,
  last_aggression text[],
  last_locations text[],
  edge_reminders jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create daily_stats table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  total_trades integer,
  winning_trades integer,
  losing_trades integer,
  total_pnl numeric,
  total_r numeric,
  avg_r numeric,
  win_rate numeric,
  best_trade_r numeric,
  worst_trade_r numeric,
  best_hour integer,
  worst_hour integer,
  consecutive_losses integer,
  trend_trades integer,
  trend_win_rate numeric,
  mean_reversion_trades integer,
  mean_reversion_win_rate numeric,
  house_money_active boolean,
  day_disabled boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Fix the bias_state foreign key constraint
ALTER TABLE public.bias_state 
DROP CONSTRAINT IF EXISTS bias_state_selected_by_fkey;

ALTER TABLE public.bias_state 
ADD CONSTRAINT bias_state_selected_by_fkey 
FOREIGN KEY (selected_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add foreign key constraint for trades.hypothesis_id (if hypotheses table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hypotheses' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'trades_hypothesis_id_fkey'
    ) THEN
      ALTER TABLE public.trades 
      ADD CONSTRAINT trades_hypothesis_id_fkey 
      FOREIGN KEY (hypothesis_id) REFERENCES public.hypotheses(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON public.user_settings TO authenticated, anon;
GRANT ALL ON public.daily_stats TO authenticated, anon;
