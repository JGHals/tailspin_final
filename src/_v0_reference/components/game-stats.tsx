"use client"

import type { FC } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface GameStatsProps {
  score: number
  moves: number
  timeLeft?: number | null
  maxMoves?: number | null
}

export const GameStats: FC<GameStatsProps> = ({ score, moves, timeLeft = null, maxMoves = null }) => {
  // Format time as MM:SS
  const formattedTime = timeLeft ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}` : null

  return (
    <div className="grid grid-cols-2 gap-2 text-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="border border-gray-200 dark:border-gray-800 rounded p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/40 cursor-help">
              <div className="text-xs text-muted-foreground">Score</div>
              <div className="font-bold">{score}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total points earned from words and bonuses</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="border border-gray-200 dark:border-gray-800 rounded p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/40 cursor-help">
              <div className="text-xs text-muted-foreground">Moves</div>
              <div className="font-bold">{maxMoves ? `${moves}/${maxMoves}` : moves}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{maxMoves ? `Words used out of ${maxMoves} maximum` : "Number of words in your chain"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {timeLeft !== null && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="col-span-2 border border-gray-200 dark:border-gray-800 rounded p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/40 cursor-help">
                <div className="text-xs text-muted-foreground">Time</div>
                <div className="font-bold">{formattedTime}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Remaining time for this game</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
