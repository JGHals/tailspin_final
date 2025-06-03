import { chainValidator } from './chain-validator';
import { scoringSystem, RARE_LETTERS } from './scoring';
import type { GameScore } from '../types/game';
import type { Achievement } from '../types/user-profile';
import { dailyPuzzleGenerator } from './daily-puzzle-generator';

export type GameMode = 'daily' | 'endless' | 'versus';

export interface GameState {
  mode: GameMode;
  chain: string[];
  startWord: string;
  targetWord?: string;
  isComplete: boolean;
  score: GameScore;
  wordTimings: Map<string, number>;
  terminalWords: Set<string>;
  lastError?: string;
  startTime: number;
  lastMoveTime: number;
  dailyPuzzle?: {
    date: string;
    parMoves: number;
  };
  powerUpsUsed: Set<string>;
  rareLettersUsed: Set<string>;
  invalidAttempts: number;
  hintsUsed: number;
  hints?: string[];
  versusState?: {
    opponentId: string;
    opponentScore: number;
    opponentChain: string[];
    timeLeft: number;
  };
  ui: {
    showTerminalCelebration: boolean;
    currentTerminalWord: string;
    terminalBonus: number;
    isNewTerminalDiscovery: boolean;
    letterTracking: {
      usedLetters: Set<string>;
      rareLettersUsed: Set<string>;
      uniqueLetterCount: number;
      rareLetterCount: number;
    };
    validationFeedback?: {
      type: 'success' | 'warning' | 'error';
      message: string;
      details?: string;
      suggestedWords?: string[];
    };
    chainQuality?: {
      branchingFactor: number;
      difficulty: string;
      riskLevel: 'low' | 'medium' | 'high';
      suggestedMoves?: string[];
    };
  };
  achievements?: Achievement[];
  completionStats?: {
    underPar: boolean;
    fastSolve: boolean;
    optimalPath: boolean;
    noMistakes: boolean;
    rareLetters: number;
    powerUpsUsed: number;
  };
}

export interface GameResult {
  chain: string[];
  score: GameScore;
  duration: number;
  terminalWords: string[];
  mode: GameMode;
  date: string;
  powerUpsUsed: string[];
  rareLettersUsed: string[];
  moveCount: number;
  parMoves?: number;
  achievements?: Achievement[];
}

export function createGame(mode: GameMode, startWord?: string, targetWord?: string): GameStateManager {
  const manager = new GameStateManager();
  manager.startGame(mode, { startWord, targetWord });
  return manager;
}

export class GameStateManager {
  private state: GameState;
  private stateSubscribers: Set<(state: GameState) => void>;

  constructor() {
    this.stateSubscribers = new Set();
    this.state = this.createInitialState('endless');
  }

  private createInitialState(mode: GameMode, options?: {
    startWord?: string;
    targetWord?: string;
    dailyPuzzle?: { date: string; parMoves: number };
  }): GameState {
    return {
      mode,
      chain: options?.startWord ? [options.startWord] : [],
      startWord: options?.startWord || '',
      targetWord: options?.targetWord,
      isComplete: false,
      score: {
        total: 0,
        wordScores: {},
        multiplier: 1,
        terminalBonus: 0,
        dailyBonus: 0,
        penalties: 0
      },
      wordTimings: new Map(),
      terminalWords: new Set(),
      startTime: Date.now(),
      lastMoveTime: Date.now(),
      dailyPuzzle: options?.dailyPuzzle,
      powerUpsUsed: new Set(),
      rareLettersUsed: new Set(),
      invalidAttempts: 0,
      hintsUsed: 0,
      ui: {
        showTerminalCelebration: false,
        currentTerminalWord: '',
        terminalBonus: 0,
        isNewTerminalDiscovery: false,
        letterTracking: {
          usedLetters: new Set(),
          rareLettersUsed: new Set(),
          uniqueLetterCount: 0,
          rareLetterCount: 0
        }
      }
    };
  }

  subscribe(callback: (state: GameState) => void): () => void {
    this.stateSubscribers.add(callback);
    return () => this.stateSubscribers.delete(callback);
  }

  private notifySubscribers() {
    const stateCopy = { ...this.state };
    this.stateSubscribers.forEach(callback => callback(stateCopy));
  }

  async startGame(mode: GameMode, options?: {
    startWord?: string;
    targetWord?: string;
    dailyPuzzle?: { date: string; parMoves: number };
  }): Promise<void> {
    chainValidator.resetUsedWords();
    this.state = this.createInitialState(mode, options);
    this.notifySubscribers();
  }

