-- Add missing columns to bias_state table to support full bias functionality
ALTER TABLE public.bias_state 
ADD COLUMN IF NOT EXISTS bias text,
ADD COLUMN IF NOT EXISTS market_state text,
ADD COLUMN IF NOT EXISTS confidence integer,
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS selected_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS selected_by uuid;