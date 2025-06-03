"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { User, Trophy, LogOut, LogIn, UserPlus } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { GameInfo } from "@/components/game-info"

export function MobileNavigation() {
  const { user, signOut: logout } = useAuth()

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center justify-center text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">TAILSPIN</h1>
        <div className="ml-2">
          <GameInfo />
        </div>
      </div>

      <div className="flex flex-col space-y-1">
        <div className="flex space-x-1">
          <Button variant="ghost" size="sm" asChild className="flex flex-col h-auto p-2">
            <Link href="/leaderboard">
              <Trophy className="h-4 w-4" />
              <span className="text-xs">Ranks</span>
            </Link>
          </Button>

          <Button variant="ghost" size="sm" asChild className="flex flex-col h-auto p-2">
            <Link href="/profile">
              <User className="h-4 w-4" />
              <span className="text-xs">Profile</span>
            </Link>
          </Button>

          {user ? (
            <Button variant="ghost" size="sm" onClick={logout} className="flex flex-col h-auto p-2">
              <LogOut className="h-4 w-4" />
              <span className="text-xs">Logout</span>
            </Button>
          ) : (
            <div className="flex space-x-1">
              <Button variant="ghost" size="sm" asChild className="flex flex-col h-auto p-2">
                <Link href="/auth/login">
                  <LogIn className="h-4 w-4" />
                  <span className="text-xs">Login</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="flex flex-col h-auto p-2">
                <Link href="/auth/register">
                  <UserPlus className="h-4 w-4" />
                  <span className="text-xs">Sign Up</span>
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
