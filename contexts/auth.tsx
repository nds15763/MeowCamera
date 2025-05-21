import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

// Define the user profile type based on the profiles table
type UserProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userProfile: UserProfile | null;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithDiscord: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: Error | null, data: UserProfile | null }>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Helper function to wait for specified milliseconds
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Fetch user profile data with retry mechanism
  const fetchUserProfile = async (userId: string, retryCount = 0, maxRetries = 10) => {
    try {
      // Try to get the user profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      // If profile not found (PGRST116 error), create a new one
      if (error && error.code === 'PGRST116') {
        console.log('Profile not found, creating new profile for user:', userId);
        
        // Create a new profile
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({ 
            id: userId,
            username: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (createError) {
          // For network errors in profile creation, retry
          if (createError.message?.includes('Network request failed') && retryCount < maxRetries) {
            console.log(`Network error creating profile, retrying in 3 seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
            await delay(3000); // Wait 3 seconds before retry
            return fetchUserProfile(userId, retryCount + 1, maxRetries);
          }
          console.error('Error creating user profile:', createError);
          return null;
        }
        
        console.log('New profile created:', newProfile);
        return newProfile as UserProfile;
      } else if (error) {
        // For network errors, retry the request
        if (error.message?.includes('Network request failed') && retryCount < maxRetries) {
          console.log(`Network error fetching profile, retrying in 3 seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
          await delay(3000); // Wait 3 seconds before retry
          return fetchUserProfile(userId, retryCount + 1, maxRetries);
        }
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return data as UserProfile;
    } catch (error: any) {
      // For network errors in the catch block, retry
      if (error.message?.includes('Network request failed') && retryCount < maxRetries) {
        console.log(`Network error in catch block, retrying in 3 seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
        await delay(3000); // Wait 3 seconds before retry
        return fetchUserProfile(userId, retryCount + 1, maxRetries);
      }
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Get session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
          setUserProfile(profile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) return { error };
      
      // If sign up is successful and we have a user, create a profile
      if (data.user) {
        console.log('User signed up, creating profile for:', data.user.id);
        
        // Create a profile for the new user
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ 
            id: data.user.id,
            username: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.error('Error creating profile during signup:', profileError);
          // We don't return this error as it would prevent the user from signing up
          // The profile will be created on first login if this fails
        }
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Sign in the user
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) return { error };
      
      // If sign in is successful and we have a user, ensure profile exists
      if (data.user) {
        // We don't need to explicitly create a profile here as fetchUserProfile
        // will be called by the auth state change listener and will create a profile
        // if one doesn't exist. This is just a safeguard.
        console.log('User signed in, profile will be fetched/created if needed');
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Sign in with Google
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'smartcamera://auth/callback', // Using the app scheme from app.json
        }
      });
      
      if (error) return { error };
      
      // Profile will be created by the auth state change listener if needed
      console.log('Google sign in initiated, profile will be created if needed after successful auth');
      
      return { error: null };
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      return { error: error as Error };
    }
  };

  const signInWithDiscord = async () => {
    try {
      // Sign in with Discord
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: 'smartcamera://auth/callback', // Using the app scheme from app.json
        }
      });
      
      if (error) return { error };
      
      // Profile will be created by the auth state change listener if needed
      console.log('Discord sign in initiated, profile will be created if needed after successful auth');
      
      return { error: null };
    } catch (error) {
      console.error('Error in signInWithDiscord:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      if (!user) return { error: new Error('User not authenticated'), data: null };

      const updates = {
        ...data,
        id: user.id,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .upsert(updates)
        .select()
        .single();

      if (error) {
        return { error, data: null };
      }

      setUserProfile(updatedProfile as UserProfile);
      return { error: null, data: updatedProfile as UserProfile };
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return { error: error as Error, data: null };
    }
  };

  const value = {
    user,
    session,
    isLoading,
    userProfile,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithDiscord,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
