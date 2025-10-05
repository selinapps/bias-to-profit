-- Update database enums to support all bias and market state values
-- This aligns the database with the application's type system

-- Add missing enum values to bias_enum
ALTER TYPE public.bias_enum ADD VALUE IF NOT EXISTS 'FLAT';

-- Add missing enum value to market_state_enum  
ALTER TYPE public.market_state_enum ADD VALUE IF NOT EXISTS 'UNCLEAR';

-- Add lot_size column to trades table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trades' 
    AND column_name = 'lot_size'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN lot_size DECIMAL(10,2) DEFAULT 1.0;
  END IF;
END $$;

-- Update validation functions to include new values
CREATE OR REPLACE FUNCTION public.validate_bias_value(bias_value text)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN bias_value IN ('OOB_LONG', 'OOB_SHORT', 'MR_LONG', 'MR_SHORT', 'FLAT', 'NONE');
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_market_state_value(market_state_value text)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN market_state_value IS NULL OR market_state_value IN ('OUT_OF_BALANCE', 'IN_BALANCE', 'UNCLEAR');
END;
$function$;