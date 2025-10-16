import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  Shield,
  TrendingUp,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Trophy,
  Zap,
  Star,
  Brain,
  Activity,
  Clock,
  BarChart3
} from 'lucide-react';
import type { ChallengeSetup } from '@/types/discipline';

interface ChallengeSetupWizardProps {
  onCreateChallenge: (setup: ChallengeSetup) => Promise<void>;
  onCancel: () => void;
}

const STEPS = [
  { id: 'intro', title: 'Introduction', description: 'Build your trading edge' },
  { id: 'metrics', title: 'Edge Metrics', description: 'How your edge is calculated' },
  { id: 'setup', title: 'Setup', description: 'Configure your challenge' },
  { id: 'launch', title: 'Launch', description: 'Begin your journey' }
];

export function ChallengeSetupWizard({ onCreateChallenge, onCancel }: ChallengeSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [customSetup, setCustomSetup] = useState<ChallengeSetup>({
    challenge_name: '30-Day Edge-Building Challenge',
    max_daily_losses: 3,
    max_risk_per_trade: 2.0,
    house_money_threshold: 3.0,
    must_follow_setup: true,
    no_sl_movement: true
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStartChallenge = async () => {
    await onCreateChallenge(customSetup);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-8">
            <div className="relative">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                <BarChart3 className="h-12 w-12 text-purple-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-900" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Build Your Trading Edge
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Track and improve your <span className="font-semibold text-foreground">Edge Score</span> over 30 days. 
                This isn't about following rigid rules—it's about building sustainable trading excellence through measurable metrics.
              </p>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="flex items-start gap-3 p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-base mb-1">Live Edge Score</h3>
                    <p className="text-sm text-muted-foreground">
                      Real-time calculation from your actual trades (0-100 score)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Target className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-base mb-1">Data-Driven Insights</h3>
                    <p className="text-sm text-muted-foreground">
                      Automatic analysis of process, risk, emotions, and more
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-base mb-1">30-Day Journey</h3>
                    <p className="text-sm text-muted-foreground">
                      Track improvement over time with streaks and milestones
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Activity className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-base mb-1">Zero Manual Entry</h3>
                    <p className="text-sm text-muted-foreground">
                      Everything calculated from your trade journal automatically
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                🎯 No daily forms • 📊 Automatic tracking • 🏆 Real-time updates
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3 mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Your Edge Score Formula
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Your Edge Score (0-100) is automatically calculated from every trade you log. 
                Here are the 5 weighted components:
              </p>
            </div>

            <div className="space-y-3">
              {/* Process Adherence */}
              <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-500/10 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <Check className="h-7 w-7 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">Process Adherence</h3>
                        <div className="text-2xl font-bold text-blue-500">30%</div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Did you follow your trading plan and checklists? Tracked via "good actions" in your trades.
                      </p>
                      <div className="text-xs text-muted-foreground">
                        ✓ Checklist completed • ✓ Plan followed • ✓ No impulsive entries
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Consistency */}
              <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/10 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <Shield className="h-7 w-7 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">Risk Consistency</h3>
                        <div className="text-2xl font-bold text-emerald-500">25%</div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Maintaining consistent position sizing within $100-$500 risk per trade. Shows discipline in risk management.
                      </p>
                      <div className="text-xs text-muted-foreground">
                        ✓ Risk within limits • ✓ Consistent sizing • ✓ No over-leveraging
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emotional Control */}
              <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/10 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <Brain className="h-7 w-7 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">Emotional Control</h3>
                        <div className="text-2xl font-bold text-purple-500">20%</div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Trading with calm emotions, high focus, and no revenge trading. Tracked via emotions data.
                      </p>
                      <div className="text-xs text-muted-foreground">
                        ✓ Stress ≤5 • ✓ Focus ≥6 • ✓ Low urge to recover
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Setup Quality */}
              <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-500/10 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <Target className="h-7 w-7 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">Setup Quality</h3>
                        <div className="text-2xl font-bold text-orange-500">15%</div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Using defined execution models (not "Unknown" or "Custom"). Shows you have a systematic approach.
                      </p>
                      <div className="text-xs text-muted-foreground">
                        ✓ Using defined setups • ✓ No random entries
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Session Alignment */}
              <Card className="border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-500/10 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <Clock className="h-7 w-7 text-cyan-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">Session Alignment</h3>
                        <div className="text-2xl font-bold text-cyan-500">10%</div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Trading during optimal ICT killzones (London Open, NY Killzone, Silver Bullet hour).
                      </p>
                      <div className="text-xs text-muted-foreground">
                        ✓ ICT killzones • ✓ Optimal timing
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center pt-4">
              <div className="inline-block p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                <p className="text-sm font-semibold mb-1">Total Edge Score = Weighted Average</p>
                <p className="text-xs text-muted-foreground">
                  Updates automatically with each trade you journal
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                Personalize Your Challenge
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Give your challenge a name and set optional risk parameters for tracking.
              </p>
            </div>
            
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Challenge Name */}
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    <Label htmlFor="challenge-name" className="text-base font-semibold">Challenge Name</Label>
                  </div>
                  <Input
                    id="challenge-name"
                    value={customSetup.challenge_name}
                    onChange={(e) => setCustomSetup({ ...customSetup, challenge_name: e.target.value })}
                    placeholder="My 30-Day Edge-Building Journey"
                    className="text-base h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will appear on your challenge dashboard
                  </p>
                </CardContent>
              </Card>

              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Optional:</strong> Set risk parameters (these don't affect your Edge Score)
                </p>
              </div>

              {/* Risk Parameters - Optional */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-70">
                <Card className="border-orange-500/20">
                  <CardContent className="p-4 space-y-3">
                    <Label htmlFor="max-losses" className="text-sm font-semibold">Max Daily Losses</Label>
                    <Input
                      id="max-losses"
                      type="number"
                      min="1"
                      max="5"
                      value={customSetup.max_daily_losses}
                      onChange={(e) => setCustomSetup({ ...customSetup, max_daily_losses: parseInt(e.target.value) })}
                      className="text-center h-10"
                    />
                    <p className="text-xs text-muted-foreground">Personal limit</p>
                  </CardContent>
                </Card>

                <Card className="border-red-500/20">
                  <CardContent className="p-4 space-y-3">
                    <Label htmlFor="max-risk" className="text-sm font-semibold">Max Risk %</Label>
                    <Input
                      id="max-risk"
                      type="number"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={customSetup.max_risk_per_trade}
                      onChange={(e) => setCustomSetup({ ...customSetup, max_risk_per_trade: parseFloat(e.target.value) })}
                      className="text-center h-10"
                    />
                    <p className="text-xs text-muted-foreground">Per trade</p>
                  </CardContent>
                </Card>

                <Card className="border-green-500/20">
                  <CardContent className="p-4 space-y-3">
                    <Label htmlFor="house-money" className="text-sm font-semibold">House Money %</Label>
                    <Input
                      id="house-money"
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      value={customSetup.house_money_threshold}
                      onChange={(e) => setCustomSetup({ ...customSetup, house_money_threshold: parseFloat(e.target.value) })}
                      className="text-center h-10"
                    />
                    <p className="text-xs text-muted-foreground">Profit threshold</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-8">
            <div className="relative">
              <div className="mx-auto w-28 h-28 bg-gradient-to-br from-green-400/20 to-emerald-600/20 rounded-full flex items-center justify-center animate-pulse">
                <Zap className="h-14 w-14 text-green-500" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-36 h-36 bg-green-500/10 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Ready to Launch! 🚀
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Your Edge-Building challenge is configured. Start journaling trades 
                and watch your Edge Score improve over the next 30 days.
              </p>
            </div>
            
            <Card className="max-w-2xl mx-auto border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-8">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  <h3 className="font-bold text-xl">{customSetup.challenge_name}</h3>
                </div>
                
                <div className="space-y-4 text-left">
                  <div className="p-4 rounded-lg bg-background/80">
                    <div className="text-sm text-muted-foreground mb-2">What happens next:</div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>Journal your trades as normal with checklists and emotions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>Your Edge Score updates automatically from your trade data</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>Track progress across 5 weighted components over 30 days</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>Unlock achievements as you hit Edge Score milestones</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                💡 Remember: Quality over quantity. Each trade should be well-documented for accurate scoring.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-2">
        <CardHeader className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{STEPS[currentStep].title}</CardTitle>
              <p className="text-muted-foreground">{STEPS[currentStep].description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className={`w-full h-1.5 rounded-full transition-all ${
                    index <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`} />
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    index < currentStep ? 'bg-primary text-primary-foreground' 
                    : index === currentStep ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                  }`}>
                    {index < currentStep ? <Check className="h-5 w-5" /> : index + 1}
                  </div>
                  <p className={`text-xs font-medium hidden md:block ${
                    index === currentStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-full h-1.5 rounded-full mx-2 transition-all ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="p-8">
          {renderStep()}
        </CardContent>
        
        <div className="flex justify-between p-8 pt-0 border-t bg-muted/20">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="min-w-[120px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          {currentStep === STEPS.length - 1 ? (
            <Button 
              onClick={handleStartChallenge} 
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 min-w-[180px] h-11 text-base font-semibold"
            >
              <Zap className="h-5 w-5 mr-2" />
              Launch Challenge
            </Button>
          ) : (
            <Button onClick={handleNext} className="min-w-[120px]">
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
