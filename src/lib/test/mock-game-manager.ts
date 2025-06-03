import type { GameState, PowerUpResult } from '@/lib/types/game'
import { mockGameState } from './mock-data'

export const mockGameManager = {
  getState: jest.fn().mockReturnValue(mockGameState),
  initialize: jest.fn().mockResolvedValue(undefined),
  addWord: jest.fn().mockImplementation((word: string) => {
    if (word === mockGameState.targetWord) {
      return Promise.resolve({
        success: true,
        gameComplete: true
      })
    }
    return Promise.resolve({
      success: true,
      gameComplete: false
    })
  }),
  useHint: jest.fn().mockResolvedValue(['test', 'tent', 'term']),
  useFlip: jest.fn().mockResolvedValue({
    success: true,
    data: {
      originalPrefix: 'et',
      flippedPrefix: 'te'
    }
  }),
  useBridge: jest.fn().mockResolvedValue({
    success: true,
    data: {
      bridgeWord: 'bridge'
    }
  }),
  useUndo: jest.fn().mockResolvedValue({
    success: true
  }),
  useWordWarp: jest.fn().mockResolvedValue({
    success: true,
    data: {
      words: ['test', 'tent', 'term']
    }
  }),
  getValidNextWords: jest.fn().mockResolvedValue(['test', 'tent', 'term'])
}

// Mock dictionary service
export const mockDictionaryService = {
  isReady: true,
  error: null,
  isValidWord: jest.fn().mockResolvedValue(true),
  getWordsWithPrefix: jest.fn().mockResolvedValue(['test', 'tent', 'term']),
  initialize: jest.fn().mockResolvedValue(undefined)
}

// Mock game state service
export const mockGameStateService = {
  saveGameState: jest.fn().mockResolvedValue(undefined),
  loadGameState: jest.fn().mockResolvedValue(null),
  deleteSavedGame: jest.fn().mockResolvedValue(undefined)
} 