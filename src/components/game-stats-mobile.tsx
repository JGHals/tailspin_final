"use client"

import { memo, useMemo, useState } from "react"
import type { FC, ComponentType } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info, Trophy, Hash, Timer } from "lucide-react"
import { useGame } from "@/lib/contexts/GameContext"
import { cn } from "@/lib/utils"
import * as React from "react"

interface GameStatsMobileProps {
  score: number
  moves: number
  maxMoves?: number
  timeTaken?: number
}

type StatItemProps = Omit<React.ComponentProps<typeof Button>, 'icon'> & {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string | number
  subValue?: string
}

const StatItem = React.forwardRef<HTMLButtonElement, StatItemProps>(({
  icon: Icon,
  label,
  value,
  subValue,
  className,
  ...props
}, ref) => (
  <Button 
    ref={ref}
    variant="outline" 
    className={cn("h-auto p-3 flex flex-col items-center", className)}
    {...props}
  >
    <div className="text-xs text-muted-foreground mb-1 flex items-center">
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </div>
    <div className="font-bold text-lg">
      {value}
      {subValue && (
        <span className="text-muted-foreground text-sm">/{subValue}</span>
      )}
    </div>
  </Button>
))

StatItem.displayName = "StatItem"

const MemoizedStatItem = memo(StatItem)

export const GameStatsMobile: FC<GameStatsMobileProps> = memo(({ 
  score, 
  moves, 
  maxMoves, 
  timeTaken 
}) => {
  const [showInfo, setShowInfo] = useState(false)
  const { gameState } = useGame()

  // Memoize formatted time
  const formattedTime = useMemo(() => {
    if (!timeTaken) return null
    const minutes = Math.floor(timeTaken / 60)
    const seconds = timeTaken % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [timeTaken])

  // Get letter tracking info
  const letterTracking = gameState?.ui?.letterTracking
  const uniqueLetterCount = letterTracking?.uniqueLetterCount || 0
  const rareLetterCount = letterTracking?.rareLetterCount || 0
  const terminalWordsCount = gameState?.terminalWords?.size || 0

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <MemoizedStatItem
          icon={Trophy}
          label="Score"
          value={score}
          onClick={() => setShowInfo(true)}
        />
        <MemoizedStatItem
          icon={Hash}
          label="Moves"
          value={moves}
          subValue={maxMoves?.toString()}
          onClick={() => setShowInfo(true)}
        />
        {formattedTime && (
          <MemoizedStatItem
            icon={Timer}
            label="Time"
            value={formattedTime}
            onClick={() => setShowInfo(true)}
            className="col-span-2"
          />
        )}
      </div>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <Info className="h-5 w-5 mr-2" />
              Game Stats
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Score</span>
                <span className="font-medium">{score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Moves</span>
                <span className="font-medium">
                  {maxMoves ? `${moves}/${maxMoves}` : moves}
                </span>
              </div>
            </div>

            {formattedTime && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{formattedTime}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unique Letters Used</span>
                <span className="font-medium">{uniqueLetterCount}/26</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rare Letters Used</span>
                <span className="font-medium">{rareLetterCount}</span>
              </div>
            </div>

            {terminalWordsCount > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Terminal Words</span>
                  <span className="font-medium">{terminalWordsCount}</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

GameStatsMobile.displayName = "GameStatsMobile"
