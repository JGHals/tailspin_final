"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface User {
  id: string
  email: string
  username: string
  avatar?: string
  tokens: number
  maxTokens: number
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

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string }>
  loginWithGoogle: () => Promise<{ success: boolean; message?: string }>
  loginWithFacebook: () => Promise<{ success: boolean; message?: string }>
  loginWithApple: () => Promise<{ success: boolean; message?: string }>
  addTokens: (amount: number) => void
  useTokens: (amount: number) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      try {
        // In a real app, this would verify the session with your backend
        const storedUser = localStorage.getItem("tailspin_user")
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
      } catch (error) {
        console.error("Auth check failed:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const addTokens = (amount: number) => {
    if (!user) return

    const newTokens = Math.min(user.tokens + amount, user.maxTokens)
    const updatedUser = { ...user, tokens: newTokens }
    setUser(updatedUser)
    localStorage.setItem("tailspin_user", JSON.stringify(updatedUser))
  }

  const useTokens = (amount: number) => {
    if (!user || user.tokens < amount) return false

    const updatedUser = { ...user, tokens: user.tokens - amount }
    setUser(updatedUser)
    localStorage.setItem("tailspin_user", JSON.stringify(updatedUser))
    return true
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // In a real app, this would call your authentication API
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call

      // Mock validation - in a real app, this would be handled by your backend
      if (email === "demo@example.com" && password === "password") {
        const mockUser = {
          id: "user_123",
          email: "demo@example.com",
          username: "DemoPlayer",
          tokens: 35,
          maxTokens: 50,
          stats: {
            gamesPlayed: 42,
            bestScore: 128,
            winRate: 68,
            avgWordLength: 5.2,
          },
          achievements: [
            {
              id: "chain_terminator",
              name: "Chain Terminator",
              description: "End 5 word chains with terminal words",
              icon: "badge",
              color: "blue",
              dateEarned: "2023-05-15",
            },
            {
              id: "word_master",
              name: "Word Master",
              description: "Use 10 words with 8+ letters",
              icon: "badge",
              color: "green",
              dateEarned: "2023-05-18",
            },
            {
              id: "vocabulary_virtuoso",
              name: "Vocabulary Virtuoso",
              description: "Use 50 unique words",
              icon: "badge",
              color: "purple",
              dateEarned: "2023-05-20",
            },
            {
              id: "speed_demon",
              name: "Speed Demon",
              description: "Complete a daily challenge in under 30 seconds",
              icon: "badge",
              color: "amber",
              dateEarned: "2023-05-22",
            },
            {
              id: "combo_king",
              name: "Combo King",
              description: "Create a chain of 10+ words",
              icon: "badge",
              color: "red",
              dateEarned: "2023-05-10",
            },
          ],
          discoveredTerminals: ["zz", "qx", "jz", "vx", "wx"],
        }
        setUser(mockUser)
        localStorage.setItem("tailspin_user", JSON.stringify(mockUser))
        return { success: true }
      }

      return { success: false, message: "Invalid email or password" }
    } catch (error) {
      console.error("Login failed:", error)
      return { success: false, message: "An error occurred during login" }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, username: string, password: string) => {
    setIsLoading(true)
    try {
      // In a real app, this would call your registration API
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call

      // Mock registration - in a real app, this would be handled by your backend
      const mockUser = {
        id: "user_" + Math.random().toString(36).substr(2, 9),
        email,
        username,
        tokens: 10, // Starting tokens for new users
        maxTokens: 50,
        stats: {
          gamesPlayed: 0,
          bestScore: 0,
          winRate: 0,
          avgWordLength: 0,
        },
        achievements: [],
        discoveredTerminals: [],
      }
      setUser(mockUser)
      localStorage.setItem("tailspin_user", JSON.stringify(mockUser))
      return { success: true }
    } catch (error) {
      console.error("Registration failed:", error)
      return { success: false, message: "An error occurred during registration" }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("tailspin_user")
  }

  const resetPassword = async (email: string) => {
    setIsLoading(true)
    try {
      // In a real app, this would call your password reset API
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call
      return { success: true, message: "Password reset instructions sent to your email" }
    } catch (error) {
      console.error("Password reset failed:", error)
      return { success: false, message: "An error occurred during password reset" }
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    setIsLoading(true)
    try {
      // In a real app, this would redirect to Google OAuth
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate API call

      // Mock successful Google login
      const mockUser = {
        id: "google_" + Math.random().toString(36).substr(2, 9),
        email: "google.user@example.com",
        username: "GoogleUser",
        tokens: 25,
        maxTokens: 50,
        stats: {
          gamesPlayed: 15,
          bestScore: 87,
          winRate: 60,
          avgWordLength: 4.8,
        },
        achievements: [
          {
            id: "chain_terminator",
            name: "Chain Terminator",
            description: "End 5 word chains with terminal words",
            icon: "badge",
            color: "blue",
            dateEarned: "2023-05-15",
          },
        ],
        discoveredTerminals: ["zz", "qx"],
      }
      setUser(mockUser)
      localStorage.setItem("tailspin_user", JSON.stringify(mockUser))
      return { success: true }
    } catch (error) {
      console.error("Google login failed:", error)
      return { success: false, message: "An error occurred during Google login" }
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithFacebook = async () => {
    setIsLoading(true)
    try {
      // In a real app, this would redirect to Facebook OAuth
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate API call

      // Mock successful Facebook login
      const mockUser = {
        id: "facebook_" + Math.random().toString(36).substr(2, 9),
        email: "facebook.user@example.com",
        username: "FacebookUser",
        tokens: 18,
        maxTokens: 50,
        stats: {
          gamesPlayed: 12,
          bestScore: 76,
          winRate: 55,
          avgWordLength: 4.5,
        },
        achievements: [
          {
            id: "word_master",
            name: "Word Master",
            description: "Use 10 words with 8+ letters",
            icon: "badge",
            color: "green",
            dateEarned: "2023-05-18",
          },
        ],
        discoveredTerminals: ["vx"],
      }
      setUser(mockUser)
      localStorage.setItem("tailspin_user", JSON.stringify(mockUser))
      return { success: true }
    } catch (error) {
      console.error("Facebook login failed:", error)
      return { success: false, message: "An error occurred during Facebook login" }
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithApple = async () => {
    setIsLoading(true)
    try {
      // In a real app, this would redirect to Apple OAuth
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate API call

      // Mock successful Apple login
      const mockUser = {
        id: "apple_" + Math.random().toString(36).substr(2, 9),
        email: "apple.user@example.com",
        username: "AppleUser",
        tokens: 15,
        maxTokens: 50,
        stats: {
          gamesPlayed: 8,
          bestScore: 65,
          winRate: 50,
          avgWordLength: 4.2,
        },
        achievements: [],
        discoveredTerminals: ["jz"],
      }
      setUser(mockUser)
      localStorage.setItem("tailspin_user", JSON.stringify(mockUser))
      return { success: true }
    } catch (error) {
      console.error("Apple login failed:", error)
      return { success: false, message: "An error occurred during Apple login" }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        resetPassword,
        loginWithGoogle,
        loginWithFacebook,
        loginWithApple,
        addTokens,
        useTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
