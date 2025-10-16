import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

interface AccessibleSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  multiSelect?: boolean;
  required?: boolean;
  helperText?: string;
  clearable?: boolean;
  loading?: boolean;
}

const selectVariants = cva(
  [
    'flex w-full min-h-[44px] px-3 py-2',
    'bg-surface border border-outline rounded-lg',
    'text-on-surface',
    'transition-all duration-fast ease-standard',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-container'
  ],
  {
    variants: {
      size: {
        sm: 'min-h-[40px] px-2 py-1.5 text-sm',
        md: 'min-h-[44px] px-3 py-2',
        lg: 'min-h-[48px] px-4 py-3 text-lg'
      },
      variant: {
        default: 'border-outline',
        error: 'border-error focus:ring-error',
        success: 'border-success focus:ring-success'
      }
    },
    defaultVariants: {
      size: 'md',
      variant: 'default'
    }
  }
);

const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  ({
    className,
    size,
    variant,
    label,
    description,
    error,
    success,
    options,
    placeholder = 'Select an option...',
    searchable = false,
    multiSelect = false,
    required,
    helperText,
    clearable = false,
    loading = false,
    id,
    value,
    onChange,
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const hasError = !!error;
    const hasSuccess = !!success && !hasError;
    const selectVariant = hasError ? 'error' : hasSuccess ? 'success' : variant;

    // Filter options based on search query
    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !option.disabled
    );

    // Group options
    const groupedOptions = filteredOptions.reduce((groups, option) => {
      const group = option.group || 'default';
      if (!groups[group]) groups[group] = [];
      groups[group].push(option);
      return groups;
    }, {} as Record<string, SelectOption[]>);

    // Get selected option(s)
    const selectedOptions = multiSelect
      ? options.filter(option => Array.isArray(value) && value.includes(option.value))
      : options.filter(option => option.value === value);

    const selectedValue = selectedOptions.length > 0
      ? selectedOptions.map(opt => opt.label).join(', ')
      : '';

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(0);
          } else {
            setFocusedIndex(prev => 
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setFocusedIndex(prev => 
              prev > 0 ? prev - 1 : filteredOptions.length - 1
            );
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (isOpen && focusedIndex >= 0) {
            const option = filteredOptions[focusedIndex];
            handleOptionSelect(option);
          } else if (!isOpen) {
            setIsOpen(true);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchQuery('');
          setFocusedIndex(-1);
          triggerRef.current?.focus();
          break;
        case 'Backspace':
          if (clearable && !searchQuery && selectedValue) {
            handleClear();
          }
          break;
      }
    };

    // Handle option selection
    const handleOptionSelect = (option: SelectOption) => {
      if (option.disabled) return;

      if (multiSelect) {
        const currentValues = Array.isArray(value) ? value : [];
        const newValues = currentValues.includes(option.value)
          ? currentValues.filter(v => v !== option.value)
          : [...currentValues, option.value];
        
        onChange?.({
          target: { value: newValues }
        } as React.ChangeEvent<HTMLSelectElement>);
      } else {
        onChange?.({
          target: { value: option.value }
        } as React.ChangeEvent<HTMLSelectElement>);
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        triggerRef.current?.focus();
      }
    };

    // Handle clear
    const handleClear = () => {
      onChange?.({
        target: { value: multiSelect ? [] : '' }
      } as React.ChangeEvent<HTMLSelectElement>);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (isOpen && !triggerRef.current?.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
          setFocusedIndex(-1);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchable && searchRef.current) {
        searchRef.current.focus();
      }
    }, [isOpen, searchable]);

    // Scroll focused option into view
    useEffect(() => {
      if (isOpen && focusedIndex >= 0 && listRef.current) {
        const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
        if (focusedElement) {
          focusedElement.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [isOpen, focusedIndex]);

    return (
      <div className="w-full space-y-1">
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-on-surface"
          >
            {label}
            {required && (
              <span className="text-error ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-on-surface-variant">
            {description}
          </p>
        )}

        {/* Select Container */}
        <div className="relative">
          {/* Trigger Button */}
          <button
            ref={triggerRef}
            type="button"
            className={cn(
              selectVariants({ size, variant: selectVariant }),
              'flex items-center justify-between w-full text-left',
              'hover:border-primary/50',
              isOpen && 'ring-2 ring-primary border-transparent',
              className
            )}
            onClick={() => setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-describedby={
              error
                ? `${selectId}-error`
                : success
                ? `${selectId}-success`
                : helperText
                ? `${selectId}-helper`
                : undefined
            }
            aria-invalid={hasError}
            aria-required={required}
            disabled={props.disabled || loading}
          >
            <span className={cn(
              'flex-1 truncate',
              !selectedValue && 'text-on-surface-variant'
            )}>
              {selectedValue || placeholder}
            </span>
            
            <div className="flex items-center gap-2 ml-2">
              {clearable && selectedValue && !loading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="p-1 rounded-full hover:bg-surface-container transition-colors duration-fast"
                  aria-label="Clear selection"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg 
                  className={cn(
                    'w-4 h-4 transition-transform duration-fast',
                    isOpen && 'rotate-180'
                  )} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </button>

          {/* Hidden select for form submission */}
          <select
            ref={ref}
            id={selectId}
            value={value}
            onChange={onChange}
            className="sr-only"
            tabIndex={-1}
            {...props}
          >
            {options.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-outline rounded-lg shadow-elevation-3 max-h-60 overflow-hidden">
              {/* Search Input */}
              {searchable && (
                <div className="p-2 border-b border-outline">
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search options..."
                    className="w-full px-3 py-2 bg-surface-container border border-outline rounded-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              )}

              {/* Options List */}
              <ul
                ref={listRef}
                className="max-h-48 overflow-y-auto"
                role="listbox"
                aria-multiselectable={multiSelect}
              >
                {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                  <div key={groupName}>
                    {groupName !== 'default' && (
                      <div className="px-3 py-2 text-xs font-medium text-on-surface-variant bg-surface-container">
                        {groupName}
                      </div>
                    )}
                    {groupOptions.map((option, index) => {
                      const isSelected = multiSelect
                        ? Array.isArray(value) && value.includes(option.value)
                        : value === option.value;
                      const isFocused = index === focusedIndex;

                      return (
                        <li
                          key={option.value}
                          role="option"
                          aria-selected={isSelected}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors duration-fast',
                            isSelected && 'bg-primary-container text-on-primary-container',
                            isFocused && !isSelected && 'bg-surface-container',
                            option.disabled && 'opacity-50 cursor-not-allowed'
                          )}
                          onClick={() => handleOptionSelect(option)}
                        >
                          {/* Multi-select checkbox */}
                          {multiSelect && (
                            <div className="flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleOptionSelect(option)}
                                className="w-4 h-4 text-primary bg-surface border-outline rounded focus:ring-primary focus:ring-2"
                              />
                            </div>
                          )}

                          {/* Option label */}
                          <span className="flex-1 truncate">{option.label}</span>

                          {/* Selection indicator for single select */}
                          {!multiSelect && isSelected && (
                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </li>
                      );
                    })}
                  </div>
                ))}

                {/* No results */}
                {filteredOptions.length === 0 && (
                  <li className="px-3 py-4 text-center text-on-surface-variant">
                    {searchQuery ? 'No options found' : 'No options available'}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Helper Text / Error / Success */}
        {(error || success || helperText) && (
          <div className="flex items-center gap-2 text-sm">
            {error && (
              <div
                id={`${selectId}-error`}
                className="flex items-center gap-1 text-error"
                role="alert"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
            
            {success && !error && (
              <div
                id={`${selectId}-success`}
                className="flex items-center gap-1 text-success"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
            )}
            
            {helperText && !error && !success && (
              <div
                id={`${selectId}-helper`}
                className="text-on-surface-variant"
              >
                {helperText}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

AccessibleSelect.displayName = 'AccessibleSelect';

export default AccessibleSelect;
