import * as React from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Create profile if new user
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            createUserProfile(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const createUserProfile = async (userId: string) => {
    try {
      logger.info('Creating user profile for:', userId);
      
      // Check if profile already exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        logger.error('Error checking existing profile:', profileError);
      }

      if (!existingProfile) {
        logger.info('Creating new profile for user:', userId);
        
        // Create profile
        const { error: insertProfileError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            display_name: 'Trader',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            risk_settings: {}
          });

        if (insertProfileError) {
          logger.error('Could not create profile:', insertProfileError);
        } else {
          logger.info('Profile created successfully');
        }
      }

      // Check if user_settings already exists
      const { data: existingSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsError) {
        logger.error('Error checking existing settings:', settingsError);
      }

      if (!existingSettings) {
        logger.info('Creating new user settings for user:', userId);
        
        // Create user_settings with default values
        const { error: insertSettingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            auto_backup: false,
            auto_save: true,
            bias_reminders: true,
            compact_mode: false,
            debug_mode: false,
            default_model: 'trend',
            default_risk_amount: 100.00,
            enable_stop_rule: true,
            experimental_features: false,
            notifications_enabled: true,
            session_alerts: true,
            show_advanced_features: false,
            theme: 'system',
            trade_alerts: true
          }, {
            onConflict: 'user_id'
          });

        if (insertSettingsError) {
          logger.error('Could not create user settings:', insertSettingsError);
        } else {
          logger.info('User settings created/updated successfully');
        }
      }

      logger.info('User profile setup completed for:', userId);
    } catch (error) {
      logger.error('Error in createUserProfile:', error);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        logger.error('Sign up error:', error);
        return { error };
      }

      // If user was created successfully, create profile immediately
      if (data.user) {
        logger.info('User created successfully, setting up profile:', data.user.id);
        
        // Create profile immediately for new users
        setTimeout(() => {
          createUserProfile(data.user.id);
        }, 1000); // Wait 1 second for auth to be fully processed
      }

      return { error: null };
    } catch (err) {
      logger.error('Sign up exception:', err);
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        logger.error('Sign in error:', error);
        return { error };
      }
      
      // Ensure user profile and settings are created after successful login
      if (data.user) {
        setTimeout(() => {
          createUserProfile(data.user.id);
        }, 100);
      }
      
      return { error: null };
    } catch (err) {
      logger.error('Sign in exception:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}