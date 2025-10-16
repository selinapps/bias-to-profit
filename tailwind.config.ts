import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // 2025 Design System - Material 3 Inspired
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-variant": "var(--color-surface-variant)",
        "surface-container": "var(--color-surface-container)",
        "surface-container-high": "var(--color-surface-container-high)",
        "surface-container-highest": "var(--color-surface-container-highest)",
        
        "on-background": "var(--color-on-background)",
        "on-surface": "var(--color-on-surface)",
        "on-surface-variant": "var(--color-on-surface-variant)",
        
        primary: {
          DEFAULT: "var(--color-primary)",
          on: "var(--color-on-primary)",
          container: "var(--color-primary-container)",
          "on-container": "var(--color-on-primary-container)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          on: "var(--color-on-secondary)",
          container: "var(--color-secondary-container)",
          "on-container": "var(--color-on-secondary-container)",
        },
        tertiary: {
          DEFAULT: "var(--color-tertiary)",
          on: "var(--color-on-tertiary)",
          container: "var(--color-tertiary-container)",
          "on-container": "var(--color-on-tertiary-container)",
        },
        
        error: {
          DEFAULT: "var(--color-error)",
          on: "var(--color-on-error)",
          container: "var(--color-error-container)",
          "on-container": "var(--color-on-error-container)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          on: "var(--color-on-warning)",
          container: "var(--color-warning-container)",
          "on-container": "var(--color-on-warning-container)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          on: "var(--color-on-success)",
          container: "var(--color-success-container)",
          "on-container": "var(--color-on-success-container)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          on: "var(--color-on-info)",
          container: "var(--color-info-container)",
          "on-container": "var(--color-on-info-container)",
        },
        
        outline: "var(--color-outline)",
        "outline-variant": "var(--color-outline-variant)",
        shadow: "var(--color-shadow)",
        scrim: "var(--color-scrim)",
        
        "inverse-surface": "var(--color-inverse-surface)",
        "inverse-on-surface": "var(--color-inverse-on-surface)",
        "inverse-primary": "var(--color-inverse-primary)",
        
        // Legacy compatibility - will be removed
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        trading: {
          bg: "hsl(var(--trading-bg))",
          card: "hsl(var(--trading-card))",
          border: "hsl(var(--trading-border))",
          accent: "hsl(var(--trading-accent))",
          muted: "hsl(var(--trading-muted))",
          success: "hsl(var(--trading-success))",
          danger: "hsl(var(--trading-danger))",
          warning: "hsl(var(--trading-warning))",
        },
      },
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)',
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
        '4xl': 'var(--spacing-4xl)',
      },
      borderRadius: {
        'none': 'var(--radius-none)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        'full': 'var(--radius-full)',
      },
      boxShadow: {
        'elevation-0': 'var(--elevation-level-0)',
        'elevation-1': 'var(--elevation-level-1)',
        'elevation-2': 'var(--elevation-level-2)',
        'elevation-3': 'var(--elevation-level-3)',
        'elevation-4': 'var(--elevation-level-4)',
        'elevation-5': 'var(--elevation-level-5)',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
        'sm': 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
        'base': 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',
        'lg': 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',
        'xl': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
        '2xl': 'clamp(1.5rem, 1.3rem + 1vw, 1.875rem)',
        '3xl': 'clamp(1.875rem, 1.6rem + 1.375vw, 2.25rem)',
        '4xl': 'clamp(2.25rem, 1.9rem + 1.75vw, 3rem)',
        '5xl': 'clamp(3rem, 2.5rem + 2.5vw, 3.75rem)',
      },
      lineHeight: {
        'tight': '1.25',
        'snug': '1.375',
        'normal': '1.5',
        'relaxed': '1.625',
        'loose': '2',
      },
      transitionDuration: {
        'fast': 'var(--motion-duration-fast)',
        'normal': 'var(--motion-duration-normal)',
        'slow': 'var(--motion-duration-slow)',
      },
      transitionTimingFunction: {
        'standard': 'var(--motion-easing-standard)',
        'decelerate': 'var(--motion-easing-decelerate)',
        'accelerate': 'var(--motion-easing-accelerate)',
      },
      screens: {
        'mobile': '600px',
        'tablet': '904px',
        'desktop': '1240px',
        'wide': '1440px',
      },
      zIndex: {
        'hide': '-1',
        'auto': 'auto',
        'base': '0',
        'docked': '10',
        'dropdown': '1000',
        'sticky': '1100',
        'banner': '1200',
        'overlay': '1300',
        'modal': '1400',
        'popover': '1500',
        'skip-link': '1600',
        'toast': '1700',
        'tooltip': '1800',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-10px)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.95)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in var(--motion-duration-normal) var(--motion-easing-standard)",
        "fade-out": "fade-out var(--motion-duration-normal) var(--motion-easing-standard)",
        "scale-in": "scale-in var(--motion-duration-normal) var(--motion-easing-standard)",
        "scale-out": "scale-out var(--motion-duration-normal) var(--motion-easing-standard)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
