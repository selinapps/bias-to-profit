import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { logger } from '@/lib/logger';

export interface UserSettings {
  // Trading Preferences
  defaultRiskAmount: number;
  defaultRiskTier: 'a' | 'b' | 'c';
  preferredAssets: string[];
  defaultModel: string;
  
  // UI Preferences
  theme: 'dark' | 'light' | 'auto';
  compactMode: boolean;
  showAdvancedFeatures: boolean;
  autoSave: boolean;
  
  // Journal Mode
  journalMode: 'advanced' | 'simple';
  customSetups: Array<{ id: string; name: string; description?: string; checklist?: string[] }>;
  
  // Trading Rules
  maxDailyLosses: number;
  enableStopRule: boolean;
  enableHouseMoney: boolean;
  houseMoneyThreshold: number;
  
  // Notifications
  enableNotifications: boolean;
  tradeAlerts: boolean;
  sessionAlerts: boolean;
  biasReminders: boolean;
  
  // Data & Privacy
  dataRetentionDays: number;
  exportFormat: 'csv' | 'json' | 'pdf';
  autoBackup: boolean;
  
  // Advanced
  experimentalFeatures: boolean;
  debugMode: boolean;
  customRiskAmounts: { a: number; b: number; c: number };
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultRiskAmount: 250,
  defaultRiskTier: 'a',
  preferredAssets: ['EURUSD', 'GBPUSD', 'USDJPY'],
  defaultModel: '',
  
  theme: 'dark',
  compactMode: false,
  showAdvancedFeatures: true,
  autoSave: true,
  
  journalMode: 'advanced',
  customSetups: [
    { id: 'setup-1', name: 'Breakout', description: 'Momentum breakout setup', checklist: ['Confirmed breakout', 'Volume spike', 'Clean structure'] },
    { id: 'setup-2', name: 'Reversal', description: 'Counter-trend reversal', checklist: ['Divergence present', 'Support/resistance hit', 'Reversal candle'] }
  ],
  
  maxDailyLosses: 3,
  enableStopRule: true,
  enableHouseMoney: true,
  houseMoneyThreshold: 3,
  
  enableNotifications: true,
  tradeAlerts: true,
  sessionAlerts: true,
  biasReminders: true,
  
  dataRetentionDays: 365,
  exportFormat: 'csv',
  autoBackup: false,
  
  experimentalFeatures: false,
  debugMode: false,
  customRiskAmounts: { a: 100, b: 50, c: 25 }
};

interface SettingsContextType {
  settings: UserSettings;
  loading: boolean;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: () => void;
  importSettings: (settings: UserSettings) => Promise<void>;
  resetAllData: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Helper function to handle upsert with conflict resolution
  const upsertUserSettings = async (dbUpdate: any) => {
    // First try to update existing record
    const { error: updateError } = await supabase
      .from('user_settings')
      .update(dbUpdate)
      .eq('user_id', user!.id);

    // If no existing record, insert new one
    if (updateError && updateError.code === 'PGRST116') {
      const { error: insertError } = await supabase
        .from('user_settings')
        .insert(dbUpdate);
      
      if (insertError) {
        throw insertError;
      }
    } else if (updateError) {
      throw updateError;
    }
  };

  // Apply theme to document
  const applyTheme = (theme: 'dark' | 'light' | 'auto') => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('dark', 'light');
    
