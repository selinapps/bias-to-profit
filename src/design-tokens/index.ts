import tokens from './tokens.json';
import themes from './themes.json';

export interface DesignTokens {
  color: typeof tokens.color;
  spacing: typeof tokens.spacing;
  radius: typeof tokens.radius;
  elevation: typeof tokens.elevation;
  typography: typeof tokens.typography;
  motion: typeof tokens.motion;
  breakpoints: typeof tokens.breakpoints;
  zIndex: typeof tokens.zIndex;
}

export interface Theme {
  color: Record<string, string>;
  elevation: Record<string, string>;
}

export interface ThemeCollection {
  light: Theme;
  dark: Theme;
  highContrast: Theme;
}

export const designTokens: DesignTokens = tokens;
export const themeCollection: ThemeCollection = themes;

// Helper function to get CSS custom property names
export const getCSSVarName = (path: string): string => {
  return `--${path.replace(/\./g, '-')}`;
};

// Helper function to get CSS custom property value
export const getCSSVarValue = (path: string, theme: keyof ThemeCollection = 'light'): string => {
  const pathParts = path.split('.');
  let value: any = themeCollection[theme];
  
  for (const part of pathParts) {
    value = value[part];
    if (value === undefined) {
      console.warn(`Theme path "${path}" not found in ${theme} theme`);
      return '';
    }
  }
  
  return value;
};

// Generate CSS custom properties for a theme
export const generateThemeCSS = (theme: keyof ThemeCollection): string => {
  const themeData = themeCollection[theme];
  const cssVars: string[] = [];
  
  const processObject = (obj: any, prefix = ''): void => {
    Object.entries(obj).forEach(([key, value]) => {
      const varName = getCSSVarName(`${prefix}${key}`);
      
      if (typeof value === 'object' && value !== null) {
        processObject(value, `${prefix}${key}.`);
      } else {
        cssVars.push(`${varName}: ${value};`);
      }
    });
  };
  
  processObject(themeData);
  
  return cssVars.join('\n  ');
};

// Check contrast ratio between two colors
export const getContrastRatio = (color1: string, color2: string): number => {
  // This is a simplified implementation
  // In production, use a proper color contrast library
  const getLuminance = (color: string): number => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const sRGB = [r, g, b].map(c => 
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

// Validate WCAG contrast requirements
export const validateWCAGContrast = (
  foreground: string, 
  background: string, 
  level: 'AA' | 'AAA' = 'AA'
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = level === 'AA' ? 4.5 : 7;
  return ratio >= requiredRatio;
};

// Get responsive breakpoint values
export const getBreakpoint = (size: keyof typeof tokens.breakpoints): string => {
  return tokens.breakpoints[size];
};

// Get spacing value
export const getSpacing = (size: keyof typeof tokens.spacing): string => {
  return tokens.spacing[size];
};

// Get radius value
export const getRadius = (size: keyof typeof tokens.radius): string => {
  return tokens.radius[size];
};

// Get elevation value
export const getElevation = (level: keyof typeof tokens.elevation): string => {
  return tokens.elevation[level];
};

// Get motion duration
export const getMotionDuration = (speed: keyof typeof tokens.motion.duration): string => {
  return tokens.motion.duration[speed];
};

// Get motion easing
export const getMotionEasing = (type: keyof typeof tokens.motion.easing): string => {
  return tokens.motion.easing[type];
};

export default designTokens;
