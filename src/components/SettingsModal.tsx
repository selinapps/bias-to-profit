import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { SetupManager } from '@/components/SetupManager';
import { 
  Settings, 
  DollarSign, 
  Palette, 
  Shield, 
  Bell, 
  Database,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  Brain,
  Zap,
  List
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSetting, updateSettings, resetSettings, exportSettings, importSettings, resetAllData } = useSettings();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showSetupManager, setShowSetupManager] = useState(false);

  const handleUpdateSetting = async (key: keyof typeof settings, value: any) => {
    setIsLoading(true);
    try {
      await updateSetting(key, value);
    } catch (error) {
      logger.error('Error updating setting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);
      await importSettings(importedSettings);
      toast({
        title: "Settings Imported",
        description: "Your settings have been successfully imported.",
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import settings. Please check the file format.",
        variant: "destructive",
      });
    }
  };

  const handleResetSettings = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      setIsLoading(true);
      try {
        await resetSettings();
        toast({
          title: "Settings Reset",
          description: "All settings have been reset to defaults.",
        });
      } catch (error) {
        logger.error('Error resetting settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResetAllData = async () => {
    const confirmMessage = '⚠️ WARNING: This will permanently delete ALL your trading data including:\n\n• All trades (open and closed)\n• All performance statistics\n• All bias states and sessions\n• All challenge data\n• All settings\n\nThis action CANNOT be undone. Are you absolutely sure?';
    
    if (confirm(confirmMessage)) {
      const finalConfirm = prompt('Type "DELETE ALL DATA" to confirm this destructive action:');
      if (finalConfirm === 'DELETE ALL DATA') {
        setIsLoading(true);
        try {
          if (!user) throw new Error('User not authenticated');
          
          // Use the robust resetAllData from the settings context
          await resetAllData();
          
          onClose(); // Close the modal
        } catch (error) {
          logger.error('Error resetting all data:', error);
          toast({
            title: "Reset Failed",
            description: "Failed to reset data. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleClearCache = async () => {
    if (confirm('Clear browser cache? This will force a fresh reload of the app.')) {
      setIsLoading(true);
      try {
        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        }
        
        // Clear localStorage
        localStorage.clear();
        
        // Force service worker update
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
          }
        }
        
        toast({
          title: "Cache Cleared",
          description: "Browser cache cleared. The app will reload.",
        });
        
        // Reload the page
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        logger.error('Error clearing cache:', error);
        toast({
          title: "Cache Clear Failed",
          description: "Failed to clear cache. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Trading Journal Settings
          </DialogTitle>
          <DialogDescription>
            Configure your trading preferences, appearance, rules, notifications, and data settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="trading" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="trading" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Trading
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data
            </TabsTrigger>
          </TabsList>

          {/* Trading Preferences */}
          <TabsContent value="trading" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trading Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultRisk">Default Risk Amount ($)</Label>
                    <Input
                      id="defaultRisk"
                      type="number"
                      value={settings.defaultRiskAmount}
                      onChange={(e) => handleUpdateSetting('defaultRiskAmount', parseInt(e.target.value) || 250)}
                      className="bg-input border-trading-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="riskTier">Default Risk Tier</Label>
                    <Select 
                      value={settings.defaultRiskTier} 
                      onValueChange={(value) => handleUpdateSetting('defaultRiskTier', value)}
                    >
                      <SelectTrigger className="bg-input border-trading-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a">Tier A - High Risk</SelectItem>
                        <SelectItem value="b">Tier B - Medium Risk</SelectItem>
                        <SelectItem value="c">Tier C - Low Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Risk Per Tier Settings</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tierA">Tier A - High Risk ($)</Label>
                      <Input
                        id="tierA"
                        type="number"
                        value={settings.customRiskAmounts.a}
                        onChange={(e) => {
                          const newAmounts = { ...settings.customRiskAmounts, a: parseInt(e.target.value) || 100 };
                          handleUpdateSetting('customRiskAmounts', newAmounts);
                        }}
                        className="bg-input border-trading-border"
                      />
                      <p className="text-xs text-trading-muted">High conviction trades</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tierB">Tier B - Medium Risk ($)</Label>
                      <Input
                        id="tierB"
                        type="number"
                        value={settings.customRiskAmounts.b}
                        onChange={(e) => {
                          const newAmounts = { ...settings.customRiskAmounts, b: parseInt(e.target.value) || 50 };
                          handleUpdateSetting('customRiskAmounts', newAmounts);
                        }}
                        className="bg-input border-trading-border"
                      />
                      <p className="text-xs text-trading-muted">Medium conviction trades</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tierC">Tier C - Low Risk ($)</Label>
                      <Input
                        id="tierC"
                        type="number"
                        value={settings.customRiskAmounts.c}
                        onChange={(e) => {
                          const newAmounts = { ...settings.customRiskAmounts, c: parseInt(e.target.value) || 25 };
                          handleUpdateSetting('customRiskAmounts', newAmounts);
                        }}
                        className="bg-input border-trading-border"
                      />
                      <p className="text-xs text-trading-muted">Low conviction trades</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Assets</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'ES', 'NQ', '6E', 'XAUUSD', 'BTCUSD'].map(asset => (
                      <div key={asset} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`asset-${asset}`}
                          checked={settings.preferredAssets.includes(asset)}
                          onChange={(e) => {
                            const newAssets = e.target.checked
                              ? [...settings.preferredAssets, asset]
                              : settings.preferredAssets.filter(a => a !== asset);
                            handleUpdateSetting('preferredAssets', newAssets);
                          }}
                          className="rounded border-trading-border"
                        />
                        <Label htmlFor={`asset-${asset}`} className="text-sm">{asset}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Custom Trading Setups</Label>
                  <p className="text-xs text-trading-muted mb-2">
                    Create and manage your custom trading setups with checklists
                  </p>
                  <Button
                    onClick={() => setShowSetupManager(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <List className="h-4 w-4 mr-2" />
                    Manage Setups ({settings.customSetups.length})
                  </Button>
                  {settings.customSetups.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {settings.customSetups.slice(0, 5).map(setup => (
                        <Badge key={setup.id} variant="secondary">
                          {setup.name}
                        </Badge>
                      ))}
                      {settings.customSetups.length > 5 && (
                        <Badge variant="outline">
                          +{settings.customSetups.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Custom Trade Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custom Trade Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-md font-semibold">❌ Custom Mistake Tags</Label>
                  <p className="text-xs text-trading-muted">
                    Add your own mistake tags for trade reflection. One tag per line.
                  </p>
                  <Textarea
                    placeholder="❌ Entered too early&#10;❌ Ignored stop loss&#10;❌ Emotional decision&#10;❌ FOMO entry&#10;❌ Revenge trading"
                    value={''}
                    onChange={(e) => {
                      // Custom mistake tags not implemented yet
                    }}
                    className="min-h-32 bg-input border-trading-border font-mono text-sm resize-y"
                    rows={6}
                    style={{ minHeight: '120px' }}
                    wrap="soft"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const textarea = e.target as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const value = textarea.value;
                        const newValue = value.substring(0, start) + '\n' + value.substring(end);
                        textarea.value = newValue;
                        textarea.setSelectionRange(start + 1, start + 1);
                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    }}
                  />
                  <p className="text-xs text-trading-muted">
                    💡 Each line becomes a separate tag. Empty lines are ignored.
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {/* Custom mistake tags not implemented yet */}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-md font-semibold">✅ Custom Good Action Tags</Label>
                  <p className="text-xs text-trading-muted">
                    Add your own good action tags for trade reflection. One tag per line.
                  </p>
                  <Textarea
                    placeholder="✅ Followed plan&#10;✅ Respected stop&#10;✅ Good entry timing&#10;✅ Proper risk sizing&#10;✅ Emotional control"
                    value={''}
                    onChange={(e) => {
                      // Custom good actions not implemented yet
                    }}
                    className="min-h-32 bg-input border-trading-border font-mono text-sm resize-y"
                    rows={6}
                    style={{ minHeight: '120px' }}
                    wrap="soft"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const textarea = e.target as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const value = textarea.value;
                        const newValue = value.substring(0, start) + '\n' + value.substring(end);
                        textarea.value = newValue;
                        textarea.setSelectionRange(start + 1, start + 1);
                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    }}
                  />
                  <p className="text-xs text-trading-muted">
                    💡 Each line becomes a separate tag. Empty lines are ignored.
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {/* Custom good actions not implemented yet */}
                  </div>
                </div>

                <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 <strong>Tip:</strong> Leave empty to use default tags. Your custom tags will appear when managing trades.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appearance & UI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select 
                      value={settings.theme} 
                      onValueChange={(value) => handleUpdateSetting('theme', value)}
                    >
                      <SelectTrigger className="bg-input border-trading-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="auto">Auto (System)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exportFormat">Export Format</Label>
                    <Select 
                      value={settings.exportFormat} 
                      onValueChange={(value) => handleUpdateSetting('exportFormat', value)}
                    >
                      <SelectTrigger className="bg-input border-trading-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Journal Mode */}
                  <div className="space-y-2">
                    <Label htmlFor="journalMode">Journal Mode</Label>
                    <p className="text-sm text-trading-muted mb-3">Choose your trading journal experience</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleUpdateSetting('journalMode', 'advanced')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          settings.journalMode === 'advanced'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="h-5 w-5 text-blue-400" />
                          <span className="font-semibold">Advanced</span>
                        </div>
                        <p className="text-xs text-slate-400">Full-featured professional journal</p>
                      </button>
                      <button
                        onClick={() => handleUpdateSetting('journalMode', 'simple')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          settings.journalMode === 'simple'
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-5 w-5 text-emerald-400" />
                          <span className="font-semibold">Just Journal</span>
                        </div>
                        <p className="text-xs text-slate-400">Simplified quick entry</p>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="compactMode">Compact Mode</Label>
                      <p className="text-sm text-trading-muted">Reduce spacing for smaller screens</p>
                    </div>
                    <Switch
                      id="compactMode"
                      checked={settings.compactMode}
                      onCheckedChange={(checked) => handleUpdateSetting('compactMode', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showAdvanced">Advanced Features</Label>
                      <p className="text-sm text-trading-muted">Show advanced trading features</p>
                    </div>
                    <Switch
                      id="showAdvanced"
                      checked={settings.showAdvancedFeatures}
                      onCheckedChange={(checked) => handleUpdateSetting('showAdvancedFeatures', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoSave">Auto Save</Label>
                      <p className="text-sm text-trading-muted">Automatically save changes</p>
                    </div>
                    <Switch
                      id="autoSave"
                      checked={settings.autoSave}
                      onCheckedChange={(checked) => handleUpdateSetting('autoSave', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trading Rules */}
          <TabsContent value="rules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trading Rules & Risk Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxLosses">Max Daily Losses</Label>
                    <Input
                      id="maxLosses"
                      type="number"
                      min="1"
                      max="10"
                      value={settings.maxDailyLosses}
                      onChange={(e) => handleUpdateSetting('maxDailyLosses', parseInt(e.target.value) || 3)}
                      className="bg-input border-trading-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="houseMoneyThreshold">House Money Threshold</Label>
                    <Input
                      id="houseMoneyThreshold"
                      type="number"
                      min="1"
                      max="10"
                      value={settings.houseMoneyThreshold}
                      onChange={(e) => handleUpdateSetting('houseMoneyThreshold', parseInt(e.target.value) || 3)}
                      className="bg-input border-trading-border"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enableStopRule">Enable Stop Rule</Label>
                      <p className="text-sm text-trading-muted">Stop trading after max daily losses</p>
                    </div>
                    <Switch
                      id="enableStopRule"
                      checked={settings.enableStopRule}
                      onCheckedChange={(checked) => handleUpdateSetting('enableStopRule', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enableHouseMoney">Enable House Money</Label>
                      <p className="text-sm text-trading-muted">Adjust risk after profitable trades</p>
                    </div>
                    <Switch
                      id="enableHouseMoney"
                      checked={settings.enableHouseMoney}
                      onCheckedChange={(checked) => handleUpdateSetting('enableHouseMoney', checked)}
                    />
                  </div>
                </div>

                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Risk Management</span>
                  </div>
                  <p className="text-sm text-yellow-600/80 mt-1">
                    These settings help protect your capital by enforcing trading limits and risk management rules.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notifications & Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enableNotifications">Enable Notifications</Label>
                      <p className="text-sm text-trading-muted">Allow browser notifications</p>
                    </div>
                    <Switch
                      id="enableNotifications"
                      checked={settings.enableNotifications}
                      onCheckedChange={(checked) => handleUpdateSetting('enableNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="tradeAlerts">Trade Alerts</Label>
                      <p className="text-sm text-trading-muted">Notify on trade updates</p>
                    </div>
                    <Switch
                      id="tradeAlerts"
                      checked={settings.tradeAlerts}
                      onCheckedChange={(checked) => handleUpdateSetting('tradeAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sessionAlerts">Session Alerts</Label>
                      <p className="text-sm text-trading-muted">Notify on session changes</p>
                    </div>
                    <Switch
                      id="sessionAlerts"
                      checked={settings.sessionAlerts}
                      onCheckedChange={(checked) => handleUpdateSetting('sessionAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="biasReminders">Bias Reminders</Label>
                      <p className="text-sm text-trading-muted">Remind to update market bias</p>
                    </div>
                    <Switch
                      id="biasReminders"
                      checked={settings.biasReminders}
                      onCheckedChange={(checked) => handleUpdateSetting('biasReminders', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data & Privacy */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data & Privacy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataRetention">Data Retention (Days)</Label>
                    <Input
                      id="dataRetention"
                      type="number"
                      min="30"
                      max="3650"
                      value={settings.dataRetentionDays}
                      onChange={(e) => handleUpdateSetting('dataRetentionDays', parseInt(e.target.value) || 365)}
                      className="bg-input border-trading-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="autoBackup">Auto Backup</Label>
                    <Select 
                      value={settings.autoBackup ? 'enabled' : 'disabled'} 
                      onValueChange={(value) => handleUpdateSetting('autoBackup', value === 'enabled')}
                    >
                      <SelectTrigger className="bg-input border-trading-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="experimentalFeatures">Experimental Features</Label>
                      <p className="text-sm text-trading-muted">Enable beta features</p>
                    </div>
                    <Switch
                      id="experimentalFeatures"
                      checked={settings.experimentalFeatures}
                      onCheckedChange={(checked) => handleUpdateSetting('experimentalFeatures', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="debugMode">Debug Mode</Label>
                      <p className="text-sm text-trading-muted">Enable debug logging</p>
                    </div>
                    <Switch
                      id="debugMode"
                      checked={settings.debugMode}
                      onCheckedChange={(checked) => handleUpdateSetting('debugMode', checked)}
                    />
                  </div>
                </div>

                <div className="border-t border-trading-border pt-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={exportSettings}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export Settings
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('import-settings')?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Import Settings
                    </Button>
                    <input
                      id="import-settings"
                      type="file"
                      accept=".json"
                      onChange={handleImportSettings}
                      className="hidden"
                    />
                    <Button
                      variant="destructive"
                      onClick={handleResetAllData}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Reset All Data
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClearCache}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Clear Cache
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    
    {/* Setup Manager Modal */}
    <SetupManager 
      isOpen={showSetupManager}
      onClose={() => setShowSetupManager(false)}
    />
    </>
  );
}