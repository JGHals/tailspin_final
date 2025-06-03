"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Zap, Lightbulb, RefreshCw, Wand2, FlipHorizontal, BracketsIcon as Bridge } from "lucide-react"

export type PowerUpType = "hint" | "spin" | "warp" | "flip" | "bridge"

interface PowerUpMenuProps {
  onUsePowerUp: (type: PowerUpType) => void
  availablePowerUps: Record<PowerUpType, number>
  disabled?: boolean
}

interface PowerUpInfo {
  icon: React.ReactNode
  label: string
  description: string
  type: PowerUpType
}

export function PowerUpMenu({ onUsePowerUp, availablePowerUps, disabled = false }: PowerUpMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const powerUps: PowerUpInfo[] = [
    {
      icon: <Lightbulb className="h-4 w-4" />,
      label: "Hint",
      description: "Get word suggestions that follow the chain rule",
      type: "hint",
    },
    {
      icon: <RefreshCw className="h-4 w-4" />,
      label: "Spin Again",
      description: "Randomly reroll a valid 2-letter starting combo",
      type: "spin",
    },
    {
      icon: <Wand2 className="h-4 w-4" />,
      label: "Word Warp",
      description: "Select any valid 2-letter combo to continue",
      type: "warp",
    },
    {
      icon: <FlipHorizontal className="h-4 w-4" />,
      label: "Flip",
      description: "Invert the current 2-letter combo if valid",
      type: "flip",
    },
    {
      icon: <Bridge className="h-4 w-4" />,
      label: "Bridge",
      description: "Place a wildcard word to continue the chain",
      type: "bridge",
    },
  ]

  const handleUsePowerUp = (type: PowerUpType) => {
    if (availablePowerUps[type] > 0) {
      onUsePowerUp(type)
      setIsOpen(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full"
          disabled={disabled || Object.values(availablePowerUps).every((count) => count === 0)}
        >
          <Zap className="h-4 w-4 mr-2 text-yellow-500" />
          Power-Ups
          <Badge variant="secondary" className="ml-2">
            {Object.values(availablePowerUps).reduce((a, b) => a + b, 0)}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="center">
        <div className="p-2 border-b">
          <h3 className="font-medium">Available Power-Ups</h3>
        </div>
        <div className="p-2 space-y-1">
          {powerUps.map((powerUp) => (
            <TooltipProvider key={powerUp.type}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    disabled={availablePowerUps[powerUp.type] === 0}
                    onClick={() => handleUsePowerUp(powerUp.type)}
                  >
                    {powerUp.icon}
                    <span className="ml-2">{powerUp.label}</span>
                    <Badge variant="outline" className="ml-auto">
                      {availablePowerUps[powerUp.type]}
                    </Badge>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{powerUp.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
