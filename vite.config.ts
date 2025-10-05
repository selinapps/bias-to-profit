import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Set base path for GitHub Pages deployment
  base: '/bias-to-profit/',
  // Force fresh build timestamp
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __DEPLOY_TIME__: JSON.stringify(Date.now()),
    __OVERRIDE_DEPLOY__: JSON.stringify("TRADING_JOURNAL_" + Date.now())
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      port: 8080,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "lodash/_root.js": path.resolve(__dirname, "./src/shims/lodashRoot.js"),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: mode === 'development',
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Use consistent hashing for stable filenames
        entryFileNames: `assets/v2-[name]-[hash].js`,
        chunkFileNames: `assets/v2-[name]-[hash].js`,
        assetFileNames: `assets/v2-[name]-[hash].[ext]`,
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          charts: ['recharts'],
          utils: ['date-fns', 'clsx', 'tailwind-merge']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // Force fresh build by clearing output directory
    emptyOutDir: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      'date-fns',
      'lucide-react'
    ]
  }
}));
