import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  signOut: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        console.error('Auth error:', error);
        if (error.message === 'User from sub claim in JWT does not exist' || 
            error.message.includes('User from sub claim in JWT does not exist')) {
          // Clear the invalid session
          supabase.auth.signOut();
          setUser(null);
        } else {
          setUser(null);
        }
      } else {
        setUser(user);
      }
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
          if (errorText.includes('User from sub claim in JWT does not exist')) {
            handleSupabaseError({ message: 'User from sub claim in JWT does not exist' });
          }
        }
        return response;
      } catch (error) {
        if (args[0]?.toString().includes('supabase.co')) {
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
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};