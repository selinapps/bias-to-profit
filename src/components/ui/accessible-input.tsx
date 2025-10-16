import React, { forwardRef, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  [
    'flex w-full min-h-[44px] px-3 py-2',
    'bg-surface border border-outline rounded-lg',
    'text-on-surface placeholder:text-on-surface-variant',
    'transition-all duration-fast ease-standard',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-container',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium'
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

export interface AccessibleInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
  helperText?: string;
}

const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({
    className,
    type = 'text',
    size,
    variant,
    label,
    description,
    error,
    success,
    leftIcon,
    rightIcon,
    required,
    helperText,
    id,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;

    const inputVariant = hasError ? 'error' : hasSuccess ? 'success' : variant;

    return (
      <div className="w-full space-y-1">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
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

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={type}
            id={inputId}
            className={cn(
              inputVariants({ size, variant: inputVariant }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            aria-describedby={
              error
                ? `${inputId}-error`
                : success
                ? `${inputId}-success`
                : helperText
                ? `${inputId}-helper`
                : undefined
            }
            aria-invalid={hasError}
            aria-required={required}
            {...props}
          />

          {/* Right Icon */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Helper Text / Error / Success */}
        {(error || success || helperText) && (
          <div className="flex items-center gap-2 text-sm">
            {error && (
              <div
                id={`${inputId}-error`}
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
                id={`${inputId}-success`}
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
                id={`${inputId}-helper`}
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

AccessibleInput.displayName = 'AccessibleInput';

// Specialized input components
export const SearchInput = forwardRef<HTMLInputElement, Omit<AccessibleInputProps, 'leftIcon' | 'rightIcon'>>(
  ({ className, ...props }, ref) => (
    <AccessibleInput
      ref={ref}
      type="search"
      leftIcon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      className={className}
      {...props}
    />
  )
);

SearchInput.displayName = 'SearchInput';

export const PasswordInput = forwardRef<HTMLInputElement, Omit<AccessibleInputProps, 'type' | 'rightIcon'>>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <AccessibleInput
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-on-surface-variant hover:text-on-surface transition-colors duration-fast"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        }
        className={className}
        {...props}
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export const NumberInput = forwardRef<HTMLInputElement, AccessibleInputProps & {
  min?: number;
  max?: number;
  step?: number;
  currency?: string;
}>(
  ({ currency, className, ...props }, ref) => {
    const [value, setValue] = useState(props.defaultValue || '');

    return (
      <AccessibleInput
        ref={ref}
        type="number"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          props.onChange?.(e);
        }}
        leftIcon={currency && (
          <span className="text-sm font-medium text-on-surface-variant">
            {currency}
          </span>
        )}
        className={cn(currency && 'pl-12', className)}
        {...props}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';

export default AccessibleInput;
export { AccessibleInput };
