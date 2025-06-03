"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import * as LucideIcons from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Achievement } from "@/lib/types/user-profile"
import { LoadingState } from "@/components/ui/loading-state"

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  const { profile, loading: profileLoading, error } = useUserProfile()
  const router = useRouter()
  const [showAchievements, setShowAchievements] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login")
    }
  }, [user, authLoading, router])

  // Show loading state while checking authentication or loading profile
  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LucideIcons.Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // If no user and not loading, the useEffect will handle redirect
  if (!user || !profile) {
    return null
  }

  // Get the 4 most recent achievements
  const recentAchievements = profile.achievements
    .filter(a => a.completed)
    .sort((a, b) => {
      if (!a.completedAt || !b.completedAt) return 0;
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    })
    .slice(0, 4);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-white dark:bg-slate-950">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <LucideIcons.ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Profile</h1>
          <div className="w-20"></div> {/* Spacer for alignment */}
        </div>

        <LoadingState loading={authLoading || profileLoading} error={error} isEmpty={!user}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
                  {profile.photoURL ? (
                    <Image
                      src={profile.photoURL}
                      alt={profile.displayName || 'User profile'}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                  ) : (
                    <LucideIcons.User className="h-8 w-8 text-blue-500" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl">{profile.displayName || 'Anonymous User'}</CardTitle>
                  <CardDescription>{profile.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tokens Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Tokens</h3>
                  <span className="text-sm font-medium">
                    {profile.tokens}
                  </span>
                </div>
                <Progress value={profile.tokens} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center p-3 border rounded-md">
                  <div className="text-sm text-muted-foreground">Games Played</div>
                  <div className="text-2xl font-bold">{profile.stats.gamesPlayed}</div>
                </div>
                <div className="flex flex-col items-center p-3 border rounded-md">
                  <div className="text-sm text-muted-foreground">Best Score</div>
                  <div className="text-2xl font-bold">{profile.stats.highestScore}</div>
                </div>
                <div className="flex flex-col items-center p-3 border rounded-md">
                  <div className="text-sm text-muted-foreground">Avg. Score</div>
                  <div className="text-2xl font-bold">{Math.round(profile.stats.averageScore)}</div>
                </div>
                <div className="flex flex-col items-center p-3 border rounded-md">
                  <div className="text-sm text-muted-foreground">Avg. Chain Length</div>
                  <div className="text-2xl font-bold">{Math.round(profile.stats.averageChainLength)}</div>
                </div>
              </div>

              {/* Recent Achievements */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Recent Achievements</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowAchievements(true)}>
                    View All
                    <LucideIcons.ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {recentAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-start gap-2 p-2 border rounded-md"
                    >
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <LucideIcons.Trophy className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{achievement.name}</div>
                        <div className="text-xs text-muted-foreground">{achievement.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </LoadingState>

        {/* Achievements Modal */}
        <Dialog open={showAchievements} onOpenChange={setShowAchievements}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LucideIcons.Trophy className="h-5 w-5" />
                Achievements
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
              {profile.achievements.map((achievement) => (
                <TooltipProvider key={achievement.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex items-start gap-3 p-3 border rounded-lg ${
                          achievement.completed ? "bg-blue-50 dark:bg-blue-900/20" : ""
                        }`}
                      >
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            achievement.completed
                              ? "bg-blue-100 dark:bg-blue-900"
                              : "bg-gray-100 dark:bg-gray-800"
                          }`}
                        >
                          <LucideIcons.Trophy
                            className={`h-5 w-5 ${
                              achievement.completed ? "text-blue-500" : "text-gray-400"
                            }`}
                          />
                        </div>
                        <div>
                          <div className="font-medium">{achievement.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {achievement.description}
                          </div>
                          {!achievement.completed && (
                            <div className="mt-2">
                              <Progress
                                value={(achievement.progress / achievement.maxProgress) * 100}
                                className="h-1"
                              />
                              <div className="text-xs text-muted-foreground mt-1">
                                {achievement.progress} / {achievement.maxProgress}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {achievement.completed
                          ? `Completed on ${new Date(
                              achievement.completedAt!
                            ).toLocaleDateString()}`
                          : `${achievement.progress} / ${achievement.maxProgress}`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
