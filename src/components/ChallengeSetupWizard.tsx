import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  Shield,
  AlertTriangle,
  TrendingUp,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Trophy,
  Zap,
  Crown,
  Leaf,
  Star
} from 'lucide-react';
import type { ChallengeSetup, ChallengeDifficulty } from '@/types/discipline';
import { CHALLENGE_DIFFICULTIES } from '@/types/discipline';

interface ChallengeSetupWizardProps {
  onCreateChallenge: (setup: ChallengeSetup) => Promise<void>;
  onCancel: () => void;
}

const STEPS = [
  { id: 'intro', title: 'Introduction', description: 'Transform your trading' },
  { id: 'difficulty', title: 'Difficulty', description: 'Choose your challenge level' },
  { id: 'rules', title: 'Rules', description: 'Review discipline rules' },
  { id: 'setup', title: 'Setup', description: 'Configure your challenge' },
  { id: 'launch', title: 'Launch', description: 'Begin your transformation' }
];

export function ChallengeSetupWizard({ onCreateChallenge, onCancel }: ChallengeSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<ChallengeDifficulty>(CHALLENGE_DIFFICULTIES[0]);
  const [customSetup, setCustomSetup] = useState<ChallengeSetup>({
    challenge_name: '30-Day Discipline Challenge',
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

  const handleDifficultySelect = (difficulty: ChallengeDifficulty) => {
    setSelectedDifficulty(difficulty);
    setCustomSetup({
      ...customSetup,
      max_daily_losses: difficulty.max_daily_losses,
      max_risk_per_trade: difficulty.max_risk_per_trade,
      house_money_threshold: difficulty.house_money_threshold
    });
  };

  const handleStartChallenge = async () => {
    await onCreateChallenge(customSetup);
  };

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) return <Check className="h-4 w-4" />;
    if (stepIndex === currentStep) return <div className="w-4 h-4 bg-primary rounded-full" />;
    return <div className="w-4 h-4 bg-muted rounded-full" />;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-8">
            <div className="relative">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                <Trophy className="h-10 w-10 text-purple-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <Star className="h-4 w-4 text-yellow-900" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Master Your Trading Edge
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join the elite 5% of traders who achieve consistent profitability through 
                disciplined execution and systematic improvement.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-8">
              <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Setup Precision</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Execute only high-probability setups with clear edge
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Risk Control</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Protect capital with unwavering stop loss discipline
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Consistent Growth</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Build sustainable edge through 30 days of excellence
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                🎯 Track your progress • 📊 Measure your edge • 🏆 Achieve mastery
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Choose Your Path
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Select the difficulty that aligns with your current discipline level. 
                You can always adjust these settings later.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {CHALLENGE_DIFFICULTIES.map((difficulty) => (
                <div
                  key={difficulty.id}
                  onClick={() => handleDifficultySelect(difficulty)}
                  className={`relative cursor-pointer transition-all duration-300 ${
                    selectedDifficulty.id === difficulty.id
                      ? 'scale-105'
                      : 'hover:scale-102'
                  }`}
                >
                  <Card className={`h-full ${
                    selectedDifficulty.id === difficulty.id
                      ? difficulty.id === 'beginner' ? 'ring-2 ring-green-500 border-green-500 bg-gradient-to-br from-green-500/10 to-transparent'
                      : difficulty.id === 'intermediate' ? 'ring-2 ring-blue-500 border-blue-500 bg-gradient-to-br from-blue-500/10 to-transparent'
                      : 'ring-2 ring-purple-500 border-purple-500 bg-gradient-to-br from-purple-500/10 to-transparent'
                      : 'hover:border-primary/50'
                  }`}>
                    <CardContent className="p-6 space-y-4">
                      {/* Icon and Title */}
                      <div className="flex items-center justify-between">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                          difficulty.id === 'beginner' ? 'bg-green-500/20'
                          : difficulty.id === 'intermediate' ? 'bg-blue-500/20'
                          : 'bg-purple-500/20'
                        }`}>
                          {difficulty.id === 'beginner' && <Leaf className="h-7 w-7 text-green-500" />}
                          {difficulty.id === 'intermediate' && <Zap className="h-7 w-7 text-blue-500" />}
                          {difficulty.id === 'advanced' && <Crown className="h-7 w-7 text-purple-500" />}
                        </div>
                        {selectedDifficulty.id === difficulty.id && (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            difficulty.id === 'beginner' ? 'bg-green-500'
                            : difficulty.id === 'intermediate' ? 'bg-blue-500'
                            : 'bg-purple-500'
                          }`}>
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* Title and Description */}
                      <div>
                        <h3 className="text-xl font-bold mb-2">{difficulty.name}</h3>
                        <p className="text-sm text-muted-foreground">{difficulty.description}</p>
                      </div>
                      
                      {/* Stats */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                          <span className="text-sm text-muted-foreground">Daily Loss Limit</span>
                          <span className="font-semibold">{difficulty.max_daily_losses} trades</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                          <span className="text-sm text-muted-foreground">Max Risk/Trade</span>
                          <span className="font-semibold">{difficulty.max_risk_per_trade}%</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                          <span className="text-sm text-muted-foreground">House Money At</span>
                          <span className="font-semibold">{difficulty.house_money_threshold}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Start with Beginner if you're new to discipline challenges
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                The 5 Sacred Rules
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Master these core principles over 30 days. Each rule is worth 20 points 
                in your daily discipline score.
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  icon: Target,
                  title: 'Follow Your Setup',
                  description: 'Only take trades that match your predefined setup criteria. No impulsive trades.',
                  color: 'blue',
                  gradient: 'from-blue-500/20 to-blue-600/5',
                  iconBg: 'bg-blue-500/20',
                  iconColor: 'text-blue-500'
                },
                {
                  icon: Shield,
                  title: 'Never Move Stop Loss',
                  description: 'Never move your stop loss against you. You can only move it in your favor.',
                  color: 'red',
                  gradient: 'from-red-500/20 to-red-600/5',
                  iconBg: 'bg-red-500/20',
                  iconColor: 'text-red-500'
                },
                {
                  icon: AlertTriangle,
                  title: 'Respect Risk Per Trade',
                  description: `Never risk more than ${selectedDifficulty.max_risk_per_trade}% of your account per trade. Protect your capital.`,
                  color: 'orange',
                  gradient: 'from-orange-500/20 to-orange-600/5',
                  iconBg: 'bg-orange-500/20',
                  iconColor: 'text-orange-500'
                },
                {
                  icon: TrendingUp,
                  title: 'House Money Rules',
                  description: `When you reach ${selectedDifficulty.house_money_threshold}% profit, reduce risk and protect your gains.`,
                  color: 'green',
                  gradient: 'from-green-500/20 to-green-600/5',
                  iconBg: 'bg-green-500/20',
                  iconColor: 'text-green-500'
                },
                {
                  icon: X,
                  title: 'Three Losses Rule',
                  description: `Stop trading immediately after ${selectedDifficulty.max_daily_losses} consecutive losses. Live to trade another day.`,
                  color: 'purple',
                  gradient: 'from-purple-500/20 to-purple-600/5',
                  iconBg: 'bg-purple-500/20',
                  iconColor: 'text-purple-500'
                }
              ].map((rule, index) => (
                <Card key={index} className={`border-l-4 border-l-${rule.color}-500 bg-gradient-to-r ${rule.gradient}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${rule.iconBg}`}>
                        <rule.icon className={`h-6 w-6 ${rule.iconColor}`} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">{rule.title}</h3>
                          <div className="flex items-center gap-2">
                            <Badge className={rule.iconBg}>20 pts</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{rule.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-semibold">Total Daily Score: 100 points</p>
              <p className="text-xs text-muted-foreground">
                Follow all 5 rules perfectly each day to achieve 100% discipline score
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                Fine-Tune Your Challenge
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Personalize your challenge settings to match your trading style and goals.
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Challenge Name */}
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    <Label htmlFor="challenge-name" className="text-base font-semibold">Challenge Name</Label>
                  </div>
                  <Input
                    id="challenge-name"
                    value={customSetup.challenge_name}
                    onChange={(e) => setCustomSetup({ ...customSetup, challenge_name: e.target.value })}
                    placeholder="My Trading Discipline Journey"
                    className="text-base h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    Give your challenge a memorable name that motivates you
                  </p>
                </CardContent>
              </Card>

              {/* Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Max Daily Losses */}
                <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <X className="h-4 w-4 text-red-500" />
                      </div>
                      <Label htmlFor="max-losses" className="font-semibold">Max Daily Losses</Label>
                    </div>
                    <Input
                      id="max-losses"
                      type="number"
                      min="1"
                      max="5"
                      value={customSetup.max_daily_losses}
                      onChange={(e) => setCustomSetup({ ...customSetup, max_daily_losses: parseInt(e.target.value) })}
                      className="text-lg h-12 text-center font-bold"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Stop after this many losses
                    </p>
                  </CardContent>
                </Card>

                {/* Max Risk Per Trade */}
                <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      </div>
                      <Label htmlFor="max-risk" className="font-semibold">Max Risk (%)</Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="max-risk"
                        type="number"
                        min="0.5"
                        max="5"
                        step="0.5"
                        value={customSetup.max_risk_per_trade}
                        onChange={(e) => setCustomSetup({ ...customSetup, max_risk_per_trade: parseFloat(e.target.value) })}
                        className="text-lg h-12 text-center font-bold pr-8"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Per trade risk limit
                    </p>
                  </CardContent>
                </Card>

                {/* House Money Threshold */}
                <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </div>
                      <Label htmlFor="house-money" className="font-semibold">House Money (%)</Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="house-money"
                        type="number"
                        min="1"
                        max="10"
                        step="0.5"
                        value={customSetup.house_money_threshold}
                        onChange={(e) => setCustomSetup({ ...customSetup, house_money_threshold: parseFloat(e.target.value) })}
                        className="text-lg h-12 text-center font-bold pr-8"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Profit threshold
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                ⚙️ Settings are pre-filled based on your selected difficulty level
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-8">
            <div className="relative">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-400/20 to-emerald-600/20 rounded-full flex items-center justify-center animate-pulse">
                <Zap className="h-12 w-12 text-green-500" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-green-500/10 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                You're All Set! 🚀
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Your personalized challenge is ready. Time to turn discipline into profit 
                and join the elite traders who master their edge.
              </p>
            </div>
            <Card className="text-left border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Your Challenge Configuration</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                    <span className="text-sm text-muted-foreground">Challenge Name</span>
                    <span className="font-semibold">{customSetup.challenge_name}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                    <span className="text-sm text-muted-foreground">Max Daily Losses</span>
                    <Badge variant="outline" className="font-semibold">{customSetup.max_daily_losses} trades</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                    <span className="text-sm text-muted-foreground">Max Risk Per Trade</span>
                    <Badge variant="outline" className="font-semibold">{customSetup.max_risk_per_trade}%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                    <span className="text-sm text-muted-foreground">House Money Threshold</span>
                    <Badge variant="outline" className="font-semibold">{customSetup.house_money_threshold}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                💪 Stay disciplined • 📈 Track everything • 🎯 Execute with precision
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
          {/* Header with title and close button */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{STEPS[currentStep].title}</CardTitle>
              <p className="text-muted-foreground">{STEPS[currentStep].description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Modern Step Indicator */}
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className={`w-full h-1 rounded-full transition-all ${
                    index <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`} />
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                      index < currentStep ? 'bg-primary text-primary-foreground' 
                      : index === currentStep ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                    }`}>
                      {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                  </div>
                  <p className={`text-xs font-medium hidden md:block ${
                    index === currentStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-full h-1 rounded-full mx-2 transition-all ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
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