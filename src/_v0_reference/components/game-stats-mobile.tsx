"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"

interface GameStatsMobileProps {
  score: number
  moves: number
  timeLeft?: number | null
  maxMoves?: number | null
}

export function GameStatsMobile({ score, moves, timeLeft = null, maxMoves = null }: GameStatsMobileProps) {
  const [showInfo, setShowInfo] = useState(false)

  // Format time as MM:SS
  const formattedTime = timeLeft ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}` : null

  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-center">
        <Button variant="outline" className="h-auto p-3 flex flex-col" onClick={() => setShowInfo(true)}>
          <div className="text-xs text-muted-foreground">Score</div>
          <div className="font-bold text-lg">{score}</div>
        </Button>

        <Button variant="outline" className="h-auto p-3 flex flex-col" onClick={() => setShowInfo(true)}>
          <div className="text-xs text-muted-foreground">Moves</div>
          <div className="font-bold text-lg">{maxMoves ? `${moves}/${maxMoves}` : moves}</div>
        </Button>

        {timeLeft !== null && (
          <Button variant="outline" className="col-span-2 h-auto p-3 flex flex-col" onClick={() => setShowInfo(true)}>
            <div className="text-xs text-muted-foreground">Time</div>
            <div className="font-bold text-lg">{formattedTime}</div>
          </Button>
        )}
      </div>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Game Stats
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Score:</span>
                <span className="font-bold">{score}</span>
              </div>
              <p className="text-sm text-muted-foreground">Total points earned from words and bonuses</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Moves:</span>
                <span className="font-bold">{maxMoves ? `${moves}/${maxMoves}` : moves}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {maxMoves ? `Words used out of ${maxMoves} maximum` : "Number of words in your chain"}
              </p>
            </div>

            {timeLeft !== null && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span className="font-bold">{formattedTime}</span>
                </div>
                <p className="text-sm text-muted-foreground">Remaining time for this game</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
