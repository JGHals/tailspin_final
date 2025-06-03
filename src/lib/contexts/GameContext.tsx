import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { GameMode, GameState, GameResult, createGame, GameStateManager } from '../game/game-state';
import type { Achievement } from '../types/user-profile';

export interface GameContextType {
  gameState: GameState | null;
  startGame: (mode: GameMode, startWord?: string, targetWord?: string) => void;
  addWord: (word: string) => Promise<{
    success: boolean;
    error?: string;
    gameComplete?: boolean;
    achievements?: Achievement[];
  }>;
  getValidNextWords: () => Promise<string[]>;
  getGameResult: () => GameResult | null;
  useHint: () => Promise<string[]>;
  useFlip: () => Promise<{
    success: boolean;
    error?: string;
    data?: { originalPrefix: string; flippedPrefix: string };
  }>;
  useBridge: () => Promise<{
    success: boolean;
    error?: string;
    data?: { bridgeWord: string };
  }>;
  useUndo: () => Promise<{
    success: boolean;
    error?: string;
  }>;
  useWordWarp: () => Promise<{
    success: boolean;
    error?: string;
    data?: { words: string[] };
  }>;
  isLoading: boolean;
  error: string | null;
}

export const GameContext = createContext<GameContextType>({
  gameState: null,
  startGame: () => {},
  addWord: async () => ({ success: false }),
  getValidNextWords: async () => [],
  getGameResult: () => null,
  useHint: async () => [],
  useFlip: async () => ({ success: false }),
  useBridge: async () => ({ success: false }),
  useUndo: async () => ({ success: false }),
  useWordWarp: async () => ({ success: false }),
  isLoading: false,
  error: null
});

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameManager, setGameManager] = useState<GameStateManager | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGame = (mode: GameMode, startWord?: string, targetWord?: string) => {
    try {
      const newGame = createGame(mode, startWord, targetWord);
      setGameManager(newGame);
      setError(null);
    } catch (err) {
      setError('Failed to start game');
      console.error('Error starting game:', err);
    }
  };

  const addWord = async (word: string) => {
    if (!gameManager) {
      throw new Error('Game not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await gameManager.addWord(word);
      if (!result.success && result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const error = 'Failed to add word';
      setError(error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const getValidNextWords = async () => {
    if (!gameManager) {
      return [];
    }

    try {
      return await gameManager.getValidNextWords();
    } catch (err) {
      console.error('Error getting valid next words:', err);
      return [];
    }
  };

  const getGameResult = () => {
    if (!gameManager) {
      return null;
    }
    return gameManager.getGameResult();
  };

  const useHint = async () => {
    if (!gameManager) {
      return [];
    }
    try {
      return await gameManager.useHint();
    } catch (err) {
      console.error('Error using hint:', err);
      return [];
    }
  };

  const useFlip = async () => {
    if (!gameManager) {
      return { success: false, error: 'Game not initialized' };
    }
    try {
      const result = await gameManager.useFlip();
      return {
        success: result,
        error: result ? undefined : 'Failed to use flip power-up',
        data: result ? {
          originalPrefix: gameManager.getState().chain[gameManager.getState().chain.length - 1].slice(-2),
          flippedPrefix: gameManager.getState().chain[gameManager.getState().chain.length - 1].slice(-2).split('').reverse().join('')
        } : undefined
      };
    } catch (err) {
      return { success: false, error: 'Failed to use flip power-up' };
    }
  };

  const useBridge = async () => {
    if (!gameManager) {
      return { success: false, error: 'Game not initialized' };
    }
    try {
      const result = await gameManager.useBridge();
      return {
        success: result,
        error: result ? undefined : 'Failed to use bridge power-up',
        data: result ? {
          bridgeWord: gameManager.getState().chain[gameManager.getState().chain.length - 1]
        } : undefined
      };
    } catch (err) {
      return { success: false, error: 'Failed to use bridge power-up' };
    }
  };

  const useUndo = async () => {
    if (!gameManager) {
      return { success: false, error: 'Game not initialized' };
    }
    try {
      const result = await gameManager.useUndo();
      return {
        success: result,
        error: result ? undefined : 'Failed to use undo power-up'
      };
    } catch (err) {
      return { success: false, error: 'Failed to use undo power-up' };
    }
  };

  const useWordWarp = async () => {
    if (!gameManager) {
      return { success: false, error: 'Game not initialized' };
    }
    try {
      const result = await gameManager.useWordWarp();
      return {
        success: result,
        error: result ? undefined : 'Failed to use word warp power-up',
        data: result ? {
          words: await gameManager.getValidNextWords()
        } : undefined
      };
    } catch (err) {
      return { success: false, error: 'Failed to use word warp power-up' };
    }
  };

  const value = {
    gameState: gameManager?.getState() || null,
    startGame,
    addWord,
    getValidNextWords,
    getGameResult,
    useHint,
    useFlip,
    useBridge,
    useUndo,
    useWordWarp,
    isLoading,
    error
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
} 