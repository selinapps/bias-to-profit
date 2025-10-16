#!/usr/bin/env node

/**
 * Script to fix all console logs across the codebase
 * Replaces console.log, console.error, console.warn with proper logger calls
 */

import fs from 'fs';
import path from 'path';

// Files to fix
const filesToFix = [
  'src/hooks/useTradesOptimized.tsx',
  'src/hooks/useTrades.tsx',
  'src/hooks/useChallenge.tsx',
  'src/hooks/useTradingStats.tsx',
  'src/hooks/useTradingAnalytics.tsx',
  'src/components/AddTradeBottomSheet.tsx',
  'src/components/ManageTradeSheet.tsx',
  'src/components/SettingsModal.tsx',
  'src/components/TradingDebugPanel.tsx',
  'src/hooks/useTradesPerformance.tsx'
];

// Console log patterns to replace
const replacements = [
  {
    pattern: /console\.error\('([^']+)',\s*([^)]+)\)/g,
    replacement: "logger.error('$1', $2)"
  },
  {
    pattern: /console\.error\('([^']+)'\)/g,
    replacement: "logger.error('$1')"
  },
  {
    pattern: /console\.warn\('([^']+)',\s*([^)]+)\)/g,
    replacement: "logger.warn('$1', $2)"
  },
  {
    pattern: /console\.warn\('([^']+)'\)/g,
    replacement: "logger.warn('$1')"
  },
  {
    pattern: /console\.log\('([^']+)',\s*([^)]+)\)/g,
    replacement: "logger.debug('$1', $2)"
  },
  {
    pattern: /console\.log\('([^']+)'\)/g,
    replacement: "logger.debug('$1')"
  },
  {
    pattern: /console\.log\(([^)]+)\)/g,
    replacement: "logger.debug($1)"
  }
];

// Import patterns to add
const importPatterns = [
  {
    pattern: /import.*from.*['"]@\/lib\/logger['"];?/,
    test: (content) => content.includes("from '@/lib/logger'")
  }
];

function addLoggerImport(content) {
  if (content.includes("from '@/lib/logger'")) {
    return content; // Already has logger import
  }

  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') && lines[i].includes('from ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, "import { logger } from '@/lib/logger';");
    return lines.join('\n');
  }

  return content;
}

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Apply replacements
  replacements.forEach(({ pattern, replacement }) => {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });

  // Add logger import if needed
  if (content.includes('logger.') && !content.includes("from '@/lib/logger'")) {
    content = addLoggerImport(content);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
    return false;
  }
}

// Main execution
console.log('🔧 Fixing console logs across codebase...\n');

let fixedCount = 0;
filesToFix.forEach(filePath => {
  if (fixFile(filePath)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files`);
console.log('🎉 Console logs have been cleaned up!');
