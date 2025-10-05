import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Activity, 
  Brain, 
  Zap 
} from 'lucide-react';

interface ResponsiveFooterProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobile: boolean;
}

export function ResponsiveFooter({ activeTab, onTabChange, isMobile }: ResponsiveFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="px-4 py-2">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className={`grid w-full grid-cols-4 bg-trading-card ${isMobile ? 'h-12' : 'h-10'}`}>
            <TabsTrigger 
              value="dashboard" 
              className={`flex items-center gap-1 ${isMobile ? 'text-sm' : 'text-xs'}`}
            >
              <BarChart3 className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="trades" 
              className={`flex items-center gap-1 ${isMobile ? 'text-sm' : 'text-xs'}`}
            >
              <Activity className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
              Trades
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className={`flex items-center gap-1 ${isMobile ? 'text-sm' : 'text-xs'}`}
            >
              <Brain className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="hypothesis" 
              className={`flex items-center gap-1 ${isMobile ? 'text-sm' : 'text-xs'}`}
            >
              <Zap className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
              Hypothesis
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
