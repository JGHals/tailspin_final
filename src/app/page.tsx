"use client"

import { useAuth } from "@/lib/hooks/useAuth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DailyChallenge } from "@/components/daily-challenge"
import { EndlessMode } from "@/components/endless-mode"
import { MultiplayerMode } from "@/components/multiplayer-mode"
import { MobileNavigation } from "@/components/mobile-navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LogIn } from "lucide-react"

export default function Home() {
  const { user } = useAuth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-white dark:bg-slate-950">
      <div className="w-full max-w-md mx-auto space-y-6">
        <MobileNavigation />

        <p className="text-sm text-muted-foreground text-center">
          Connect words where each new word starts with the last two letters of the previous word
        </p>

        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger
              value="daily"
              className="text-sm py-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Daily
            </TabsTrigger>
            <TabsTrigger
              value="endless"
              className="text-sm py-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Endless
            </TabsTrigger>
            <TabsTrigger
              value="multiplayer"
              className="text-sm py-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Versus
            </TabsTrigger>
          </TabsList>
          <TabsContent value="daily">
            {!user ? (
              <div className="flex flex-col items-center justify-center p-4 space-y-4">
                <p className="text-sm text-muted-foreground">Please sign in to play the daily challenge</p>
                <Button variant="outline" asChild>
                  <Link href="/auth/login" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign in with Google
                  </Link>
                </Button>
              </div>
            ) : (
              <DailyChallenge />
            )}
          </TabsContent>
          <TabsContent value="endless">
            <EndlessMode />
          </TabsContent>
          <TabsContent value="multiplayer">
            <MultiplayerMode />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
