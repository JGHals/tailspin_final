import { GameState, PowerUpResult } from '../types/game'
import { powerUpSystem } from '../game/power-up-system'
import { chainValidator } from '../game/chain-validator'
import { createGamePersistence } from '../services/game-persistence'
import { errorRecovery } from '../services/error-recovery'

export class GameManager {
  private state: GameState
  private userId: string
  private persistence: ReturnType<typeof createGamePersistence>

  constructor(userId: string) {
    this.userId = userId
    this.state = this.getInitialState()
    this.persistence = createGamePersistence(userId)
  }

  private getInitialState(): GameState {
    return {
      mode: 'daily',
      chain: [],
      startWord: '',
      isComplete: false,
      score: {
        total: 0,
        wordPoints: 0,
        chainPoints: 0,
        bonusPoints: 0,
        terminalPoints: 0
      },
      wordTimings: new Map(),
      terminalWords: new Set(),
      startTime: Date.now(),
      lastMoveTime: Date.now(),
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
      },
      achievements: [],
      completionStats: {
        underPar: false,
        fastSolve: false,
        optimalPath: false,
        noMistakes: false,
        rareLetters: 0,
        powerUpsUsed: 0
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
      }
    }
  }

  async initialize(mode: 'daily' | 'endless' | 'versus'): Promise<void> {
    // Try to load existing state first
    const savedState = await this.persistence.loadGameState()
    if (savedState && savedState.mode === mode && !savedState.isComplete) {
      // Validate loaded state
      const validation = await errorRecovery.validateState(savedState)
      if (!validation.isValid) {
        console.warn('Loaded state has errors:', validation.errors)
        // Attempt recovery
        const { recovered, state: recoveredState } = await errorRecovery.attemptRecovery(
          { message: validation.errors[0] },
          savedState
        )
        if (recovered) {
          this.state = recoveredState
        } else {
          // If recovery failed, start fresh
          this.state = this.getInitialState()
          this.state.mode = mode
        }
      } else {
        this.state = savedState
      }
    } else {
      this.state = this.getInitialState()
      this.state.mode = mode
    }
    
    // Start auto-save
    this.persistence.startAutoSave(this.state)
  }

  getState(): GameState {
    return { ...this.state }
  }

  async addWord(word: string): Promise<PowerUpResult> {
    if (!this.userId) {
      return {
        success: false,
        error: 'No active game or user'
      }
    }

    try {
      const validationResult = await chainValidator.validateNextWord(this.state.chain, word)
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.reason
        }
      }

      this.state.chain.push(word)
      this.state.wordTimings.set(word, Date.now())
      
      // Update letter tracking
      word.split('').forEach(letter => {
        this.state.ui.letterTracking.usedLetters.add(letter.toLowerCase())
        if ('qxjz'.includes(letter.toLowerCase())) {
          this.state.ui.letterTracking.rareLettersUsed.add(letter.toLowerCase())
        }
      })
      this.state.ui.letterTracking.uniqueLetterCount = this.state.ui.letterTracking.usedLetters.size
      this.state.ui.letterTracking.rareLetterCount = this.state.ui.letterTracking.rareLettersUsed.size

      // Force save after each word addition
      await this.persistence.saveGameState(this.state, true)

      return {
        success: true
      }
    } catch (err) {
      console.error('Error adding word:', err)
      // Attempt recovery if possible
      const { recovered, state: recoveredState } = await errorRecovery.attemptRecovery(err, this.state)
      if (recovered) {
        this.state = recoveredState
        return {
          success: false,
          error: 'Game state was recovered. Please try again.'
        }
      }
      return {
        success: false,
        error: 'Failed to add word'
      }
    }
  }

  async useHint(): Promise<string[]> {
    if (!this.userId || this.state.chain.length === 0) return []
    
    const result = await powerUpSystem.useHint(
      this.userId,
      this.state.chain[this.state.chain.length - 1]
    )

    if (result.success) {
      this.state.hintsUsed++
      this.state.powerUpsUsed.add('hint')
      return result.data?.words || []
    }

    return []
  }

  async useFlip(): Promise<boolean> {
    if (!this.userId || this.state.chain.length === 0) return false
    
    const result = await powerUpSystem.useFlip(
      this.userId,
      this.state.chain[this.state.chain.length - 1]
    )

    if (result.success) {
      this.state.powerUpsUsed.add('flip')
      return true
    }

    return false
  }

  async useBridge(): Promise<boolean> {
    if (!this.userId || this.state.chain.length === 0) return false
    
    const result = await powerUpSystem.useBridge(
      this.userId,
      this.state.chain[this.state.chain.length - 1]
    )

    if (result.success) {
      this.state.powerUpsUsed.add('bridge')
      return true
    }

    return false
  }

  async useWordWarp(): Promise<boolean> {
    if (!this.userId || this.state.chain.length === 0) return false
    
    const result = await powerUpSystem.useWordWarp(this.userId)

    if (result.success) {
      this.state.powerUpsUsed.add('wordWarp')
      return true
    }

    return false
  }

  async useUndo(): Promise<PowerUpResult> {
    if (!this.userId || this.state.chain.length <= 1) {
      return {
        success: false,
        error: 'Cannot undo the starting word'
      }
    }

    try {
      const newChain = this.state.chain.slice(0, -1)
      this.state.chain = newChain
      this.state.powerUpsUsed.add('undo')

      return {
        success: true,
        data: {
          words: newChain
        }
      }
    } catch (err) {
      console.error('Error using undo:', err)
      return {
        success: false,
        error: 'Failed to undo last word'
      }
    }
  }

  async getValidNextWords(): Promise<string[]> {
    if (!this.state.chain.length) return []
    
    const lastWord = this.state.chain[this.state.chain.length - 1]
    return chainValidator.findPossibleNextWords(lastWord)
  }

  getGameResult() {
    return {
      chain: this.state.chain,
      score: this.state.score,
      achievements: this.state.achievements,
      stats: this.state.completionStats
    }
  }

  cleanup(): void {
    this.persistence.stopAutoSave()
  }

  private async validateAndRecoverState(): Promise<boolean> {
    const validation = await errorRecovery.validateState(this.state)
    if (!validation.isValid) {
      console.warn('Current state has errors:', validation.errors)
      const { recovered, state: recoveredState } = await errorRecovery.attemptRecovery(
        { message: validation.errors[0] },
        this.state
      )
      if (recovered) {
        this.state = recoveredState
        return true
      }
      return false
    }
    return true
  }
} 