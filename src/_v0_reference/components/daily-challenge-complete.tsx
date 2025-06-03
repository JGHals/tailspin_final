"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trophy, Share2, Coins } from "lucide-react"
import { WordChain } from "@/components/word-chain"
import confetti from "canvas-confetti"
import { useEffect } from "react"

interface DailyChallengeCompleteProps {
  isOpen: boolean
  onClose: () => void
  words: string[]
  score: number
  moves: number
  maxMoves: number
  timeTaken: number | null
  tokensEarned: number
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
    // In a real app, this would open a share dialog or copy to clipboard
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
                {timeTaken && timeTaken < 30 && <li>Fast solve bonus: +2 tokens</li>}
                {tokensEarned > 8 && <li>Rare letter bonus: +{tokensEarned - 8} tokens</li>}
              </ul>
            </div>
          </div>
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
