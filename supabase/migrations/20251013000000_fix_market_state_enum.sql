-- Ensure market_state_enum has all required values
-- This migration fixes any missing enum values

-- Add enum values if they don't exist (PostgreSQL 9.1+)
DO $$
BEGIN
  -- Add OUT_OF_BALANCE if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'OUT_OF_BALANCE' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'market_state_enum')
  ) THEN
    ALTER TYPE public.market_state_enum ADD VALUE 'OUT_OF_BALANCE';
  END IF;

  -- Add IN_BALANCE if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'IN_BALANCE' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'market_state_enum')
  ) THEN
    ALTER TYPE public.market_state_enum ADD VALUE 'IN_BALANCE';
  END IF;

  -- Add UNCLEAR if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'UNCLEAR' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'market_state_enum')
  ) THEN
    ALTER TYPE public.market_state_enum ADD VALUE 'UNCLEAR';
  END IF;
END$$;

-- Log the current enum values for debugging
DO $$
DECLARE
  enum_values TEXT;
BEGIN
  SELECT string_agg(enumlabel, ', ' ORDER BY enumlabel)
  INTO enum_values
  FROM pg_enum
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'market_state_enum');
  
  RAISE NOTICE 'market_state_enum values: %', enum_values;
END$$;

