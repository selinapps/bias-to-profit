export interface TradingSession {
  id: string;
  name: string;
  start: { hour: number; minute: number };
  end: { hour: number; minute: number };
  localTime: string;
  description: string;
  priceHint: string; // Common price behavior during this session
  color?: string;
}

// ICT Killzones - All times in EST (New York Time)
export const TRADING_SESSIONS: TradingSession[] = [
  {
    id: 'asian_session',
    name: 'Asian Session',
    start: { hour: 19, minute: 0 },  // 7:00 PM EST
    end: { hour: 2, minute: 0 },     // 2:00 AM EST
    localTime: '7:00 PM - 2:00 AM EST',
    description: 'Tokyo open. Lower volatility, often consolidation and range formation.',
    priceHint: '📊 Range Formation | Liquidity Building | Sets Asia High/Low',
    color: 'bg-purple-500/20 text-purple-300 border-purple-400/50'
  },
  {
    id: 'london_open',
    name: 'London Open (ICT Killzone)',
    start: { hour: 3, minute: 0 },   // 3:00 AM EST (8:00 AM London)
    end: { hour: 5, minute: 0 },     // 5:00 AM EST (10:00 AM London)
    localTime: '3:00 AM - 5:00 AM EST (8:00 AM - 10:00 AM London)',
    description: 'London market opens. High probability for breakouts from Asian range.',
    priceHint: '🔥 Breakout Setups | Takes Asian Liquidity | Strong Directional Moves | Day Bias Forms',
    color: 'bg-red-500/20 text-red-300 border-red-400/50'
  },
  {
    id: 'london_lunch',
    name: 'London Lunch',
    start: { hour: 7, minute: 0 },   // 7:00 AM EST (12:00 PM London)
    end: { hour: 8, minute: 0 },     // 8:00 AM EST (1:00 PM London)
    localTime: '7:00 AM - 8:00 AM EST (12:00 PM - 1:00 PM London)',
    description: 'Low volatility pause as London traders take lunch.',
    priceHint: '⏸️ Consolidation | Avoid Trading | Market Drifts | Low Volume',
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50'
  },
  {
    id: 'ny_killzone',
    name: 'New York Killzone (ICT)',
    start: { hour: 8, minute: 30 },  // 8:30 AM EST
    end: { hour: 11, minute: 0 },    // 11:00 AM EST
    localTime: '8:30 AM - 11:00 AM EST',
    description: 'NY market opens. Highest liquidity window with London/NY overlap.',
    priceHint: '⚡ Most Volatile | News Impacts | Major Reversals | Strong Trends | Best Setups',
    color: 'bg-blue-500/20 text-blue-300 border-blue-400/50'
  },
  {
    id: 'silver_bullet',
    name: 'Silver Bullet (10-11 AM)',
    start: { hour: 10, minute: 0 },  // 10:00 AM EST
    end: { hour: 11, minute: 0 },    // 11:00 AM EST
    localTime: '10:00 AM - 11:00 AM EST',
    description: 'ICT\'s highest probability setup window within NY Killzone.',
    priceHint: '💎 Premium Setup Hour | Reversal Patterns | Exhaustion Plays | High Win Rate',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
  },
  {
    id: 'ny_afternoon',
    name: 'NY Afternoon',
    start: { hour: 13, minute: 0 },  // 1:00 PM EST
    end: { hour: 17, minute: 0 },    // 5:00 PM EST
    localTime: '1:00 PM - 5:00 PM EST',
    description: 'Post-lunch session. Lower volatility, trend continuation or ranging.',
    priceHint: '📉 Slower Moves | Trend Continuation | Position Squaring | Lower Volume',
    color: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50'
  }
];

const EST_TIMEZONE = 'America/New_York';

const minutesSinceMidnight = (hour: number, minute: number) => hour * 60 + minute;

export const getActiveSession = (date: Date = new Date()): TradingSession | null => {
  const estDate = new Date(date.toLocaleString('en-US', { timeZone: EST_TIMEZONE }));
  const currentMinutes = minutesSinceMidnight(estDate.getHours(), estDate.getMinutes());

  for (const session of TRADING_SESSIONS) {
    const startMinutes = minutesSinceMidnight(session.start.hour, session.start.minute);
    const endMinutes = minutesSinceMidnight(session.end.hour, session.end.minute);

    if (startMinutes > endMinutes) {
      if (currentMinutes >= startMinutes || currentMinutes <= endMinutes) {
        return session;
      }
    } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return session;
    }
  }

  return null;
};

// Check if market is open (even if no specific session is active)
export const isMarketOpen = (date: Date = new Date()): boolean => {
  const estDate = new Date(date.toLocaleString('en-US', { timeZone: EST_TIMEZONE }));
  const currentMinutes = minutesSinceMidnight(estDate.getHours(), estDate.getMinutes());
  
  // Market is considered open from 8 PM Sunday to 5 PM Friday EST
  // This covers the gap between sessions and weekend closure
  const dayOfWeek = estDate.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Weekend check - Market is closed from Friday 5 PM to Sunday 8 PM EST
  if (dayOfWeek === 0 && currentMinutes < 20 * 60) return false; // Sunday before 8 PM
  if (dayOfWeek === 6) return false; // Saturday is completely closed
  if (dayOfWeek === 0 && currentMinutes >= 20 * 60) return true; // Sunday after 8 PM
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    // Monday to Friday - check if it's after Friday 5 PM
    if (dayOfWeek === 5 && currentMinutes > 17 * 60) return false; // Friday after 5 PM
    return true; // Monday to Friday before 5 PM
  }
  
  return false;
};
