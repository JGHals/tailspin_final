import type { GameMode } from '../types/game';
import { isTerminalWord } from '../validation/terminal-detection';

export interface GameScore {
  total: number;
  wordScores: {
    [word: string]: {
      base: number;
      length: number;
      rareLetters: number;
      streak: number;
      speed: number;
      total: number;
    }
  };
  multiplier: number;
  terminalBonus: number;
  dailyBonus: number;
  penalties: number;
}

export const RARE_LETTERS = new Set(['J', 'Q', 'X', 'Z']);

interface ScoringRules {
  basePoints: number;
  lengthBonus: number;
  rareLetterBonus: number;
  streakBonus: number;
  terminalBonus: number;
  speedBonus: number;
  dailyBonus: {
    completion: number;
    underPar: number;
    fastSolve: number;
    rareLetters: number;
  };
  penalties: {
    invalidAttempt: number;
    hintUsed: number;
    powerUpUsed: number;
  };
}

export const defaultScoringRules: ScoringRules = {
  basePoints: 10,
  lengthBonus: 5,
  rareLetterBonus: 15,
  streakBonus: 10,
  terminalBonus: 50,
  speedBonus: 20,
  dailyBonus: {
    completion: 100,
    underPar: 50,
    fastSolve: 75,
    rareLetters: 25
  },
  penalties: {
    invalidAttempt: -5,
    hintUsed: -10,
    powerUpUsed: -5
  }
};

interface WordScore {
  base: number;
  length: number;
  rareLetters: number;
  streak: number;
  speed: number;
  total: number;
}

interface ScoreCalculationParams {
  chain: string[];
  wordTimings: Map<string, number>;
  terminalWords: Set<string>;
  mode: GameMode;
  dailyPuzzle?: {
    date: string;
    parMoves: number;
  };
  moveTime: number;
  invalidAttempts?: number;
  hintsUsed?: number;
  powerUpsUsed?: Set<string>;
}

export class ScoringSystem {
  private rules: ScoringRules;
  private currentMultiplier: number = 1;

  constructor(rules: ScoringRules = defaultScoringRules) {
    this.rules = rules;
  }

  reset() {
    this.currentMultiplier = 1;
  }

  recordInvalidAttempt(): number {
    return this.rules.penalties.invalidAttempt;
  }

  calculateWordScore(
    word: string,
    moveTime: number,
    isTerminal: boolean = false,
    streak: number = 0
  ): WordScore {
    const base = this.rules.basePoints;
    const length = Math.max(0, word.length - 4) * this.rules.lengthBonus;
    
    // Calculate rare letter bonus
    const rareLetters = Array.from(word.toUpperCase())
      .filter(letter => RARE_LETTERS.has(letter))
      .length * this.rules.rareLetterBonus;

    // Calculate streak bonus
    const streakPoints = streak > 1 ? (streak - 1) * this.rules.streakBonus : 0;

    // Speed bonus for quick moves (under 5 seconds)
    const speed = moveTime < 5 ? this.rules.speedBonus : 0;

    // Add terminal bonus if applicable
    const terminalPoints = isTerminal ? this.rules.terminalBonus : 0;

    const subtotal = base + length + rareLetters + streakPoints + speed + terminalPoints;
    const total = Math.floor(subtotal * this.currentMultiplier);

    return {
      base,
      length,
      rareLetters,
      streak: streakPoints,
      speed,
      total
    };
  }

