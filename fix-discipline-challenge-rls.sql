-- Fix RLS policies for discipline challenge tables
-- The issue: FOR ALL with USING() doesn't work for INSERT because user_id doesn't exist yet

-- ============================================================================
-- Drop existing policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can manage their own discipline challenges" ON public.discipline_challenges;
DROP POLICY IF EXISTS "Users can manage their own daily tracking" ON public.daily_discipline_tracking;
DROP POLICY IF EXISTS "Users can manage their own rule violations" ON public.rule_violations;

-- ============================================================================
-- Create separate policies for each operation
-- ============================================================================

-- DISCIPLINE CHALLENGES POLICIES
-- Allow users to view their own challenges
CREATE POLICY "Users can view own challenges" 
ON public.discipline_challenges FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own challenges (WITH CHECK ensures user_id = auth.uid())
CREATE POLICY "Users can insert own challenges" 
ON public.discipline_challenges FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own challenges
CREATE POLICY "Users can update own challenges" 
ON public.discipline_challenges FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own challenges
CREATE POLICY "Users can delete own challenges" 
ON public.discipline_challenges FOR DELETE 
USING (auth.uid() = user_id);

-- DAILY TRACKING POLICIES
-- Allow users to view their own tracking
CREATE POLICY "Users can view own tracking" 
ON public.daily_discipline_tracking FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own tracking
CREATE POLICY "Users can insert own tracking" 
ON public.daily_discipline_tracking FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own tracking
CREATE POLICY "Users can update own tracking" 
ON public.daily_discipline_tracking FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own tracking
CREATE POLICY "Users can delete own tracking" 
ON public.daily_discipline_tracking FOR DELETE 
USING (auth.uid() = user_id);

-- RULE VIOLATIONS POLICIES
-- Allow users to view their own violations
CREATE POLICY "Users can view own violations" 
ON public.rule_violations FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own violations
CREATE POLICY "Users can insert own violations" 
ON public.rule_violations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own violations
CREATE POLICY "Users can update own violations" 
ON public.rule_violations FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own violations
CREATE POLICY "Users can delete own violations" 
ON public.rule_violations FOR DELETE 
USING (auth.uid() = user_id);