  private async validateAndAddWord(word: string): Promise<{
    valid: boolean;
    reason?: string;
    isTerminal: boolean;
  }> {
    const validation = await chainValidator.validateNextWord(
      this.state.chain,
      word
    );

    if (!validation.valid) {
      this.state.lastError = validation.reason;
      this.state.invalidAttempts++;
      
      // Enhanced validation feedback
      this.state.ui.validationFeedback = {
        type: 'error',
        message: validation.reason || 'Invalid word',
        details: validation.suggestedHints ? 'Try one of these:' : undefined,
        suggestedWords: validation.suggestedHints
      };

      return {
        valid: false,
        reason: validation.reason,
        isTerminal: false
      };
    }

    const isTerminal = await chainValidator.isTerminalPosition(word);
    
    // Handle terminal words based on game mode
    if (isTerminal && this.state.mode === 'daily' && word !== this.state.targetWord) {
      const error = 'Terminal words are not allowed in Daily Challenge mode';
      this.state.lastError = error;
      this.state.ui.validationFeedback = {
        type: 'warning',
        message: error,
        details: 'This word has no valid next moves'
      };
      
      return {
        valid: false,
        reason: error,
        isTerminal: true
      };
    }

    // Update chain quality feedback
    if (validation.branchingFactor !== undefined) {
      this.state.ui.chainQuality = {
        branchingFactor: validation.branchingFactor,
        difficulty: validation.pathDifficulty || 'medium',
        riskLevel: this.calculateRiskLevel(validation.branchingFactor),
        suggestedMoves: validation.suggestedHints
      };
    }

    // Update letter tracking
    const wordLetters = new Set(word.toUpperCase().split(''));
    const rareLetters = new Set([...wordLetters].filter(l => RARE_LETTERS.has(l)));
    
    this.state.ui.letterTracking.usedLetters = new Set([
      ...this.state.ui.letterTracking.usedLetters,
      ...wordLetters
    ]);
    this.state.ui.letterTracking.rareLettersUsed = new Set([
      ...this.state.ui.letterTracking.rareLettersUsed,
      ...rareLetters
    ]);
    this.state.ui.letterTracking.uniqueLetterCount = this.state.ui.letterTracking.usedLetters.size;
    this.state.ui.letterTracking.rareLetterCount = this.state.ui.letterTracking.rareLettersUsed.size;

    // Clear any previous validation feedback
    this.state.ui.validationFeedback = {
      type: 'success',
      message: 'Valid word!'
    };

    return {
      valid: true,
      isTerminal
    };
  }

  private calculateRiskLevel(branchingFactor: number): 'low' | 'medium' | 'high' {
    if (branchingFactor >= 7) return 'low';
    if (branchingFactor >= 3) return 'medium';
    return 'high';
  }

