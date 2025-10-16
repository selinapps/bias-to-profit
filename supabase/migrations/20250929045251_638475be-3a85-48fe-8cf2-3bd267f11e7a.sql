-- Fix RLS policies for security and regenerate types
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Add RLS policies for trades
CREATE POLICY "Users can view their own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trades" ON public.trades FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for hypotheses
CREATE POLICY "Users can view their own hypotheses" ON public.hypotheses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own hypotheses" ON public.hypotheses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own hypotheses" ON public.hypotheses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own hypotheses" ON public.hypotheses FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for daily_stats
CREATE POLICY "Users can view their own daily stats" ON public.daily_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily stats" ON public.daily_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily stats" ON public.daily_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own daily stats" ON public.daily_stats FOR DELETE USING (auth.uid() = user_id);