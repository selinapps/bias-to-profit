/**
 * cTrader CSV Import Utilities
 * 
 * Parses CSV files exported from cTrader and maps them to our trade structure.
 * 
 * Expected cTrader CSV columns:
 * - Trade ID
 * - Symbol (e.g., EURUSD, GBPUSD)
 * - Direction (Buy/Sell or Long/Short)
 * - Volume (Lot size)
 * - Entry Price
 * - Exit Price (optional if trade still open)
 * - Entry Time
 * - Exit Time (optional if trade still open)
 * - Gross Profit (optional)
 * - Commission (optional)
 * - Swap (optional)
 * - Net Profit (optional)
 * - Stop Loss (optional)
 * - Take Profit (optional)
 */

export interface CTraderTrade {
  tradeId: string;
  symbol: string;
  direction: 'long' | 'short';
  volume: number;
  entryPrice: number;
  exitPrice?: number;
  entryTime: string;
  exitTime?: string;
  grossProfit?: number;
  commission?: number;
  swap?: number;
  netProfit?: number;
  stopLoss: number;
  takeProfit?: number;
  durationMinutes?: number;
  riskAmount?: number; // User-configured risk amount
}

interface CSVRow {
  [key: string]: string;
}

/**
 * Parse cTrader CSV and extract trades
 */
export function parseCTraderCSV(csvText: string): CTraderTrade[] {
  const lines = csvText.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const normalizedHeaders = headers.map(h => normalizeHeader(h));

  // Debug: Log headers for troubleshooting
  console.log('===== CSV IMPORT DEBUG =====');
  console.log('CSV Headers found:', headers);
  console.log('Normalized headers:', normalizedHeaders);
  console.log('Header mapping:');
  headers.forEach((h, i) => {
    console.log(`  "${h}" -> "${normalizedHeaders[i]}"`);
  });

  // Parse data rows
  const trades: CTraderTrade[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line);
      const row: CSVRow = {};
      
      normalizedHeaders.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      console.log(`\n----- Row ${i} -----`);
      console.log('Raw values:', values);
      console.log('Mapped row:', JSON.stringify(row, null, 2));

      const trade = mapRowToTrade(row, i);
      if (trade) {
        trades.push(trade);
      } else {
        console.warn(`Row ${i} did not map to a valid trade`);
      }
    } catch (error) {
      console.warn(`Failed to parse line ${i + 1}:`, error);
    }
  }

  console.log(`Total trades parsed: ${trades.length}`);
  return trades;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Normalize header names to handle variations
 */
