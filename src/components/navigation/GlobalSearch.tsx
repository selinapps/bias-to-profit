import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from './NavigationProvider';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  label: string;
  path: string;
  type: 'navigation' | 'action' | 'content';
  icon?: React.ComponentType<any>;
  description?: string;
  keywords?: string[];
}

interface GlobalSearchProps {
  className?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  className
}) => {
  const { items, setActiveItem, isMobile } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Generate search results
  const searchResults: SearchResult[] = React.useMemo(() => {
    if (!query.trim()) {
      // Show recent items when no query
      return items
        .filter(item => recentSearches.includes(item.id))
        .slice(0, 5)
        .map(item => ({
          id: item.id,
          label: item.label,
          path: item.path,
          type: 'navigation' as const,
          icon: item.icon,
          description: `Navigate to ${item.label.toLowerCase()}`
        }));
    }

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Search navigation items
    items.forEach(item => {
      const labelMatch = item.label.toLowerCase().includes(queryLower);
      const pathMatch = item.path.toLowerCase().includes(queryLower);
      
      if (labelMatch || pathMatch) {
        results.push({
          id: item.id,
          label: item.label,
          path: item.path,
          type: 'navigation',
          icon: item.icon,
          description: `Navigate to ${item.label.toLowerCase()}`
        });
      }
    });

    // Add common actions
    const actions: SearchResult[] = [
      {
        id: 'add-trade',
        label: 'Add Trade',
        path: '/trades/new',
        type: 'action',
        description: 'Create a new trade entry',
        keywords: ['new', 'create', 'add', 'trade']
      },
      {
        id: 'export-data',
        label: 'Export Data',
        path: '/export',
        type: 'action',
        description: 'Export trading data to CSV',
        keywords: ['export', 'download', 'csv', 'data']
      },
      {
        id: 'view-analytics',
        label: 'View Analytics',
        path: '/analytics',
        type: 'action',
        description: 'View detailed trading analytics',
        keywords: ['analytics', 'stats', 'performance', 'charts']
      }
    ];

    actions.forEach(action => {
      const labelMatch = action.label.toLowerCase().includes(queryLower);
      const descMatch = action.description.toLowerCase().includes(queryLower);
      const keywordMatch = action.keywords?.some(keyword => 
        keyword.toLowerCase().includes(queryLower)
      );
      
      if (labelMatch || descMatch || keywordMatch) {
        results.push(action);
      }
    });

    return results.slice(0, 8); // Limit results
  }, [query, items, recentSearches]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isOpen && !isMobile) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(0);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMobile]);

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    setRecentSearches(prev => [result.id, ...prev.filter(id => id !== result.id)].slice(0, 5));
    setActiveItem(result.id);
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
    
    // Navigate to the result
    if (result.type === 'navigation' || result.type === 'action') {
      window.location.href = result.path;
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleResultSelect(searchResults[selectedIndex]);
        }
        break;
    }
  };

  // Update selected index when results change
  useEffect(() => {
    if (selectedIndex >= searchResults.length) {
      setSelectedIndex(0);
    }
  }, [searchResults.length, selectedIndex]);

  return (
    <div className={cn('relative', className)}>
      {/* Search Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-2',
          'bg-surface-container border border-outline rounded-lg',
          'text-on-surface-variant hover:text-on-surface',
          'hover:bg-surface-container-high',
          'transition-all duration-fast ease-standard',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
        )}
        aria-label="Search"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {!isMobile && (
          <span className="text-sm">Search...</span>
        )}
        {!isMobile && (
          <kbd className="text-xs bg-surface-container-high px-1.5 py-0.5 rounded">
            /
          </kbd>
        )}
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-scrim/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Search Panel */}
          <div className="relative w-full max-w-2xl mx-4 bg-surface rounded-xl shadow-elevation-5 border border-outline">
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b border-outline">
              <svg className="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search navigation, actions, and content..."
                className={cn(
                  'flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant',
                  'focus:outline-none',
                  'text-base'
                )}
                autoFocus
              />
              <button
                onClick={() => setIsOpen(false)}
                className={cn(
                  'p-1 rounded-md',
                  'text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
                  'transition-colors duration-fast ease-standard'
                )}
                aria-label="Close search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Results */}
            <div ref={resultsRef} className="max-h-96 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map((result, index) => {
                    const IconComponent = result.icon;
                    const isSelected = index === selectedIndex;
                    
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultSelect(result)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left',
                          'transition-colors duration-fast ease-standard',
                          'focus:outline-none',
                          isSelected
                            ? 'bg-primary-container text-on-primary-container'
                            : 'text-on-surface hover:bg-surface-container'
                        )}
                      >
                        <div className="flex-shrink-0">
                          {IconComponent ? (
                            <IconComponent className="w-5 h-5" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {result.label}
                          </div>
                          {result.description && (
                            <div className="text-sm text-on-surface-variant truncate">
                              {result.description}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-shrink-0">
                          <span className={cn(
                            'text-xs px-2 py-1 rounded-full',
                            result.type === 'navigation' 
                              ? 'bg-primary-container text-on-primary-container'
                              : 'bg-secondary-container text-on-secondary-container'
                          )}>
                            {result.type}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : query.trim() ? (
                <div className="py-8 text-center text-on-surface-variant">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm">No results found for "{query}"</p>
                  <p className="text-xs mt-1">Try different keywords or check your spelling</p>
                </div>
              ) : (
                <div className="py-8 text-center text-on-surface-variant">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-sm">Quick actions</p>
                  <p className="text-xs mt-1">Type to search or use keyboard shortcuts</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-outline bg-surface-container/50">
              <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-surface-container-high rounded">↑↓</kbd>
                  <span>navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-surface-container-high rounded">↵</kbd>
                  <span>select</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-surface-container-high rounded">esc</kbd>
                  <span>close</span>
                </div>
              </div>
              <div className="text-xs text-on-surface-variant">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
