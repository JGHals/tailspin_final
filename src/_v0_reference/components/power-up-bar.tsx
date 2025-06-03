"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Lightbulb, Wand2, FlipHorizontal, BracketsIcon, Zap, Undo, Info, Coins } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { PowerUpInfoModal } from "@/components/power-up-info-modal"

export type PowerUpType = "hint" | "undo" | "warp" | "flip" | "bridge"

interface PowerUpBarProps {
  onUsePowerUp: (type: PowerUpType) => void
  disabled?: boolean
}

export function PowerUpBar({ onUsePowerUp, disabled = false }: PowerUpBarProps) {
  const { user } = useAuth()
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const powerUps = [
    {
      type: "hint" as PowerUpType,
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
      label: "Hint",
      tokenCost: 2,
    },
    {
      type: "undo" as PowerUpType,
      icon: <Undo className="h-5 w-5 text-orange-500" />,
      label: "Undo",
      tokenCost: 3,
    },
    {
      type: "warp" as PowerUpType,
      icon: <Wand2 className="h-5 w-5 text-blue-500" />,
      label: "Warp",
      tokenCost: 6,
    },
    {
      type: "flip" as PowerUpType,
      icon: <FlipHorizontal className="h-5 w-5 text-purple-500" />,
      label: "Flip",
      tokenCost: 4,
    },
    {
      type: "bridge" as PowerUpType,
      icon: <BracketsIcon className="h-5 w-5 text-amber-500" />,
      label: "Bridge",
      tokenCost: 5,
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <Zap className="h-4 w-4 mr-2 text-yellow-500" />
          <span>Power-ups</span>
        </div>
        <div className="flex items-center space-x-2">
          {user && (
            <span className="text-sm">
              Tokens: <span className="font-medium">{user.tokens}</span>
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowInfoModal(true)} className="h-8 w-8 p-0">
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Power-up buttons - cleaner design without costs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-1">
        {powerUps.map((powerUp) => (
          <Button
            key={powerUp.type}
            variant="outline"
            onClick={() => onUsePowerUp(powerUp.type)}
            disabled={disabled || !user || user.tokens < powerUp.tokenCost}
            className="flex flex-col items-center justify-center h-20 sm:h-16 p-3 text-xs gap-2"
          >
            {powerUp.icon}
            <span className="font-medium">{powerUp.label}</span>
          </Button>
        ))}
      </div>

      {/* Token costs display */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          {powerUps.map((powerUp) => (
            <div key={`cost-${powerUp.type}`} className="flex flex-col items-center flex-1">
              <div className="flex items-center">
                <Coins className="h-3 w-3 mr-1 text-yellow-500" />
                <span className="font-bold">{powerUp.tokenCost}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-muted-foreground">tokens per use</div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <PowerUpInfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} onUsePowerUp={onUsePowerUp} />
    </div>
  )
}
