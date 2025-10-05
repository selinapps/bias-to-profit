-- Add lot_size column to trades table
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS lot_size DECIMAL(10,2) DEFAULT 1.0;
