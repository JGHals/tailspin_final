"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut, 
  sendEmailVerification,
  type User 
} from "firebase/auth";
import { auth } from "../firebase/firebase";
import { userProfileService } from "../services/user-profile-service";
import type { UserProfile } from "../types/user-profile";

export interface AuthUser {
  id: string
  email: string | null
  username: string
  avatar?: string
  tokens: number
  maxTokens: number
  isEmailVerified: boolean
  stats?: {
    gamesPlayed: number
    bestScore: number
    winRate: number
    avgWordLength: number
  }
  achievements?: {
    id: string
    name: string
    description: string
    icon: string
    color: string
    dateEarned: string
  }[]
  discoveredTerminals?: string[]
}

export interface AuthContextType {
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  sendVerificationEmail: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string }>
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; message?: string }>
  loginWithGoogle: () => Promise<{ success: boolean; message?: string }>
  loginWithFacebook: () => Promise<{ success: boolean; message?: string }>
  loginWithApple: () => Promise<{ success: boolean; message?: string }>
  addTokens: (amount: number) => Promise<void>
  useTokens: (amount: number) => Promise<boolean>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isLoading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  sendVerificationEmail: async () => {},
  resetPassword: async () => ({ success: false }),
  register: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
  loginWithFacebook: async () => ({ success: false }),
  loginWithApple: async () => ({ success: false }),
  addTokens: async () => {},
  useTokens: async () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Load or create user profile
          let userProfile = await userProfileService.getProfile(firebaseUser.uid);
          
          if (!userProfile) {
            userProfile = await userProfileService.createProfile(
              firebaseUser.uid,
              firebaseUser.displayName || "Anonymous",
              firebaseUser.email || "",
              firebaseUser.photoURL || undefined
            );
          }

          // Convert Firebase User to AuthUser
          const authUser: AuthUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            username: userProfile.displayName,
            avatar: userProfile.photoURL,
            tokens: userProfile.tokens,
            maxTokens: 50, // Default max tokens
            isEmailVerified: firebaseUser.emailVerified,
            stats: {
              gamesPlayed: userProfile.stats.gamesPlayed,
              bestScore: userProfile.stats.highestScore,
              winRate: userProfile.stats.gamesPlayed > 0 
                ? (userProfile.stats.averageScore) 
                : 0,
              avgWordLength: userProfile.stats.averageChainLength
            },
            discoveredTerminals: Array.from(userProfile.terminalWordsDiscovered)
          };

          setUser(authUser);
          setProfile(userProfile);
        } else {
          // Clear state on sign out
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("Error handling auth state change:", error);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
        setIsLoading(false);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (isLoading) return; // Prevent multiple simultaneous attempts
    
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      await signInWithPopup(auth, provider);
      // The onAuthStateChanged listener will handle the rest

    } catch (error: any) {
      console.error("Google sign in failed:", error);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup - silent fail
        return;
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Another popup is already open
        throw new Error("Authentication popup was blocked. Please try again.");
      } else {
        // Other errors should be thrown
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      setIsLoading(true);
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      // Clear local state
      setUser(null);
      setProfile(null);
      
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendVerificationEmail = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user signed in");
    
    try {
      await sendEmailVerification(currentUser);
    } catch (error) {
      console.error("Failed to send verification email:", error);
      throw error;
    }
  };

  const register = async (email: string, username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    if (isLoading) return { success: false, message: "Operation in progress" };
    
    try {
      setIsLoading(true);
      
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create user profile
      await userProfileService.createProfile(
        firebaseUser.uid,
        username,
        email,
        undefined
      );
      
      // Send verification email
      await sendEmailVerification(firebaseUser);
      
      return { success: true };
    } catch (error: any) {
      console.error("Registration failed:", error);
      
      // Handle specific error cases
      if (error.code === 'auth/email-already-in-use') {
        return { success: false, message: "Email already in use" };
      } else if (error.code === 'auth/invalid-email') {
        return { success: false, message: "Invalid email address" };
      } else if (error.code === 'auth/weak-password') {
        return { success: false, message: "Password is too weak" };
      }
      
      return { success: false, message: "Registration failed" };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
    if (isLoading) return { success: false, message: "Operation in progress" };
    
    try {
      setIsLoading(true);
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: "Password reset email sent" };
    } catch (error: any) {
      console.error("Password reset failed:", error);
      
      if (error.code === 'auth/user-not-found') {
        return { success: false, message: "No account found with this email" };
      } else if (error.code === 'auth/invalid-email') {
        return { success: false, message: "Invalid email address" };
      }
      
      return { success: false, message: "Failed to send reset email" };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithFacebook = async (): Promise<{ success: boolean; message?: string }> => {
    if (isLoading) return { success: false, message: "Operation in progress" };
    
    try {
      setIsLoading(true);
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
      return { success: true };
    } catch (error: any) {
      console.error("Facebook login failed:", error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        return { success: false };
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        return { success: false, message: "Account exists with different provider" };
      }
      
      return { success: false, message: "Login failed" };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithApple = async (): Promise<{ success: boolean; message?: string }> => {
    if (isLoading) return { success: false, message: "Operation in progress" };
    
    try {
      setIsLoading(true);
      const provider = new OAuthProvider('apple.com');
      await signInWithPopup(auth, provider);
      return { success: true };
    } catch (error: any) {
      console.error("Apple login failed:", error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        return { success: false };
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        return { success: false, message: "Account exists with different provider" };
      }
      
      return { success: false, message: "Login failed" };
    } finally {
      setIsLoading(false);
    }
  };

  const addTokens = async (amount: number) => {
    if (!user || !profile) return;
    try {
      const newTokens = await userProfileService.updateTokens(user.id, amount);
      setProfile(prev => prev ? { ...prev, tokens: newTokens } : null);
    } catch (error) {
      console.error("Failed to add tokens:", error);
    }
  };

  const useTokens = async (amount: number) => {
    if (!user || !profile || profile.tokens < amount) return false;
    try {
      const newTokens = await userProfileService.updateTokens(user.id, -amount);
      setProfile(prev => prev ? { ...prev, tokens: newTokens } : null);
      return true;
    } catch (error) {
      console.error("Failed to use tokens:", error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isLoading,
      signInWithGoogle,
      signOut: signOutUser,
      sendVerificationEmail,
      resetPassword,
      register,
      loginWithGoogle: async () => {
        await signInWithGoogle();
        return { success: true };
      },
      loginWithFacebook,
      loginWithApple,
      addTokens,
      useTokens,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
