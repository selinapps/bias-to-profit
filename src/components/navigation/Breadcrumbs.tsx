import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigation } from './NavigationProvider';
import { cn } from '@/lib/utils';

interface BreadcrumbsProps {
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  className
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, isMobile } = useNavigation();

  if (isMobile) return null;

  // Generate breadcrumb trail based on current path
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Always start with Home/Dashboard
    breadcrumbs.push({
      label: 'Dashboard',
      path: '/',
      isLast: pathSegments.length === 0
    });

    // Build breadcrumb trail
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      
      // Find matching navigation item
      const navItem = items.find(item => item.path === currentPath);
      
      if (navItem) {
        breadcrumbs.push({
          label: navItem.label,
          path: currentPath,
          isLast
        });
      } else {
        // For unknown paths, create a breadcrumb from the segment
        breadcrumbs.push({
          label: segment.charAt(0).toUpperCase() + segment.slice(1),
          path: currentPath,
          isLast
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav 
      className={cn(
        'flex items-center space-x-1 md:space-x-2 text-xs md:text-sm',
        'ml-3 md:ml-4 mt-3 md:mt-4 overflow-x-auto',
        className
      )}
      aria-label="Breadcrumb navigation"
    >
      <ol className="flex items-center space-x-1 md:space-x-2">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.path} className="flex items-center flex-shrink-0">
            {index > 0 && (
              <svg 
                className="w-3 h-3 md:w-4 md:h-4 text-on-surface-variant mx-1 md:mx-2 flex-shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            
            {breadcrumb.isLast ? (
              <span 
                className="text-on-surface font-medium truncate max-w-32 md:max-w-none"
                aria-current="page"
              >
                {breadcrumb.label}
              </span>
            ) : (
              <button
                onClick={() => navigate(breadcrumb.path)}
                className={cn(
                  'text-on-surface-variant hover:text-primary',
                  'transition-colors duration-fast ease-standard',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-sm',
                  'truncate max-w-24 md:max-w-none'
                )}
              >
                {breadcrumb.label}
              </button>
            )}
          </li>
        ))}
      </ol>
      
      {/* Back button for mobile-like behavior */}
      <button
        onClick={() => navigate(-1)}
        className={cn(
          'ml-3 md:ml-4 p-1 rounded-md flex-shrink-0',
          'text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
          'transition-colors duration-fast ease-standard',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
        )}
        aria-label="Go back"
      >
        <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </nav>
  );
};
