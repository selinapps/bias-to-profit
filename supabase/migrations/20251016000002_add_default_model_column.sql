-- Add missing default_model column to user_settings
-- This column stores the user's preferred default trading model

ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS default_model text DEFAULT 'trend';

-- Update the column comment
COMMENT ON COLUMN public.user_settings.default_model IS 'User preferred default trading model (trend or mean_reversion)';

-- Update existing records to set default_model from last_model if it exists
UPDATE public.user_settings 
SET default_model = COALESCE(last_model, 'trend')
WHERE default_model IS NULL;

