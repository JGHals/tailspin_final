"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Trophy, BookOpen, Badge, User, Loader2, Share2, ChevronRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/theme-toggle"

export default function ProfilePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [showAchievements, setShowAchievements] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, isLoading, router])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // If no user and not loading, the useEffect will handle redirect
  if (!user) {
    return null
  }

  // Get the 4 most recent achievements
  const recentAchievements = user.achievements
    ? [...user.achievements]
        .sort((a, b) => {
          return new Date(b.dateEarned).getTime() - new Date(a.dateEarned).getTime()
        })
        .slice(0, 4)
    : []

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
          <h1 className="text-xl font-bold">Profile</h1>
          <div className="w-20"></div> {/* Spacer for alignment */}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <User className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-xl">{user.username}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tokens Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Tokens</h3>
                <span className="text-sm font-medium">
                  {user.tokens}/{user.maxTokens}
                </span>
              </div>
              <Progress value={(user.tokens / user.maxTokens) * 100} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-3 border rounded-md">
                <div className="text-sm text-muted-foreground">Games Played</div>
                <div className="text-2xl font-bold">{user.stats?.gamesPlayed || 0}</div>
              </div>
              <div className="flex flex-col items-center p-3 border rounded-md">
                <div className="text-sm text-muted-foreground">Best Score</div>
                <div className="text-2xl font-bold">{user.stats?.bestScore || 0}</div>
              </div>
              <div className="flex flex-col items-center p-3 border rounded-md">
                <div className="text-sm text-muted-foreground">Win Rate</div>
                <div className="text-2xl font-bold">{user.stats?.winRate || 0}%</div>
              </div>
              <div className="flex flex-col items-center p-3 border rounded-md">
                <div className="text-sm text-muted-foreground">Avg. Word Length</div>
                <div className="text-2xl font-bold">{user.stats?.avgWordLength || 0}</div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium flex items-center">
                  <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                  Achievements
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm text-blue-600 dark:text-blue-400 p-0 h-auto"
                  onClick={() => setShowAchievements(true)}
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="space-y-2">
                {recentAchievements.length > 0 ? (
                  recentAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`flex justify-between items-center p-2 bg-${achievement.color}-50 dark:bg-${achievement.color}-900/20 rounded-md`}
                    >
                      <div className="flex items-center">
                        <Badge className={`h-4 w-4 mr-2 text-${achievement.color}-500`} />
                        <span>{achievement.name}</span>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Share2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Share achievement</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-2">No achievements yet</div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-medium mb-2 flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-purple-500" />
                Terminal Words Discovered
              </h3>
              <div className="flex flex-wrap gap-2">
                {user.discoveredTerminals && user.discoveredTerminals.length > 0 ? (
                  user.discoveredTerminals.map((terminal) => (
                    <div key={terminal} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-md text-sm">
                      {terminal}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-2 w-full">No terminal words discovered yet</div>
                )}
              </div>
            </div>

            {/* Theme Toggle Section */}
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">Preferences</h3>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements Dialog */}
      <Dialog open={showAchievements} onOpenChange={setShowAchievements}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
              Achievements
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-4">
            {user.achievements && user.achievements.length > 0 ? (
              user.achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`flex justify-between items-center p-3 bg-${achievement.color}-50 dark:bg-${achievement.color}-900/20 rounded-md`}
                >
                  <div>
                    <div className="flex items-center">
                      <Badge className={`h-4 w-4 mr-2 text-${achievement.color}-500`} />
                      <span className="font-medium">{achievement.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      Earned on {new Date(achievement.dateEarned).toLocaleDateString()}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">No achievements yet</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