  async addWord(word: string): Promise<{
    success: boolean;
    error?: string;
    gameComplete?: boolean;
    score: GameScore;
    achievements?: Achievement[];
  }> {
    if (this.state.isComplete) {
      return {
        success: false,
        error: 'Game is already complete',
        score: this.state.score
      };
    }

    const validation = await this.validateAndAddWord(word);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason,
        score: this.state.score
      };
    }

    // Add word to chain
    this.state.chain.push(word);
    
    // Record timing and update rare letters
    const now = Date.now();
    const timeForWord = (now - this.state.lastMoveTime) / 1000;
    this.state.wordTimings.set(word, timeForWord);
    this.state.lastMoveTime = now;

    if (validation.isTerminal) {
      this.state.terminalWords.add(word);
      
      // Update terminal celebration UI state
      this.state.ui.showTerminalCelebration = true;
      this.state.ui.currentTerminalWord = word;
      
      // Calculate terminal bonus based on word length and rarity
      const baseBonus = 20;
      const lengthBonus = Math.max(0, word.length - 5) * 2;
      const rareLetterBonus = Array.from(word).filter(letter => RARE_LETTERS.has(letter.toUpperCase())).length * 5;
      this.state.ui.terminalBonus = baseBonus + lengthBonus + rareLetterBonus;
      
      // Check if this is a new discovery for the user
      const isNewDiscovery = !this.state.terminalWords.has(word);
      this.state.ui.isNewTerminalDiscovery = isNewDiscovery;

      // Add achievement for first terminal word discovery
      if (isNewDiscovery) {
        this.state.achievements = [
          ...(this.state.achievements || []),
          {
            id: 'terminal_discoverer',
            name: 'Terminal Discoverer',
            description: 'Find your first terminal word',
            category: 'endless',
            condition: 'Find a word that no other word can follow',
            reward: 10,
            progress: 1,
            maxProgress: 1,
            completed: true,
            completedAt: new Date().toISOString()
          }
        ];
      }

      // Add achievement for collecting multiple terminal words
      if (this.state.terminalWords.size >= 5) {
        this.state.achievements = [
          ...(this.state.achievements || []),
          {
            id: 'dead_end_collector',
            name: 'Dead End Collector',
            description: 'Find 5 different terminal words',
            category: 'endless',
            condition: 'Discover terminal words with different endings',
            reward: 15,
            progress: 5,
            maxProgress: 5,
            completed: true,
            completedAt: new Date().toISOString()
          }
        ];
      }
    }

    // Update score
    this.state.score = scoringSystem.calculateScore({
      chain: this.state.chain,
      wordTimings: this.state.wordTimings,
      terminalWords: this.state.terminalWords,
      mode: this.state.mode,
      dailyPuzzle: this.state.dailyPuzzle,
      moveTime: timeForWord
    });

    // Check if game is complete
    if (
      (this.state.mode === 'daily' && word === this.state.targetWord) ||
      (this.state.mode === 'endless' && validation.isTerminal)
    ) {
      this.state.isComplete = true;

      // Calculate completion stats for daily challenge
      if (this.state.mode === 'daily' && this.state.dailyPuzzle) {
        const totalDuration = (now - this.state.startTime) / 1000;
        const moveCount = this.state.chain.length - 1;

        // Check if the current chain matches any of the optimal paths
        const puzzle = await dailyPuzzleGenerator.generateDailyPuzzle(this.state.dailyPuzzle.date);
        const isOptimalPath = puzzle.validPaths.some((path: string[]) => 
          path.length === this.state.chain.length &&
          path.every((pathWord: string, index: number) => pathWord === this.state.chain[index])
        );

        this.state.completionStats = {
          underPar: moveCount <= this.state.dailyPuzzle.parMoves,
          fastSolve: totalDuration <= 120, // 2 minutes
          optimalPath: isOptimalPath,
          noMistakes: this.state.invalidAttempts === 0,
          rareLetters: Array.from(this.state.rareLettersUsed).length,
          powerUpsUsed: this.state.powerUpsUsed.size
        };
      }
    }

    this.notifySubscribers();

    return {
      success: true,
      gameComplete: this.state.isComplete,
      score: this.state.score,
      achievements: this.state.achievements
    };
  }

  getGameResult(): GameResult {
    return {
      chain: [...this.state.chain],
      score: { ...this.state.score },
      duration: (Date.now() - this.state.startTime) / 1000,
      terminalWords: Array.from(this.state.terminalWords),
      mode: this.state.mode,
      date: new Date().toISOString(),
      powerUpsUsed: Array.from(this.state.powerUpsUsed),
      rareLettersUsed: Array.from(this.state.rareLettersUsed),
      moveCount: this.state.chain.length - 1,
      parMoves: this.state.dailyPuzzle?.parMoves
    };
  }

  getState(): GameState {
    return { ...this.state };
  }

  // Power-up methods
  async useHint(): Promise<string[]> {
    if (this.state.chain.length === 0) {
      return [];
    }

    const lastWord = this.state.chain[this.state.chain.length - 1];
    const hints = await chainValidator.findPossibleNextWords(lastWord);
    
    // Update state with hints
    this.state.hints = hints.slice(0, 3);
    this.state.hintsUsed++;
    this.notifySubscribers();

    return this.state.hints;
  }

  async useUndo(): Promise<boolean> {
    if (this.state.chain.length <= 1) return false;
    this.state.chain.pop();
    this.state.powerUpsUsed.add('undo');
    this.notifySubscribers();
    return true;
  }

  async useWordWarp(): Promise<boolean> {
    this.state.powerUpsUsed.add('warp');
    this.notifySubscribers();
    return true;
  }

  async useFlip(): Promise<boolean> {
    if (this.state.chain.length === 0) return false;
    this.state.powerUpsUsed.add('flip');
    this.notifySubscribers();
    return true;
  }

  async useBridge(): Promise<boolean> {
    if (this.state.chain.length === 0) return false;
    this.state.powerUpsUsed.add('bridge');
    this.notifySubscribers();
    return true;
  }

  async getValidNextWords(): Promise<string[]> {
    if (!this.state.chain.length) {
      return [];
    }
    const lastWord = this.state.chain[this.state.chain.length - 1];
    return chainValidator.findPossibleNextWords(lastWord);
  }
}

// Export singleton instance
export const gameStateManager = new GameStateManager(); 