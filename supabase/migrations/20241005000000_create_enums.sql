-- Create required enums before other migrations that depend on them
-- This migration must run before any functions that use these enums

-- Create bias_enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bias_enum') THEN
    CREATE TYPE public.bias_enum AS ENUM ('OOB_LONG', 'OOB_SHORT', 'MR_LONG', 'MR_SHORT', 'NONE');
  END IF;
END $$;

-- Create market_state_enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'market_state_enum') THEN
    CREATE TYPE public.market_state_enum AS ENUM ('TRENDING', 'RANGING', 'VOLATILE', 'CALM');
  END IF;
END $$;
