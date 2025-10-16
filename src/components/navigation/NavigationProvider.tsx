import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: string | number;
  disabled?: boolean;
  order: number;
  section?: 'primary' | 'secondary' | 'tertiary';
}

export interface NavigationState {
  activeItem: string;
  isCollapsed: boolean;
  density: 'comfortable' | 'compact';
  recentItems: string[];
  pinnedItems: string[];
}

interface NavigationContextType {
  state: NavigationState;
  items: NavigationItem[];
  setActiveItem: (itemId: string) => void;
  toggleCollapse: () => void;
  setDensity: (density: 'comfortable' | 'compact') => void;
  addRecentItem: (itemId: string) => void;
  togglePinnedItem: (itemId: string) => void;
  isMobile: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: React.ReactNode;
  isMobile: boolean;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ 
  children, 
  isMobile 
}) => {
  const location = useLocation();
  
  // Define navigation items based on trading app structure
  const [items] = useState<NavigationItem[]>([
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14H8V5z" />
        </svg>
      ),
      path: '/',
      order: 1,
      section: 'primary'
    },
    {
      id: 'trades',
      label: 'Trades',
      icon: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      path: '/trades',
      order: 2,
      section: 'primary'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      path: '/analytics',
      order: 3,
      section: 'primary'
    },
    {
      id: 'challenges',
      label: 'Challenges',
      icon: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      path: '/challenges',
      order: 4,
      section: 'primary'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      path: '/settings',
      order: 5,
      section: 'secondary'
    },
    {
      id: 'help',
      label: 'Help',
      icon: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      path: '/help',
      order: 6,
      section: 'secondary'
    }
  ]);

  const [state, setState] = useState<NavigationState>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('navigation-state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to default
      }
    }
    
    return {
      activeItem: 'dashboard',
      isCollapsed: false,
      density: 'comfortable',
      recentItems: [],
      pinnedItems: ['dashboard', 'trades']
    };
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('navigation-state', JSON.stringify(state));
  }, [state]);

  // Auto-detect active item based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const matchingItem = items.find(item => 
      item.path === currentPath || 
      (item.path !== '/' && currentPath.startsWith(item.path))
    );
    
    if (matchingItem && matchingItem.id !== state.activeItem) {
      setActiveItem(matchingItem.id);
    }
  }, [location.pathname, items, state.activeItem]);

  const setActiveItem = (itemId: string) => {
    setState(prev => ({
      ...prev,
      activeItem: itemId
    }));
    addRecentItem(itemId);
  };

  const toggleCollapse = () => {
    setState(prev => ({
      ...prev,
      isCollapsed: !prev.isCollapsed
    }));
  };

  const setDensity = (density: 'comfortable' | 'compact') => {
    setState(prev => ({
      ...prev,
      density
    }));
  };

  const addRecentItem = (itemId: string) => {
    setState(prev => ({
      ...prev,
      recentItems: [itemId, ...prev.recentItems.filter(id => id !== itemId)].slice(0, 5)
    }));
  };

  const togglePinnedItem = (itemId: string) => {
    setState(prev => ({
      ...prev,
      pinnedItems: prev.pinnedItems.includes(itemId)
        ? prev.pinnedItems.filter(id => id !== itemId)
        : [...prev.pinnedItems, itemId]
    }));
  };

  const contextValue: NavigationContextType = {
    state,
    items,
    setActiveItem,
    toggleCollapse,
    setDensity,
    addRecentItem,
    togglePinnedItem,
    isMobile
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};
