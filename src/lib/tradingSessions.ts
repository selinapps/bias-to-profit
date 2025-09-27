export interface TradingSession {
  id: string;
  name: string;
  start: { hour: number; minute: number };
  end: { hour: number; minute: number };
  localTime: string;
  description: string;
  color?: string;
}

export const TRADING_SESSIONS: TradingSession[] = [
  {
    id: 'asian_range',
    name: 'Asian Range',
    start: { hour: 20, minute: 0 },
    end: { hour: 4, minute: 0 },
    localTime: '3:00 AM - 11:00 AM (+03)',
    description: 'Consolidation period',
    color: 'bg-purple-500/20 text-purple-300 border-purple-400/50'
  },
  {
    id: 'london_killzone',
    name: 'London Killzone',
    start: { hour: 2, minute: 0 },
    end: { hour: 5, minute: 0 },
    localTime: '9:00 AM - 12:00 PM (+03)',
    description: 'High volatility - London open',
    color: 'bg-red-500/20 text-red-300 border-red-400/50'
  },
  {
    id: 'london_lunch',
    name: 'London Lunch',
    start: { hour: 7, minute: 0 },
    end: { hour: 8, minute: 0 },
    localTime: '2:00 PM - 3:00 PM (+03)',
    description: 'Lower volatility',
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50'
  },
  {
    id: 'london_ny_overlap',
    name: 'London vs. New York',
    start: { hour: 8, minute: 0 },
    end: { hour: 12, minute: 0 },
    localTime: '3:00 PM - 7:00 PM (+03)',
    description: 'Key trading window - Major overlap',
    color: 'bg-blue-500/20 text-blue-300 border-blue-400/50'
  },
  {
    id: 'silver_bullet',
    name: 'Silver Bullet Hours',
    start: { hour: 10, minute: 0 },
    end: { hour: 11, minute: 0 },
    localTime: '5:00 PM - 6:00 PM (+03)',
    description: 'Reversal window',
    color: 'bg-green-500/20 text-green-300 border-green-400/50'
  },
  {
    id: 'ny_session',
    name: 'New York Session',
    start: { hour: 8, minute: 0 },
    end: { hour: 17, minute: 0 },
    localTime: '3:00 PM - 12:00 AM (+03)',
    description: 'Major U.S. trading hours',
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
