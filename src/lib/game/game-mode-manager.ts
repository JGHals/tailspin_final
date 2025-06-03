import { chainValidator, ChainStats } from './chain-validator';
import { ScoringSystem, defaultScoringRules, GameScore } from './scoring';
import { dictionaryAccess } from '../dictionary/dictionary-access';
import { userProfileService } from '../services/user-profile-service';
import { achievementSystem } from './achievement-system';
import { powerUpSystem, PowerUpResult } from './power-up-system';
import { gameStateService } from '../services/game-state-service';
import { dailyPuzzleService } from './daily-puzzle-service';
import type { Achievement, GameHistory } from '../types/user-profile';
import type { GameMode, SavedGameState } from '../types/game';

interface GameModeState {
  mode: GameMode;
  chain: string[];
  startWord: string;
  targetWord?: string;
  score: GameScore;
  stats: ChainStats;
  isComplete: boolean;
  startTime: number;
  lastMoveTime: number;
  hintsUsed: number;
  invalidAttempts: number;
  wordTimings: Map<string, number>;
  terminalWords: Set<string>;
  powerUpsUsed: Set<string>;
  rareLettersUsed: Set<string>;
  dailyPuzzle?: {
    date: string;
    parMoves: number;
  };
}

export interface DailyPuzzle {
  date: string;
  startWord: string;
  targetWord: string;
  parMoves: number;
}

export interface GameModeManager {
  getCurrentDailyPuzzle(): Promise<DailyPuzzle>;
  startGame(options: {
    startWord?: string;
    targetWord?: string;
    dailyPuzzle?: DailyPuzzle;
  }): Promise<void>;
  getGameState(): GameModeState;
  setUserId(uid: string): void;
  submitWord(word: string): Promise<{
    valid: boolean;
    reason?: string;
    gameComplete?: boolean;
    score: GameScore;
    stats: ChainStats;
    achievements?: Achievement[];
  }>;
  useHint(): Promise<string[]>;
  useFlip(): Promise<PowerUpResult>;
  useBridge(): Promise<PowerUpResult>;
  useUndo(): Promise<PowerUpResult>;
  useWordWarp(): Promise<PowerUpResult>;
  getGameDuration(): number;
  resumeGame(gameId: string): Promise<boolean>;
}

export class GameModeManagerImpl implements GameModeManager {
  private state: GameModeState;
  private scoring: ScoringSystem;
  private userId?: string;
  private currentGameId?: string;
  private autoSaveTimeout?: NodeJS.Timeout;

  constructor(mode: GameMode = 'endless') {
    this.scoring = new ScoringSystem(defaultScoringRules);
    this.state = this.initializeState(mode);
  }

  private initializeState(mode: GameMode): GameModeState {
    return {
      mode,
      chain: [],
      startWord: '',
      score: {
        total: 0,
        wordScores: {},
        multiplier: 1,
        terminalBonus: 0,
        dailyBonus: 0,
        penalties: 0
      },
      stats: {
        length: 0,
        uniqueLetters: new Set(),
        rareLetters: [],
        averageWordLength: 0,
        longestWord: '',
        currentStreak: 0,
        maxStreak: 0,
        terminalWords: [],
        branchingFactors: [],
        pathDifficulty: 'easy'
      },
      isComplete: false,
      startTime: Date.now(),
      lastMoveTime: Date.now(),
      hintsUsed: 0,
      invalidAttempts: 0,
      wordTimings: new Map(),
      terminalWords: new Set(),
      powerUpsUsed: new Set(),
      rareLettersUsed: new Set()
    };
  }

  setUserId(uid: string): void {
    this.userId = uid;
    this.checkForUnfinishedGame();
  }

  private async checkForUnfinishedGame(): Promise<void> {
    if (!this.userId) return;

    try {
      const savedGame = await gameStateService.getLastSavedGame(this.userId, this.state.mode);
      if (savedGame && !savedGame.isComplete) {
        // Notify subscribers about unfinished game
        this.notifyUnfinishedGame(savedGame);
      }
    } catch (error) {
      console.error('Failed to check for unfinished game:', error);
    }
  }

  private notifyUnfinishedGame(savedGame: SavedGameState): void {
    // Implementation depends on your UI notification system
    // This could emit an event, call a callback, etc.
    console.log('Unfinished game found:', savedGame);
  }

