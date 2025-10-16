import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  [
    'relative overflow-hidden',
    'bg-surface border border-outline rounded-xl',
    'transition-all duration-normal ease-standard',
    'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background'
  ],
  {
    variants: {
      variant: {
        default: 'shadow-elevation-1 hover:shadow-elevation-2',
        elevated: 'shadow-elevation-2 hover:shadow-elevation-3',
        outlined: 'shadow-none border-2',
        filled: 'bg-surface-container border-surface-container',
        tonal: 'bg-primary-container/50 border-primary-container/50'
      },
      interactive: {
        true: [
          'cursor-pointer',
          'hover:scale-[1.01] active:scale-[0.99]',
          'hover:shadow-elevation-3 active:shadow-elevation-1',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
        ],
        false: ''
      },
      selected: {
        true: [
          'ring-2 ring-primary ring-offset-2 ring-offset-background',
          'bg-primary-container/10'
        ],
        false: ''
      },
      disabled: {
        true: [
          'opacity-50 cursor-not-allowed',
          'hover:scale-100 hover:shadow-elevation-1',
          'active:scale-100'
        ],
        false: ''
      },
      size: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6'
      }
    },
    defaultVariants: {
      variant: 'default',
      interactive: false,
      selected: false,
      disabled: false,
      size: 'md'
    }
  }
);

export interface ModernCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const ModernCard = forwardRef<HTMLDivElement, ModernCardProps>(
  ({ className, variant, interactive, selected, disabled, size, asChild = false, ...props }, ref) => {
    const Component = asChild ? 'div' : 'div';
    
    return (
      <Component
        className={cn(cardVariants({ variant, interactive, selected, disabled, size, className }))}
        ref={ref}
        tabIndex={interactive && !disabled ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        aria-disabled={disabled}
        {...props}
      />
    );
  }
);
ModernCard.displayName = 'ModernCard';

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 mb-4', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        'text-on-surface',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-on-surface-variant', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between pt-4 mt-4 border-t border-outline', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

// Specialized card components for common patterns
const ActionCard = forwardRef<HTMLDivElement, ModernCardProps & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}>(
  ({ title, description, icon, action, className, ...props }, ref) => (
    <ModernCard
      ref={ref}
      className={cn('group', className)}
      interactive
      {...props}
    >
      <CardContent className="flex items-start gap-4">
        {icon && (
          <div className="flex-shrink-0 p-2 rounded-lg bg-primary-container/20 text-primary">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <CardTitle className="text-base mb-1 group-hover:text-primary transition-colors duration-fast">
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className="text-sm">
              {description}
            </CardDescription>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
            {action}
          </div>
        )}
      </CardContent>
    </ModernCard>
  )
);
ActionCard.displayName = 'ActionCard';

const StatCard = forwardRef<HTMLDivElement, ModernCardProps & {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
}>(
  ({ title, value, change, icon, className, ...props }, ref) => (
    <ModernCard
      ref={ref}
      className={cn('relative min-h-[120px]', className)}
      {...props}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-xs md:text-sm font-medium text-on-surface-variant truncate">
            {title}
          </CardTitle>
          {icon && (
            <div className="text-on-surface-variant flex-shrink-0 ml-2">
              {icon}
            </div>
          )}
        </div>
        
        <div className="text-xl md:text-2xl font-bold text-on-surface mb-1 truncate">
          {value}
        </div>
        
        {change && (
          <div className={cn(
            'flex items-center gap-1 text-xs md:text-sm font-medium',
            change.type === 'increase' && 'text-success',
            change.type === 'decrease' && 'text-error',
            change.type === 'neutral' && 'text-on-surface-variant'
          )}>
            <svg 
              className={cn(
                'w-3 h-3 md:w-4 md:h-4 flex-shrink-0',
                change.type === 'decrease' && 'rotate-180'
              )}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="truncate">{Math.abs(change.value)}%</span>
          </div>
        )}
      </CardContent>
    </ModernCard>
  )
);
StatCard.displayName = 'StatCard';

const ListCard = forwardRef<HTMLDivElement, ModernCardProps & {
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    selected?: boolean;
    onClick?: () => void;
  }>;
  onItemSelect?: (itemId: string) => void;
  selectable?: boolean;
  selectedItems?: string[];
}>(
  ({ items, onItemSelect, selectable = false, selectedItems = [], className, ...props }, ref) => (
    <ModernCard
      ref={ref}
      className={cn('p-0', className)}
      {...props}
    >
      <div className="divide-y divide-outline">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => {
              item.onClick?.();
              onItemSelect?.(item.id);
            }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 text-left',
              'hover:bg-surface-container transition-colors duration-fast',
              'focus:outline-none focus:bg-surface-container',
              'first:rounded-t-xl last:rounded-b-xl',
              selectable && selectedItems.includes(item.id) && 'bg-primary-container/20'
            )}
          >
            {selectable && (
              <input
                type="checkbox"
                checked={selectedItems.includes(item.id)}
                onChange={() => onItemSelect?.(item.id)}
                className="w-4 h-4 text-primary bg-surface border-outline rounded focus:ring-primary focus:ring-2"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            
            {item.icon && (
              <div className="flex-shrink-0 text-on-surface-variant">
                {item.icon}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-on-surface truncate">
                {item.title}
              </div>
              {item.subtitle && (
                <div className="text-sm text-on-surface-variant truncate">
                  {item.subtitle}
                </div>
              )}
            </div>
            
            {item.action && (
              <div className="flex-shrink-0">
                {item.action}
              </div>
            )}
          </button>
        ))}
      </div>
    </ModernCard>
  )
);
ListCard.displayName = 'ListCard';

export {
  ModernCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  ActionCard,
  StatCard,
  ListCard
};
