"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Trophy, Medal, Calendar, Crown, Clock, Star, Zap } from "lucide-react"
import { LoadingState } from "@/components/ui/loading-state"
import { useRealtimeLeaderboard } from "@/lib/hooks/useRealtimeLeaderboard"
import { useAuth } from "@/lib/hooks/useAuth"
import type { LeaderboardPeriod } from "@/lib/types/leaderboard"
import { formatDistanceToNow } from "date-fns"

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily')
  const { data: leaderboardData, loading, error } = useRealtimeLeaderboard('daily', period, user?.id)

  const getTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Medal className="h-5 w-5 text-amber-700" />
      default:
        return <Star className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-white dark:bg-slate-950">
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Leaderboard</h1>
          <div className="w-20"></div>
        </div>

        {leaderboardData?.userRank && (
          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Your Ranking</CardTitle>
              <CardDescription>
                {period === 'daily' ? "Today's performance" : period === 'weekly' ? "This week's standing" : "All-time position"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {getRankIcon(leaderboardData.userRank)}
                  </div>
                  <div>
                    <div className="font-semibold">Rank #{leaderboardData.userRank}</div>
                    <div className="text-sm text-muted-foreground">
                      Out of {leaderboardData.totalPlayers} players
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {leaderboardData.entries.find(e => e.userId === user?.id)?.score || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">points</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="daily" className="w-full" onValueChange={(value) => setPeriod(value as LeaderboardPeriod)}>
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="daily" className="text-sm py-3">
              <Calendar className="h-4 w-4 mr-2" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-sm py-3">
              <Trophy className="h-4 w-4 mr-2" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="allTime" className="text-sm py-3">
              <Zap className="h-4 w-4 mr-2" />
              All Time
            </TabsTrigger>
          </TabsList>

          <LoadingState loading={loading} error={error} isEmpty={!leaderboardData}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {period === 'daily' && 'Daily Challenge Leaders'}
                  {period === 'weekly' && 'Weekly Leaders'}
                  {period === 'allTime' && 'All Time Leaders'}
                </CardTitle>
                <CardDescription>
                  {period === 'daily' && "Top players for today's challenge"}
                  {period === 'weekly' && 'Best performers this week'}
                  {period === 'allTime' && 'Best players overall'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboardData?.entries.map((entry, index) => (
                    <div
                      key={`${entry.userId}-${index}`}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        entry.userId === user?.id
                          ? "bg-primary/5 border-primary/20"
                          : index < 3
                          ? "bg-secondary/50"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                          {getRankIcon(index + 1)}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {entry.displayName}
                            {entry.userId === user?.id && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">You</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="inline-flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {getTimeAgo(entry.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">{entry.score}</div>
                        <div className="text-sm text-muted-foreground space-x-2">
                          <span>{entry.chain.length} words</span>
                          <span>•</span>
                          <span>{entry.moveCount} moves</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </LoadingState>
        </Tabs>

        {leaderboardData && (
          <div className="text-center text-sm text-muted-foreground">
            Last updated {getTimeAgo(leaderboardData.lastUpdated)}
          </div>
        )}
      </div>
    </main>
  )
}
