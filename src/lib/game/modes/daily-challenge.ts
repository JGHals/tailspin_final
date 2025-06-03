import { dictionaryAccess } from '../../dictionary/dictionary-access';
import { chainValidator } from '../chain-validator';
import { db } from '../../firebase/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  query,
  where,
  getDocs,
  DocumentData,
  Timestamp,
  increment,
  runTransaction
} from 'firebase/firestore';
import { tokenManager } from '../token-manager';
import { RARE_LETTERS } from '../scoring';
import { dailyPuzzleGenerator, DailyPuzzle } from '../daily-puzzle-generator';
import { achievementSystem } from '../achievement-system';
import type { Achievement } from '../../types/user-profile';

export interface DailyResult {
  userId: string;
  puzzleId: string;
  chain: string[];
  score: number;
  duration: number;
  powerUpsUsed: string[];
  timestamp: Timestamp;
  moveCount: number;
  invalidAttempts: number;
  hintsUsed: number;
  foundOptimalPath: boolean;
  achievements?: Achievement[];
  terminalWords: Set<string>;
  rareLettersUsed: Set<string>;
}

interface WordFilter {
  minLength: number;
  maxLength: number;
}

class DailyChallengeManager {
  private static readonly COLLECTION_PUZZLES = 'daily_puzzles';
  private static readonly COLLECTION_RESULTS = 'daily_results';
  private static readonly MAX_PATH_LENGTH = 7;
  private static readonly MIN_PATH_LENGTH = 3;
  private static readonly BASE_TOKEN_REWARD = 3;
  private static readonly COMPLETION_BONUS = 5;
  private static readonly FAST_SOLVE_BONUS = 2;
  private static readonly OPTIMAL_PATH_BONUS = 10;
  private static readonly NO_MISTAKES_BONUS = 5;
  private static readonly POWER_UP_PENALTY = 2;
  private static readonly RARE_LETTER_BONUS = 1;

  private async findValidPaths(
    startWord: string,
    targetWord: string,
    maxDepth: number = DailyChallengeManager.MAX_PATH_LENGTH,
    paths: string[][] = [[startWord]],
    validPaths: string[][] = []
  ): Promise<string[][]> {
    if (validPaths.length >= 3) return validPaths; // Found enough valid paths

    for (const currentPath of paths) {
      if (currentPath.length > maxDepth) continue;
      
      const lastWord = currentPath[currentPath.length - 1];
      
      // If we reached target, add to valid paths
      if (lastWord === targetWord) {
        validPaths.push([...currentPath]);
        continue;
      }

      // Get next possible words
      const nextWords = await chainValidator.findPossibleNextWords(lastWord);
      
      // Create new paths with each valid next word
      const newPaths = nextWords
        .filter(word => !currentPath.includes(word)) // Avoid cycles
        .map(word => [...currentPath, word]);

      // Recursively search new paths
      await this.findValidPaths(startWord, targetWord, maxDepth, newPaths, validPaths);
    }

    return validPaths;
  }

  private calculateDifficulty(paths: string[][]): {
    difficulty: 'easy' | 'medium' | 'hard';
    parMoves: number;
  } {
    const shortestPath = Math.min(...paths.map(p => p.length - 1)); // -1 to exclude start word
    
    if (shortestPath <= 3) {
      return { difficulty: 'easy', parMoves: 3 };
    } else if (shortestPath <= 5) {
      return { difficulty: 'medium', parMoves: 5 };
    } else {
      return { difficulty: 'hard', parMoves: 7 };
    }
  }

  async generatePuzzle(date: string): Promise<DailyPuzzle> {
    // Get a random word pair that has valid paths
    const startWord = await this.getRandomStartWord();
    const targetWord = await this.findSuitableTarget(startWord);
    
    // Find valid paths between words
    const validPaths = await this.findValidPaths(startWord, targetWord);
    
    if (validPaths.length === 0) {
      throw new Error('No valid paths found between words');
    }

    const { difficulty, parMoves } = this.calculateDifficulty(validPaths);

    // Generate hints based on the shortest valid path
    const shortestPath = validPaths.reduce(
      (shortest, current) => current.length < shortest.length ? current : shortest,
      validPaths[0]
    );
    
    const hints = this.generateHints(shortestPath);

    const puzzle: DailyPuzzle = {
      id: date,
      date,
      startWord,
      targetWord,
      parMoves,
      difficulty,
      validPaths,
      hints
    };

    // Store in Firebase
    await setDoc(
      doc(collection(db, DailyChallengeManager.COLLECTION_PUZZLES), date),
      puzzle
    );

    return puzzle;
  }

