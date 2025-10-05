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
        } else {
          logger.error('Error fetching settings:', error);
          // Fallback to localStorage
          try {
            const localSettings = localStorage.getItem('bias-to-profit:settings');
            if (localSettings) {
              const parsed = JSON.parse(localSettings);
              setSettings({ ...DEFAULT_SETTINGS, ...parsed });
              toast({
                title: "Settings Loaded from Local Storage",
                description: "Using locally saved settings.",
                variant: "default"
              });
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
      logger.debug('Starting data reset for user:', user.id);
      
      // Delete all user data from database - handle each table separately
      const deleteResults = [];

      // Delete trades
      logger.debug('Deleting trades...');
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .delete()
        .eq('user_id', user.id);
      deleteResults.push({ table: 'trades', error: tradesError, data: tradesData });

      // Delete bias states
      logger.debug('Deleting bias states...');
      const { data: biasData, error: biasError } = await supabase
        .from('bias_state')
        .delete()
        .eq('selected_by', user.id);
      deleteResults.push({ table: 'bias_state', error: biasError, data: biasData });

      // Delete daily stats
      logger.debug('Deleting daily stats...');
      const { data: statsData, error: statsError } = await supabase
        .from('daily_stats')
        .delete()
        .eq('user_id', user.id);
      deleteResults.push({ table: 'daily_stats', error: statsError, data: statsData });

      // Delete hypotheses
      logger.debug('Deleting hypotheses...');
      const { data: hypothesesData, error: hypothesesError } = await supabase
        .from('hypotheses')
        .delete()
        .eq('user_id', user.id);
      deleteResults.push({ table: 'hypotheses', error: hypothesesError, data: hypothesesData });

      // Delete user settings
      logger.debug('Deleting user settings...');
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', user.id);
      deleteResults.push({ table: 'user_settings', error: settingsError, data: settingsData });

      // Log results
      logger.debug('Delete results:', deleteResults);
      
      // Check for errors
      const errors = deleteResults.filter(result => result.error);
      if (errors.length > 0) {
        logger.warn('Some deletions failed:', errors);
        // Don't throw error, just log warnings
      }

      // Clear localStorage
      localStorage.removeItem('bias-to-profit:settings');
      localStorage.clear(); // Clear all localStorage
      
      // Reset settings to defaults
      setSettings(DEFAULT_SETTINGS);

      // Force page reload to clear all cached data
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      logger.debug('Data reset completed successfully');
      toast({
        title: "All Data Reset",
        description: "All your trading data has been permanently deleted. Page will reload in a moment.",
        variant: "default"
      });
    } catch (error) {
      logger.error('Error resetting data:', error);
      toast({
        title: "Reset Failed",
        description: `Failed to reset data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
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
