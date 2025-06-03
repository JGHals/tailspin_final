"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GameLogo } from "@/components/game-logo"
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react"
import { SocialLoginButton } from "@/components/social-login-button"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const { user, signInWithGoogle, isLoading } = useAuth()
  const router = useRouter()

  // Redirect to home if already authenticated
  useEffect(() => {
    if (user && !isLoading && !isSigningIn) {
      router.replace("/")
    }
  }, [user, isLoading, isSigningIn, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // Email/password login not implemented yet
    setError("Please use Google sign-in to log in")
  }

  const handleGoogleLogin = async () => {
    try {
      setError(null)
      setIsSigningIn(true)
      await signInWithGoogle()
      // Navigation will be handled by the useEffect above
    } catch (err: any) {
      if (err.message) {
        setError(err.message)
      } else {
        setError("Failed to sign in with Google")
      }
      console.error("Google sign in error:", err)
    } finally {
      setIsSigningIn(false)
    }
  }

  // Show loading state while checking authentication
  if (isLoading || isSigningIn) {
    return (
      <div className="container flex flex-col items-center justify-center min-h-screen py-2">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // If already authenticated, show nothing (useEffect will handle redirect)
  if (user) {
    return null
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-white dark:bg-slate-950">
      <div className="w-full max-w-md mx-auto">
        <div className="flex flex-col items-center mb-6">
          <GameLogo className="h-16 w-16 mb-4" />
          <h1 className="text-3xl font-bold tracking-tight">TAILSPIN</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Connect words where each new word starts with the last two letters of the previous word
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-4">
                <SocialLoginButton 
                  provider="google" 
                  onClick={handleGoogleLogin} 
                  isLoading={isLoading || isSigningIn}
                  disabled={isLoading || isSigningIn}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24"
                    viewBox="0 0 24 24"
                    width="24"
                    className="h-5 w-5"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  <span>Sign in with Google</span>
                </SocialLoginButton>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || isSigningIn}>
                  {isLoading || isSigningIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="text-blue-600 dark:text-blue-400 hover:underline">
                Register
              </Link>
            </div>
            <div className="text-xs text-center text-muted-foreground">
              By logging in, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
