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
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Choose Your Difficulty</h2>
              <p className="text-muted-foreground">
                Select the challenge level that matches your current discipline level.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CHALLENGE_DIFFICULTIES.map((difficulty) => (
                <Card
                  key={difficulty.id}
                  className={`cursor-pointer transition-all ${
                    selectedDifficulty.id === difficulty.id
                      ? 'ring-2 ring-primary border-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleDifficultySelect(difficulty)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      {difficulty.id === 'beginner' && <Leaf className="h-5 w-5 mr-2 text-green-500" />}
                      {difficulty.id === 'intermediate' && <Zap className="h-5 w-5 mr-2 text-blue-500" />}
                      {difficulty.id === 'advanced' && <Crown className="h-5 w-5 mr-2 text-red-500" />}
                      {difficulty.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{difficulty.description}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Max Daily Losses:</span>
                        <Badge variant="outline">{difficulty.max_daily_losses}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Risk:</span>
                        <Badge variant="outline">{difficulty.max_risk_per_trade}%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>House Money:</span>
                        <Badge variant="outline">{difficulty.house_money_threshold}%</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Discipline Rules</h2>
              <p className="text-muted-foreground">
                These are the 5 core rules you'll follow for 30 days.
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  icon: Target,
                  title: 'Follow Your Setup',
                  description: 'Only take trades that match your predefined setup criteria',
                  color: 'text-blue-500'
                },
                {
                  icon: Shield,
                  title: 'Never Move Stop Loss',
                  description: 'Never move your stop loss against you (only in your favor)',
                  color: 'text-red-500'
                },
                {
                  icon: AlertTriangle,
                  title: 'Respect Risk Per Trade',
                  description: `Never risk more than ${selectedDifficulty.max_risk_per_trade}% per trade`,
                  color: 'text-orange-500'
                },
                {
                  icon: TrendingUp,
                  title: 'House Money Rules',
                  description: `Follow house money rules when in ${selectedDifficulty.house_money_threshold}% profit`,
                  color: 'text-green-500'
                },
                {
                  icon: X,
                  title: 'Three Losses Rule',
                  description: `Stop trading after ${selectedDifficulty.max_daily_losses} consecutive losses`,
                  color: 'text-purple-500'
                }
              ].map((rule, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-primary/10`}>
                        <rule.icon className={`h-4 w-4 ${rule.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{rule.title}</h3>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                      <Badge variant="outline">20 pts</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Challenge Setup</h2>
              <p className="text-muted-foreground">
                Customize your challenge settings.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="challenge-name">Challenge Name</Label>
                <Input
                  id="challenge-name"
                  value={customSetup.challenge_name}
                  onChange={(e) => setCustomSetup({ ...customSetup, challenge_name: e.target.value })}
                  placeholder="30-Day Discipline Challenge"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="max-losses">Max Daily Losses</Label>
                  <Input
                    id="max-losses"
                    type="number"
                    min="1"
                    max="5"
                    value={customSetup.max_daily_losses}
                    onChange={(e) => setCustomSetup({ ...customSetup, max_daily_losses: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="max-risk">Max Risk Per Trade (%)</Label>
                  <Input
                    id="max-risk"
                    type="number"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={customSetup.max_risk_per_trade}
                    onChange={(e) => setCustomSetup({ ...customSetup, max_risk_per_trade: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="house-money">House Money Threshold (%)</Label>
                  <Input
                    id="house-money"
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={customSetup.house_money_threshold}
                    onChange={(e) => setCustomSetup({ ...customSetup, house_money_threshold: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
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
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{STEPS[currentStep].title}</CardTitle>
              <p className="text-muted-foreground">{STEPS[currentStep].description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={(currentStep / (STEPS.length - 1)) * 100} className="mt-4" />
        </CardHeader>
        <CardContent className="p-6">
          {renderStep()}
        </CardContent>
        <div className="flex justify-between p-6 pt-0">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          {currentStep === STEPS.length - 1 ? (
            <Button onClick={handleStartChallenge} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
              <Zap className="h-4 w-4 mr-2" />
              Launch Challenge
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}