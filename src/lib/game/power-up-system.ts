import { chainValidator } from './chain-validator';
import { userProfileService } from '../services/user-profile-service';
import type { PowerUpInventory } from '../types/user-profile';
import { PowerUpResult } from '../types/game';

export interface PowerUpCosts {
  flip: number;
  hint: number;
  bridge: number;
  undo: number;
  wordWarp: number;
}

export class PowerUpSystem {
  private readonly costs: PowerUpCosts = {
    flip: 5,
    hint: 3,
    bridge: 7,
    undo: 4,
    wordWarp: 10
  };

  private async validateAndDeduct(uid: string, powerUpType: keyof PowerUpInventory): Promise<boolean> {
    const profile = await userProfileService.getProfile(uid);
    if (!profile) return false;

    // Check if user has the power-up
    if (profile.powerUps[powerUpType] <= 0) return false;

    // Deduct power-up
    await userProfileService.usePowerUp(uid, powerUpType);
    return true;
  }

  async useFlip(uid: string, lastWord: string): Promise<PowerUpResult> {
    if (!await this.validateAndDeduct(uid, 'flip')) {
      return {
        success: false,
        error: 'Insufficient power-ups'
      };
    }

    try {
      const lastTwoLetters = lastWord.slice(-2);
      const flippedLetters = lastTwoLetters.split('').reverse().join('');
      
      const nextWords = await chainValidator.findPossibleNextWords(flippedLetters);
      if (!nextWords.length) {
        return {
          success: false,
          error: 'No valid words with flipped letters'
        };
      }

      return {
        success: true,
        data: {
          originalPrefix: lastTwoLetters,
          flippedPrefix: flippedLetters
        }
      };
    } catch (err) {
      console.error('Error using flip:', err);
      return {
        success: false,
        error: 'Failed to flip letters'
      };
    }
  }

  async useHint(uid: string, lastWord: string): Promise<PowerUpResult> {
    if (!await this.validateAndDeduct(uid, 'hint')) {
      return {
        success: false,
        error: 'Insufficient power-ups'
      };
    }

    try {
      const nextWords = await chainValidator.findPossibleNextWords(lastWord);
      if (!nextWords.length) {
        return {
          success: false,
          error: 'No valid next words found'
        };
      }

      return {
        success: true,
        data: {
          words: nextWords.slice(0, 3) // Only show 3 hints
        }
      };
    } catch (err) {
      console.error('Error using hint:', err);
      return {
        success: false,
        error: 'Failed to get hints'
      };
    }
  }

  async useBridge(uid: string, lastWord: string): Promise<PowerUpResult> {
    if (!await this.validateAndDeduct(uid, 'bridge')) {
      return {
        success: false,
        error: 'Insufficient power-ups'
      };
    }

    try {
      const nextWords = await chainValidator.findPossibleNextWords(lastWord);
      if (!nextWords.length) {
        return {
          success: false,
          error: 'No valid bridge words found'
        };
      }

      // Select a random bridge word
      const bridgeWord = nextWords[Math.floor(Math.random() * nextWords.length)];

      return {
        success: true,
        data: {
          bridgeWord
        }
      };
    } catch (err) {
      console.error('Error using bridge:', err);
      return {
        success: false,
        error: 'Failed to find bridge word'
      };
    }
  }

  async useUndo(uid: string, chain: string[]): Promise<PowerUpResult> {
    if (!await this.validateAndDeduct(uid, 'undo')) {
      return {
        success: false,
        error: 'Insufficient power-ups'
      };
    }

    try {
      if (chain.length <= 1) {
        return {
          success: false,
          error: 'Cannot undo the starting word'
        };
      }

      const newChain = chain.slice(0, -1);

      return {
        success: true,
        data: {
          words: newChain // Use words array for consistency
        }
      };
    } catch (err) {
      console.error('Error using undo:', err);
      return {
        success: false,
        error: 'Failed to undo last word'
      };
    }
  }

  async useWordWarp(uid: string): Promise<PowerUpResult> {
    if (!await this.validateAndDeduct(uid, 'wordWarp')) {
      return {
        success: false,
        error: 'Insufficient power-ups'
      };
    }

    try {
      // Get all possible two-letter combinations that have valid next words
      const validPrefixes = await chainValidator.findPossibleNextWords('');
      if (!validPrefixes.length) {
        return {
          success: false,
          error: 'No valid prefixes found'
        };
      }

      return {
        success: true,
        data: {
          words: validPrefixes
        }
      };
    } catch (err) {
      console.error('Error using word warp:', err);
      return {
        success: false,
        error: 'Failed to get valid prefixes'
      };
    }
  }

  getCosts(): PowerUpCosts {
    return { ...this.costs };
  }
}

// Export singleton instance
export const powerUpSystem = new PowerUpSystem(); 