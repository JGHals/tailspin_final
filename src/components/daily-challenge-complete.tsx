"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trophy, Share2, Coins, Star, Clock, Target, Sparkles } from "lucide-react"
import { WordChain } from "@/components/word-chain"
import confetti from "canvas-confetti"
import { useEffect } from "react"
import type { Achievement } from "@/lib/types/user-profile"

interface DailyChallengeCompleteProps {
  isOpen: boolean
  onClose: () => void
  words: string[]
  score: number
  moves: number
  maxMoves: number
  timeTaken: number | null
  tokensEarned: number
  achievements?: Achievement[]
  stats?: {
    underPar: boolean
    fastSolve: boolean
    optimalPath: boolean
    noMistakes: boolean
    rareLetters: number
    powerUpsUsed: number
  }
}

export function DailyChallengeComplete({
  isOpen,
  onClose,
  words,
  score,
  moves,
  maxMoves,
  timeTaken,
  tokensEarned,
  achievements = [],
  stats
}: DailyChallengeCompleteProps) {
  // Trigger confetti when the modal opens
  useEffect(() => {
    if (isOpen) {
      const duration = 3000
      const end = Date.now() + duration

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 70,
          origin: { x: 0 },
          colors: ["#3b82f6", "#10b981", "#f59e0b"],
        })

        confetti({
          particleCount: 3,
          angle: 120,
          spread: 70,
          origin: { x: 1 },
          colors: ["#3b82f6", "#10b981", "#f59e0b"],
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }

      frame()
    }
  }, [isOpen])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleShare = () => {
    const shareText = `I completed today's TailSpin Daily Challenge with a score of ${score} in ${
      timeTaken ? formatTime(timeTaken) : "???"
    }! Can you beat that? #TailSpinGame`

    if (navigator.share) {
      navigator
        .share({
          title: "TailSpin Daily Challenge",
          text: shareText,
          url: window.location.href,
        })
        .catch((err) => {
          console.error("Error sharing:", err)
        })
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard
        .writeText(shareText)
        .then(() => {
          alert("Copied to clipboard!")
        })
        .catch((err) => {
          console.error("Error copying to clipboard:", err)
        })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center text-xl">
            <Trophy className="h-6 w-6 text-yellow-500 mr-2" />
            Daily Challenge Complete!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Your Score</div>
            <div className="text-3xl font-bold">{score}</div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Moves</div>
              <div className="font-medium">
                {moves}/{maxMoves}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Time</div>
              <div className="font-medium">{timeTaken ? formatTime(timeTaken) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tokens</div>
              <div className="font-medium flex items-center justify-center">
                <Coins className="h-3 w-3 mr-1 text-yellow-500" />
                {tokensEarned}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-2">Your Word Chain</div>
            <WordChain words={words} maxDisplay={words.length} />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
            <div className="text-sm font-medium mb-1 flex items-center">
              <Coins className="h-4 w-4 mr-1 text-yellow-500" />
              Tokens Earned
            </div>
            <div className="text-sm">
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Base reward: 3 tokens</li>
                <li>Completion bonus: +5 tokens</li>
                {stats?.underPar && (
                  <li className="flex items-center">
                    <Target className="h-3 w-3 mr-1 text-green-500" />
                    Under par bonus: +{Math.floor((maxMoves - moves) * 1.5)} tokens
                  </li>
                )}
                {stats?.fastSolve && (
                  <li className="flex items-center">
                    <Clock className="h-3 w-3 mr-1 text-blue-500" />
                    Fast solve bonus: +2 tokens
                  </li>
                )}
                {stats?.optimalPath && (
                  <li className="flex items-center">
                    <Star className="h-3 w-3 mr-1 text-purple-500" />
                    Optimal path bonus: +3 tokens
                  </li>
                )}
                {stats?.noMistakes && (
                  <li className="flex items-center">
                    <Sparkles className="h-3 w-3 mr-1 text-yellow-500" />
                    Perfect play bonus: +2 tokens
                  </li>
                )}
                {(stats?.rareLetters ?? 0) > 0 && (
                  <li className="flex items-center">
                    <Star className="h-3 w-3 mr-1 text-orange-500" />
                    Rare letter bonus: +{stats?.rareLetters} tokens
                  </li>
                )}
                {(stats?.powerUpsUsed ?? 0) > 0 && (
                  <li className="text-red-500">
                    Power-up penalty: -{stats?.powerUpsUsed} tokens
                  </li>
                )}
              </ul>
            </div>
          </div>

          {achievements.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
              <div className="text-sm font-medium mb-1 flex items-center">
                <Trophy className="h-4 w-4 mr-1 text-yellow-500" />
                Achievements Unlocked
              </div>
              <div className="text-sm">
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {achievements.map((achievement) => (
                    <li key={achievement.id} className="flex items-center">
                      <Star className="h-3 w-3 mr-1 text-yellow-500" />
                      {achievement.name} (+{achievement.reward} tokens)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="sm:flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button className="sm:flex-1" onClick={onClose}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