  private async getRandomStartWord(): Promise<string> {
    // Get a word between 4-6 letters that has many possible next words
    const words = await this.getRandomWordsFromDictionary({
      minLength: 4,
      maxLength: 6
    });

    // Find the word with the most possible next words
    let bestWord = words[0];
    let maxNextWords = 0;

    for (const word of words) {
      const nextWords = await chainValidator.findPossibleNextWords(word);
      if (nextWords.length > maxNextWords) {
        maxNextWords = nextWords.length;
        bestWord = word;
      }
    }

    return bestWord;
  }

  private async findSuitableTarget(startWord: string): Promise<string> {
    const words = await this.getRandomWordsFromDictionary({
      minLength: 4,
      maxLength: 8
    });

    // Try each candidate until we find one with valid paths
    for (const target of words) {
      if (target === startWord) continue;
      
      const paths = await this.findValidPaths(startWord, target);
      if (paths.length > 0) {
        return target;
      }
    }

    throw new Error('No suitable target word found');
  }

  private async getRandomWordsFromDictionary(filter: WordFilter): Promise<string[]> {
    // This is a placeholder - implement actual random word selection from dictionary
    // For now, return some sample words
    return ['chain', 'input', 'table', 'eager', 'round', 'dance', 'light', 'think', 'pause', 'quick'];
  }

  private generateHints(path: string[]): string[] {
    const hints: string[] = [];
    
    // For each word after start, generate a hint showing first 3 letters
    for (let i = 1; i < path.length; i++) {
      const word = path[i];
      hints.push(`${word.slice(0, 3)}...`);
    }

    return hints;
  }

  async getPuzzle(date: string): Promise<DailyPuzzle | null> {
    const puzzleDoc = await getDoc(
      doc(collection(db, DailyChallengeManager.COLLECTION_PUZZLES), date)
    );

    return puzzleDoc.exists() ? puzzleDoc.data() as DailyPuzzle : null;
  }

