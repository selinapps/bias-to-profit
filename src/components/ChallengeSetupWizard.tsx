import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, Target, TrendingUp, RefreshCw } from 'lucide-react';
import { useChallenge } from '@/hooks/useChallenge';
import { useToast } from '@/hooks/use-toast';
import type { CreateChallengeRequest } from '@/types/challenge';

interface ChallengeSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PROP_FIRMS = [
  { value: 'Funded Hive', label: 'Funded Hive' },
  { value: 'Topstep', label: 'Topstep' }
] as const;

const PHASES = [
  { value: 1, label: 'Phase 1', description: 'First evaluation phase' },
  { value: 2, label: 'Phase 2', description: 'Second evaluation phase' },
  { value: 'Funded', label: 'Funded', description: 'Live funded account' }
] as const;

export function ChallengeSetupWizard({ isOpen, onClose, onSuccess }: ChallengeSetupWizardProps) {
  const { createChallenge } = useChallenge();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateChallengeRequest>>({
    propFirm: undefined,
    phase: undefined,
    startingBalance: undefined,
    targetProfit: undefined,
    currentBalance: undefined
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.propFirm || !formData.phase || !formData.startingBalance || !formData.targetProfit) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await createChallenge({
        propFirm: formData.propFirm as 'Funded Hive' | 'Topstep',
        phase: formData.phase as 1 | 2 | 'Funded',
        startingBalance: Number(formData.startingBalance),
        targetProfit: Number(formData.targetProfit),
        currentBalance: formData.currentBalance ? Number(formData.currentBalance) : undefined
      });

      toast({
        title: 'Challenge Created',
        description: 'Your prop firm challenge has been set up successfully!',
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create challenge',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof CreateChallengeRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.propFirm;
      case 2:
        return formData.phase;
      case 3:
        return formData.startingBalance && formData.targetProfit;
      case 4:
        return true; // Optional step
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">Setup Prop Firm Challenge</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Progress value={(currentStep / totalSteps) * 100} className="flex-1" />
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Step 1: Prop Firm Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-semibold mb-2">Select Your Prop Firm</h3>
                <p className="text-muted-foreground">
                  Choose the prop firm you're trading with
                </p>
              </div>
              
              <div className="space-y-3">
                {PROP_FIRMS.map((firm) => (
                  <div
                    key={firm.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.propFirm === firm.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateFormData('propFirm', firm.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">
                          {firm.value === 'Funded Hive' ? '🐝 ' : ''}{firm.label}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {firm.value === 'Funded Hive' 
                            ? 'Popular choice with flexible rules'
                            : 'Established firm with structured evaluation'
                          }
                        </p>
                      </div>
                      {formData.propFirm === firm.value && (
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Phase Selection */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">Select Challenge Phase</h3>
                <p className="text-muted-foreground">
                  Which phase are you currently in?
                </p>
              </div>
              
              <div className="space-y-3">
                {PHASES.map((phase) => (
                  <div
                    key={phase.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.phase === phase.value
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateFormData('phase', phase.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{phase.label}</h4>
                        <p className="text-sm text-muted-foreground">{phase.description}</p>
                      </div>
                      {formData.phase === phase.value && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Account Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                <h3 className="text-lg font-semibold mb-2">Account Details</h3>
                <p className="text-muted-foreground">
                  Enter your account size and profit target
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startingBalance">Starting Balance ($)</Label>
                  <Input
                    id="startingBalance"
                    type="number"
                    placeholder="50000"
                    value={formData.startingBalance || ''}
                    onChange={(e) => updateFormData('startingBalance', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="targetProfit">Profit Target ($)</Label>
                  <Input
                    id="targetProfit"
                    type="number"
                    placeholder="8000"
                    value={formData.targetProfit || ''}
                    onChange={(e) => updateFormData('targetProfit', e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium mb-2">Example:</h4>
                <p className="text-sm text-muted-foreground">
                  $50,000 account with $8,000 profit target = 16% gain required to pass
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Current Balance (Optional) */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-semibold mb-2">Current Balance (Optional)</h3>
                <p className="text-muted-foreground">
                  If you've already started trading, enter your current balance
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currentBalance">Current Balance ($)</Label>
                <Input
                  id="currentBalance"
                  type="number"
                  placeholder="55500"
                  value={formData.currentBalance || ''}
                  onChange={(e) => updateFormData('currentBalance', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank if you haven't started trading yet
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <h4 className="font-medium mb-2">Summary:</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Prop Firm:</span>
                    <Badge variant="outline">
                      {formData.propFirm === 'Funded Hive' ? '🐝 ' : ''}{formData.propFirm}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Phase:</span>
                    <Badge variant="outline">Phase {formData.phase}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Starting Balance:</span>
                    <span>${formData.startingBalance?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profit Target:</span>
                    <span>${formData.targetProfit?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              Back
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!isStepValid() || loading}
                className="flex items-center gap-2"
              >
                {loading ? 'Creating...' : 'Create Challenge'}
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
