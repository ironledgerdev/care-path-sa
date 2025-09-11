import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: 'patient' | 'doctor' | 'admin';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Supabase profile fetch error:', error);
        // Ensure we throw a real Error with a string message so callers can display it
        throw new Error((error as any)?.message ?? JSON.stringify(error));
      }

      setProfile(data);
    } catch (err: any) {
      const msg = err?.message ?? JSON.stringify(err);
      console.error('Error fetching profile:', msg);
      setProfile(null);
      // Re-throw a normalized Error so callers/getting code can show a useful message
      throw new Error(msg);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // If a local admin session flag is present and env vars configured, restore fake session
    try {
      const isLocalAdmin = !!localStorage.getItem('local_admin_session');
      if (isLocalAdmin && ADMIN_EMAIL) {
        const fakeUser: any = { id: 'local-admin', email: ADMIN_EMAIL };
        const fakeProfile: Profile = {
          id: 'local-admin',
          email: ADMIN_EMAIL,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(fakeUser);
        setSession(null);
        setProfile(fakeProfile);
        setLoading(false);
        return;
      }
    } catch (e) {
      // ignore
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;

  const signIn = async (email: string, password: string) => {
    // Check for local env-based admin override
    if (ADMIN_EMAIL && ADMIN_PASSWORD && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Create a lightweight fake user/profile in-memory and persist flag in localStorage
      const fakeUser: any = {
        id: 'local-admin',
        email,
      };
      const fakeProfile: Profile = {
        id: 'local-admin',
        email,
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(fakeUser);
      setSession(null);
      setProfile(fakeProfile);
      try {
        localStorage.setItem('local_admin_session', '1');
      } catch (e) {}
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    // Clear local admin flag if present
    try {
      localStorage.removeItem('local_admin_session');
    } catch (e) {}

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signIn,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
