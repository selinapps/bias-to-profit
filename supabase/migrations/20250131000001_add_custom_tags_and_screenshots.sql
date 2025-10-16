-- Add custom tags to user_settings and enhance screenshot support
-- This allows users to customize their mistake tags and good actions lists

-- Step 1: Add custom tags arrays to user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS custom_mistake_tags text[] DEFAULT '{}';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS custom_good_actions text[] DEFAULT '{}';

-- Step 2: Add default model selection
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS default_model text;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN public.user_settings.custom_mistake_tags IS 'User-defined mistake tags for trade reflection';
COMMENT ON COLUMN public.user_settings.custom_good_actions IS 'User-defined good action tags for trade reflection';
COMMENT ON COLUMN public.user_settings.default_model IS 'Default execution model for new trades';

-- Step 4: Verify the changes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_settings' AND column_name = 'custom_mistake_tags'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_settings' AND column_name = 'custom_good_actions'
  ) THEN
    RAISE NOTICE '✅ Migration successful! Custom tags fields added to user_settings.';
  ELSE
    RAISE NOTICE '⚠️ Migration may have failed. Please check the logs.';
  END IF;
END $$;
