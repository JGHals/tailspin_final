import { useState } from 'react'
import type { GameState } from '../types/game'
import type { AuthUser } from '../contexts/AuthContext'
import type { UserProfile } from '../types/user-profile'
import { usePowerUps } from './usePowerUps'
import type { PowerUpType } from './usePowerUps'

export function usePowerUpHandler(
  gameState: GameState | null,
  user: AuthUser | null,
  profile: UserProfile | null,
  toast: any
) {
  const [showHintModal, setShowHintModal] = useState(false)
  const [showWordWarpGrid, setShowWordWarpGrid] = useState(false)
  const [hintWords, setHintWords] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const {
    getHint,
    performUndo,
    performWordWarp,
    performFlip,
    performBridge
  } = usePowerUps(gameState?.chain || [])

  const handlePowerUp = async (type: PowerUpType) => {
    if (!user || !profile) return

    try {
      let result
      switch (type) {
        case "hint": {
          const hints = await getHint()
          if (hints && hints.length > 0) {
            setHintWords(hints)
            setShowHintModal(true)
          } else {
            setError("No hints available")
          }
          break
        }
          
        case "undo": {
          result = await performUndo()
          if (!result.success) {
            setError(result.error || "Cannot undo")
          }
          break
        }
          
        case "wordWarp": {
          result = await performWordWarp()
          if (result.success && result.data?.words) {
            setShowWordWarpGrid(true)
          } else {
            setError(result.error || "Word warp not available")
          }
          break
        }
          
        case "flip": {
          result = await performFlip()
          if (result.success && result.data) {
            const { originalPrefix, flippedPrefix } = result.data
            toast({
              description: `Flipped '${originalPrefix}' to '${flippedPrefix}'`,
              variant: "default"
            })
          } else {
            setError(result.error || "Cannot flip current combo")
          }
          break
        }
          
        case "bridge": {
          result = await performBridge(gameState?.targetWord)
          if (!result.success) {
            setError(result.error || "Bridge not available")
          }
          break
        }
      }
    } catch (error) {
      console.error("Error using power-up:", error)
      setError("Failed to use power-up. Please try again.")
    }
  }

  return {
    handlePowerUp,
    showHintModal,
    showWordWarpGrid,
    hintWords,
    error,
    setError,
    setShowHintModal,
    setShowWordWarpGrid
  }
} 