import React from 'react';
import { NavigationProvider } from '@/components/navigation/NavigationProvider';
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar';
import { MobileBottomNavigation } from '@/components/navigation/MobileBottomNavigation';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { SkipLinks } from '@/components/accessibility/SkipLinks';
import { ThemeProvider, ThemeToggle } from '@/hooks/useTheme';
import { GridProvider } from '@/components/layout/ResponsiveGrid';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ModernLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const LayoutContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => {
  const isMobile = useIsMobile();

  return (
    <NavigationProvider isMobile={isMobile}>
      <div className={cn('min-h-screen bg-background', className)}>
        <SkipLinks />
        
        <div className="flex">
          {/* Desktop Sidebar */}
          {!isMobile && <DesktopSidebar />}
          
          {/* Main Content Area */}
          <main 
            id="main-content"
            className={cn(
              'flex-1 min-w-0 transition-all duration-normal ease-standard',
              isMobile ? 'pb-20' : 'ml-0'
            )}
          >
          {/* Top Navigation Bar */}
          <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline">
            <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3">
              {/* Left side - App Title */}
              <div className="flex-1">
                <h1 className="text-lg md:text-xl font-semibold text-on-surface">
                  Trading Journal
                </h1>
              </div>
              
              {/* Right side - Actions */}
              <div className="flex items-center gap-2 md:gap-3">
                <ThemeToggle />
                
                {/* User menu would go here */}
                <button
                  className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs md:text-sm font-medium"
                  aria-label="User menu"
                >
                  U
                </button>
              </div>
            </div>
          </header>

          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Page Content */}
          <div className="p-4 md:p-6">
            {children}
          </div>
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileBottomNavigation />}
      </div>
    </NavigationProvider>
  );
};

export const ModernLayout: React.FC<ModernLayoutProps> = ({
  children,
  className
}) => {
  return (
    <ThemeProvider>
      <GridProvider>
        <LayoutContent className={className}>
          {children}
        </LayoutContent>
      </GridProvider>
    </ThemeProvider>
  );
};

// Layout patterns for different page types
export const DashboardPage: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <ModernLayout className={className}>
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </ModernLayout>
);

export const ContentPage: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <ModernLayout className={className}>
    <div className="max-w-4xl mx-auto">
      {children}
    </div>
  </ModernLayout>
);

export const FullWidthPage: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <ModernLayout className={className}>
    {children}
  </ModernLayout>
);
