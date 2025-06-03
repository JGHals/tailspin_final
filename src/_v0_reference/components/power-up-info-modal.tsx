"use client"

import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info, Lightbulb, Wand2, FlipHorizontal, BracketsIcon, Undo, Coins } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export type PowerUpType = "hint" | "undo" | "warp" | "flip" | "bridge"

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
  const { user } = useAuth()

  const powerUps: PowerUpInfo[] = [
    {
      type: "hint",
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
      label: "Hint",
      description: "Get word suggestions that follow the chain rule",
      tokenCost: 2,
      color: "text-yellow-500",
    },
    {
      type: "undo",
      icon: <Undo className="h-5 w-5 text-orange-500" />,
      label: "Undo",
      description: "Remove the last word from the chain",
      tokenCost: 3,
      color: "text-orange-500",
    },
    {
      type: "warp",
      icon: <Wand2 className="h-5 w-5 text-blue-500" />,
      label: "Word Warp",
      description: "Select any valid 2-letter combo to continue",
      tokenCost: 6,
      color: "text-blue-500",
    },
    {
      type: "flip",
      icon: <FlipHorizontal className="h-5 w-5 text-purple-500" />,
      label: "Flip",
      description: "Invert the current 2-letter combo if valid",
      tokenCost: 4,
      color: "text-purple-500",
    },
    {
      type: "bridge",
      icon: <BracketsIcon className="h-5 w-5 text-amber-500" />,
      label: "Bridge",
      description: "Place a wildcard word to continue the chain",
      tokenCost: 5,
      color: "text-amber-500",
    },
  ]

  const handleUsePowerUp = (type: PowerUpType) => {
    onUsePowerUp(type)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Power-Ups
            {user && (
              <span className="ml-auto text-sm font-normal flex items-center">
                <Coins className="h-4 w-4 mr-1 text-yellow-500" />
                {user.tokens}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
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
                <Button
                  size="sm"
                  onClick={() => handleUsePowerUp(powerUp.type)}
                  disabled={!user || user.tokens < powerUp.tokenCost}
                  className="h-7 px-3 text-xs"
                >
                  Use
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
