import { GameState } from '../types/game';
import { chainValidator } from '../game/chain-validator';

export interface ErrorRecoveryStrategy {
  canRecover: (error: any) => boolean;
  recover: (state: GameState) => Promise<GameState>;
}

export class ErrorRecoveryService {
  private strategies: Map<string, ErrorRecoveryStrategy> = new Map();

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies() {
    // Strategy for invalid chain state
    this.strategies.set('invalidChain', {
      canRecover: (error: any) => error?.message?.includes('invalid chain state'),
      recover: async (state: GameState) => {
        // Validate each word in the chain
        const validChain: string[] = [];
        for (const word of state.chain) {
          const validation = await chainValidator.validateNextWord(validChain, word);
          if (validation.valid) {
            validChain.push(word);
          } else {
            break;
          }
        }
        return {
          ...state,
          chain: validChain,
          lastError: 'Chain was corrupted and has been recovered'
        };
      }
    });

    // Strategy for missing word timings
    this.strategies.set('missingTimings', {
      canRecover: (error: any) => error?.message?.includes('missing word timings'),
      recover: async (state: GameState) => {
        const now = Date.now();
        const reconstructedTimings = new Map<string, number>();
        
        state.chain.forEach((word, index) => {
          if (!state.wordTimings.has(word)) {
            // Estimate timing based on position
            reconstructedTimings.set(word, now - (state.chain.length - index) * 5000);
          } else {
            reconstructedTimings.set(word, state.wordTimings.get(word)!);
          }
        });

        return {
          ...state,
          wordTimings: reconstructedTimings,
          lastError: 'Word timings were missing and have been reconstructed'
        };
      }
    });

    // Strategy for corrupted UI state
    this.strategies.set('corruptedUI', {
      canRecover: (error: any) => error?.message?.includes('corrupted UI state'),
      recover: async (state: GameState) => {
        // Reconstruct UI state from chain data
        const letterTracking = {
          usedLetters: new Set<string>(),
          rareLettersUsed: new Set<string>(),
          uniqueLetterCount: 0,
          rareLetterCount: 0
        };

        state.chain.forEach(word => {
          word.split('').forEach(letter => {
            letterTracking.usedLetters.add(letter.toLowerCase());
          });
        });

        letterTracking.uniqueLetterCount = letterTracking.usedLetters.size;
        letterTracking.rareLetterCount = Array.from(letterTracking.usedLetters)
          .filter(letter => 'qxjz'.includes(letter)).length;

        return {
          ...state,
          ui: {
            ...state.ui,
            letterTracking,
            showTerminalCelebration: false,
            currentTerminalWord: '',
            terminalBonus: 0,
            isNewTerminalDiscovery: false
          },
          lastError: 'UI state was corrupted and has been reconstructed'
        };
      }
    });
  }

  async attemptRecovery(error: any, state: GameState): Promise<{
    recovered: boolean;
    state: GameState;
  }> {
    for (const [name, strategy] of this.strategies) {
      if (strategy.canRecover(error)) {
        try {
          const recoveredState = await strategy.recover(state);
          console.log(`Successfully recovered from ${name} error`);
          return {
            recovered: true,
            state: recoveredState
          };
        } catch (recoveryError) {
          console.error(`Failed to recover from ${name} error:`, recoveryError);
        }
      }
    }

    return {
      recovered: false,
      state
    };
  }

  async validateState(state: GameState): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Validate chain integrity
    for (let i = 1; i < state.chain.length; i++) {
      const validation = await chainValidator.validateNextWord(
        state.chain.slice(0, i),
        state.chain[i]
      );
      if (!validation.valid) {
        errors.push(`Invalid word at position ${i}: ${state.chain[i]}`);
      }
    }

    // Validate timing data
    state.chain.forEach(word => {
      if (!state.wordTimings.has(word)) {
        errors.push(`Missing timing data for word: ${word}`);
      }
    });

    // Validate UI state
    if (!state.ui.letterTracking) {
      errors.push('Missing letter tracking data');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const errorRecovery = new ErrorRecoveryService(); 