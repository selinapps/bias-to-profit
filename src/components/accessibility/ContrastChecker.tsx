import React, { useState, useEffect } from 'react';
import { checkContrast } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  level: 'AA' | 'AAA' | 'FAIL';
  largeText: 'AA' | 'AAA' | 'FAIL';
}

export const ContrastChecker: React.FC<{
  className?: string;
}> = ({ className }) => {
  const [results, setResults] = useState<ContrastResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Define color combinations to test - Trading App Specific
  const colorCombinations = [
    { foreground: '#ffffff', background: '#000000', name: 'White on Black' },
    { foreground: '#000000', background: '#ffffff', name: 'Black on White' },
    { foreground: '#0066cc', background: '#ffffff', name: 'Blue on White' },
    { foreground: '#ffffff', background: '#0066cc', name: 'White on Blue' },
    { foreground: '#dc2626', background: '#ffffff', name: 'Red on White (Fixed)' },
    { foreground: '#ffffff', background: '#dc2626', name: 'White on Red (Fixed)' },
    { foreground: '#16a34a', background: '#000000', name: 'Green on Black' },
    { foreground: '#000000', background: '#16a34a', name: 'Black on Green' },
    { foreground: '#eab308', background: '#000000', name: 'Yellow on Black' },
    { foreground: '#000000', background: '#eab308', name: 'Black on Yellow' },
    { foreground: '#6b7280', background: '#ffffff', name: 'Gray on White (Fixed)' },
    { foreground: '#ffffff', background: '#6b7280', name: 'White on Gray (Fixed)' },
    { foreground: '#7c3aed', background: '#ffffff', name: 'Purple on White' },
    { foreground: '#ffffff', background: '#7c3aed', name: 'White on Purple' },
    { foreground: '#0e7490', background: '#ffffff', name: 'Cyan on White (Fixed)' },
    { foreground: '#ffffff', background: '#0e7490', name: 'White on Cyan (Fixed)' },
  ];

  useEffect(() => {
    const testResults = colorCombinations.map(combo => {
      const result = checkContrast(combo.foreground, combo.background);
      return {
        ...combo,
        ...result
      };
    });
    setResults(testResults);
  }, []);

  const getStatusColor = (level: 'AA' | 'AAA' | 'FAIL') => {
    switch (level) {
      case 'AAA': return 'text-success';
      case 'AA': return 'text-warning';
      case 'FAIL': return 'text-error';
    }
  };

  const getStatusIcon = (level: 'AA' | 'AAA' | 'FAIL') => {
    switch (level) {
      case 'AAA':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'AA':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'FAIL':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
    }
  };

  return (
    <div className={cn('fixed bottom-4 right-4 z-50', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-12 h-12 rounded-full',
          'bg-primary text-on-primary',
          'shadow-elevation-3 hover:shadow-elevation-4',
          'transition-all duration-fast ease-standard',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
          'flex items-center justify-center'
        )}
        aria-label="Toggle contrast checker"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 max-h-96 overflow-hidden bg-surface border border-outline rounded-xl shadow-elevation-5">
          <div className="p-4 border-b border-outline">
            <h3 className="text-lg font-semibold text-on-surface">
              WCAG Contrast Checker
            </h3>
            <p className="text-sm text-on-surface-variant">
              Testing color combinations for accessibility compliance
            </p>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            <div className="divide-y divide-outline">
              {results.map((result, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded border border-outline flex-shrink-0"
                      style={{
                        background: `linear-gradient(45deg, ${result.background} 50%, ${result.foreground} 50%)`
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-on-surface text-sm">
                        {result.name}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {result.foreground} on {result.background}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(result.level)}
                      <span className={cn('text-sm font-medium', getStatusColor(result.level))}>
                        {result.level}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-on-surface-variant">Ratio</div>
                      <div className="font-mono text-on-surface">{result.ratio}:1</div>
                    </div>
                    <div>
                      <div className="text-on-surface-variant">Large Text</div>
                      <div className={cn('font-medium', getStatusColor(result.largeText))}>
                        {result.largeText}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-outline bg-surface-container/50">
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  AAA (7:1+)
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  AA (4.5:1+)
                </div>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Fail
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
