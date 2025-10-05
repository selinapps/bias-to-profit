-- Add missing columns to user_settings table
ALTER TABLE public.user_settings 
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

-- Update existing records with default values for new columns
UPDATE public.user_settings 
SET 
  preferred_assets = COALESCE(preferred_assets, '{}'),
  default_risk_amount = COALESCE(default_risk_amount, 250),
  max_daily_losses = COALESCE(max_daily_losses, 3),
  enable_stop_rule = COALESCE(enable_stop_rule, true),
  enable_house_money = COALESCE(enable_house_money, true),
  house_money_threshold = COALESCE(house_money_threshold, 3),
  theme = COALESCE(theme, 'dark'),
  compact_mode = COALESCE(compact_mode, false),
  show_advanced_features = COALESCE(show_advanced_features, true),
  auto_save = COALESCE(auto_save, true),
  trade_alerts = COALESCE(trade_alerts, true),
  session_alerts = COALESCE(session_alerts, true),
  bias_reminders = COALESCE(bias_reminders, true),
  data_retention_days = COALESCE(data_retention_days, 365),
  export_format = COALESCE(export_format, 'csv'),
  auto_backup = COALESCE(auto_backup, false),
  experimental_features = COALESCE(experimental_features, false),
  debug_mode = COALESCE(debug_mode, false),
  custom_risk_amounts = COALESCE(custom_risk_amounts, '{"a": 100, "b": 50, "c": 25}')
WHERE preferred_assets IS NULL 
   OR default_risk_amount IS NULL 
   OR max_daily_losses IS NULL 
   OR enable_stop_rule IS NULL 
   OR enable_house_money IS NULL 
   OR house_money_threshold IS NULL 
   OR theme IS NULL 
   OR compact_mode IS NULL 
   OR show_advanced_features IS NULL 
   OR auto_save IS NULL 
   OR trade_alerts IS NULL 
   OR session_alerts IS NULL 
   OR bias_reminders IS NULL 
   OR data_retention_days IS NULL 
   OR export_format IS NULL 
   OR auto_backup IS NULL 
   OR experimental_features IS NULL 
   OR debug_mode IS NULL 
   OR custom_risk_amounts IS NULL;
