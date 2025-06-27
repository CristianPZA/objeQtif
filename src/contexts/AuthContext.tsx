import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  userCountry: string | null;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  signOut: async () => {},
  userCountry: null,
  refreshUserData: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string | null>(null);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserCountry(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('country')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      setUserCountry(data?.country || 'france');
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const refreshUserData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await fetchUserProfile(user.id);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, []);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        // Provide more detailed error logging
        console.error('Auth error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: import.meta.env.VITE_SUPABASE_URL
        });
        
        // Don't log "Auth session missing!" as an error since it's a normal state
        if (error.message !== 'Auth session missing!') {
          console.error('Auth error:', error);
        }
        
        if (error.message === 'User from sub claim in JWT does not exist' || 
            error.message.includes('User from sub claim in JWT does not exist')) {
          // Clear the invalid session
          supabase.auth.signOut();
          setUser(null);
          setUserCountry(null);
        } else {
          setUser(null);
          setUserCountry(null);
        }
      } else {
        setUser(user);
        if (user) {
          fetchUserProfile(user.id);
        }
      }
      setLoading(false);
    }).catch((error) => {
      console.error('Failed to get user:', error);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserCountry(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Global error handler for Supabase requests
  useEffect(() => {
    const handleSupabaseError = (error: any) => {
      if (error?.message === 'User from sub claim in JWT does not exist' ||
          error?.message?.includes('User from sub claim in JWT does not exist')) {
        console.log('Detected invalid JWT, signing out user');
        signOut();
      }
    };

    // Add a global error listener for unhandled Supabase errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok && args[0]?.toString().includes('supabase.co')) {
          const errorText = await response.clone().text();
          console.error('Supabase fetch error:', {
            url: args[0],
            status: response.status,
            statusText: response.statusText,
            errorText
          });
          if (errorText.includes('User from sub claim in JWT does not exist')) {
            handleSupabaseError({ message: 'User from sub claim in JWT does not exist' });
          }
        }
        return response;
      } catch (error) {
        if (args[0]?.toString().includes('supabase.co')) {
          console.error('Network error connecting to Supabase:', {
            url: args[0],
            error: error.message
          });
          handleSupabaseError(error);
        }
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, userCountry, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};