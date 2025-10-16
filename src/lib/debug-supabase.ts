// Debug utility for Supabase API calls
import { supabase } from '@/integrations/supabase/client';

// Intercept and log all Supabase requests
export function debugSupabaseRequests() {
  // Override the original supabase methods to add logging
  const originalFrom = supabase.from.bind(supabase);
  
  supabase.from = function(table: string) {
    console.log(`🔍 Supabase API Call: FROM ${table}`);
    
    const query = originalFrom(table);
    
    // Override select method
    const originalSelect = query.select.bind(query);
    query.select = function(columns?: string) {
      console.log(`🔍 Supabase API Call: SELECT ${columns || '*'} FROM ${table}`);
      return originalSelect(columns);
    };
    
    // Override insert method
    const originalInsert = query.insert.bind(query);
    query.insert = function(values: any) {
      console.log(`🔍 Supabase API Call: INSERT INTO ${table}`, values);
      return originalInsert(values);
    };
    
    // Override update method
    const originalUpdate = query.update.bind(query);
    query.update = function(values: any) {
      console.log(`🔍 Supabase API Call: UPDATE ${table}`, values);
      return originalUpdate(values);
    };
    
    // Override delete method
    const originalDelete = query.delete.bind(query);
    query.delete = function() {
      console.log(`🔍 Supabase API Call: DELETE FROM ${table}`);
      return originalDelete();
    };
    
    return query;
  };
}

// Check current authentication state
export async function debugAuthState() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('🔐 Authentication State:');
    console.log('  Session:', session ? 'Active' : 'None');
    console.log('  User ID:', session?.user?.id || 'None');
    console.log('  Error:', error || 'None');
    
    if (session) {
      console.log('  Access Token:', session.access_token ? 'Present' : 'Missing');
      console.log('  Token Expires:', new Date(session.expires_at! * 1000).toISOString());
    }
    
    return { session, error };
  } catch (err) {
    console.error('🔐 Auth Debug Error:', err);
    return { session: null, error: err };
  }
}

// Test basic API connectivity
export async function testApiConnectivity() {
  console.log('🧪 Testing API Connectivity...');
  
  try {
    // Test basic health check
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('🧪 API Test Failed:', error);
      return false;
    }
    
    console.log('🧪 API Test Passed:', data);
    return true;
  } catch (err) {
    console.error('🧪 API Test Exception:', err);
    return false;
  }
}

// Monitor network requests for 406 errors
export function monitorNetworkErrors() {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    try {
      const response = await originalFetch.apply(this, args);
      
      if (!response.ok) {
        console.error('🚨 Network Error:', {
          url: typeof url === 'string' ? url : url.toString(),
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          options: options
        });
        
        if (response.status === 406) {
          console.error('🚨 406 ERROR DETECTED:', {
            url,
            headers: options?.headers,
            method: options?.method || 'GET'
          });
        }
      }
      
      return response;
    } catch (error) {
      console.error('🚨 Network Exception:', error);
      throw error;
    }
  };
}

// Initialize debugging
export function initSupabaseDebugging() {
  if (process.env.NODE_ENV === 'development') {
    console.log('🐛 Supabase Debugging Enabled');
    debugSupabaseRequests();
    monitorNetworkErrors();
    
    // Test connectivity on init
    setTimeout(() => {
      debugAuthState();
      testApiConnectivity();
    }, 1000);
  }
}
