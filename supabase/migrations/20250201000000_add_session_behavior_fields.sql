-- Add Session Behavior Fields to Trades Table
-- This allows traders to track session behaviors (Asia/London/NY patterns)
-- and trading scenarios (S1/S2/S3) for backtesting analysis

-- Add session_behavior field
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS session_behavior text;

-- Add session_scenario field (S1, S2, or S3)
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS session_scenario text;

-- Add sweep_time field for tracking when sweep happened
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS sweep_time timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.trades.session_behavior IS 'ICT session behavior pattern (e.g., london_sweep_asia_low, london_break_asia, ny_continuation)';
COMMENT ON COLUMN public.trades.session_scenario IS 'Trading scenario classification (S1: London Sweep & Reversal, S2: London Breakout, S3: London Rejection)';
COMMENT ON COLUMN public.trades.sweep_time IS 'Time when sweep happened (for sweep behaviors)';

-- Create index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_trades_session_behavior ON public.trades(session_behavior) WHERE session_behavior IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_session_scenario ON public.trades(session_scenario) WHERE session_scenario IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_sweep_time ON public.trades(sweep_time) WHERE sweep_time IS NOT NULL;
