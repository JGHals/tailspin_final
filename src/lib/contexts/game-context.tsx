import { createContext, useContext, ReactNode, useState, useCallback } from 'react'
import { GameManager } from '../game/game-manager'
import { GameState, PowerUpResult } from '../types/game'
import { useAuth } from '../hooks/useAuth'
import type { AuthUser } from './AuthContext'

interface GameContextType {
  gameState: GameState | null
  startGame: (mode: 'daily' | 'endless' | 'versus') => Promise<void>
  addWord: (word: string) => Promise<PowerUpResult>
  useHint: () => Promise<string[]>
  useFlip: () => Promise<PowerUpResult>
  useBridge: () => Promise<PowerUpResult>
  useUndo: () => Promise<PowerUpResult>
  useWordWarp: () => Promise<PowerUpResult>
  isLoading: boolean
  error: string | null
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameManager, setGameManager] = useState<GameManager | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const startGame = useCallback(async (mode: 'daily' | 'endless' | 'versus') => {
    if (!user) {
      setError('Must be logged in to play')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const manager = new GameManager(user.id)
      await manager.initialize(mode)
      setGameManager(manager)
    } catch (err) {
      setError('Failed to start game')
      console.error('Error starting game:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const value: GameContextType = {
    gameState: gameManager?.getState() || null,
    startGame,
    addWord: async (word: string): Promise<PowerUpResult> => {
      if (!gameManager) return { success: false, error: 'Game not initialized' }
      try {
        return await gameManager.addWord(word)
      } catch (err) {
        console.error('Error adding word:', err)
        return { success: false, error: 'Failed to add word' }
      }
    },
    useHint: async (): Promise<string[]> => {
      if (!gameManager) return []
      try {
        return await gameManager.useHint()
      } catch (err) {
        console.error('Error using hint:', err)
        return []
      }
    },
    useFlip: async (): Promise<PowerUpResult> => {
      if (!gameManager) return { success: false, error: 'Game not initialized' }
      try {
        const result = await gameManager.useFlip()
        if (!result) return { success: false, error: 'Failed to use flip power-up' }
        
        const currentWord = gameManager.getState().chain[gameManager.getState().chain.length - 1]
        const originalPrefix = currentWord.slice(-2)
        const flippedPrefix = originalPrefix.split('').reverse().join('')
        
        return {
          success: true,
          data: {
            originalPrefix,
            flippedPrefix
          }
        }
      } catch (err) {
        return { success: false, error: 'Failed to use flip power-up' }
      }
    },
    useBridge: async (): Promise<PowerUpResult> => {
      if (!gameManager) return { success: false, error: 'Game not initialized' }
      try {
        const result = await gameManager.useBridge()
        if (!result) return { success: false, error: 'Failed to use bridge power-up' }
        
        const bridgeWord = gameManager.getState().chain[gameManager.getState().chain.length - 1]
        return {
          success: true,
          data: { bridgeWord }
        }
      } catch (err) {
        return { success: false, error: 'Failed to use bridge power-up' }
      }
    },
    useUndo: async (): Promise<PowerUpResult> => {
      if (!gameManager) return { success: false, error: 'Game not initialized' }
      try {
        return await gameManager.useUndo()
      } catch (err) {
        return { success: false, error: 'Failed to use undo power-up' }
      }
    },
    useWordWarp: async (): Promise<PowerUpResult> => {
      if (!gameManager) return { success: false, error: 'Game not initialized' }
      try {
        const result = await gameManager.useWordWarp()
        if (!result) return { success: false, error: 'Failed to use word warp power-up' }
        
        const words = await gameManager.getValidNextWords()
        return {
          success: true,
          data: { words }
        }
      } catch (err) {
        return { success: false, error: 'Failed to use word warp power-up' }
      }
    },
    isLoading,
    error
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
} 