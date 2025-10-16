import React, { useState } from 'react';
import { useNavigation } from './NavigationProvider';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DesktopSidebarProps {
  className?: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  className
}) => {
  const { state, items, setActiveItem, toggleCollapse, setDensity, togglePinnedItem, isMobile } = useNavigation();
  const [showRecentItems, setShowRecentItems] = useState(false);
  const navigate = useNavigate();

  const handleNavigation = (item: any) => {
    setActiveItem(item.id);
    navigate(item.path);
  };

  if (isMobile) return null;

  const primaryItems = items.filter(item => item.section === 'primary');
  const secondaryItems = items.filter(item => item.section === 'secondary');
  const recentItems = items.filter(item => state.recentItems.includes(item.id));
  const pinnedItems = items.filter(item => state.pinnedItems.includes(item.id));

  return (
    <aside 
      className={cn(
        'fixed left-0 top-0 h-full z-40 flex-shrink-0',
        'bg-surface border-r border-outline',
        'transition-all duration-normal ease-standard',
        state.isCollapsed ? 'w-16' : 'w-64',
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-outline">
        {!state.isCollapsed && (
          <h2 className="text-lg font-semibold text-on-surface">
            Trading Journal
          </h2>
        )}
        <button
          onClick={toggleCollapse}
          className={cn(
            'p-2 rounded-lg',
            'text-on-surface-variant hover:text-on-surface',
            'hover:bg-surface-container',
            'transition-colors duration-fast ease-standard',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface'
          )}
          aria-label={state.isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d={state.isCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} 
            />
          </svg>
        </button>
      </div>

      {/* Search */}
      {!state.isCollapsed && (
        <div className="p-4 border-b border-outline">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className={cn(
                'w-full h-10 px-3 pr-10',
                'bg-surface-container border border-outline rounded-lg',
                'text-on-surface placeholder:text-on-surface-variant',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'transition-all duration-fast ease-standard'
              )}
              onKeyDown={(e) => {
                if (e.key === '/') {
                  e.preventDefault();
                  e.currentTarget.focus();
                }
              }}
            />
            <svg 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto">
        {/* Primary Navigation */}
        <div className="p-2">
          {!state.isCollapsed && (
            <div className="px-3 py-2 text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              Main
            </div>
          )}
          <div className="space-y-1">
            {primaryItems.map((item) => {
              const isActive = state.activeItem === item.id;
              const IconComponent = item.icon;
              const isPinned = state.pinnedItems.includes(item.id);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                    'text-left transition-all duration-fast ease-standard',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
                    'group',
                    isActive
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  disabled={item.disabled}
                >
                  <div className="relative flex-shrink-0">
                    <IconComponent className="w-5 h-5" />
                    {item.badge && (
                      <span className={cn(
                        'absolute -top-1 -right-1',
                        'min-w-4 h-4 px-1',
                        'bg-error text-on-error',
                        'text-xs font-medium rounded-full',
                        'flex items-center justify-center'
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  
                  {!state.isCollapsed && (
                    <>
                      <span className="flex-1 truncate font-medium">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {isPinned && (
                          <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 4v12l-4-2-4 2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2z" />
                          </svg>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinnedItem(item.id);
                          }}
                          className={cn(
                            'opacity-0 group-hover:opacity-100',
                            'p-1 rounded transition-opacity duration-fast',
                            'hover:bg-surface-container-high',
                            'focus:outline-none focus:ring-2 focus:ring-primary'
                          )}
                          aria-label={isPinned ? 'Unpin' : 'Pin'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d={isPinned ? "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" : "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"} 
                            />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Items */}
        {!state.isCollapsed && recentItems.length > 0 && (
          <div className="p-2 border-t border-outline">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
                Recent
              </div>
              <button
                onClick={() => setShowRecentItems(!showRecentItems)}
                className="text-xs text-primary hover:underline"
              >
                {showRecentItems ? 'Hide' : 'Show all'}
              </button>
            </div>
            {showRecentItems && (
              <div className="space-y-1">
                {recentItems.map((item) => {
                  const isActive = state.activeItem === item.id;
                  const IconComponent = item.icon;
                  
                  return (
                    <button
                      key={`recent-${item.id}`}
                      onClick={() => handleNavigation(item)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                        'text-left transition-all duration-fast ease-standard',
                        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
                        isActive
                          ? 'bg-primary-container text-on-primary-container'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <IconComponent className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1 truncate text-sm">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Secondary Navigation */}
        <div className="p-2 border-t border-outline">
          {!state.isCollapsed && (
            <div className="px-3 py-2 text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              Settings
            </div>
          )}
          <div className="space-y-1">
            {secondaryItems.map((item) => {
              const isActive = state.activeItem === item.id;
              const IconComponent = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                    'text-left transition-all duration-fast ease-standard',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
                    isActive
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  disabled={item.disabled}
                >
                  <IconComponent className="w-5 h-5 flex-shrink-0" />
                  {!state.isCollapsed && (
                    <span className="flex-1 truncate font-medium">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-outline">
        {!state.isCollapsed && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-on-surface">
              Density
            </span>
            <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1">
              <button
                onClick={() => setDensity('comfortable')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  state.density === 'comfortable'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                Comfortable
              </button>
              <button
                onClick={() => setDensity('compact')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  state.density === 'compact'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                Compact
              </button>
            </div>
          </div>
        )}
        
        {/* Keyboard shortcuts help */}
        {!state.isCollapsed && (
          <button
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
              'text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
              'transition-all duration-fast ease-standard',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface'
            )}
            onClick={() => {
              // This would show keyboard shortcuts modal
              console.log('Show keyboard shortcuts');
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="flex-1 truncate text-sm">
              Keyboard shortcuts
            </span>
            <kbd className="text-xs bg-surface-container-high px-2 py-1 rounded">
              ?
            </kbd>
          </button>
        )}
      </div>
    </aside>
  );
};