  async resumeGame(gameId: string): Promise<boolean> {
    if (!this.userId) return false;

    try {
      const savedGame = await gameStateService.loadGameState(gameId);
      if (!savedGame || savedGame.userId !== this.userId) return false;

      // For daily challenges, verify the save matches today's puzzle
      if (savedGame.mode === 'daily') {
        const todaysPuzzle = await this.getCurrentDailyPuzzle();
        if (savedGame.startWord !== todaysPuzzle.startWord || 
            savedGame.targetWord !== todaysPuzzle.targetWord) {
          await gameStateService.deleteSavedGame(gameId);
          return false;
        }
      }

      // Restore game state
      this.state = {
        mode: savedGame.mode,
        chain: savedGame.chain,
        startWord: savedGame.startWord,
        targetWord: savedGame.targetWord,
        score: savedGame.score,
        stats: savedGame.stats,
        isComplete: savedGame.isComplete,
        startTime: savedGame.startTime,
        lastMoveTime: savedGame.lastMoveTime,
        hintsUsed: savedGame.hintsUsed,
        invalidAttempts: savedGame.invalidAttempts,
        wordTimings: new Map(savedGame.wordTimings.map(wt => [wt.word, wt.time])),
        terminalWords: new Set(savedGame.terminalWords),
        powerUpsUsed: new Set(savedGame.powerUpsUsed),
        rareLettersUsed: new Set(savedGame.rareLettersUsed),
        dailyPuzzle: savedGame.dailyPuzzle
      };

      this.currentGameId = gameId;
      this.setupAutoSave();
      return true;
    } catch (error) {
      console.error('Failed to resume game:', error);
      return false;
    }
  }

  private setupAutoSave(): void {
    // Clear any existing auto-save
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Set up new auto-save timer (every 30 seconds)
    this.autoSaveTimeout = setInterval(() => {
      this.saveGameState();
    }, 30000);
  }

  private async saveGameState(): Promise<void> {
    if (!this.userId || this.state.isComplete) return;

    try {
      const stateToSave = {
        mode: this.state.mode,
        chain: this.state.chain,
        startWord: this.state.startWord,
        targetWord: this.state.targetWord,
        score: this.state.score,
        stats: this.state.stats,
        isComplete: this.state.isComplete,
        startTime: this.state.startTime,
        lastMoveTime: this.state.lastMoveTime,
        hintsUsed: this.state.hintsUsed,
        invalidAttempts: this.state.invalidAttempts,
        wordTimings: Array.from(this.state.wordTimings.entries()).map(([word, time]) => ({ word, time })),
        terminalWords: Array.from(this.state.terminalWords),
        powerUpsUsed: Array.from(this.state.powerUpsUsed),
        rareLettersUsed: Array.from(this.state.rareLettersUsed),
        dailyPuzzle: this.state.dailyPuzzle
      };

      this.currentGameId = await gameStateService.saveGameState(this.userId, stateToSave);
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  }

  async startGame(options?: { 
    startWord?: string; 
    targetWord?: string;
    dailyPuzzle?: DailyPuzzle;
  }): Promise<void> {
    // Clear any existing auto-save
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Reset state
    chainValidator.resetUsedWords();
    this.scoring.reset();
    this.state = this.initializeState(this.state.mode);

    if (this.state.mode === 'daily' && options?.dailyPuzzle) {
      this.state.startWord = options.dailyPuzzle.startWord;
      this.state.targetWord = options.dailyPuzzle.targetWord;
      this.state.chain = [options.dailyPuzzle.startWord];
      this.state.dailyPuzzle = options.dailyPuzzle;
    } else if (options?.startWord) {
      this.state.startWord = options.startWord;
      this.state.chain = [options.startWord];
      if (options?.targetWord) {
        this.state.targetWord = options.targetWord;
      }
    } else {
      // Generate random start word for endless mode
      const randomPrefix = this.getRandomPrefix();
      const words = await dictionaryAccess.getWordsWithPrefix(randomPrefix);
      if (words.length > 0) {
        const startWord = words[Math.floor(Math.random() * words.length)];
        this.state.startWord = startWord;
        this.state.chain = [startWord];
      }
    }

    // Update initial stats
    this.state.stats = await chainValidator.getChainStats(this.state.chain);

    // Set up auto-save if we have a user
    if (this.userId) {
      this.setupAutoSave();
      // Initial save
      await this.saveGameState();
    }
  }

  private getRandomPrefix(): string {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    return letters[Math.floor(Math.random() * 26)] + 
           letters[Math.floor(Math.random() * 26)];
  }

  async submitWord(word: string): Promise<{
    valid: boolean;
    reason?: string;
    gameComplete?: boolean;
    score: GameScore;
    stats: ChainStats;
    achievements?: Achievement[];
  }> {
    const moveTime = Date.now() - this.state.lastMoveTime;
    
    // Validate the word
    const validationResult = await chainValidator.validateNextWord(
      this.state.chain, 
      word
    );

    if (!validationResult.valid) {
      this.scoring.recordInvalidAttempt();
      this.state.invalidAttempts++;
      return {
        valid: false,
        reason: validationResult.reason,
        score: this.state.score,
        stats: this.state.stats
      };
    }

    // Add word to chain and update timings
    this.state.chain.push(word);
    this.state.lastMoveTime = Date.now();
    this.state.wordTimings.set(word, moveTime);
    
    // Update stats
    this.state.stats = await chainValidator.getChainStats(this.state.chain);
    
    // Update score
    this.state.score = this.scoring.calculateScore({
      chain: this.state.chain,
      wordTimings: this.state.wordTimings,
      terminalWords: this.state.terminalWords,
      mode: this.state.mode,
      dailyPuzzle: this.state.dailyPuzzle,
      moveTime,
      invalidAttempts: this.state.invalidAttempts,
      hintsUsed: this.state.hintsUsed,
      powerUpsUsed: this.state.powerUpsUsed
    });

    // Check if game is complete
    let gameComplete = false;
    if (this.state.mode === 'daily' && this.state.targetWord) {
      gameComplete = word === this.state.targetWord;
    } else if (validationResult.isTerminal) {
      gameComplete = true;
    }

    this.state.isComplete = gameComplete;

    // Save state after each move
    if (this.userId) {
      await this.saveGameState();
    }

    // If game is complete, clean up
    if (gameComplete) {
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
      }
      if (this.currentGameId) {
        await gameStateService.deleteSavedGame(this.currentGameId);
      }
    }

    // If game is complete and we have a user ID, update profile
    let achievements: Achievement[] = [];
    if (gameComplete && this.userId) {
      const gameHistory: GameHistory = {
        id: Date.now().toString(),
        mode: this.state.mode,
        date: new Date().toISOString(),
        score: this.state.score.total,
        chain: this.state.chain,
        duration: this.getGameDuration(),
        hintsUsed: this.state.hintsUsed,
        uniqueLettersUsed: Array.from(this.state.stats.uniqueLetters),
        rareLettersUsed: this.state.stats.rareLetters,
        longestWord: this.state.stats.longestWord,
        terminalWords: this.state.stats.terminalWords
      };

      await userProfileService.addGameHistory(this.userId, gameHistory);
      achievements = await achievementSystem.checkAchievements(this.userId, gameHistory);
    }

    return {
      valid: true,
      gameComplete,
      score: this.state.score,
      stats: this.state.stats,
      achievements: achievements.length > 0 ? achievements : undefined
    };
  }