function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().trim().replace(/[_\s]+/g, '');
  
  // Map common variations to standard names
  const headerMap: { [key: string]: string } = {
    // Trade ID variations
    'tradeid': 'tradeid',
    'positionid': 'tradeid',
    'dealid': 'tradeid',
    'deal': 'tradeid',
    'deals': 'tradeid',
    'position': 'tradeid',
    'id': 'tradeid',
    'ticket': 'tradeid',
    'order': 'tradeid',
    'orderno': 'tradeid',
    
    // Symbol variations
    'symbol': 'symbol',
    'instrument': 'symbol',
    'pair': 'symbol',
    'asset': 'symbol',
    
    // Direction variations
    'direction': 'direction',
    'side': 'direction',
    'type': 'direction',
    'action': 'direction',
    'tradetype': 'direction',
    'openingdir': 'direction',
    'openingdirection': 'direction',
    'dir': 'direction',
    
    // Volume variations
    'volume': 'volume',
    'lotsize': 'volume',
    'lots': 'volume',
    'size': 'volume',
    'quantity': 'volume',
    'amount': 'volume',
    'closingquar': 'volume',
    'closingquantity': 'volume',
    'quar': 'volume',
    
    // Entry price variations
    'entryprice': 'entryprice',
    'openprice': 'entryprice',
    'open': 'entryprice',
    'price': 'entryprice',
    'buyprice': 'entryprice',
    'sellprice': 'entryprice',
    'openingprice': 'entryprice',
    
    // Exit price variations
    'exitprice': 'exitprice',
    'closeprice': 'exitprice',
    'close': 'exitprice',
    'closingprice': 'exitprice',
    
    // Entry time variations
    'entrytime': 'entrytime',
    'opentime': 'entrytime',
    'opendate': 'entrytime',
    'created': 'entrytime',
    'createdtime': 'entrytime',
    'datetime': 'entrytime',
    'time': 'entrytime',
    'date': 'entrytime',
    
    // Exit time variations
    'exittime': 'exittime',
    'closetime': 'exittime',
    'closedate': 'exittime',
    'closed': 'exittime',
    'closingtime': 'exittime',
    
    // Profit variations
    'grossprofit': 'grossprofit',
    'profit': 'grossprofit',
    'pl': 'grossprofit',
    
    // Commission variations
    'commission': 'commission',
    'fee': 'commission',
    'fees': 'commission',
    
    // Swap variations
    'swap': 'swap',
    'swapfee': 'swap',
    'overnight': 'swap',
    
    // Net profit variations
    'netprofit': 'netprofit',
    'netpl': 'netprofit',
    'pnl': 'netprofit',
    'totalprofit': 'netprofit',
    'net': 'netprofit',
    'netusd': 'netprofit',
    'profitusd': 'netprofit',
    
    // Stop loss variations
    'stoploss': 'stoploss',
    'sl': 'stoploss',
    'stop': 'stoploss',
    
    // Take profit variations
    'takeprofit': 'takeprofit',
    'tp': 'takeprofit',
    'target': 'takeprofit',
    
    // Duration
    'duration': 'duration',
  };

  return headerMap[normalized] || normalized;
}

/**
 * Map CSV row to CTraderTrade object
 */
