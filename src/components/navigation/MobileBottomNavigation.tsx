import React from 'react';
import { useNavigation } from './NavigationProvider';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MobileBottomNavigationProps {
  className?: string;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({
  className
}) => {
  const { state, items, setActiveItem, isMobile } = useNavigation();
  const navigate = useNavigate();

  const handleNavigation = (item: any) => {
    setActiveItem(item.id);
    navigate(item.path);
  };
  
  // Filter to primary navigation items only (max 5)
  const primaryItems = items
    .filter(item => item.section === 'primary')
    .sort((a, b) => a.order - b.order)
    .slice(0, 5);

  // Always render for mobile, let parent handle visibility

  return (
    <nav 
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-surface border-t border-outline',
        'safe-area-pb', // For devices with home indicator
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 px-1 sm:px-2">
        {primaryItems.map((item) => {
          const isActive = state.activeItem === item.id;
          const IconComponent = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item)}
              className={cn(
                'flex flex-col items-center justify-center',
                'min-w-0 flex-1 h-full',
                'rounded-lg mx-0.5 sm:mx-1',
                'transition-all duration-fast ease-standard',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
                'active:scale-95',
                isActive
                  ? 'text-primary bg-primary-container'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              disabled={item.disabled}
            >
              <div className="relative flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 mb-1">
                <IconComponent 
                  className={cn(
                    'w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-fast',
                    isActive && 'scale-110'
                  )} 
                />
                {item.badge && (
                  <span className={cn(
                    'absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1',
                    'min-w-3 h-3 sm:min-w-4 sm:h-4 px-0.5 sm:px-1',
                    'bg-error text-on-error',
                    'text-xs font-medium rounded-full',
                    'flex items-center justify-center',
                    'animate-pulse'
                  )}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-xs font-medium truncate max-w-full',
                'transition-all duration-fast',
                isActive ? 'text-primary' : 'text-on-surface-variant'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* FAB for adding trades */}
      <button
        className={cn(
          'absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
          'w-12 h-12 sm:w-14 sm:h-14 rounded-full',
          'bg-primary text-on-primary',
          'shadow-elevation-4 hover:shadow-elevation-5',
          'transition-all duration-normal ease-standard',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
          'active:scale-95',
          'flex items-center justify-center'
        )}
        aria-label="Add new trade"
        onClick={() => {
          // This would trigger the add trade flow
          console.log('Add trade clicked');
        }}
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </nav>
  );
};
