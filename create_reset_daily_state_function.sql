-- Create function to reset challenge daily state
CREATE OR REPLACE FUNCTION reset_challenge_daily_state(
  p_challenge_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS void AS $$
BEGIN
  -- Reset today's daily state to clear banked profits and build phase
  UPDATE public.challenge_daily_state
  SET 
    build_trades_count = 0,
    build_realized_pnl = 0,
    banked_profit = 0,
    banking_triggered = false,
    daily_stop_losses = 0,
    is_locked = false,
    lock_reason = null,
    build_phase_active = false,
    realized_pnl = 0,
    total_trades = 0,
    updated_at = now()
  WHERE challenge_id = p_challenge_id AND date_key = p_date;
  
  -- If no daily state exists for this date, create one
  IF NOT FOUND THEN
    INSERT INTO public.challenge_daily_state (
      challenge_id, 
      user_id, 
      date_key,
      build_trades_count,
      build_realized_pnl,
      banked_profit,
      banking_triggered,
      daily_stop_losses,
      is_locked,
      lock_reason,
      build_phase_active,
      realized_pnl,
      total_trades
    )
    SELECT 
      p_challenge_id,
      cp.user_id,
      p_date,
      0, -- build_trades_count
      0, -- build_realized_pnl
      0, -- banked_profit
      false, -- banking_triggered
      0, -- daily_stop_losses
      false, -- is_locked
      null, -- lock_reason
      false, -- build_phase_active
      0, -- realized_pnl
      0 -- total_trades
    FROM public.challenge_phases cp
    WHERE cp.id = p_challenge_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for the function
GRANT EXECUTE ON FUNCTION reset_challenge_daily_state(uuid, date) TO authenticated;
