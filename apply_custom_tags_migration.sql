-- ============================================
-- CUSTOM TAGS & SCREENSHOT ENHANCEMENTS
-- ============================================
-- Run this in your Supabase SQL Editor to add custom tag functionality
-- This allows users to customize mistake tags and good action tags in settings

-- Step 1: Add custom tags arrays to user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS custom_mistake_tags text[] DEFAULT '{}';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS custom_good_actions text[] DEFAULT '{}';

-- Step 2: Add default model selection if not exists
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

-- Optional: View updated table structure
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_settings'
  AND column_name IN ('custom_mistake_tags', 'custom_good_actions', 'default_model')
ORDER BY ordinal_position;

-- Note: The screenshot_url field already exists in the trades table from previous migrations
-- It can be used to store trade screenshots uploaded through the manage trade interface
