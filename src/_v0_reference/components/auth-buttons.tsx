"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut, LogIn, UserPlus } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function AuthButtons() {
  const { user, logout } = useAuth()

  if (user) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Logout</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="flex space-x-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Link href="/auth/login">
                <LogIn className="h-5 w-5" />
                <span className="sr-only">Login</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Login</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Link href="/auth/register">
                <UserPlus className="h-5 w-5" />
                <span className="sr-only">Register</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Register</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
