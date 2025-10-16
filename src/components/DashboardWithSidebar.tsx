import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import ImprovedTradingDashboard from '@/components/ImprovedTradingDashboard';
import { JournalModeSelector } from '@/components/JournalModeSelector';
import { useSettings } from '@/hooks/useSettings';

const DashboardWithSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { settings, loading } = useSettings();

  // Show mode selector if no mode is set or if loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="text-on-surface-variant">Loading...</div>
        </div>
      </div>
    );
  }

  // Show mode selector if mode not set (first time user or explicitly cleared)
  // Note: Advanced mode is default, so this only shows if explicitly needed
  const showModeSelector = false; // For now, we'll let users access via settings

  if (showModeSelector) {
    return <JournalModeSelector />;
  }

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <ImprovedTradingDashboard activeTab={activeTab} onTabChange={setActiveTab} />
    </AppLayout>
  );
};

export default DashboardWithSidebar;