  calculateScore(params: ScoreCalculationParams): GameScore {
    const {
      chain,
      wordTimings,
      terminalWords,
      mode,
      dailyPuzzle,
      moveTime,
      invalidAttempts = 0,
      hintsUsed = 0,
      powerUpsUsed = new Set()
    } = params;

    const wordScores: { [word: string]: WordScore } = {};
    let streak = 0;
    let total = 0;
    let terminalBonus = 0;
    let dailyBonus = 0;
    let penalties = 0;

    // Reset multiplier at start of calculation
    this.currentMultiplier = 1;

    // Calculate score for each word in the chain
    chain.forEach((word, index) => {
      if (index === 0) return; // Skip start word

      const timing = wordTimings.get(word) || 0;
      streak = timing < 10 ? streak + 1 : 0;

      // Update multiplier based on streak
      this.currentMultiplier = 1 + Math.floor(streak / 5) * 0.5; // +0.5x every 5 words

      const score = this.calculateWordScore(word, timing, terminalWords.has(word), streak);
      wordScores[word] = score;
      total += score.total;

      // Add terminal word bonus
      if (terminalWords.has(word)) {
        terminalBonus += this.rules.terminalBonus;
      }
    });

    // Calculate penalties
    penalties += invalidAttempts * this.rules.penalties.invalidAttempt;
    penalties += hintsUsed * this.rules.penalties.hintUsed;
    penalties += powerUpsUsed.size * this.rules.penalties.powerUpUsed;

    // Add mode-specific bonuses
    if (mode === 'daily' && dailyPuzzle) {
      const moves = chain.length - 1;
      const duration = Array.from(wordTimings.values()).reduce((a, b) => a + b, 0);

      // Completion bonus
      dailyBonus += this.rules.dailyBonus.completion;

      // Under par bonus
      if (moves <= dailyPuzzle.parMoves) {
        dailyBonus += this.rules.dailyBonus.underPar;
      }

      // Fast solve bonus (under 2 minutes)
      if (duration < 120) {
        dailyBonus += this.rules.dailyBonus.fastSolve;
      }

      // Rare letters bonus
      const uniqueRareLetters = new Set(
        chain
          .join('')
          .toUpperCase()
          .split('')
          .filter(letter => RARE_LETTERS.has(letter))
      );
      dailyBonus += uniqueRareLetters.size * this.rules.dailyBonus.rareLetters;
    }

    const finalTotal = Math.max(0, total + terminalBonus + dailyBonus + penalties);

    return {
      total: finalTotal,
      wordScores,
      multiplier: this.currentMultiplier,
      terminalBonus,
      dailyBonus,
      penalties
    };
  }

  // Helper method to get score breakdown for UI/analytics
  getScoreBreakdown(score: GameScore): string {
    return [
      `Base Score: ${Object.values(score.wordScores).reduce((sum, ws) => sum + ws.base, 0)}`,
      `Length Bonuses: ${Object.values(score.wordScores).reduce((sum, ws) => sum + ws.length, 0)}`,
      `Rare Letters: ${Object.values(score.wordScores).reduce((sum, ws) => sum + ws.rareLetters, 0)}`,
      `Streak Bonuses: ${Object.values(score.wordScores).reduce((sum, ws) => sum + ws.streak, 0)}`,
      `Speed Bonuses: ${Object.values(score.wordScores).reduce((sum, ws) => sum + ws.speed, 0)}`,
      `Terminal Bonus: ${score.terminalBonus}`,
      `Daily Bonus: ${score.dailyBonus}`,
      `Penalties: ${score.penalties}`,
      `Final Multiplier: ${score.multiplier}x`,
      `Total Score: ${score.total}`
    ].join('\n');
  }
}

// Export singleton instance
export const scoringSystem = new ScoringSystem();

/**
 * Calculate base score for a word
 */
export function calculateWordScore(word: string): number {
  if (!word) return 0;
  
  let score = 10; // Base score
  
  // Length bonus
  if (word.length > 5) {
    score += (word.length - 5);
  }
  
  // Rare letter bonus
  const rareLetters = new Set(['q', 'z', 'x', 'j']);
  for (const letter of word.toLowerCase()) {
    if (rareLetters.has(letter)) {
      score += 5;
    }
  }
  
  return score;
}

/**
 * Calculate bonus points for terminal words
 */
export async function calculateTerminalBonus(word: string): Promise<number> {
  if (!word) return 0;
  
  // Check if it's a terminal word
  const isTerminal = await isTerminalWord(word);
  if (!isTerminal) return 0;
  
  let bonus = 20; // Base terminal bonus
  
  // Additional bonus for longer words
  if (word.length > 5) {
    bonus += (word.length - 5) * 2;
  }
  
  return bonus;
}

/**
 * Calculate total score for a word including any bonuses
 */
export async function calculateTotalScore(word: string): Promise<number> {
  const baseScore = calculateWordScore(word);
  const terminalBonus = await calculateTerminalBonus(word);
  return baseScore + terminalBonus;
} 