import React from 'react';
import { cn } from '@/lib/utils';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  href,
  children,
  className
}) => (
  <a
    href={href}
    className={cn(
      'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4',
      'z-skip-link px-4 py-2',
      'bg-primary text-on-primary',
      'rounded-lg shadow-elevation-3',
      'transition-all duration-fast ease-standard',
      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
      className
    )}
  >
    {children}
  </a>
);

export const SkipLinks: React.FC = () => (
  <div className="skip-links">
    <SkipLink href="#main-content">
      Skip to main content
    </SkipLink>
    <SkipLink href="#navigation">
      Skip to navigation
    </SkipLink>
    <SkipLink href="#search">
      Skip to search
    </SkipLink>
  </div>
);
