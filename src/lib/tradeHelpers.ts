/**
 * Helper functions for trade data manipulation
 */

/**
 * Get the setup name from a trade
 * Setup names are stored in locations[0], with fallback to notes or model field
 */
export function getTradeSetupName(trade: any): string {
  // Priority 1: locations array (where actual setup name is stored)
  if (Array.isArray(trade.locations) && trade.locations.length > 0) {
    return String(trade.locations[0]);
  }
  
  // Priority 2: notes field
  if (trade.notes && typeof trade.notes === 'string') {
    return trade.notes;
  }
  
  // Priority 3: model field (legacy, but kept for backwards compatibility)
  if (trade.model) {
    return trade.model;
  }
  
  return 'Unknown';
}

/**
 * Format setup name for display (replace underscores with spaces, capitalize)
 */
export function formatSetupName(setupName: string): string {
  if (!setupName || setupName === 'Unknown') return setupName;
  
  return setupName
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

