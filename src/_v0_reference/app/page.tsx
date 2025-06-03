import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DailyChallenge } from "@/components/daily-challenge"
import { EndlessMode } from "@/components/endless-mode"
import { MultiplayerMode } from "@/components/multiplayer-mode"
import { MobileNavigation } from "@/components/mobile-navigation"

export default function Home() {
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
            <DailyChallenge />
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
