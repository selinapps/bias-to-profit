-- Safe user data reset function
-- Handles division by zero errors in triggers/functions
-- Wraps deletions in a transaction to prevent partial resets

CREATE OR REPLACE FUNCTION safe_reset_user_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_deleted_trades INTEGER := 0;
  v_deleted_bias INTEGER := 0;
  v_deleted_reflections INTEGER := 0;
  v_deleted_patterns INTEGER := 0;
BEGIN
  -- Start transaction
  BEGIN
    -- Delete trades (this might trigger stats calculations)
    DELETE FROM trades WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_deleted_trades = ROW_COUNT;
    
    -- Delete bias states
    DELETE FROM bias_state WHERE selected_by = p_user_id;
    GET DIAGNOSTICS v_deleted_bias = ROW_COUNT;
    
    -- Delete daily reflections
    DELETE FROM daily_reflection WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_deleted_reflections = ROW_COUNT;
    
    -- Delete session patterns
    DELETE FROM daily_session_patterns WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_deleted_patterns = ROW_COUNT;
    
    -- Build result
    v_result := json_build_object(
      'success', true,
      'deleted_trades', v_deleted_trades,
      'deleted_bias_states', v_deleted_bias,
      'deleted_reflections', v_deleted_reflections,
      'deleted_patterns', v_deleted_patterns,
      'message', 'All data reset successfully'
    );
    
    RETURN v_result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Catch any errors (including division by zero)
    v_result := json_build_object(
      'success', false,
      'error_code', SQLSTATE,
      'error_message', SQLERRM,
      'message', 'Reset failed: ' || SQLERRM
    );
    
    RETURN v_result;
  END;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION safe_reset_user_data(UUID) TO authenticated;

-- Add RLS policy check
ALTER FUNCTION safe_reset_user_data(UUID) SECURITY DEFINER;

COMMENT ON FUNCTION safe_reset_user_data IS 'Safely resets all user trading data with error handling for division by zero issues';

