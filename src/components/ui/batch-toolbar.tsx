import React from 'react';
import { cn } from '@/lib/utils';

interface BatchToolbarProps {
  selectedCount: number;
  totalCount: number;
  actions: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'destructive';
    onClick: () => void;
    disabled?: boolean;
  }>;
  onClearSelection: () => void;
  className?: string;
}

export const BatchToolbar: React.FC<BatchToolbarProps> = ({
  selectedCount,
  totalCount,
  actions,
  onClearSelection,
  className
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-50',
      'bg-surface border-t border-outline shadow-elevation-4',
      'animate-slide-up',
      className
    )}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-on-surface">
              {selectedCount} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface rounded-sm"
            >
              Clear
            </button>
          </div>
          
          {selectedCount < totalCount && (
            <button
              onClick={() => {
                // This would select all items
                console.log('Select all');
              }}
              className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface rounded-sm"
            >
              Select all {totalCount}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                'transition-all duration-fast ease-standard',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
                action.variant === 'destructive'
                  ? 'bg-error text-on-error hover:bg-error/90 disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Hook for managing batch operations
export const useBatchOperations = <T extends { id: string }>(
  items: T[],
  initialSelected: string[] = []
) => {
  const [selectedItems, setSelectedItems] = React.useState<string[]>(initialSelected);

  const selectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    setSelectedItems(items.map(item => item.id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const isSelected = (itemId: string) => selectedItems.includes(itemId);

  const selectedData = items.filter(item => selectedItems.includes(item.id));

  return {
    selectedItems,
    selectedData,
    selectedCount: selectedItems.length,
    totalCount: items.length,
    selectItem,
    selectAll,
    clearSelection,
    isSelected,
    setSelectedItems
  };
};