  async submitResult(result: DailyResult): Promise<{
    success: boolean;
    tokens?: number;
    error?: string;
    achievements?: Achievement[];
  }> {
    // Get puzzle to verify completion
    const puzzle = await this.getPuzzle(result.puzzleId);
    if (!puzzle) {
      return { success: false, error: 'Puzzle not found' };
    }

    // Verify the chain is valid
    const lastWord = result.chain[result.chain.length - 1];
    if (lastWord !== puzzle.targetWord) {
      return { success: false, error: 'Chain does not reach target word' };
    }

    // Check if the solution follows an optimal path
    const foundOptimalPath = puzzle.validPaths.some(path => 
      path.join(',') === result.chain.join(',')
    );

    // Calculate token rewards
    let tokenReward = DailyChallengeManager.BASE_TOKEN_REWARD;

    // Completion bonus
    tokenReward += DailyChallengeManager.COMPLETION_BONUS;

    // Under par bonus
    if (result.moveCount <= puzzle.parMoves) {
      tokenReward += Math.floor((puzzle.parMoves - result.moveCount) * 1.5);
    }

    // Fast solve bonus (under 2 minutes)
    if (result.duration <= 120) {
      tokenReward += DailyChallengeManager.FAST_SOLVE_BONUS;
    }

    // Optimal path bonus
    if (foundOptimalPath) {
      tokenReward += DailyChallengeManager.OPTIMAL_PATH_BONUS;
    }

    // No mistakes bonus
    if (result.invalidAttempts === 0) {
      tokenReward += DailyChallengeManager.NO_MISTAKES_BONUS;
    }

    // Count rare letters used
    const rareLetters = result.chain.reduce((count, word) => {
      return count + Array.from(word).filter(letter => 
        RARE_LETTERS.has(letter.toUpperCase())
      ).length;
    }, 0);
    tokenReward += rareLetters * DailyChallengeManager.RARE_LETTER_BONUS;

    // Power-up penalties
    const powerUpPenalty = result.powerUpsUsed.length * DailyChallengeManager.POWER_UP_PENALTY;
    const finalTokens = Math.max(0, tokenReward - powerUpPenalty);

    // Check achievements
    const gameHistory = {
      id: `${result.puzzleId}_${result.userId}`,
      mode: 'daily' as const,
      chain: result.chain,
      score: result.score,
      duration: result.duration,
      date: result.puzzleId,
      longestWord: result.chain.reduce((longest, word) => word.length > longest.length ? word : longest, ''),
      hintsUsed: result.hintsUsed,
      uniqueLettersUsed: Array.from(new Set(result.chain.join('').split(''))),
      rareLettersUsed: Array.from(result.rareLettersUsed),
      terminalWords: Array.from(result.terminalWords)
    };
    const achievements = await achievementSystem.checkAchievements(result.userId, gameHistory);

    // Save the result with achievements
    const resultWithAchievements: DailyResult = {
      ...result,
      foundOptimalPath,
      achievements
    };

    await setDoc(
      doc(collection(db, DailyChallengeManager.COLLECTION_RESULTS), `${result.puzzleId}_${result.userId}`),
      {
        ...resultWithAchievements,
        timestamp: Timestamp.now()
      }
    );

    // Update puzzle metadata
    await this.updatePuzzleMetadata(puzzle.id, {
      totalAttempts: 1,
      successRate: 1,
      averageCompletionTime: result.duration,
      foundOptimalPath
    });

    // Add tokens to user's balance
    if (finalTokens > 0) {
      await tokenManager.addTokens(
        result.userId,
        finalTokens,
        'Daily challenge completion',
        'daily',
        result.puzzleId
      );
    }

    return {
      success: true,
      tokens: finalTokens,
      achievements
    };
  }

  private async updatePuzzleMetadata(puzzleId: string, newResult: {
    totalAttempts: number;
    successRate: number;
    averageCompletionTime: number;
    foundOptimalPath: boolean;
  }): Promise<void> {
    const puzzleRef = doc(db, DailyChallengeManager.COLLECTION_PUZZLES, puzzleId);

    await runTransaction(db, async (transaction) => {
      const puzzleDoc = await transaction.get(puzzleRef);
      if (!puzzleDoc.exists()) return;

      const puzzle = puzzleDoc.data() as DailyPuzzle;
      const metadata = puzzle.metadata ?? {
        totalAttempts: 0,
        successRate: 0,
        averageCompletionTime: 0,
        optimalPathCount: 0
      };

      const newMetadata = {
        totalAttempts: (metadata.totalAttempts ?? 0) + 1,
        successRate: (
          ((metadata.successRate ?? 0) * (metadata.totalAttempts ?? 0) + 1) /
          ((metadata.totalAttempts ?? 0) + 1)
        ),
        averageCompletionTime: (
          ((metadata.averageCompletionTime ?? 0) * (metadata.totalAttempts ?? 0) + newResult.averageCompletionTime) /
          ((metadata.totalAttempts ?? 0) + 1)
        ),
        optimalPathCount: newResult.foundOptimalPath ? 
          (metadata.optimalPathCount ?? 0) + 1 : 
          (metadata.optimalPathCount ?? 0)
      };

      transaction.update(puzzleRef, {
        metadata: newMetadata
      });
    });
  }

  async getLeaderboard(puzzleId: string, limit: number = 10): Promise<DailyResult[]> {
    const resultsRef = collection(db, DailyChallengeManager.COLLECTION_RESULTS);
    const resultsQuery = query(
      resultsRef,
      where('puzzleId', '==', puzzleId)
    );

    const snapshot = await getDocs(resultsQuery);
    const results = snapshot.docs.map(doc => doc.data() as DailyResult);

    // Sort by score (desc), then by duration (asc), then by moveCount (asc)
    return results
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        if (a.duration !== b.duration) return a.duration - b.duration;
        return a.moveCount - b.moveCount;
      })
      .slice(0, limit);
  }
}

// Export singleton instance
export const dailyChallengeManager = new DailyChallengeManager(); 