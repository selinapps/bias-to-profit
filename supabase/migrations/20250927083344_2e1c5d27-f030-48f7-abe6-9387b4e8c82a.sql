-- Create database schema for comprehensive trading journal

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  risk_settings JSONB DEFAULT '{
    "tier_a": 100,
    "tier_b": 50,
    "tier_c": 25,
    "max_daily_loss": 500,
    "house_money_threshold": 3
  }',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hypotheses table for forward testing
CREATE TABLE public.hypotheses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comprehensive trades table
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  hypothesis_id UUID,
  
  -- Trading details
  asset TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('long', 'short')) NOT NULL,
  model TEXT CHECK (model IN ('trend', 'mean_reversion')) NOT NULL,
  
  -- Location and aggression (arrays for multi-select)
  locations TEXT[] DEFAULT '{}',
  aggression TEXT[],
  
  -- Risk management
  risk_tier TEXT CHECK (risk_tier IN ('a', 'b', 'c')) NOT NULL,
  risk_amount DECIMAL(10,2) NOT NULL,
  
  -- Price levels
  entry_price DECIMAL(12,4) NOT NULL,
  stop_loss DECIMAL(12,4) NOT NULL,
  exit_price DECIMAL(12,4),
  
  -- Performance metrics
  pnl DECIMAL(10,2),
  r_multiple DECIMAL(6,3),
  
  -- Trading session and timing
  trading_session TEXT,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exit_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  
  -- Psychology and external factors
  emotions JSONB DEFAULT '{}', -- {calm_stressed: 5, focus: 7, urge_recover: 3}
  externals TEXT[] DEFAULT '{}', -- [sleep_poor, distraction, etc]
  
  -- Mistakes and tags
  mistake_tags TEXT[] DEFAULT '{}', -- [overtrade, fomo, chased, etc]
  
  -- Scenarios used
  scenarios TEXT[] DEFAULT '{}',
  
  -- Attachments
  screenshot_url TEXT,
  notes TEXT,
  
  -- Trade state
  status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  is_experimental BOOLEAN DEFAULT false,
  
  -- Override tracking for stop rules
  override_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id) ON DELETE SET NULL
);

-- Create daily stats table
CREATE TABLE public.daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  
  -- Performance metrics
  total_pnl DECIMAL(10,2) DEFAULT 0,
  total_r DECIMAL(8,3) DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  avg_r DECIMAL(6,3) DEFAULT 0,
  
  -- Trade counts
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  
  -- House money and limits
  house_money_active BOOLEAN DEFAULT false,
  consecutive_losses INTEGER DEFAULT 0,
  day_disabled BOOLEAN DEFAULT false,
  
  -- Best/worst performance
  best_trade_r DECIMAL(6,3),
  worst_trade_r DECIMAL(6,3),
  best_hour INTEGER,
  worst_hour INTEGER,
  
  -- Model performance
  trend_trades INTEGER DEFAULT 0,
  mean_reversion_trades INTEGER DEFAULT 0,
  trend_win_rate DECIMAL(5,2) DEFAULT 0,
  mean_reversion_win_rate DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, date)
);

-- Create user settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Last selections for persistence
  last_model TEXT,
  last_risk_tier TEXT,
  last_locations TEXT[],
  last_aggression TEXT[],
  
  -- Preferences
  daily_wrap_time TIME DEFAULT '21:00:00',
  notifications_enabled BOOLEAN DEFAULT true,
  offline_mode BOOLEAN DEFAULT false,
  
  -- Edge reminders
  edge_reminders JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for hypotheses
CREATE POLICY "Users can manage their own hypotheses" 
ON public.hypotheses FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for trades
CREATE POLICY "Users can manage their own trades" 
ON public.trades FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for daily_stats
CREATE POLICY "Users can manage their own daily stats" 
ON public.daily_stats FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for user_settings
CREATE POLICY "Users can manage their own settings" 
ON public.user_settings FOR ALL 
USING (auth.uid() = user_id);

-- Create function to compute daily stats
CREATE OR REPLACE FUNCTION public.compute_daily_stats(target_date DATE, target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats_result JSONB;
  trade_data RECORD;
  total_trades_count INTEGER := 0;
  winning_trades_count INTEGER := 0;
  total_pnl_sum DECIMAL := 0;
  total_r_sum DECIMAL := 0;
  trend_trades_count INTEGER := 0;
  mr_trades_count INTEGER := 0;
  trend_wins INTEGER := 0;
  mr_wins INTEGER := 0;
  best_r DECIMAL;
  worst_r DECIMAL;
  hour_performance JSONB := '{}';
BEGIN
  -- Get all trades for the target date
  FOR trade_data IN
    SELECT 
      pnl, r_multiple, model,
      EXTRACT(HOUR FROM entry_time) as trade_hour,
      CASE WHEN pnl > 0 THEN 1 ELSE 0 END as is_win
    FROM trades 
    WHERE user_id = target_user_id 
      AND DATE(entry_time) = target_date 
      AND status = 'closed'
  LOOP
    total_trades_count := total_trades_count + 1;
    total_pnl_sum := total_pnl_sum + COALESCE(trade_data.pnl, 0);
    total_r_sum := total_r_sum + COALESCE(trade_data.r_multiple, 0);
    
    IF trade_data.is_win = 1 THEN
      winning_trades_count := winning_trades_count + 1;
    END IF;
    
    -- Track model performance
    IF trade_data.model = 'trend' THEN
      trend_trades_count := trend_trades_count + 1;
      IF trade_data.is_win = 1 THEN
        trend_wins := trend_wins + 1;
      END IF;
    ELSIF trade_data.model = 'mean_reversion' THEN
      mr_trades_count := mr_trades_count + 1;
      IF trade_data.is_win = 1 THEN
        mr_wins := mr_wins + 1;
      END IF;
    END IF;
    
    -- Track best/worst R
    IF best_r IS NULL OR trade_data.r_multiple > best_r THEN
      best_r := trade_data.r_multiple;
    END IF;
    
    IF worst_r IS NULL OR trade_data.r_multiple < worst_r THEN
      worst_r := trade_data.r_multiple;
    END IF;
  END LOOP;

  -- Build result
  stats_result := jsonb_build_object(
    'total_trades', total_trades_count,
    'winning_trades', winning_trades_count,
    'total_pnl', total_pnl_sum,
    'total_r', total_r_sum,
    'win_rate', CASE WHEN total_trades_count > 0 THEN (winning_trades_count::DECIMAL / total_trades_count * 100) ELSE 0 END,
    'avg_r', CASE WHEN total_trades_count > 0 THEN (total_r_sum / total_trades_count) ELSE 0 END,
    'best_trade_r', best_r,
    'worst_trade_r', worst_r,
    'trend_trades', trend_trades_count,
    'mean_reversion_trades', mr_trades_count,
    'trend_win_rate', CASE WHEN trend_trades_count > 0 THEN (trend_wins::DECIMAL / trend_trades_count * 100) ELSE 0 END,
    'mean_reversion_win_rate', CASE WHEN mr_trades_count > 0 THEN (mr_wins::DECIMAL / mr_trades_count * 100) ELSE 0 END
  );

  RETURN stats_result;
END;
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hypotheses_updated_at
  BEFORE UPDATE ON public.hypotheses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_stats_updated_at
  BEFORE UPDATE ON public.daily_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('trade-screenshots', 'trade-screenshots', false);

-- Create storage policies for trade screenshots
CREATE POLICY "Users can view their own screenshots" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own screenshots" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own screenshots" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own screenshots" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);