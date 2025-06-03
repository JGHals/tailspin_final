import { useState } from 'react';
import { PowerUpResult } from '../types/game';
import { PowerUpService } from '../services/power-up.service';
import { useDictionary } from './useDictionary';

export type PowerUpType = 'hint' | 'undo' | 'wordWarp' | 'flip' | 'bridge';

export function usePowerUps(initialChain: string[] = []) {
  const [chain, setChain] = useState<string[]>(initialChain);
  const { dictionaryService } = useDictionary();
  const powerUpService = new PowerUpService(dictionaryService);

  const getHint = async (): Promise<string[]> => {
    if (chain.length === 0) return [];
    return powerUpService.hint(chain[chain.length - 1]);
  };

  const performUndo = async (): Promise<PowerUpResult> => {
    const result = await powerUpService.undo(chain);
    if (result.success) {
      setChain(prev => prev.slice(0, -1));
    }
    return result;
  };

  const performWordWarp = async (): Promise<PowerUpResult> => {
    if (chain.length === 0) {
      return { success: false, error: "No current word" };
    }
    return powerUpService.wordWarp(chain[chain.length - 1]);
  };

  const performFlip = async (): Promise<PowerUpResult> => {
    if (chain.length === 0) {
      return { success: false, error: "No current word" };
    }
    return powerUpService.flip(chain[chain.length - 1]);
  };

  const performBridge = async (targetWord?: string): Promise<PowerUpResult> => {
    if (chain.length === 0) {
      return { success: false, error: "No current word" };
    }
    return powerUpService.bridge(chain[chain.length - 1], targetWord);
  };

  return {
    getHint,
    performUndo,
    performWordWarp,
    performFlip,
    performBridge,
    chain
  };
} 