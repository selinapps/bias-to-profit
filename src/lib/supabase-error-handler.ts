// Comprehensive error handling for Supabase API calls
import { PostgrestError } from '@supabase/supabase-js';
import { logger } from './logger';

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
  isRetryable: boolean;
  isAuthError: boolean;
  isNetworkError: boolean;
}

export function analyzeSupabaseError(error: any): ApiError {
  const postgresError = error as PostgrestError;
  
  // Network/HTTP errors
  if (error?.message?.includes('406')) {
    return {
      code: '406_NOT_ACCEPTABLE',
      message: 'API request format not acceptable - check headers and authentication',
      details: error.message,
      isRetryable: true,
      isAuthError: false,
      isNetworkError: true
    };
  }
  
  if (error?.message?.includes('400')) {
    return {
      code: '400_BAD_REQUEST',
      message: 'Bad request - check request format and authentication',
      details: error.message,
      isRetryable: false,
      isAuthError: true,
      isNetworkError: false
    };
  }
  
  if (error?.message?.includes('401')) {
    return {
      code: '401_UNAUTHORIZED',
      message: 'Unauthorized - please log in again',
      details: error.message,
      isRetryable: false,
      isAuthError: true,
      isNetworkError: false
    };
  }
  
  if (error?.message?.includes('403')) {
    return {
      code: '403_FORBIDDEN',
      message: 'Forbidden - insufficient permissions',
      details: error.message,
      isRetryable: false,
      isAuthError: true,
      isNetworkError: false
    };
  }
  
  // PostgreSQL errors
  if (postgresError?.code) {
    switch (postgresError.code) {
      case 'PGRST116':
        return {
          code: 'PGRST116_NO_ROWS',
          message: 'No rows found - this is normal for empty results',
          details: postgresError.message,
          isRetryable: false,
          isAuthError: false,
          isNetworkError: false
        };
      
      case 'PGRST301':
        return {
          code: 'PGRST301_NOT_FOUND',
          message: 'Resource not found - table or function may not exist',
          details: postgresError.message,
          isRetryable: false,
          isAuthError: false,
          isNetworkError: false
        };
      
      case 'PGRST301':
        return {
          code: 'PGRST301_NOT_FOUND',
          message: 'Resource not found - table or function may not exist',
          details: postgresError.message,
          isRetryable: false,
          isAuthError: false,
          isNetworkError: false
        };
      
      case '42501':
        return {
          code: '42501_INSUFFICIENT_PRIVILEGE',
          message: 'Insufficient privilege - check RLS policies',
          details: postgresError.message,
          isRetryable: false,
          isAuthError: true,
          isNetworkError: false
        };
      
      default:
        return {
          code: postgresError.code,
          message: postgresError.message,
          details: postgresError.details,
          hint: postgresError.hint,
          isRetryable: true,
          isAuthError: false,
          isNetworkError: false
        };
    }
  }
  
  // Generic error
  return {
    code: 'UNKNOWN_ERROR',
    message: error?.message || 'An unknown error occurred',
    details: error?.toString(),
    isRetryable: true,
    isAuthError: false,
    isNetworkError: false
  };
}

export function handleSupabaseError(error: any, context: string): ApiError {
  const analyzedError = analyzeSupabaseError(error);
  
  // Log the error with context
  logger.error(`Supabase error in ${context}:`, {
    code: analyzedError.code,
    message: analyzedError.message,
    details: analyzedError.details,
    hint: analyzedError.hint,
    originalError: error
  });
  
  // Log specific 406 errors for debugging
  if (analyzedError.code === '406_NOT_ACCEPTABLE') {
    logger.error('406 Error Details:', {
      context,
      error,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }
  
  return analyzedError;
}

export function shouldRetryRequest(error: ApiError, attempt: number): boolean {
  if (attempt >= 3) return false;
  if (!error.isRetryable) return false;
  if (error.isAuthError) return false;
  
  return true;
}

export function getErrorMessage(error: ApiError): string {
  switch (error.code) {
    case '406_NOT_ACCEPTABLE':
      return 'There was a problem with the request format. Please refresh the page and try again.';
    
    case '400_BAD_REQUEST':
      return 'Invalid request. Please check your input and try again.';
    
    case '401_UNAUTHORIZED':
      return 'Please log in to continue.';
    
    case '403_FORBIDDEN':
      return 'You don\'t have permission to perform this action.';
    
    case 'PGRST116_NO_ROWS':
      return 'No data found. This is normal if you haven\'t added any data yet.';
    
    case 'PGRST301_NOT_FOUND':
      return 'The requested resource was not found. Please contact support if this persists.';
    
    case '42501_INSUFFICIENT_PRIVILEGE':
      return 'Access denied. Please contact support if you believe this is an error.';
    
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

// Retry wrapper for Supabase operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: ApiError | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = handleSupabaseError(error, context);
      
      if (!shouldRetryRequest(lastError, attempt)) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000;
      logger.warn(`Retrying ${context} in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Max retry attempts exceeded');
}
