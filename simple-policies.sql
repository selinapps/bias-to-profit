-- SIMPLE POLICIES - Run this AFTER table and function are created

-- Enable RLS
ALTER TABLE public.challenge_phases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own challenges" ON public.challenge_phases;
DROP POLICY IF EXISTS "Users can insert their own challenges" ON public.challenge_phases;
DROP POLICY IF EXISTS "Users can update their own challenges" ON public.challenge_phases;
DROP POLICY IF EXISTS "Users can delete their own challenges" ON public.challenge_phases;

-- Create policies
CREATE POLICY "Users can view their own challenges" ON public.challenge_phases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges" ON public.challenge_phases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges" ON public.challenge_phases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenges" ON public.challenge_phases
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.challenge_phases TO authenticated;
GRANT EXECUTE ON FUNCTION get_challenge_summary(uuid) TO authenticated;
