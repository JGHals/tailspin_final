"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Lightbulb, Wand2, FlipHorizontal, BracketsIcon, Zap, Undo, Info, Coins } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { PowerUpInfoModal } from "@/components/power-up-info-modal"
import { powerUpSystem } from "@/lib/game/power-up-system"
import type { PowerUpInventory } from "@/lib/types/user-profile"

export type PowerUpType = keyof PowerUpInventory

interface PowerUpBarProps {
  onUsePowerUp: (type: PowerUpType) => void
  disabled?: boolean
}

export function PowerUpBar({ onUsePowerUp, disabled = false }: PowerUpBarProps) {
  const { profile } = useUserProfile()
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const costs = powerUpSystem.getCosts()

  const powerUps = [
    {
      type: "hint" as PowerUpType,
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
      label: "Hint",
      tokenCost: costs.hint,
      count: profile?.powerUps?.hint || 0
    },
    {
      type: "undo" as PowerUpType,
      icon: <Undo className="h-5 w-5 text-orange-500" />,
      label: "Undo",
      tokenCost: costs.undo,
      count: profile?.powerUps?.undo || 0
    },
    {
      type: "wordWarp" as PowerUpType,
      icon: <Wand2 className="h-5 w-5 text-blue-500" />,
      label: "Word Warp",
      tokenCost: costs.wordWarp,
      count: profile?.powerUps?.wordWarp || 0
    },
    {
      type: "flip" as PowerUpType,
      icon: <FlipHorizontal className="h-5 w-5 text-purple-500" />,
      label: "Flip",
      tokenCost: costs.flip,
      count: profile?.powerUps?.flip || 0
    },
    {
      type: "bridge" as PowerUpType,
      icon: <BracketsIcon className="h-5 w-5 text-amber-500" />,
      label: "Bridge",
      tokenCost: costs.bridge,
      count: profile?.powerUps?.bridge || 0
    },
  ]

  const handleUsePowerUp = async (type: PowerUpType) => {
    if (!profile) {
      setError("Please sign in to use power-ups")
      return
    }

    const powerUp = powerUps.find(p => p.type === type)
    if (!powerUp) return

    if (profile.tokens < powerUp.tokenCost) {
      setError(`Not enough tokens. Need ${powerUp.tokenCost} tokens.`)
      return
    }

    if (powerUp.count <= 0) {
      setError(`No ${powerUp.label} power-ups remaining.`)
      return
    }

    setError(null)
    onUsePowerUp(type)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <Zap className="h-4 w-4 mr-2 text-yellow-500" />
          <span>Power-ups</span>
        </div>
        <div className="flex items-center space-x-2">
          {profile && (
            <span className="text-sm">
              Tokens: <span className="font-medium">{profile.tokens}</span>
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowInfoModal(true)} className="h-8 w-8 p-0">
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Power-up buttons */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-1">
        {powerUps.map((powerUp) => (
          <Button
            key={powerUp.type}
            variant="outline"
            onClick={() => handleUsePowerUp(powerUp.type)}
            disabled={
              disabled || 
              !profile || 
              profile.tokens < powerUp.tokenCost || 
              powerUp.count <= 0
            }
            className="flex flex-col items-center justify-center h-20 sm:h-16 p-3 text-xs gap-2"
          >
            {powerUp.icon}
            <div className="flex flex-col items-center">
              <span className="font-medium">{powerUp.label}</span>
              <span className="text-xs text-muted-foreground">({powerUp.count})</span>
            </div>
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

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}

      <PowerUpInfoModal 
        isOpen={showInfoModal} 
        onClose={() => setShowInfoModal(false)} 
        onUsePowerUp={handleUsePowerUp} 
      />
    </div>
  )
}
