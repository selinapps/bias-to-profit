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
  Leaf
} from 'lucide-react';
import type { ChallengeSetup, ChallengeDifficulty } from '@/types/discipline';
import { CHALLENGE_DIFFICULTIES } from '@/types/discipline';

interface ChallengeSetupWizardProps {
  onCreateChallenge: (setup: ChallengeSetup) => Promise<void>;
  onCancel: () => void;
}

const STEPS = [
  { id: 'welcome', title: 'Welcome', description: 'Start your discipline journey' },
  { id: 'difficulty', title: 'Difficulty', description: 'Choose your challenge level' },
  { id: 'rules', title: 'Rules', description: 'Review discipline rules' },
  { id: 'setup', title: 'Setup', description: 'Configure your challenge' },
  { id: 'ready', title: 'Ready', description: 'Start your challenge' }
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
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">30-Day Discipline Challenge</h2>
              <p className="text-muted-foreground">
                Build unbreakable trading discipline through consistent practice of core rules.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium">Follow Setup</h3>
                  <p className="text-sm text-muted-foreground">Only trade your predefined setups</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium">Respect SL</h3>
                  <p className="text-sm text-muted-foreground">Never move stop loss against you</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium">Risk Management</h3>
                  <p className="text-sm text-muted-foreground">Strict risk per trade limits</p>
                </div>
              </div>
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
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Ready to Start!</h2>
              <p className="text-muted-foreground">
                Your 30-day discipline challenge is configured and ready to begin.
              </p>
            </div>
            <Card className="text-left">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Challenge Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span className="font-medium">{customSetup.challenge_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Daily Losses:</span>
                    <span className="font-medium">{customSetup.max_daily_losses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Risk Per Trade:</span>
                    <span className="font-medium">{customSetup.max_risk_per_trade}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>House Money Threshold:</span>
                    <span className="font-medium">{customSetup.house_money_threshold}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
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
            <Button onClick={handleStartChallenge}>
              <Trophy className="h-4 w-4 mr-2" />
              Start Challenge
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