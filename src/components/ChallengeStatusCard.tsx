import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  Shield,
  Zap,
  Banknote,
  Settings
} from 'lucide-react';
import { useChallenge } from '@/hooks/useChallenge';
import { logger } from '@/lib/logger';
import { ChallengeSetupWizard } from './ChallengeSetupWizard';
import type { ChallengeSummary, ChallengePhaseStatus } from '@/types/challenge';

interface ChallengeStatusCardProps {
  className?: string;
}

export function ChallengeStatusCard({ className }: ChallengeStatusCardProps) {
  const { activeChallenge, challengeSummary, loading, error, refreshChallenge, getPhaseStatus } = useChallenge();
  const [showSetupWizard, setShowSetupWizard] = React.useState(false);
  const [phaseStatus, setPhaseStatus] = React.useState<ChallengePhaseStatus | null>(null);
  const [bankingAnimation, setBankingAnimation] = React.useState(false);

  // Fetch phase status when challenge summary changes
  React.useEffect(() => {
    if (challengeSummary?.phaseId) {
      getPhaseStatus(challengeSummary.phaseId).then(setPhaseStatus);
    }
  }, [challengeSummary?.phaseId, getPhaseStatus]);

  // Trigger banking animation when banked profit increases
  React.useEffect(() => {
    if (challengeSummary?.bankedProfit && challengeSummary.bankedProfit > 0) {
      setBankingAnimation(true);
      const timer = setTimeout(() => setBankingAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [challengeSummary?.bankedProfit]);

  // Debug logging
  React.useEffect(() => {
    logger.debug('ChallengeStatusCard Debug:', {
      activeChallenge,
      challengeSummary,
      phaseStatus,
      loading,
      error
    });
  }, [activeChallenge, challengeSummary, phaseStatus, loading, error]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyWithSign = (amount: number) => {
    const sign = amount < 0 ? '-$' : '+$';
    return sign + Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatR = (value: number) => {
    return (Math.round(value * 100) / 100).toFixed(2) + 'R';
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'PASSED':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400';
      case 'ACTIVE':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-400';
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'BUILD':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-400';
      case 'NORMAL':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-400';
      case 'PRESERVATION':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400';
      case 'LOCKED':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-400';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'BUILD':
        return <Zap className="h-4 w-4" />;
      case 'NORMAL':
        return <Target className="h-4 w-4" />;
      case 'PRESERVATION':
        return <Shield className="h-4 w-4" />;
      case 'LOCKED':
        return <Lock className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 1) return 'bg-green-500';
    if (progress >= 0.8) return 'bg-yellow-500';
    if (progress >= 0.5) return 'bg-blue-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Challenge Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Challenge Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={refreshChallenge}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeChallenge || !challengeSummary) {
    return (
      <>
        <Card className={className}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Challenge Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Active Challenge</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set up your prop firm challenge to start tracking your progress
              </p>
              <Button onClick={() => setShowSetupWizard(true)}>
                <Target className="h-4 w-4 mr-2" />
                Setup Challenge
              </Button>
            </div>
          </CardContent>
        </Card>

      </>
    );
  }

  return (
    <TooltipProvider>
      <Card className={`${className} ${bankingAnimation ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {challengeSummary.challengeName || 'Challenge Status'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {challengeSummary.propFirm === 'Funded Hive' ? '🐝 Funded Hive' : challengeSummary.propFirm}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Phase {challengeSummary.phase}
              </Badge>
              {phaseStatus && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className={`text-xs ${getPhaseColor(phaseStatus.phase)}`}>
                      {getPhaseIcon(phaseStatus.phase)}
                      <span className="ml-1">{phaseStatus.phase}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {phaseStatus.phase === 'BUILD' && 'First 3 trades build the day. Risk capped at $250/$500.'}
                      {phaseStatus.phase === 'NORMAL' && 'Normal trading phase - standard risk rules apply.'}
                      {phaseStatus.phase === 'PRESERVATION' && 'Banked profit protected - cannot lose below this line.'}
                      {phaseStatus.phase === 'LOCKED' && phaseStatus.lockReason}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Badge className={`text-xs ${getStatusColor(challengeSummary.state)}`}>
                {challengeSummary.state}
              </Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSetupWizard(true)}
                    className="h-6 w-6 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit Challenge Settings</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar with Banked Line */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress to Target</span>
            <span className="font-medium">{formatPercentage(challengeSummary.progressPct)}</span>
          </div>
          <div className="relative">
            <Progress 
              value={Math.min(challengeSummary.progressPct * 100, 100)} 
              className="h-3"
            />
            {/* Banked profit line */}
            {challengeSummary.bankedProfit && challengeSummary.bankedProfit > 0 && (
              <div 
                className="absolute top-0 h-3 border-l-2 border-dashed border-green-500 opacity-80"
                style={{
                  left: `${(challengeSummary.bankedProfit / challengeSummary.targetProfit) * 100}%`
                }}
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(challengeSummary.startingBalance)}</span>
            <span>{formatCurrency(challengeSummary.startingBalance + challengeSummary.targetProfit)}</span>
          </div>
          {challengeSummary.bankedProfit && challengeSummary.bankedProfit > 0 && (
            <div className="text-xs text-green-600 font-medium text-center">
              🏦 Banked: {formatCurrency(challengeSummary.bankedProfit)} (Protected)
            </div>
          )}
        </div>

        <Separator />

        {/* Daily Stats Row */}
        {phaseStatus && (
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">
                {phaseStatus.buildProgress}
              </div>
              <div className="text-xs text-muted-foreground">Build Progress</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(challengeSummary.bankedProfit || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Banked Profit</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {phaseStatus.stopLossCount}
              </div>
              <div className="text-xs text-muted-foreground">Stop Losses</div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Current Balance
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(challengeSummary.currentBalance)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {challengeSummary.netProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              Net P&L
            </div>
            <div className={`text-2xl font-bold ${challengeSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrencyWithSign(challengeSummary.netProfit)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Distance to Pass
            </div>
            <div className="text-xl font-semibold">
              {formatCurrency(challengeSummary.distanceToPass)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Today's P&L
            </div>
            <div className={`text-xl font-semibold ${challengeSummary.realizedToday >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(challengeSummary.realizedToday)}
            </div>
          </div>
        </div>

        {/* Distance in R */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Distance to Pass (in R)</h4>
          <div className="grid grid-cols-3 gap-2">
            {challengeSummary.distanceInR.map((item, index) => (
              <div key={index} className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-semibold">
                  {formatR(item.rLeft)}
                </div>
                <div className="text-xs text-muted-foreground">
                  @ ${item.risk.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Challenge Passed State */}
        {challengeSummary.state === 'PASSED' && (
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-200">
                Challenge Passed! 🎉
              </h4>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              Congratulations! You've successfully passed this phase. You can now proceed to the next phase or lock in your funded account.
            </p>
            <Button className="mt-3" size="sm">
              Lock Phase & Start Next
            </Button>
          </div>
        )}

        {/* Locked State */}
        {phaseStatus?.isLocked && (
          <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-red-600" />
              <h4 className="font-semibold text-red-800 dark:text-red-200">
                Trading Locked
              </h4>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">
              {phaseStatus.lockReason || 'Trading is locked until next session.'}
            </p>
          </div>
        )}

        {/* Banking Animation */}
        {bankingAnimation && (
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-200">
                🏦 Profit Banked!
              </h4>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              Half of your early profits have been locked. You can't lose below this banked line.
            </p>
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={refreshChallenge}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
    
    {/* Challenge Setup/Edit Wizard - Always available */}
    <ChallengeSetupWizard
      isOpen={showSetupWizard}
      onClose={() => setShowSetupWizard(false)}
      onSuccess={() => setShowSetupWizard(false)}
      editingChallenge={challengeSummary}
    />
    </TooltipProvider>
  );
}
