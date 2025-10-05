import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Clock, 
  Globe, 
  Shield, 
  AlertTriangle, 
  FileText, 
  Download, 
  RotateCcw, 
  Menu, 
  X, 
  Settings,
  Wifi,
  WifiOff,
  Smartphone,
  Bell,
  BellOff,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { isMarketOpen } from '@/lib/tradingSessions';
import { biasLabels, biasTone, marketStateLabels, marketStateTone, toneClasses } from '@/types/bias';
import type { BiasStateSnapshot } from '@/types/bias';

interface ResponsiveHeaderProps {
  currentTime: Date;
  currentSession: any;
  dailyStats: {
    tradesCount: number;
    totalPnL: number;
    isHouseMoneyActive: boolean;
    isDayDisabled: boolean;
  };
  isMobile: boolean;
  isConnected: boolean;
  pendingChanges: number;
  lastSyncTime: Date | null;
  onExportReport: (format: 'md' | 'csv' | 'json') => void;
  onResetDay: () => void;
  onForceSync: () => void;
  onOpenSettings: () => void;
  biasState?: BiasStateSnapshot | null;
  onEditBias?: () => void;
}

const Pill = ({ label, tone, compact = false }: { label: string; tone: keyof typeof toneClasses; compact?: boolean }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full font-medium tracking-tight',
      compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs',
      toneClasses[tone]
    )}
  >
    {label}
  </span>
);

