"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Lightbulb } from "lucide-react"
import { useGame } from "@/lib/contexts/GameContext"
import { useState } from "react"
import { getHintWords } from "@/lib/game-utils"

interface HintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HintModal({ open, onOpenChange }: HintModalProps) {
  const { gameState, useHint } = useGame()
  const [isLoading, setIsLoading] = useState(false)

  const handleUseHint = async () => {
    if (!gameState) return
    setIsLoading(true)
    await useHint()
    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
            Word Hints
          </DialogTitle>
          <DialogDescription>
            Get help finding valid words that continue your chain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Using a hint will cost you 10 points from your final score.
          </div>

          <div className="space-y-2">
            <div className="font-medium">Available Hints:</div>
            <div className="text-2xl font-bold">
              {gameState?.hints?.length ?? 0}
            </div>
          </div>

          <Button
            onClick={handleUseHint}
            className="w-full"
            disabled={isLoading || !gameState?.hints?.length}
          >
            {isLoading ? "Loading..." : "Use Hint"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
