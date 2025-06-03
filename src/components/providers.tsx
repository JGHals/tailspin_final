"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/contexts/AuthContext"
import { GameProvider } from "@/lib/contexts/GameContext"
import { ConnectionProvider } from "@/lib/contexts/connection-context"
import { Toaster } from "@/components/ui/toaster"
import { type ReactNode, useEffect, useState } from "react"
import { startupService } from "@/lib/services/startup-service"

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        await startupService.initialize()
      } catch (error) {
        console.error("Failed to initialize startup service:", error)
      }
      setMounted(true)
    }
    init()
  }, [])

  if (!mounted) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <ConnectionProvider>
        <AuthProvider>
          <GameProvider>
            {children}
            <Toaster />
          </GameProvider>
        </AuthProvider>
      </ConnectionProvider>
    </ThemeProvider>
  )
} 