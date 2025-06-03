import { ScoringSystem, defaultScoringRules, RARE_LETTERS } from '../scoring';
import type { GameMode } from '../../types/game';

describe('ScoringSystem', () => {
  let scoringSystem: ScoringSystem;

  beforeEach(() => {
    scoringSystem = new ScoringSystem();
  });

  describe('Word Score Calculation', () => {
    it('should calculate base score correctly', () => {
      const score = scoringSystem.calculateWordScore('test', 6);
      expect(score.base).toBe(defaultScoringRules.basePoints);
    });

    it('should calculate length bonus', () => {
      const score = scoringSystem.calculateWordScore('puzzle', 6);
      expect(score.length).toBe((6 - 4) * defaultScoringRules.lengthBonus);
    });

    it('should not give length bonus for words <= 4 letters', () => {
      const score = scoringSystem.calculateWordScore('test', 6);
      expect(score.length).toBe(0);
    });

    it('should calculate rare letter bonus', () => {
      const score = scoringSystem.calculateWordScore('jazz', 6);
      expect(score.rareLetters).toBe(defaultScoringRules.rareLetterBonus);
    });

    it('should calculate streak bonus', () => {
      const score = scoringSystem.calculateWordScore('test', 4, false, 3);
      expect(score.streak).toBe(2 * defaultScoringRules.streakBonus); // streak - 1 * bonus
    });

    it('should give speed bonus for quick moves', () => {
      const score = scoringSystem.calculateWordScore('test', 3);
      expect(score.speed).toBe(defaultScoringRules.speedBonus);
    });

    it('should not give speed bonus for slow moves', () => {
      const score = scoringSystem.calculateWordScore('test', 6);
      expect(score.speed).toBe(0);
    });

    it('should apply multiplier to total score', () => {
      // Force a streak to increase multiplier
      for (let i = 0; i < 5; i++) {
        scoringSystem.calculateWordScore('test', 3, false, i + 1);
      }
      const score = scoringSystem.calculateWordScore('puzzle', 3, false, 6);
      expect(score.total).toBe(Math.floor((
        defaultScoringRules.basePoints +
        2 * defaultScoringRules.lengthBonus +
        5 * defaultScoringRules.streakBonus +
        defaultScoringRules.speedBonus
      ) * 1.5)); // 1.5x multiplier after 5 words
    });
  });

  describe('Chain Score Calculation', () => {
    it('should calculate total chain score', () => {
      const chain = ['test', 'stellar', 'arcade'];
      const wordTimings = new Map([
        ['stellar', 3],
        ['arcade', 4]
      ]);
      const terminalWords = new Set(['arcade']);

      const score = scoringSystem.calculateScore({
        chain,
        wordTimings,
        terminalWords,
        mode: 'endless' as GameMode,
        moveTime: 4
      });

      expect(score.total).toBeGreaterThan(0);
      expect(Object.keys(score.wordScores)).toHaveLength(2);
      expect(score.terminalBonus).toBe(defaultScoringRules.terminalBonus);
    });

    it('should handle empty chain', () => {
      const score = scoringSystem.calculateScore({
        chain: [],
        wordTimings: new Map(),
        terminalWords: new Set(),
        mode: 'endless' as GameMode,
        moveTime: 0
      });

      expect(score.total).toBe(0);
      expect(Object.keys(score.wordScores)).toHaveLength(0);
    });

    it('should calculate daily mode bonuses', () => {
      const chain = ['test', 'stellar', 'arcade'];
      const wordTimings = new Map([
        ['stellar', 3],
        ['arcade', 3]
      ]);

      const score = scoringSystem.calculateScore({
        chain,
        wordTimings,
        terminalWords: new Set(),
        mode: 'daily' as GameMode,
        dailyPuzzle: {
          date: new Date().toISOString().split('T')[0],
          parMoves: 3
        },
        moveTime: 3
      });

      expect(score.dailyBonus).toBe(
        defaultScoringRules.dailyBonus.completion +
        defaultScoringRules.dailyBonus.underPar +
        defaultScoringRules.dailyBonus.fastSolve
      );
    });

    it('should apply penalties correctly', () => {
      const score = scoringSystem.calculateScore({
        chain: ['test', 'stellar'],
        wordTimings: new Map([['stellar', 4]]),
        terminalWords: new Set(),
        mode: 'endless' as GameMode,
        moveTime: 4,
        invalidAttempts: 2,
        hintsUsed: 1,
        powerUpsUsed: new Set(['hint', 'undo'])
      });

      expect(score.penalties).toBe(
        2 * defaultScoringRules.penalties.invalidAttempt +
        defaultScoringRules.penalties.hintUsed +
        2 * defaultScoringRules.penalties.powerUpUsed
      );
    });
  });

  describe('Utility Functions', () => {
    it('should reset multiplier', () => {
      // Build up multiplier
      for (let i = 0; i < 5; i++) {
        scoringSystem.calculateWordScore('test', 3, false, i + 1);
      }

      scoringSystem.reset();

      const score = scoringSystem.calculateWordScore('test', 3);
      expect(score.total).toBe(
        defaultScoringRules.basePoints +
        defaultScoringRules.speedBonus
      );
    });

    it('should record invalid attempt penalty', () => {
      const penalty = scoringSystem.recordInvalidAttempt();
      expect(penalty).toBe(defaultScoringRules.penalties.invalidAttempt);
    });
  });
}); 