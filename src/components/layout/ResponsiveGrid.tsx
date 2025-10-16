import React, { createContext, useContext, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GridContextType {
  density: 'comfortable' | 'compact';
  setDensity: (density: 'comfortable' | 'compact') => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const GridContext = createContext<GridContextType | undefined>(undefined);

export const useGrid = () => {
  const context = useContext(GridContext);
  if (!context) {
    throw new Error('useGrid must be used within a GridProvider');
  }
  return context;
};

interface GridProviderProps {
  children: React.ReactNode;
  defaultDensity?: 'comfortable' | 'compact';
}

export const GridProvider: React.FC<GridProviderProps> = ({
  children,
  defaultDensity = 'comfortable'
}) => {
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    const saved = localStorage.getItem('grid-density');
    return (saved as 'comfortable' | 'compact') || defaultDensity;
  });

  const [screenSize, setScreenSize] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false
  });

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      setScreenSize({
        isMobile: width < 600,
        isTablet: width >= 600 && width < 1240,
        isDesktop: width >= 1240
      });
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  useEffect(() => {
    localStorage.setItem('grid-density', density);
  }, [density]);

  const value: GridContextType = {
    density,
    setDensity,
    ...screenSize
  };

  return (
    <GridContext.Provider value={value}>
      {children}
    </GridContext.Provider>
  );
};

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  gap = 'md',
  columns = {
    mobile: 1,
    tablet: 2,
    desktop: 3
  },
  maxWidth = 'full'
}) => {
  const { density, isMobile, isTablet, isDesktop } = useGrid();

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  // Determine grid columns based on screen size
  const getGridCols = () => {
    if (isMobile) return `grid-cols-${columns.mobile}`;
    if (isTablet) return `grid-cols-${columns.tablet}`;
    return `grid-cols-${columns.desktop}`;
  };

  return (
    <div
      className={cn(
        'grid w-full',
        getGridCols(),
        gapClasses[gap],
        maxWidthClasses[maxWidth],
        density === 'compact' && 'gap-2',
        className
      )}
    >
      {children}
    </div>
  );
};

interface GridItemProps {
  children: React.ReactNode;
  className?: string;
  span?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  order?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export const GridItem: React.FC<GridItemProps> = ({
  children,
  className,
  span,
  order
}) => {
  const { isMobile, isTablet } = useGrid();

  const getSpanClasses = () => {
    if (!span) return '';
    
    if (isMobile && span.mobile) return `col-span-${span.mobile}`;
    if (isTablet && span.tablet) return `col-span-${span.tablet}`;
    if (span.desktop) return `col-span-${span.desktop}`;
    
    return '';
  };

  const getOrderClasses = () => {
    if (!order) return '';
    
    if (isMobile && order.mobile) return `order-${order.mobile}`;
    if (isTablet && order.tablet) return `order-${order.tablet}`;
    if (order.desktop) return `order-${order.desktop}`;
    
    return '';
  };

  return (
    <div
      className={cn(
        getSpanClasses(),
        getOrderClasses(),
        className
      )}
    >
      {children}
    </div>
  );
};

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  center?: boolean;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className,
  maxWidth = 'xl',
  padding = 'md',
  center = true
}) => {
  const { isMobile } = useGrid();

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-7xl',
    '2xl': 'max-w-8xl',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    sm: isMobile ? 'px-2' : 'px-4',
    md: isMobile ? 'px-4' : 'px-6',
    lg: isMobile ? 'px-6' : 'px-8'
  };

  return (
    <div
      className={cn(
        'w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        center && 'mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
};

interface DensityToggleProps {
  className?: string;
}

export const DensityToggle: React.FC<DensityToggleProps> = ({ className }) => {
  const { density, setDensity, isDesktop } = useGrid();

  if (!isDesktop) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm font-medium text-on-surface">Density:</span>
      <div className="flex items-center bg-surface-container rounded-lg p-1">
        <button
          onClick={() => setDensity('comfortable')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-fast',
            density === 'comfortable'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          )}
        >
          Comfortable
        </button>
        <button
          onClick={() => setDensity('compact')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-fast',
            density === 'compact'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          )}
        >
          Compact
        </button>
      </div>
    </div>
  );
};

// Layout patterns for common use cases
export const DashboardLayout: React.FC<{
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}> = ({ children, sidebar, header, className }) => {
  const { isMobile } = useGrid();

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {header}
      
      <div className="flex">
        {sidebar && !isMobile && (
          <aside className="flex-shrink-0">
            {sidebar}
          </aside>
        )}
        
        <main className={cn(
          'flex-1 min-w-0',
          isMobile ? 'pb-20' : 'ml-0'
        )}>
          {children}
        </main>
      </div>
    </div>
  );
};

export const CardGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}> = ({ children, className, columns = { mobile: 1, tablet: 2, desktop: 3 } }) => {
  return (
    <ResponsiveGrid
      columns={columns}
      className={className}
    >
      {children}
    </ResponsiveGrid>
  );
};

export const StatsGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn(
      'grid gap-4 md:gap-6',
      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      'px-2 md:px-0',
      className
    )}>
      {children}
    </div>
  );
};
