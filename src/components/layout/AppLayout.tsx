import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SettingsModal } from '@/components/SettingsModal';
import { isMarketOpen } from '@/lib/tradingSessions';
import { useSettings } from '@/hooks/useSettings';
import { 
  BarChart3, 
  Activity, 
  Brain, 
  Zap,
  Trophy,
  Eye
} from 'lucide-react';

// Simple navigation items - same as footer
const navigationItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    value: 'dashboard',
    icon: BarChart3
  },
  { 
    id: 'trades', 
    label: 'Trades', 
    value: 'trades',
    icon: Activity
  },
  { 
    id: 'analytics', 
    label: 'Analytics', 
    value: 'analytics',
    icon: Brain
  },
  { 
    id: 'challenge', 
    label: 'Challenge', 
    value: 'challenge',
    icon: Trophy
  },
  { 
    id: 'reflection', 
    label: 'Reflection', 
    value: 'reflection',
    icon: Eye
  },
];

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};

// Desktop Sidebar Component - same as footer
const DesktopSidebar: React.FC<{ 
  isCollapsed: boolean; 
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}> = ({ isCollapsed, onToggle, activeTab, onTabChange }) => {
  

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-full z-40 bg-surface border-r border-outline transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      <div className="p-4 border-b border-outline">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-lg font-semibold text-on-surface">Trading Journal</h1>
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-surface-container transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const isActive = activeTab === item.value;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.value)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors relative',
                isActive
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              )}
            >
              <item.icon className="w-5 h-5" />
              {!isCollapsed && (
                <span className="font-medium flex-1">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

// Mobile Bottom Navigation Component - same as footer
const MobileBottomNav: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
}> = ({ activeTab, onTabChange }) => {
  

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-outline safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {navigationItems.map((item) => {
          const isActive = activeTab === item.value;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.value)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors relative',
                isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// Main Layout Component
interface AppLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  activeTab = 'dashboard', 
  onTabChange = () => {} 
}) => {
  const isMobile = useIsMobile();
  const { settings, updateSetting } = useSettings();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date());
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <DesktopSidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      )}

      {/* Main Content */}
      <main className={cn(
        'transition-all duration-300',
        isMobile ? 'pb-16' : sidebarCollapsed ? 'ml-16' : 'ml-64'
      )}>
        {/* Header */}
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-6">
              <h1 className="text-lg font-semibold text-on-surface">
                {isMobile ? 'Trading Journal' : 'Dashboard'}
              </h1>
              {!isMobile && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-lg">
                    <span className="text-on-surface-variant">
                      {currentTime.toLocaleTimeString('en-US', {
                        timeZone: 'America/New_York',
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit'
                      })} NY
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                    isMarketOpen(currentTime) 
                      ? 'bg-success-container' 
                      : 'bg-error-container'
                  }`}>
                    <span className={isMarketOpen(currentTime) 
                      ? 'text-on-success-container' 
                      : 'text-on-error-container'
                    }>
                      {isMarketOpen(currentTime) ? 'Market Open' : 'Market Closed'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors">
                      Export MD
                    </button>
                    <button className="px-3 py-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors">
                      CSV
                    </button>
                    <button className="px-3 py-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors">
                      JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Journal Mode Toggle */}
              {!isMobile && (
                <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1">
                  <button
                    onClick={() => updateSetting('journalMode', 'advanced')}
                    className={cn(
                      'px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5',
                      settings.journalMode === 'advanced'
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    <Brain className="w-4 h-4" />
                    Advanced
                  </button>
                  <button
                    onClick={() => updateSetting('journalMode', 'simple')}
                    className={cn(
                      'px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5',
                      settings.journalMode === 'simple'
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    <Zap className="w-4 h-4" />
                    Just Journal
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setShowSettings(true)}
                className="w-8 h-8 rounded-full bg-surface-container text-on-surface flex items-center justify-center text-sm font-medium hover:bg-surface-container-high transition-colors"
                aria-label="Settings"
              >
                ⚙️
              </button>
              <button
                className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-medium"
                aria-label="User menu"
              >
                U
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav 
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
