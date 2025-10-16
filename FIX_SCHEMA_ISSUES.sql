-- ========================================
-- FIX SCHEMA ISSUES FOR USER_SETTINGS TABLE
-- ========================================
-- Run this SQL in your Supabase SQL Editor to fix schema errors
-- This adds the missing default_model column that's causing 406 and 400 errors

-- Add the missing default_model column
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS default_model text DEFAULT 'trend';

-- Ensure all other required columns exist
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS last_model text,
ADD COLUMN IF NOT EXISTS last_risk_tier text,
ADD COLUMN IF NOT EXISTS last_locations text[],
ADD COLUMN IF NOT EXISTS last_aggression text[],
ADD COLUMN IF NOT EXISTS daily_wrap_time time DEFAULT '21:00:00',
ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS offline_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS edge_reminders jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_assets text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS default_risk_amount numeric DEFAULT 250,
ADD COLUMN IF NOT EXISTS max_daily_losses integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS enable_stop_rule boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_house_money boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS house_money_threshold integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'dark',
ADD COLUMN IF NOT EXISTS compact_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_advanced_features boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_save boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS trade_alerts boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS session_alerts boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS bias_reminders boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS data_retention_days integer DEFAULT 365,
ADD COLUMN IF NOT EXISTS export_format text DEFAULT 'csv',
ADD COLUMN IF NOT EXISTS auto_backup boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS experimental_features boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS debug_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_risk_amounts jsonb DEFAULT '{"a": 100, "b": 50, "c": 25}';

-- Update existing records to set default_model from last_model if it exists
UPDATE public.user_settings 
SET default_model = COALESCE(last_model, 'trend')
WHERE default_model IS NULL OR default_model = '';

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'default_model'
  ) THEN
    RAISE NOTICE '✅ default_model column exists!';
  ELSE
    RAISE EXCEPTION '❌ default_model column still missing!';
  END IF;
END $$;