function mapRowToTrade(row: CSVRow, rowIndex: number): CTraderTrade | null {
  try {
    // Required fields
    let tradeId = row['tradeid'] || '';
    // If no trade ID provided, generate one from row index
    if (!tradeId || tradeId.trim() === '') {
      tradeId = `IMPORT-${Date.now()}-${rowIndex}`;
    }
    
    const symbol = (row['symbol'] || '').replace(/[^A-Z]/gi, '').toUpperCase();
    const direction = normalizeDirection(row['direction'] || '');
    
    // Parse volume - handle formats like "4.09~Lots" or "5.16~Lots"
    const volumeStr = (row['volume'] || '0').toString().replace(/~.*$/i, '').trim();
    const volume = parseFloat(volumeStr);
    
    // Parse entry price - handle formats with ~ or other separators
    const entryPriceStr = (row['entryprice'] || '0').toString().replace(/~/g, '').trim();
    const entryPrice = parseFloat(entryPriceStr);
    
    // Try to get entry time, if not available use exit time as fallback
    let entryTime = parseDateTime(row['entrytime'] || '');
    const exitTime = row['exittime'] ? parseDateTime(row['exittime']) : undefined;
    
    // If no entry time but have exit time, estimate entry time as 1 hour before exit
    if (!entryTime && exitTime) {
      const exitDate = new Date(exitTime);
      exitDate.setHours(exitDate.getHours() - 1); // Estimate 1 hour trade duration
      entryTime = exitDate.toISOString();
      console.log('No entry time found, estimated from exit time');
    }
    
    // If still no time, use current time
    if (!entryTime) {
      entryTime = new Date().toISOString();
      console.log('No time data found, using current time');
    }

    // Debug: Check which fields are missing
    const missingFields = [];
    if (!symbol || symbol.length < 2) missingFields.push('symbol');
    if (!direction) missingFields.push('direction');
    if (!volume || volume === 0) missingFields.push('volume');
    if (!entryPrice || entryPrice === 0) missingFields.push('entryprice');

    if (missingFields.length > 0) {
      console.warn('Missing or invalid required fields:', missingFields);
      console.warn('Row data:', row);
      console.warn('Parsed values:', {
        symbol: symbol,
        direction: direction,
        volume: volume,
        entryPrice: entryPrice,
        rawSymbol: row['symbol'],
        rawDirection: row['direction'],
        rawVolume: row['volume'],
        rawEntryPrice: row['entryprice']
      });
      return null;
    }

    // Optional fields (exitTime already parsed above)
    // Handle prices with ~ separators
    const exitPrice = row['exitprice'] ? parseFloat(row['exitprice'].toString().replace(/~/g, '')) : undefined;
    const grossProfit = row['grossprofit'] ? parseFloat(row['grossprofit'].toString().replace(/~/g, '')) : undefined;
    const commission = row['commission'] ? parseFloat(row['commission'].toString().replace(/~/g, '')) : undefined;
    const swap = row['swap'] ? parseFloat(row['swap'].toString().replace(/~/g, '')) : undefined;
    
    // Calculate net profit if components are available
    let netProfit = row['netprofit'] ? parseFloat(row['netprofit'].toString().replace(/~/g, '')) : undefined;
    if (!netProfit && grossProfit !== undefined) {
      netProfit = grossProfit - (commission || 0) - (swap || 0);
    }

    // Parse stop loss - will be calculated properly in the component with user's risk amount
    let stopLoss = row['stoploss'] ? parseFloat(row['stoploss'].toString().replace(/~/g, '')) : undefined;
    if (!stopLoss) {
      // Temporary placeholder - will be recalculated with proper risk amount
      // This ensures the trade object is valid
      stopLoss = direction === 'long' 
        ? entryPrice * 0.99 
        : entryPrice * 1.01;
    }

    const takeProfit = row['takeprofit'] ? parseFloat(row['takeprofit'].toString().replace(/~/g, '')) : undefined;

    // Calculate duration if both times available
    let durationMinutes: number | undefined;
    if (exitTime) {
      const entryDate = new Date(entryTime);
      const exitDate = new Date(exitTime);
      durationMinutes = Math.round((exitDate.getTime() - entryDate.getTime()) / 60000);
    }

    return {
      tradeId,
      symbol,
      direction,
      volume,
      entryPrice,
      exitPrice,
      entryTime,
      exitTime,
      grossProfit,
      commission,
      swap,
      netProfit,
      stopLoss,
      takeProfit,
      durationMinutes
    };
  } catch (error) {
    console.error('Error mapping row to trade:', error);
    return null;
  }
}

/**
 * Normalize direction to 'long' or 'short'
 */
function normalizeDirection(direction: string): 'long' | 'short' | null {
  const normalized = direction.toLowerCase().trim();
  
  if (normalized === 'buy' || normalized === 'long' || normalized === '0') {
    return 'long';
  }
  
  if (normalized === 'sell' || normalized === 'short' || normalized === '1') {
    return 'short';
  }
  
  return null;
}

/**
 * Parse various date/time formats
 */
