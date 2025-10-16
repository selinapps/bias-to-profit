import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { debugAuthState, testApiConnectivity } from '@/lib/debug-supabase';

export function DebugPanel() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      console.log('🔍 Running Supabase Diagnostics...');
      
      // Check auth state
      const authState = await debugAuthState();
      
      // Test API connectivity
      const apiTest = await testApiConnectivity();
      
      // Test specific tables
      const tests = {
        auth: authState,
        apiConnectivity: apiTest,
        userTables: {}
      };

      if (user) {
        // Test user_settings
        try {
          const { data: settingsData, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          tests.userTables.user_settings = {
            success: !settingsError,
            error: settingsError,
            data: settingsData
          };
        } catch (err) {
          tests.userTables.user_settings = {
            success: false,
            error: err
          };
        }

        // Test challenge_phases
        try {
          const { data: challengeData, error: challengeError } = await supabase
            .from('challenge_phases')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active');
          
          tests.userTables.challenge_phases = {
            success: !challengeError,
            error: challengeError,
            data: challengeData
          };
        } catch (err) {
          tests.userTables.challenge_phases = {
            success: false,
            error: err
          };
        }

        // Test profiles
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          tests.userTables.profiles = {
            success: !profileError,
            error: profileError,
            data: profileData
          };
        } catch (err) {
          tests.userTables.profiles = {
            success: false,
            error: err
          };
        }
      }

      setDebugInfo(tests);
      console.log('🔍 Diagnostics Complete:', tests);
    } catch (error) {
      console.error('🔍 Diagnostic Error:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="mt-4 border-red-200">
      <CardHeader>
        <CardTitle className="text-red-600">🐛 Debug Panel (Development Only)</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={runDiagnostics} disabled={loading}>
          {loading ? 'Running Diagnostics...' : 'Run Supabase Diagnostics'}
        </Button>
        
        {debugInfo && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Diagnostic Results:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