    if (theme === 'auto') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    } else {
      root.classList.add(theme);
    }
  };

  // Listen for system theme changes when auto is selected
  useEffect(() => {
    if (settings.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('auto');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  useEffect(() => {
    if (user) {
      fetchSettings();
    } else {
      // Try to load from localStorage as fallback
      try {
        const localSettings = localStorage.getItem('bias-to-profit:settings');
        if (localSettings) {
          const parsed = JSON.parse(localSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        logger.error('Error loading local settings:', error);
        setSettings(DEFAULT_SETTINGS);
      }
      setLoading(false);
    }
  }, [user]);

  // Apply theme whenever settings change
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Add a fallback for when authentication fails
  useEffect(() => {
    const handleAuthError = () => {
      logger.debug('Authentication failed, using offline mode');
      setLoading(false);
    };

    // Set a timeout to handle cases where auth never resolves
    const timeout = setTimeout(() => {
      if (loading) {
        logger.debug('Auth timeout, using offline mode');
        setLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      // Try to fetch from the existing user_settings table structure
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || error.code === 'PGRST301') {
          // No settings found, use defaults
          logger.debug('No settings found, using defaults');
          setSettings(DEFAULT_SETTINGS);
        } else if (
          error.code === 'PGRST204' || 
          error.message?.includes('406') || 
          error.message?.includes('Not Acceptable') ||
          error.message?.includes('schema cache')
        ) {
          // Handle 406/schema cache errors by using defaults
          logger.warn('API schema cache error, using default settings:', error);
          setSettings(DEFAULT_SETTINGS);
          // Don't show toast, it's annoying and the app still works
        } else {
          logger.error('Error fetching settings:', error);
          // Fallback to localStorage
          try {
            const localSettings = localStorage.getItem('bias-to-profit:settings');
            if (localSettings) {
              const parsed = JSON.parse(localSettings);
              setSettings({ ...DEFAULT_SETTINGS, ...parsed });
              logger.debug('Using locally saved settings');
            } else {
              setSettings(DEFAULT_SETTINGS);
            }
          } catch (localError) {
            logger.error('Error loading local settings:', localError);
            setSettings(DEFAULT_SETTINGS);
          }
        }
      } else if (data) {
      // Map the existing database fields to our settings structure
      const mappedSettings: UserSettings = {
        ...DEFAULT_SETTINGS,
        // Map existing fields from database (with safe access)
        defaultModel: (data as any)?.last_model || DEFAULT_SETTINGS.defaultModel,
        defaultRiskTier: ((data as any)?.last_risk_tier as 'a' | 'b' | 'c') || DEFAULT_SETTINGS.defaultRiskTier,
        enableNotifications: (data as any)?.notifications_enabled ?? DEFAULT_SETTINGS.enableNotifications,
        // Map additional fields if they exist in the database
        defaultRiskAmount: (data as any)?.default_risk_amount || DEFAULT_SETTINGS.defaultRiskAmount,
        preferredAssets: (data as any)?.preferred_assets || DEFAULT_SETTINGS.preferredAssets,
        maxDailyLosses: (data as any)?.max_daily_losses || DEFAULT_SETTINGS.maxDailyLosses,
        enableStopRule: (data as any)?.enable_stop_rule ?? DEFAULT_SETTINGS.enableStopRule,
        enableHouseMoney: (data as any)?.enable_house_money ?? DEFAULT_SETTINGS.enableHouseMoney,
        houseMoneyThreshold: (data as any)?.house_money_threshold || DEFAULT_SETTINGS.houseMoneyThreshold,
        theme: (data as any)?.theme || DEFAULT_SETTINGS.theme,
        compactMode: (data as any)?.compact_mode ?? DEFAULT_SETTINGS.compactMode,
        showAdvancedFeatures: (data as any)?.show_advanced_features ?? DEFAULT_SETTINGS.showAdvancedFeatures,
        autoSave: (data as any)?.auto_save ?? DEFAULT_SETTINGS.autoSave,
        journalMode: (data as any)?.journal_mode || DEFAULT_SETTINGS.journalMode,
        customSetups: (data as any)?.custom_setups || DEFAULT_SETTINGS.customSetups,
        tradeAlerts: (data as any)?.trade_alerts ?? DEFAULT_SETTINGS.tradeAlerts,
        sessionAlerts: (data as any)?.session_alerts ?? DEFAULT_SETTINGS.sessionAlerts,
        biasReminders: (data as any)?.bias_reminders ?? DEFAULT_SETTINGS.biasReminders,
        dataRetentionDays: (data as any)?.data_retention_days || DEFAULT_SETTINGS.dataRetentionDays,
        exportFormat: (data as any)?.export_format || DEFAULT_SETTINGS.exportFormat,
        autoBackup: (data as any)?.auto_backup ?? DEFAULT_SETTINGS.autoBackup,
        experimentalFeatures: (data as any)?.experimental_features ?? DEFAULT_SETTINGS.experimentalFeatures,
        debugMode: (data as any)?.debug_mode ?? DEFAULT_SETTINGS.debugMode,
        customRiskAmounts: (data as any)?.custom_risk_amounts || DEFAULT_SETTINGS.customRiskAmounts,
      };
        
        // Try to load additional settings from localStorage
        try {
          const localSettings = localStorage.getItem('bias-to-profit:settings');
          if (localSettings) {
            const parsed = JSON.parse(localSettings);
            setSettings({ ...mappedSettings, ...parsed });
          } else {
            setSettings(mappedSettings);
          }
        } catch (localError) {
          setSettings(mappedSettings);
        }
      }
    } catch (error) {
      logger.error('Error fetching settings:', error);
      // Fallback to localStorage
      try {
        const localSettings = localStorage.getItem('bias-to-profit:settings');
        if (localSettings) {
          const parsed = JSON.parse(localSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (localError) {
        setSettings(DEFAULT_SETTINGS);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async <K extends keyof UserSettings>(
    key: K, 
    value: UserSettings[K]
  ) => {
    if (!user) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      // Map settings to database fields
      const dbUpdate: any = {
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      // Map specific settings to database columns
      if (key === 'defaultModel') {
        dbUpdate.last_model = value as string;
      } else if (key === 'defaultRiskTier') {
        dbUpdate.last_risk_tier = value as string;
      } else if (key === 'enableNotifications') {
        dbUpdate.notifications_enabled = value as boolean;
      } else if (key === 'defaultRiskAmount') {
        dbUpdate.default_risk_amount = value as number;
      } else if (key === 'preferredAssets') {
        dbUpdate.preferred_assets = value as string[];
      } else if (key === 'maxDailyLosses') {
        dbUpdate.max_daily_losses = value as number;
      } else if (key === 'enableStopRule') {
        dbUpdate.enable_stop_rule = value as boolean;
      } else if (key === 'enableHouseMoney') {
        dbUpdate.enable_house_money = value as boolean;
      } else if (key === 'houseMoneyThreshold') {
        dbUpdate.house_money_threshold = value as number;
      } else if (key === 'theme') {
        dbUpdate.theme = value as string;
      } else if (key === 'compactMode') {
        dbUpdate.compact_mode = value as boolean;
      } else if (key === 'showAdvancedFeatures') {
        dbUpdate.show_advanced_features = value as boolean;
      } else if (key === 'autoSave') {
        dbUpdate.auto_save = value as boolean;
      } else if (key === 'journalMode') {
        dbUpdate.journal_mode = value as string;
      } else if (key === 'customSetups') {
        dbUpdate.custom_setups = value;
      } else if (key === 'tradeAlerts') {
        dbUpdate.trade_alerts = value as boolean;
      } else if (key === 'sessionAlerts') {
        dbUpdate.session_alerts = value as boolean;
      } else if (key === 'biasReminders') {
        dbUpdate.bias_reminders = value as boolean;
      } else if (key === 'dataRetentionDays') {
        dbUpdate.data_retention_days = value as number;
      } else if (key === 'exportFormat') {
        dbUpdate.export_format = value as string;
      } else if (key === 'autoBackup') {
        dbUpdate.auto_backup = value as boolean;
      } else if (key === 'experimentalFeatures') {
        dbUpdate.experimental_features = value as boolean;
      } else if (key === 'debugMode') {
        dbUpdate.debug_mode = value as boolean;
      } else if (key === 'customRiskAmounts') {
        dbUpdate.custom_risk_amounts = value as { a: number; b: number; c: number };
      }

      await upsertUserSettings(dbUpdate);

      // Save full settings to localStorage as backup
      localStorage.setItem('bias-to-profit:settings', JSON.stringify(newSettings));
      toast({
        title: "Setting Updated",
        description: "Your preference has been saved.",
      });
    } catch (error) {
      logger.error('Error updating setting:', error);
      // Save to localStorage as fallback
      localStorage.setItem('bias-to-profit:settings', JSON.stringify(newSettings));
      setSettings(settings);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return;

    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      // Map settings to database fields
      const dbUpdate: any = {
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      // Map specific settings to database columns
      if (updates.defaultModel !== undefined) {
        dbUpdate.last_model = updates.defaultModel;
      }
      if (updates.defaultRiskTier !== undefined) {
        dbUpdate.last_risk_tier = updates.defaultRiskTier;
      }
      if (updates.enableNotifications !== undefined) {
        dbUpdate.notifications_enabled = updates.enableNotifications;
      }
      if (updates.defaultRiskAmount !== undefined) {
        dbUpdate.default_risk_amount = updates.defaultRiskAmount;
      }
      if (updates.preferredAssets !== undefined) {
        dbUpdate.preferred_assets = updates.preferredAssets;
      }
      if (updates.maxDailyLosses !== undefined) {
        dbUpdate.max_daily_losses = updates.maxDailyLosses;
      }
      if (updates.enableStopRule !== undefined) {
        dbUpdate.enable_stop_rule = updates.enableStopRule;
      }
      if (updates.enableHouseMoney !== undefined) {
        dbUpdate.enable_house_money = updates.enableHouseMoney;
      }
      if (updates.houseMoneyThreshold !== undefined) {
        dbUpdate.house_money_threshold = updates.houseMoneyThreshold;
      }
      if (updates.theme !== undefined) {
        dbUpdate.theme = updates.theme;
      }
      if (updates.compactMode !== undefined) {
        dbUpdate.compact_mode = updates.compactMode;
      }
      if (updates.showAdvancedFeatures !== undefined) {
        dbUpdate.show_advanced_features = updates.showAdvancedFeatures;
      }
      if (updates.autoSave !== undefined) {
        dbUpdate.auto_save = updates.autoSave;
      }
      if (updates.journalMode !== undefined) {
        dbUpdate.journal_mode = updates.journalMode;
      }
      if (updates.customSetups !== undefined) {
        dbUpdate.custom_setups = updates.customSetups;
      }
      if (updates.tradeAlerts !== undefined) {
        dbUpdate.trade_alerts = updates.tradeAlerts;
      }
      if (updates.sessionAlerts !== undefined) {
        dbUpdate.session_alerts = updates.sessionAlerts;
      }
      if (updates.biasReminders !== undefined) {
        dbUpdate.bias_reminders = updates.biasReminders;
      }
      if (updates.dataRetentionDays !== undefined) {
        dbUpdate.data_retention_days = updates.dataRetentionDays;
      }
      if (updates.exportFormat !== undefined) {
        dbUpdate.export_format = updates.exportFormat;
      }
      if (updates.autoBackup !== undefined) {
        dbUpdate.auto_backup = updates.autoBackup;
      }
      if (updates.experimentalFeatures !== undefined) {
        dbUpdate.experimental_features = updates.experimentalFeatures;
      }
      if (updates.debugMode !== undefined) {
        dbUpdate.debug_mode = updates.debugMode;
      }
      if (updates.customRiskAmounts !== undefined) {
        dbUpdate.custom_risk_amounts = updates.customRiskAmounts;
      }

      await upsertUserSettings(dbUpdate);

      // Save full settings to localStorage as backup
      localStorage.setItem('bias-to-profit:settings', JSON.stringify(newSettings));
    } catch (error) {
      logger.error('Error updating settings:', error);
      // Save to localStorage as fallback
      localStorage.setItem('bias-to-profit:settings', JSON.stringify(newSettings));
      setSettings(settings);
    }
  };

  const resetSettings = async () => {
    if (!user) return;

    setSettings(DEFAULT_SETTINGS);

    try {
      await upsertUserSettings({
        user_id: user.id,
        last_model: DEFAULT_SETTINGS.defaultModel,
        last_risk_tier: DEFAULT_SETTINGS.defaultRiskTier,
        notifications_enabled: DEFAULT_SETTINGS.enableNotifications,
        default_risk_amount: DEFAULT_SETTINGS.defaultRiskAmount,
        preferred_assets: DEFAULT_SETTINGS.preferredAssets,
        max_daily_losses: DEFAULT_SETTINGS.maxDailyLosses,
        enable_stop_rule: DEFAULT_SETTINGS.enableStopRule,
        enable_house_money: DEFAULT_SETTINGS.enableHouseMoney,
        house_money_threshold: DEFAULT_SETTINGS.houseMoneyThreshold,
        theme: DEFAULT_SETTINGS.theme,
        compact_mode: DEFAULT_SETTINGS.compactMode,
        show_advanced_features: DEFAULT_SETTINGS.showAdvancedFeatures,
        auto_save: DEFAULT_SETTINGS.autoSave,
        journal_mode: DEFAULT_SETTINGS.journalMode,
        custom_setups: DEFAULT_SETTINGS.customSetups,
        trade_alerts: DEFAULT_SETTINGS.tradeAlerts,
        session_alerts: DEFAULT_SETTINGS.sessionAlerts,
        bias_reminders: DEFAULT_SETTINGS.biasReminders,
        data_retention_days: DEFAULT_SETTINGS.dataRetentionDays,
        export_format: DEFAULT_SETTINGS.exportFormat,
        auto_backup: DEFAULT_SETTINGS.autoBackup,
        experimental_features: DEFAULT_SETTINGS.experimentalFeatures,
        debug_mode: DEFAULT_SETTINGS.debugMode,
        custom_risk_amounts: DEFAULT_SETTINGS.customRiskAmounts,
        updated_at: new Date().toISOString()
      });

      // Save to localStorage as backup
      localStorage.setItem('bias-to-profit:settings', JSON.stringify(DEFAULT_SETTINGS));
      toast({
        title: "Settings Reset",
        description: "All settings have been reset to defaults.",
      });
    } catch (error) {
      logger.error('Error resetting settings:', error);
      // Save to localStorage as fallback
      localStorage.setItem('bias-to-profit:settings', JSON.stringify(DEFAULT_SETTINGS));
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bias-to-profit-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = async (importedSettings: UserSettings) => {
    if (!user) return;

    setSettings(importedSettings);

    try {
      await upsertUserSettings({
        user_id: user.id,
        last_model: importedSettings.defaultModel,
        last_risk_tier: importedSettings.defaultRiskTier,
        notifications_enabled: importedSettings.enableNotifications,
        default_risk_amount: importedSettings.defaultRiskAmount,
        preferred_assets: importedSettings.preferredAssets,
        max_daily_losses: importedSettings.maxDailyLosses,
        enable_stop_rule: importedSettings.enableStopRule,
        enable_house_money: importedSettings.enableHouseMoney,
        house_money_threshold: importedSettings.houseMoneyThreshold,
        theme: importedSettings.theme,
        compact_mode: importedSettings.compactMode,
        show_advanced_features: importedSettings.showAdvancedFeatures,
        auto_save: importedSettings.autoSave,
        journal_mode: importedSettings.journalMode,
        custom_setups: importedSettings.customSetups,
        trade_alerts: importedSettings.tradeAlerts,
        session_alerts: importedSettings.sessionAlerts,
        bias_reminders: importedSettings.biasReminders,
        data_retention_days: importedSettings.dataRetentionDays,
        export_format: importedSettings.exportFormat,
        auto_backup: importedSettings.autoBackup,
        experimental_features: importedSettings.experimentalFeatures,
        debug_mode: importedSettings.debugMode,
        custom_risk_amounts: importedSettings.customRiskAmounts,
        updated_at: new Date().toISOString()
      });

      // Save full settings to localStorage as backup
      localStorage.setItem('bias-to-profit:settings', JSON.stringify(importedSettings));
      toast({
        title: "Settings Imported",
        description: "Your settings have been imported successfully.",
      });
    } catch (error) {
      logger.error('Error importing settings:', error);
      // Save to localStorage as fallback
      localStorage.setItem('bias-to-profit:settings', JSON.stringify(importedSettings));
    }
  };

  const resetAllData = async () => {
    if (!user) return;

    try {
      logger.debug('Starting safe data reset for user:', user.id);
      
      // Strategy: Try multiple approaches until one works
      let resetSuccessful = false;

      // Approach 1: Try the robust SECURITY DEFINER reset function
      try {
        const { data, error } = await supabase.rpc('safe_full_user_reset', {
          p_user_id: user.id
        });

        if (!error && data?.success) {
          logger.debug('Full reset function succeeded:', data);
          resetSuccessful = true;
        } else {
          logger.warn('Full reset function failed or returned error:', error || data);
        }
      } catch (rpcError) {
        logger.warn('RPC call failed:', rpcError);
      }

      // Approach 1b: Fallback to legacy safe_reset_user_data if available
      if (!resetSuccessful) {
        try {
          const { data, error } = await supabase.rpc('safe_reset_user_data', {
            p_user_id: user.id
          });
          if (!error && (data as any)?.success) {
            logger.debug('Legacy safe reset function succeeded:', data);
            resetSuccessful = true;
          } else if (error) {
            logger.warn('Legacy safe reset returned error:', error);
          }
        } catch (legacyError) {
          logger.warn('Legacy RPC call failed:', legacyError);
        }
      }

      // Approach 2: Manual deletion with strict success requirement (trades must be deleted)
      if (!resetSuccessful) {
        logger.debug('Using manual deletion');

        let tradesDeleted = false;

        // Delete trades first and require success
        try {
          const { error } = await supabase
            .from('trades' as any)
            .delete()
            .eq('user_id', user.id);
          if (error) {
            logger.warn('Failed to delete from trades:', error);
          } else {
            tradesDeleted = true;
            logger.debug('✅ Deleted from trades');
          }
        } catch (err) {
          logger.warn('Error deleting from trades:', err);
        }

        // Proceed to best-effort delete for the rest
        const deleteOperations = [
          { table: 'bias_state', column: 'selected_by' },
          { table: 'daily_reflection', column: 'user_id' },
          { table: 'trade_reflection', column: 'user_id' },
          { table: 'daily_session_patterns', column: 'user_id' },
          { table: 'challenge_phases', column: 'user_id' },
          { table: 'user_settings', column: 'user_id' },
        ];

        const results = await Promise.allSettled(
          deleteOperations.map(async ({ table, column }) => {
            try {
              const { error } = await supabase
                .from(table as any)
                .delete()
                .eq(column, user.id);
              if (error) throw error;
              logger.debug(`✅ Deleted from ${table}`);
              return true;
            } catch (e) {
              logger.debug(`⚠️ Could not delete from ${table}:`, e);
              throw e;
            }
          })
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failCount = results.filter(r => r.status === 'rejected').length;
        logger.debug(`Deletion results (excluding trades): ${successCount} succeeded, ${failCount} failed`);

        // Consider manual deletion successful only if trades were deleted
        resetSuccessful = tradesDeleted;
        if (!resetSuccessful) {
          throw new Error('Trades could not be deleted. Reset aborted to prevent false success.');
        }
      }

      // Only proceed with cleanup if reset was successful
      if (!resetSuccessful) {
        throw new Error('All database deletion attempts failed');
      }

      // Clear localStorage
      try {
        localStorage.clear();
        logger.debug('✅ Cleared localStorage');
      } catch (err) {
        logger.warn('Could not clear localStorage:', err);
      }
      
      // Reset settings to defaults
      setSettings(DEFAULT_SETTINGS);

      // Show success message
      toast({
        title: "Data Reset Complete",
        description: "All trading data has been deleted. Page will reload.",
        variant: "default"
      });

      // Force page reload to clear all cached data and re-sync
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      logger.error('Error in resetAllData:', error);
      
      // Clear local data even on error
      try {
        localStorage.clear();
        setSettings(DEFAULT_SETTINGS);
      } catch (clearError) {
        logger.error('Could not clear local storage:', clearError);
      }
      
      // Show error to user - don't reload on error
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to delete data. Please check database permissions or try again.",
        variant: "destructive"
      });
      
      // Re-throw the error so calling code knows it failed
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      loading,
      updateSetting,
      updateSettings,
      resetSettings,
      exportSettings,
      importSettings,
      resetAllData
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
