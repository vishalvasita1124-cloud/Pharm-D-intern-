import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (params: SignUpParams) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  syncPurchases: () => Promise<void>;
}

interface SignUpParams {
  email: string;
  password: string;
  full_name: string;
  username: string;
  mobile: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (_userId: string) => {
    // Use SECURITY DEFINER RPC — works even if profile.user_id was NULL
    const { data, error } = await supabase.rpc('get_my_profile');

    if (error || !data) {
      // Fallback: direct query (works if RLS is satisfied)
      const { data: fallback } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', _userId)
        .single();
      return fallback as Profile | null;
    }
    return data as Profile;
  }, []);


  const syncPurchases = useCallback(async () => {
    try {
      await supabase.rpc('sync_my_orders_and_access');
    } catch (e) {
      console.warn('sync_my_orders_and_access error:', e);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    if (p) setProfile(p);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
        syncPurchases();
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const p = await fetchProfile(session.user.id);
          setProfile(p);
          syncPurchases();
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile, syncPurchases]);

  const signUp = async ({ email, password, full_name, username, mobile }: SignUpParams) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, username, mobile },
      },
    });

    if (error) return { error };

    // Upsert profile (also handled by DB trigger, safe fallback)
    if (data.user) {
      try {
        await supabase.from('profiles').upsert({
          user_id: data.user.id,
          full_name,
          username,
          email,
          mobile,
          role: 'user',
        });
        syncPurchases();
      } catch (e) {
        // Handled by DB trigger
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      syncPurchases();
    }
    return { error: error ?? null };
  };

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });
    return { error: error ?? null };
  };

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });
    if (!error) {
      syncPurchases();
    }
    return { error: error ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInWithOtp,
        verifyOtp,
        signOut,
        refreshProfile,
        syncPurchases,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
