-- Migration: Add journal mode and custom setups to user_settings table
-- Description: Adds support for two-tier journal system (Advanced vs Just Journal)
-- Date: 2025-10-15

-- Add journal_mode column (defaults to 'advanced')
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS journal_mode TEXT DEFAULT 'advanced' CHECK (journal_mode IN ('advanced', 'simple'));

-- Add custom_setups column (stores array of setup objects as JSONB)
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS custom_setups JSONB DEFAULT '[
  {
    "id": "setup-1",
    "name": "Breakout",
    "description": "Momentum breakout setup",
    "checklist": ["Confirmed breakout", "Volume spike", "Clean structure"]
  },
  {
    "id": "setup-2",
    "name": "Reversal",
    "description": "Counter-trend reversal",
    "checklist": ["Divergence present", "Support/resistance hit", "Reversal candle"]
  }
]'::jsonb;

-- Add comment to journal_mode column
COMMENT ON COLUMN user_settings.journal_mode IS 'User journal mode preference: advanced (full-featured) or simple (quick entry)';

-- Add comment to custom_setups column
COMMENT ON COLUMN user_settings.custom_setups IS 'User-defined trading setups with checklists stored as JSONB array';

-- Update existing users to have default values (if they don't already)
UPDATE user_settings 
SET 
  journal_mode = COALESCE(journal_mode, 'advanced'),
  custom_setups = COALESCE(custom_setups, '[
    {
      "id": "setup-1",
      "name": "Breakout",
      "description": "Momentum breakout setup",
      "checklist": ["Confirmed breakout", "Volume spike", "Clean structure"]
    },
    {
      "id": "setup-2",
      "name": "Reversal",
      "description": "Counter-trend reversal",
      "checklist": ["Divergence present", "Support/resistance hit", "Reversal candle"]
    }
  ]'::jsonb)
WHERE journal_mode IS NULL OR custom_setups IS NULL;

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
  AND column_name IN ('journal_mode', 'custom_setups')
ORDER BY column_name;