  async useHint(): Promise<string[]> {
    if (!this.userId || this.state.chain.length === 0) return [];

    const result = await powerUpSystem.useHint(
      this.userId, 
      this.state.chain[this.state.chain.length - 1]
    );

    if (result.success) {
      this.state.hintsUsed++;
      this.state.powerUpsUsed.add('hint');
      return result.data.hints;
    }

    return [];
  }

  async useFlip(): Promise<PowerUpResult> {
    if (!this.userId || this.state.chain.length === 0) {
      return { success: false, error: 'No active game or user' };
    }

    return powerUpSystem.useFlip(
      this.userId,
      this.state.chain[this.state.chain.length - 1]
    );
  }

  async useBridge(): Promise<PowerUpResult> {
    if (!this.userId || this.state.chain.length === 0) {
      return { success: false, error: 'No active game or user' };
    }

    return powerUpSystem.useBridge(
      this.userId,
      this.state.chain[this.state.chain.length - 1]
    );
  }

  async useWordWarp(): Promise<PowerUpResult> {
    if (!this.userId || this.state.chain.length === 0) {
      return { success: false, error: 'No active game or user' };
    }

    const result = await powerUpSystem.useWordWarp(this.userId);
    if (result.success) {
      this.state.powerUpsUsed.add('wordWarp');
    }

    return result;
  }

  async useUndo(): Promise<PowerUpResult> {
    if (!this.userId || this.state.chain.length <= 1) {
      return { success: false, error: 'Cannot undo the starting word' };
    }

    const result = await powerUpSystem.useUndo(this.userId, this.state.chain);
    if (result.success) {
      this.state.chain = result.data.newChain;
      this.state.stats = await chainValidator.getChainStats(this.state.chain);
      this.state.score = this.scoring.calculateScore({
        chain: this.state.chain,
        wordTimings: this.state.wordTimings,
        terminalWords: this.state.terminalWords,
        mode: this.state.mode,
        dailyPuzzle: this.state.dailyPuzzle,
        moveTime: 0,
        invalidAttempts: this.state.invalidAttempts,
        hintsUsed: this.state.hintsUsed,
        powerUpsUsed: this.state.powerUpsUsed
      });
      this.state.powerUpsUsed.add('undo');
    }

    return result;
  }

  getGameState(): GameModeState {
    return { ...this.state };
  }

  getGameDuration(): number {
    return Date.now() - this.state.startTime;
  }

  async getCurrentDailyPuzzle(): Promise<DailyPuzzle> {
    try {
      // Get today's puzzle from the service
      const puzzle = await dailyPuzzleService.getDailyPuzzle();
      
      // Return the puzzle in the format expected by the game mode
      return {
        date: puzzle.date,
        startWord: puzzle.startWord,
        targetWord: puzzle.targetWord,
        parMoves: puzzle.parMoves
      };
    } catch (error) {
      console.error('Error getting daily puzzle:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const gameModeManager = new GameModeManagerImpl(); 