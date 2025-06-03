"use client"

import { useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { achievementService } from "@/lib/services/achievement-service"
import { Trophy, Star, Lock, Check } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { LoadingState } from "@/components/ui/loading-state"
import type { Achievement } from "@/lib/types/user-profile"

export default function AchievementsPage() {
  const { user } = useAuth()
  const { profile, loading } = useUserProfile()
  const [selectedCategory, setSelectedCategory] = useState<Achievement["category"]>("global")

  const achievements = achievementService.getAchievementDefinitions()
  const userAchievements = new Map(profile?.achievements.map(a => [a.id, a]) || [])

  const filteredAchievements = achievements.filter(a => a.category === selectedCategory)

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
          <Trophy className="h-6 w-6 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-sm text-muted-foreground">
            Complete challenges to earn rewards and unlock achievements
          </p>
        </div>
      </div>

      <LoadingState loading={loading} loadingMessage="Loading achievements...">
        <Tabs defaultValue="global" onValueChange={(value) => setSelectedCategory(value as Achievement["category"])}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="endless">Endless</TabsTrigger>
            <TabsTrigger value="versus">Versus</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="space-y-4 mt-6">
            {filteredAchievements.map((achievement) => {
              const userAchievement = userAchievements.get(achievement.id)
              const progress = userAchievement?.progress || 0
              const isCompleted = userAchievement?.completed || false

              return (
                <div
                  key={achievement.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    isCompleted
                      ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-md ${
                      isCompleted
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      {isCompleted ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <Lock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{achievement.name}</div>
                        {isCompleted && (
                          <Star className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {achievement.description}
                      </p>
                      
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {progress} / {achievement.maxProgress}
                          </span>
                        </div>
                        <Progress value={(progress / achievement.maxProgress) * 100} />
                      </div>

                      {!isCompleted && (
                        <div className="flex items-center gap-1 mt-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-yellow-500">
                            +{achievement.reward} tokens
                          </span>
                        </div>
                      )}

                      {isCompleted && userAchievement?.completedAt && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Completed {new Date(userAchievement.completedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </TabsContent>
        </Tabs>
      </LoadingState>
    </div>
  )
} 