function parseDateTime(dateStr: string): string | null {
  if (!dateStr) return null;

  try {
    // Handle time-only format like "03:51.3" or "16:05.7"
    // Format: HH:mm.s or HH:mm:ss
    const timeOnlyFormat = /^(\d{1,2}):(\d{2})(?:[.:](\d{1,2}))?$/;
    const timeMatch = dateStr.trim().match(timeOnlyFormat);
    
    if (timeMatch) {
      const [, hour, minute, secondOrTenth] = timeMatch;
      const today = new Date();
      const date = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        parseInt(hour),
        parseInt(minute),
        secondOrTenth ? parseInt(secondOrTenth) : 0
      );
      
      if (!isNaN(date.getTime())) {
        console.log(`Parsed time-only "${dateStr}" as ${date.toISOString()}`);
        return date.toISOString();
      }
    }

    // Try parsing as ISO string
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    // Try parsing common formats
    // Format: DD.MM.YYYY HH:mm:ss or DD/MM/YYYY HH:mm:ss
    const euroFormat = /(\d{1,2})[./](\d{1,2})[./](\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/;
    const match = dateStr.match(euroFormat);
    
    if (match) {
      const [, day, month, year, hour, minute, second] = match;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
      
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return null;
  }
}

/**
 * Calculate stop loss based on risk amount
 * Formula: SL = Entry ± (Risk Amount / (Volume × Pip Value × Point Value))
 * 
 * For forex pairs like EURUSD:
 * - Pip Value ≈ 10 (for standard lot)
 * - Point Value = 100,000 (contract size)
 */
export function calculateStopLossFromRisk(
  entryPrice: number,
  volume: number,
  riskAmount: number,
  direction: 'long' | 'short',
  symbol: string
): number {
  // Determine pip value based on currency pair
  // For most pairs, pip is 0.0001 (4th decimal)
  // For JPY pairs, pip is 0.01 (2nd decimal)
  const isJPYPair = symbol.includes('JPY');
  const pipSize = isJPYPair ? 0.01 : 0.0001;
  
  // Standard lot size is 100,000 units
  const contractSize = 100000;
  
  // Value per pip = (Pip Size × Contract Size × Volume)
  const valuePerPip = pipSize * contractSize * volume;
  
  // Calculate pip distance needed for the risk amount
  const pipDistance = riskAmount / valuePerPip;
  
  // Calculate stop loss
  if (direction === 'long') {
    // For long trades, SL is below entry
    return entryPrice - (pipDistance * pipSize);
  } else {
    // For short trades, SL is above entry
    return entryPrice + (pipDistance * pipSize);
  }
}

/**
 * Validate imported trade data
 */
export function validateTrade(trade: CTraderTrade): string[] {
  const errors: string[] = [];

  if (!trade.symbol || trade.symbol.length < 6) {
    errors.push('Invalid symbol');
  }

  if (trade.volume <= 0 || trade.volume > 100) {
    errors.push('Volume out of reasonable range');
  }

  if (trade.entryPrice <= 0) {
    errors.push('Invalid entry price');
  }

  if (trade.exitPrice !== undefined && trade.exitPrice <= 0) {
    errors.push('Invalid exit price');
  }

  if (trade.stopLoss <= 0) {
    errors.push('Invalid stop loss');
  }

  // Validate stop loss makes sense
  if (trade.direction === 'long' && trade.stopLoss >= trade.entryPrice) {
    errors.push('Stop loss should be below entry for long positions');
  }

  if (trade.direction === 'short' && trade.stopLoss <= trade.entryPrice) {
    errors.push('Stop loss should be above entry for short positions');
  }

  return errors;
}

/**
 * Generate sample cTrader CSV for testing
 */
export function generateSampleCSV(): string {
  const header = 'Trade ID,Symbol,Direction,Volume,Entry Price,Exit Price,Entry Time,Exit Time,Gross Profit,Commission,Swap,Net Profit,Stop Loss,Take Profit';
  
  const rows = [
    '12345,EURUSD,Buy,1.0,1.09500,1.09650,2024-01-15 09:30:00,2024-01-15 12:45:00,150.00,-7.50,-2.00,140.50,1.09200,1.09800',
    '12346,GBPUSD,Sell,0.5,1.27800,1.27650,2024-01-15 14:20:00,2024-01-15 16:30:00,75.00,-3.75,-1.00,70.25,1.28100,1.27500',
    '12347,USDJPY,Buy,2.0,148.500,149.200,2024-01-16 08:00:00,2024-01-16 11:15:00,280.00,-14.00,-3.50,262.50,148.200,149.500',
    '12348,AUDUSD,Buy,1.5,0.66200,,2024-01-16 13:45:00,,,,,,0.65900,0.66500',
  ];

  return [header, ...rows].join('\n');
}

