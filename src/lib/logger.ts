/**
 * Centralized logging utility
 * Controls console output based on environment and debug settings
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private logLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.logLevel = this.isProduction ? LogLevel.ERROR : LogLevel.DEBUG;
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  // Performance logging
  performance(operation: string, duration: number) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`[PERF] ${operation}: ${duration.toFixed(2)}ms`);
    }
  }

  // Trading specific logging
  trade(action: string, tradeId?: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const prefix = tradeId ? `[TRADE:${tradeId}]` : '[TRADE]';
      console.log(`${prefix} ${action}`, ...args);
    }
  }

  // Database specific logging
  db(operation: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`[DB] ${operation}`, ...args);
    }
  }

  // Real-time specific logging
  realtime(event: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`[REALTIME] ${event}`, ...args);
    }
  }

  // Challenge specific logging
  challenge(action: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`[CHALLENGE] ${action}`, ...args);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export individual methods for convenience
export const { error, warn, info, debug, performance, trade, db, realtime, challenge } = logger;
