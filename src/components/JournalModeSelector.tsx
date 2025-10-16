import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Target, 
  BarChart3, 
  Brain, 
  Settings, 
  CheckCircle2,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export function JournalModeSelector() {
  const { settings, updateSetting } = useSettings();

  const selectMode = async (mode: 'advanced' | 'simple') => {
    await updateSetting('journalMode', mode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in duration-500">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Bias to Profit
            </h1>
          </div>
          <p className="text-xl text-slate-400">Choose your trading journal experience</p>
        </div>

        {/* Mode Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Advanced Journal */}
          <div className="animate-in slide-in-from-left duration-500">
            <Card className="relative overflow-hidden border-2 border-slate-700 bg-slate-900/50 backdrop-blur-sm hover:border-blue-500 transition-all duration-300 group cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative p-8 h-full flex flex-col">
                {/* Icon & Badge */}
                <div className="flex items-start justify-between mb-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/50">
                    <Brain className="h-10 w-10 text-white" />
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                    Full Power
                  </Badge>
                </div>

                {/* Title & Description */}
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-2">
                    Advanced Journal
                    <Sparkles className="h-6 w-6 text-blue-400" />
                  </h2>
                  <p className="text-slate-400 text-lg">
                    Professional-grade trading journal with comprehensive analysis tools and deep insights
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8 flex-1">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Complete bias & market state framework</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Execution model checklists & validation</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Order flow tracking & session patterns</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Psychology metrics & discipline challenges</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Advanced analytics & performance insights</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Hypothesis testing & custom tags</span>
                  </div>
                </div>

                {/* Button */}
                <Button
                  onClick={() => selectMode('advanced')}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/50"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Go Advanced
                </Button>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Perfect for serious traders who want every edge
                </p>
              </div>
            </Card>
          </div>

          {/* Just Journal */}
          <div className="animate-in slide-in-from-right duration-500 delay-100">
            <Card className="relative overflow-hidden border-2 border-slate-700 bg-slate-900/50 backdrop-blur-sm hover:border-emerald-500 transition-all duration-300 group cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative p-8 h-full flex flex-col">
                {/* Icon & Badge */}
                <div className="flex items-start justify-between mb-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/50">
                    <Zap className="h-10 w-10 text-white" />
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                    Quick & Simple
                  </Badge>
                </div>

                {/* Title & Description */}
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-2">
                    Just Journal
                    <Target className="h-6 w-6 text-emerald-400" />
                  </h2>
                  <p className="text-slate-400 text-lg">
                    Streamlined trade logging focused on speed and simplicity
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8 flex-1">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Lightning-fast trade entry</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Essential fields only: Entry, SL, Target, Size</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Custom setups with simple checklists</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">No complexity, just what you need</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Full analytics still available</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Perfect for in-the-moment logging</span>
                  </div>
                </div>

                {/* Button */}
                <Button
                  onClick={() => selectMode('simple')}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/50"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Go Simple
                </Button>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Perfect for traders who value speed and focus
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center animate-in fade-in duration-500 delay-300">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700">
            <Settings className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">
              You can switch modes anytime in Settings
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