export function ResponsiveHeader({
  currentTime,
  currentSession,
  dailyStats,
  isMobile,
  isConnected,
  pendingChanges,
  lastSyncTime,
  onExportReport,
  onResetDay,
  onForceSync,
  onOpenSettings,
  biasState,
  onEditBias
}: ResponsiveHeaderProps) {
  const { settings } = useSettings();
  const { isEnabled: notificationsEnabled, requestPermission } = usePushNotifications();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNYTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Mobile Header - Shows on small screens */}
      <header className="sticky top-0 z-50 border-b border-trading-border bg-background/95 backdrop-blur-md lg:hidden">
        {/* Mobile Header */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            {/* Left: App Title */}
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">Edge Day</h1>
              <Badge variant="outline" className="text-xs">
                <Smartphone className="mr-1 h-3 w-3" />
                Mobile
              </Badge>
            </div>

            {/* Right: Status & Actions */}
            <div className="flex items-center gap-2">
              {/* Connection Status - Only show when offline */}
              {!isConnected && (
                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                  <WifiOff className="mr-1 h-3 w-3" />
                  Offline
                </Badge>
              )}

              {/* Pending Changes */}
              {pendingChanges > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                  {pendingChanges}
                </Badge>
              )}

              {/* Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="h-8 w-8 p-0"
              >
                {showMobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>


          {/* Mobile Status Row */}
          <div className="flex items-center justify-between mt-1 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatNYTime(currentTime)} NY
              </div>
              {currentSession ? (
                <Badge className={`${currentSession.color} border text-xs`}>
                  <Globe className="mr-1 h-3 w-3" />
                  {currentSession.name}
                </Badge>
              ) : isMarketOpen(currentTime) ? (
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                  <Globe className="mr-1 h-3 w-3" />
                  Market Open
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Market Closed
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {lastSyncTime && (
                <span className="text-trading-muted">
                  {lastSyncTime.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onForceSync}
                className="h-6 px-2 text-xs"
              >
                Sync
              </Button>
            </div>
          </div>

          {/* Mobile Session Hint */}
          {currentSession ? (
            <div className="mt-1 p-2 bg-secondary/30 rounded-lg border border-trading-border/50">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${currentSession.color && currentSession.color.includes('red') ? 'bg-red-400' : currentSession.color && currentSession.color.includes('blue') ? 'bg-blue-400' : currentSession.color && currentSession.color.includes('purple') ? 'bg-purple-400' : 'bg-green-400'}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{currentSession.name}</p>
                  <p className="text-xs text-trading-muted mt-0.5">{currentSession.description}</p>
                  <p className="text-xs text-trading-muted">{currentSession.localTime}</p>
                </div>
              </div>
            </div>
          ) : isMarketOpen(currentTime) ? (
            <div className="mt-1 p-2 bg-green-500/10 rounded-lg border border-green-500/30">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-300">Market Open</p>
                  <p className="text-xs text-green-300/80 mt-0.5">Trading is available between sessions</p>
                  <p className="text-xs text-green-300/60">Next session starts soon</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-1 p-2 bg-red-500/10 rounded-lg border border-red-500/30">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-300">Market Closed</p>
                  <p className="text-xs text-red-300/80 mt-0.5">Trading sessions are not active at this time</p>
                  <p className="text-xs text-red-300/60">Check back during market hours</p>
                </div>
              </div>
            </div>
          )}

          {/* Ultra-Compact Mobile Stats Row - All in one line */}
          <div className="flex items-center justify-between mt-1 px-1">
            {/* Left: All Stats Combined */}
            <div className="flex items-center gap-2 flex-1">
              {/* Trades & P&L */}
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-sm font-bold text-foreground">{dailyStats.tradesCount}</div>
                  <div className="text-xs text-trading-muted">Trades</div>
                </div>
                <div className="text-center">
                  <div className={`text-sm font-bold ${dailyStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(dailyStats.totalPnL)}
                  </div>
                  <div className="text-xs text-trading-muted">P&L</div>
                </div>
              </div>
              
              {/* Bias State - Inline with stats */}
              <div className="flex items-center gap-1 ml-2">
                <Brain className="h-3 w-3 text-trading-accent flex-shrink-0" />
                {biasState ? (
                  <div className="flex items-center gap-1">
                    <Pill 
                      label={biasLabels[biasState.bias]} 
                      tone={biasTone[biasState.bias]} 
                      compact={true}
                    />
                    {biasState.market_state && (
                      <Pill 
                        label={marketStateLabels[biasState.market_state]} 
                        tone={marketStateTone[biasState.market_state]} 
                        compact={true}
                      />
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-trading-muted">Not set</span>
                )}
              </div>
            </div>

            {/* Right: Status Badges */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {dailyStats.isHouseMoneyActive && (
                <Badge className="bg-green-500/20 text-green-300 border-green-400/50 text-xs px-1.5 py-0.5">
                  <Shield className="mr-1 h-2.5 w-2.5" />
                  House
                </Badge>
              )}
              {dailyStats.isDayDisabled && (
                <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-400/50 text-xs px-1.5 py-0.5">
                  <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                  Stop
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <Card className="mx-4 mb-4 border-trading-border bg-background/95 backdrop-blur-md">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onExportReport('md');
                    setShowMobileMenu(false);
                  }}
                  className="text-xs"
                >
                  <FileText className="mr-1 h-3 w-3" />
                  Export MD
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onExportReport('csv');
                    setShowMobileMenu(false);
                  }}
                  className="text-xs"
                >
                  <Download className="mr-1 h-3 w-3" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onExportReport('json');
                    setShowMobileMenu(false);
                  }}
                  className="text-xs"
                >
                  <Download className="mr-1 h-3 w-3" />
                  JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenSettings}
                  className="text-xs"
                >
                  <Settings className="mr-1 h-3 w-3" />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!notificationsEnabled) {
                      requestPermission();
                    }
                    setShowMobileMenu(false);
                  }}
                  className="text-xs"
                >
                  {notificationsEnabled ? (
                    <Bell className="mr-1 h-3 w-3" />
                  ) : (
                    <BellOff className="mr-1 h-3 w-3" />
                  )}
                  {notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onResetDay();
                    setShowMobileMenu(false);
                  }}
                  className="text-xs"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset Day
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </header>

      {/* Desktop Header - Shows on large screens */}
      <header className="sticky top-0 z-50 border-b border-trading-border bg-background/80 backdrop-blur-md hidden lg:block">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">Edge Day – Mechanical Trading Journal</h1>
            
            {/* Desktop Status Indicators */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-trading-card border-trading-border">
                <Clock className="mr-1 h-3 w-3" />
                {formatNYTime(currentTime)} NY
              </Badge>
              {currentSession ? (
                <Badge className={`${currentSession.color} border`}>
                  <Globe className="mr-1 h-3 w-3" />
                  {currentSession.name}
                </Badge>
              ) : isMarketOpen(currentTime) ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Globe className="mr-1 h-3 w-3" />
                  Market Open
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Market Closed
                </Badge>
              )}
              {dailyStats.isHouseMoneyActive && (
                <Badge className="bg-green-500/20 text-green-300 border-green-400/50">
                  <Shield className="mr-1 h-3 w-3" />
                  House Money
                </Badge>
              )}
              {dailyStats.isDayDisabled && (
                <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-400/50">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Session Guardrail
                </Badge>
              )}
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="flex items-center gap-3">
            <Button variant="terminal" size="sm" onClick={() => onExportReport('md')}>
              <FileText className="mr-1 h-3 w-3" />
              Export MD
            </Button>
            <Button variant="terminal" size="sm" onClick={() => onExportReport('csv')}>
              <Download className="mr-1 h-3 w-3" />
              CSV
            </Button>
            <Button variant="terminal" size="sm" onClick={() => onExportReport('json')}>
              <Download className="mr-1 h-3 w-3" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenSettings}>
              <Settings className="mr-1 h-3 w-3" />
              Settings
            </Button>
            <Button variant="danger" size="sm" onClick={onResetDay}>
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset Day
            </Button>
          </div>
        </div>


        {/* Desktop Session Hint */}
        {currentSession ? (
          <div className="px-6 pb-3">
            <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg border border-trading-border/50">
              <div className="flex-shrink-0 mt-1">
                <div className={`w-3 h-3 rounded-full ${currentSession.color && currentSession.color.includes('red') ? 'bg-red-400' : currentSession.color && currentSession.color.includes('blue') ? 'bg-blue-400' : currentSession.color && currentSession.color.includes('purple') ? 'bg-purple-400' : 'bg-green-400'}`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground">{currentSession.name}</h3>
                  <span className="text-xs text-trading-muted">{currentSession.localTime}</span>
                </div>
                <p className="text-sm text-trading-muted">{currentSession.description}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-3">
            <div className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
              <div className="flex-shrink-0 mt-1">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-red-300">Market Closed</h3>
                  <span className="text-xs text-red-300/60">No active sessions</span>
                </div>
                <p className="text-sm text-red-300/80">Trading sessions are not active at this time. Check back during market hours.</p>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}