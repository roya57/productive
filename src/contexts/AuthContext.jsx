import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  useEffect(() => {
    // Check if current URL has recovery hash parameters
    const checkRecoverySession = () => {
      const hashParams = window.location.hash;
      return (
        hashParams.includes("type=recovery") ||
        hashParams.includes("access_token")
      );
    };

    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Check if this is a recovery session
      const isRecovery = checkRecoverySession();
      setIsRecoverySession(isRecovery);

      // Only set user if it's not a recovery session (recovery sessions are temporary)
      // Recovery sessions should only allow access to reset-password page
      if (session && !isRecovery) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isRecovery = checkRecoverySession();
      setIsRecoverySession(isRecovery);

      // If it's a PASSWORD_RECOVERY event, mark as recovery session
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoverySession(true);
        setUser(null); // Don't treat recovery sessions as authenticated
      } else if (session && !isRecovery) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign up with email and password
  const signUp = async (email, password, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      // Check if email already exists (empty identities array means email is already registered)
      if (
        data.user &&
        (!data.user.identities || data.user.identities.length === 0)
      ) {
        return {
          data: null,
          error: {
            message:
              "An account with this email already exists. Please sign in instead.",
          },
        };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      // Use the production domain for password reset redirects
      // TODO: Replace with your actual productive app domain
      const baseUrl = "https://productive.gather-up.com"; // Update this with your actual domain
      const redirectUrl = `${baseUrl}/reset-password`;

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Update user profile (display name)
  const updateProfile = async (updates) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) throw error;

      // Update local user state
      setUser(data.user);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Update display name specifically
  const updateDisplayName = async (displayName) => {
    return await updateProfile({ full_name: displayName });
  };

  const value = {
    user,
    loading,
    isRecoverySession,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    updateDisplayName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
