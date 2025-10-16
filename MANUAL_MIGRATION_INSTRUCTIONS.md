# Manual Database Migration Instructions

Since the automated script requires service role permissions, please follow these manual steps to fix the database issues:

## Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project: `zbmpysqxauzfrbvroboh`

## Step 2: Open SQL Editor

1. In the left sidebar, click on **"SQL Editor"**
2. Click **"New query"** to create a new SQL query

## Step 3: Apply the Migration

Copy and paste the following SQL code into the SQL Editor:

```sql
-- Comprehensive fix for missing database schema
-- This migration ensures all required tables, views, and functions exist

-- First, ensure we have the bias_state table with the correct structure
CREATE TABLE IF NOT EXISTS public.bias_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_key date NOT NULL,
  bias text NOT NULL,
  market_state text,
  confidence text,
  tags jsonb,
  selected_at timestamp with time zone DEFAULT now(),
  selected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for bias_state
CREATE INDEX IF NOT EXISTS idx_bias_state_day_key ON public.bias_state(day_key);
CREATE INDEX IF NOT EXISTS idx_bias_state_active ON public.bias_state(active);
CREATE INDEX IF NOT EXISTS idx_bias_state_selected_by ON public.bias_state(selected_by);

-- Enable RLS for bias_state
ALTER TABLE public.bias_state ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bias_state
CREATE POLICY "Users can view bias state" ON public.bias_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert bias state" ON public.bias_state FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update bias state" ON public.bias_state FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete bias state" ON public.bias_state FOR DELETE TO authenticated USING (true);

-- Ensure profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  timezone text DEFAULT 'UTC',
  risk_settings jsonb DEFAULT '{
    "tier_a": 100,
    "tier_b": 50,
    "tier_c": 25,
    "max_daily_loss": 500,
    "house_money_threshold": 3
  }',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ensure trades table exists with correct structure
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hypothesis_id uuid,
  
  -- Trading details
  asset text NOT NULL,
  direction text CHECK (direction IN ('long', 'short')) NOT NULL,
  model text CHECK (model IN ('trend', 'mean_reversion')) NOT NULL,
  
  -- Location and aggression
  locations text[] DEFAULT '{}',
  aggression text[],
  
  -- Risk management
  risk_tier text CHECK (risk_tier IN ('a', 'b', 'c')) NOT NULL,
  risk_amount decimal(10,2) NOT NULL,
  
  -- Price levels
  entry_price decimal(12,4) NOT NULL,
  stop_loss decimal(12,4) NOT NULL,
  exit_price decimal(12,4),
  
  -- Performance metrics
  pnl decimal(10,2),
  r_multiple decimal(6,3),
  
  -- Trading session and timing
  trading_session text,
  entry_time timestamp with time zone DEFAULT now(),
  exit_time timestamp with time zone,
  duration_minutes integer,
  
  -- Psychology and external factors
  emotions jsonb DEFAULT '{}',
  externals text[] DEFAULT '{}',
  
  -- Mistakes and tags
  mistake_tags text[] DEFAULT '{}',
  
  -- Scenarios used
  scenarios text[] DEFAULT '{}',
  
  -- Attachments
  screenshot_url text,
  notes text,
  
  -- Trade state
  status text CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  is_experimental boolean DEFAULT false,
  
  -- Override tracking
  override_reason text,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for trades
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON public.trades(entry_time);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);

-- Enable RLS for trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trades
CREATE POLICY "Users can manage their own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);

-- Ensure user_settings table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Last selections for persistence
  last_model text,
  last_risk_tier text,
  last_locations text[],
  last_aggression text[],
  
  -- Preferences
  daily_wrap_time time DEFAULT '21:00:00',
  notifications_enabled boolean DEFAULT true,
  offline_mode boolean DEFAULT false,
  
  -- Edge reminders
  edge_reminders jsonb DEFAULT '{}',
  
  -- Additional settings
  preferred_assets text[] DEFAULT '{}',
  default_risk_amount numeric DEFAULT 250,
  max_daily_losses integer DEFAULT 3,
  enable_stop_rule boolean DEFAULT true,
  enable_house_money boolean DEFAULT true,
  house_money_threshold integer DEFAULT 3,
  theme text DEFAULT 'dark',
  compact_mode boolean DEFAULT false,
  show_advanced_features boolean DEFAULT true,
  auto_save boolean DEFAULT true,
  trade_alerts boolean DEFAULT true,
  session_alerts boolean DEFAULT true,
  bias_reminders boolean DEFAULT true,
  data_retention_days integer DEFAULT 365,
  export_format text DEFAULT 'csv',
  auto_backup boolean DEFAULT false,
  experimental_features boolean DEFAULT false,
  debug_mode boolean DEFAULT false,
  custom_risk_amounts jsonb DEFAULT '{"a": 100, "b": 50, "c": 25}',
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Enable RLS for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_settings
CREATE POLICY "Users can manage their own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- Create the v_current_bias view
DROP VIEW IF EXISTS public.v_current_bias;
CREATE VIEW public.v_current_bias AS
SELECT DISTINCT ON (day_key)
  day_key,
  id,
  bias,
  market_state,
  confidence,
  tags,
  selected_at,
  selected_by,
  active
FROM public.bias_state
WHERE active
ORDER BY day_key, selected_at DESC;

-- Create the get_current_bias function
CREATE OR REPLACE FUNCTION public.get_current_bias(target_day date)
RETURNS public.bias_state
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bs
  FROM public.bias_state AS bs
  WHERE bs.day_key = target_day
    AND bs.active
  ORDER BY bs.selected_at DESC
  LIMIT 1;
$$;

-- Create the set_bias_state function
CREATE OR REPLACE FUNCTION public.set_bias_state(
  target_day date,
  target_bias text,
  target_market_state text DEFAULT NULL,
  target_confidence text DEFAULT NULL,
  target_tags text[] DEFAULT NULL
)
RETURNS public.bias_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_selected_by uuid := auth.uid();
  v_inserted public.bias_state;
BEGIN
  IF v_selected_by IS NULL THEN
    RAISE EXCEPTION 'Missing authenticated user for bias selection';
  END IF;

  UPDATE public.bias_state
     SET active = FALSE
   WHERE day_key = target_day
     AND active;

  INSERT INTO public.bias_state (
    day_key,
    bias,
    market_state,
    confidence,
    tags,
    selected_by,
    active
  )
  VALUES (
    target_day,
    target_bias,
    target_market_state,
    target_confidence,
    CASE WHEN target_tags IS NULL THEN NULL ELSE to_jsonb(target_tags) END,
    v_selected_by,
    TRUE
  )
  RETURNING * INTO v_inserted;

  RETURN v_inserted;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_current_bias(date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_current_bias(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_bias_state(date, text, text, text, text[]) TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates (only if they don't exist)
DO $$
BEGIN
  -- Create bias_state trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_bias_state_updated_at'
  ) THEN
    CREATE TRIGGER update_bias_state_updated_at
      BEFORE UPDATE ON public.bias_state
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Create profiles trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Create trades trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_trades_updated_at'
  ) THEN
    CREATE TRIGGER update_trades_updated_at
      BEFORE UPDATE ON public.trades
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Create user_settings trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_user_settings_updated_at
      BEFORE UPDATE ON public.user_settings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
```

## Step 4: Execute the Migration

1. Click the **"Run"** button (or press Ctrl+Enter)
2. Wait for the execution to complete
3. You should see a success message

## Step 5: Verify the Fix

1. Go back to your application
2. Refresh the page
3. Check the browser console - you should no longer see the database errors
4. The application should now load properly

## What This Fixes

✅ **Missing Tables**: Creates `profiles`, `trades`, `bias_state`, `user_settings`  
✅ **Missing Views**: Creates `v_current_bias`  
✅ **Service Worker**: Already fixed in the code  
✅ **Database Errors**: All 404 and schema errors should be resolved  

## Troubleshooting

If you encounter any issues:

1. **Permission Errors**: Make sure you're logged in as the project owner
2. **Syntax Errors**: Check that you copied the entire SQL block
3. **Still Getting Errors**: Try refreshing the application after a few seconds

The migration is designed to be safe and will not overwrite existing data.
