import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Trophy, Medal, Calendar } from "lucide-react"

export default function LeaderboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-white dark:bg-slate-950">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Leaderboard</h1>
          <div className="w-20"></div> {/* Spacer for alignment */}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
              Top Players
            </CardTitle>
            <CardDescription>See who's leading in TailSpin</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="daily" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  Daily
                </TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs">
                  Weekly
                </TabsTrigger>
                <TabsTrigger value="alltime" className="text-xs">
                  All Time
                </TabsTrigger>
              </TabsList>

              <TabsContent value="daily" className="space-y-2">
                {[
                  { rank: 1, name: "WordMaster", score: 142 },
                  { rank: 2, name: "LexiconPro", score: 136 },
                  { rank: 3, name: "ChainBuilder", score: 129 },
                  { rank: 4, name: "LetterWizard", score: 124 },
                  { rank: 5, name: "VocabKing", score: 118 },
                ].map((player) => (
                  <div
                    key={player.rank}
                    className={`flex items-center justify-between p-3 rounded-md ${
                      player.rank === 1
                        ? "bg-yellow-50 dark:bg-yellow-900/20"
                        : player.rank === 2
                          ? "bg-gray-100 dark:bg-gray-800/50"
                          : player.rank === 3
                            ? "bg-amber-50 dark:bg-amber-900/20"
                            : "bg-white dark:bg-slate-900"
                    } border`}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3">
                        {player.rank === 1 ? (
                          <Medal className="h-5 w-5 text-yellow-500" />
                        ) : player.rank === 2 ? (
                          <Medal className="h-5 w-5 text-gray-400" />
                        ) : player.rank === 3 ? (
                          <Medal className="h-5 w-5 text-amber-700" />
                        ) : (
                          <span className="font-bold text-muted-foreground">{player.rank}</span>
                        )}
                      </div>
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <div className="font-bold">{player.score}</div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="weekly" className="space-y-2">
                {/* Similar content for weekly leaderboard */}
                <div className="text-center text-muted-foreground py-8">Weekly leaderboard data</div>
              </TabsContent>

              <TabsContent value="alltime" className="space-y-2">
                {/* Similar content for all-time leaderboard */}
                <div className="text-center text-muted-foreground py-8">All-time leaderboard data</div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
