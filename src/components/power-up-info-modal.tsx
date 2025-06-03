"use client"

import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info, Lightbulb, Wand2, FlipHorizontal, BracketsIcon, Undo, Coins } from "lucide-react"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { powerUpSystem } from "@/lib/game/power-up-system"
import type { PowerUpInventory } from "@/lib/types/user-profile"

export type PowerUpType = keyof PowerUpInventory

interface PowerUpInfo {
  type: PowerUpType
  icon: React.ReactNode
  label: string
  description: string
  tokenCost: number
  color: string
}

interface PowerUpInfoModalProps {
  isOpen: boolean
  onClose: () => void
  onUsePowerUp: (type: PowerUpType) => void
}

export function PowerUpInfoModal({ isOpen, onClose, onUsePowerUp }: PowerUpInfoModalProps) {
  const { profile } = useUserProfile()
  const costs = powerUpSystem.getCosts()

  const powerUps: PowerUpInfo[] = [
    {
      type: "hint",
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
      label: "Hint",
      description: "Get suggestions for valid next words",
      tokenCost: costs.hint,
      color: "text-yellow-500",
    },
    {
      type: "undo",
      icon: <Undo className="h-5 w-5 text-orange-500" />,
      label: "Undo",
      description: "Remove the last word from your chain",
      tokenCost: costs.undo,
      color: "text-orange-500",
    },
    {
      type: "wordWarp",
      icon: <Wand2 className="h-5 w-5 text-blue-500" />,
      label: "Word Warp",
      description: "Choose any two-letter combo to continue your chain",
      tokenCost: costs.wordWarp,
      color: "text-blue-500",
    },
    {
      type: "flip",
      icon: <FlipHorizontal className="h-5 w-5 text-purple-500" />,
      label: "Flip",
      description: "Reverse the last two letters to find new paths",
      tokenCost: costs.flip,
      color: "text-purple-500",
    },
    {
      type: "bridge",
      icon: <BracketsIcon className="h-5 w-5 text-amber-500" />,
      label: "Bridge",
      description: "Add a wildcard word to bridge your chain",
      tokenCost: costs.bridge,
      color: "text-amber-500",
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Power-Ups Guide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">Your Tokens:</span>
            </div>
            <span className="font-bold">{profile?.tokens || 0}</span>
          </div>

          <div className="space-y-4">
            {powerUps.map((powerUp) => (
              <div
                key={powerUp.type}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50"
              >
                <div className="flex items-center space-x-3">
                  {powerUp.icon}
                  <div>
                    <div className="font-medium">{powerUp.label}</div>
                    <div className="text-sm text-muted-foreground">{powerUp.description}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <div className="text-sm font-medium flex items-center">
                    <Coins className="h-3 w-3 mr-1 text-yellow-500" />
                    {powerUp.tokenCost}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Available: {profile?.powerUps?.[powerUp.type] || 0}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onUsePowerUp(powerUp.type)}
                    disabled={
                      !profile || 
                      profile.tokens < powerUp.tokenCost || 
                      (profile.powerUps?.[powerUp.type] || 0) <= 0
                    }
                    className="h-7 px-3 text-xs"
                  >
                    Use
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-medium">How to Get More Tokens</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>• Complete daily challenges (+3 tokens)</li>
              <li>• Maintain login streaks (+1 per day)</li>
              <li>• Discover terminal words (+2 tokens)</li>
              <li>• Unlock achievements (+5 tokens)</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
