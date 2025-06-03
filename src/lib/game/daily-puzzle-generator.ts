import { dictionaryAccess } from '../dictionary/dictionary-access';
import { chainValidator } from './chain-validator';
import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface DailyPuzzle {
  id: string;
  date: string;
  startWord: string;
  targetWord: string;
  parMoves: number;
  difficulty: 'easy' | 'medium' | 'hard';
  validPaths: string[][];
  hints?: string[];
  metadata?: {
    averageCompletionTime?: number;
    totalAttempts?: number;
    successRate?: number;
    optimalPathCount?: number;
    branchingFactor?: number;
  };
}

interface WordPath {
  word: string;
  path: string[];
  depth: number;
  branchingFactor?: number;
}

export class DailyPuzzleGenerator {
  private static readonly MIN_PATH_LENGTH = 4;
  private static readonly MAX_PATH_LENGTH = 8;
  private static readonly MAX_SEARCH_DEPTH = 10;
  private static readonly MIN_WORD_LENGTH = 4;
  private static readonly MAX_VALID_PATHS = 5;
  private static readonly COLLECTION_PUZZLES = 'daily_puzzles';

  private async findAllValidPaths(
    startWord: string,
    targetWord: string,
    maxDepth: number = DailyPuzzleGenerator.MAX_PATH_LENGTH
  ): Promise<string[][]> {
    const visited = new Set<string>([startWord]);
    const queue: WordPath[] = [{ word: startWord, path: [startWord], depth: 0 }];
    const validPaths: string[][] = [];
    
    while (queue.length > 0 && validPaths.length < DailyPuzzleGenerator.MAX_VALID_PATHS) {
      const { word, path, depth } = queue.shift()!;
      
      if (depth >= maxDepth) continue;
      
      const nextWords = await chainValidator.findPossibleNextWords(word);
      
      // Calculate branching factor for this position
      const validNextWords = nextWords.filter(w => 
        w.length >= DailyPuzzleGenerator.MIN_WORD_LENGTH && 
        !visited.has(w)
      );

      // If we reached target, add to valid paths
      if (word === targetWord && path.length >= DailyPuzzleGenerator.MIN_PATH_LENGTH) {
        validPaths.push([...path]);
        continue;
      }
      
      // Add all valid next paths to queue
      for (const nextWord of validNextWords) {
        if (visited.has(nextWord)) continue;
        
        visited.add(nextWord);
        queue.push({
          word: nextWord,
          path: [...path, nextWord],
          depth: depth + 1,
          branchingFactor: validNextWords.length
        });
      }
    }
    
    return validPaths;
  }

  private async getRandomStartWord(): Promise<string> {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    let attempts = 0;
    const maxAttempts = 10;
    let bestWord = '';
    let maxBranchingFactor = 0;

    while (attempts < maxAttempts) {
      const prefix = letters[Math.floor(Math.random() * 26)] + 
                    letters[Math.floor(Math.random() * 26)];
      
      const words = await dictionaryAccess.getWordsWithPrefix(prefix);
      const validWords = words.filter(w => 
        w.length >= DailyPuzzleGenerator.MIN_WORD_LENGTH
      );
      
      for (const word of validWords) {
        const nextWords = await chainValidator.findPossibleNextWords(word);
        if (nextWords.length > maxBranchingFactor) {
          maxBranchingFactor = nextWords.length;
          bestWord = word;
        }
      }
      
      if (maxBranchingFactor > 5) {
        return bestWord;
      }
      
      attempts++;
    }

    if (!bestWord) {
      throw new Error('Could not find valid start word');
    }

    return bestWord;
  }

  private calculateDifficulty(paths: string[][]): {
    difficulty: 'easy' | 'medium' | 'hard';
    parMoves: number;
    branchingFactor: number;
  } {
    const shortestPath = Math.min(...paths.map(p => p.length - 1));
    const longestPath = Math.max(...paths.map(p => p.length - 1));
    const avgBranchingFactor = paths.reduce((sum, path) => sum + path.length, 0) / paths.length;
    
    let difficulty: 'easy' | 'medium' | 'hard';
    let parMoves: number;
    
    if (shortestPath <= 3 && avgBranchingFactor > 5) {
      difficulty = 'easy';
      parMoves = shortestPath + 1;
    } else if (shortestPath <= 5 && avgBranchingFactor > 3) {
      difficulty = 'medium';
      parMoves = shortestPath + 2;
    } else {
      difficulty = 'hard';
      parMoves = shortestPath + 3;
    }

    return {
      difficulty,
      parMoves,
      branchingFactor: avgBranchingFactor
    };
  }

  private generateHints(paths: string[][]): string[] {
    // Use the shortest path for hints
    const shortestPath = paths.reduce(
      (shortest, current) => current.length < shortest.length ? current : shortest,
      paths[0]
    );
    
    return shortestPath.slice(1).map(word => `${word.slice(0, 3)}...`);
  }

  async generateDailyPuzzle(date: string): Promise<DailyPuzzle> {
    // Reset validator state
    chainValidator.resetUsedWords();
    
    // Get random start word with good branching factor
    const startWord = await this.getRandomStartWord();
    
    // Find all valid paths from start word to potential targets
    const nextWords = await chainValidator.findPossibleNextWords(startWord);
    let bestPaths: string[][] = [];
    let targetWord = '';
    
    for (const word of nextWords) {
      const paths = await this.findAllValidPaths(startWord, word);
      if (paths.length > bestPaths.length) {
        bestPaths = paths;
        targetWord = word;
      }
      
      if (bestPaths.length >= DailyPuzzleGenerator.MAX_VALID_PATHS) {
        break;
      }
    }
    
    if (bestPaths.length === 0) {
      throw new Error('Could not generate valid puzzle paths');
    }

    const { difficulty, parMoves, branchingFactor } = this.calculateDifficulty(bestPaths);
    const hints = this.generateHints(bestPaths);

    const puzzle: DailyPuzzle = {
      id: date,
      date,
      startWord,
      targetWord,
      parMoves,
      difficulty,
      validPaths: bestPaths,
      hints,
      metadata: {
        branchingFactor,
        optimalPathCount: bestPaths.length
      }
    };

    // Store in Firebase
    await setDoc(
      doc(db, DailyPuzzleGenerator.COLLECTION_PUZZLES, date),
      puzzle
    );

    return puzzle;
  }

  async validatePuzzle(puzzle: DailyPuzzle): Promise<boolean> {
    // Reset validator state
    chainValidator.resetUsedWords();
    
    // Check if start word is valid
    if (!await dictionaryAccess.isValidWord(puzzle.startWord)) {
      return false;
    }
    
    // Check if target word is valid
    if (!await dictionaryAccess.isValidWord(puzzle.targetWord)) {
      return false;
    }
    
    // Try to find paths between start and target
    const paths = await this.findAllValidPaths(puzzle.startWord, puzzle.targetWord);
    
    // Puzzle is valid if we can find at least one path
    return paths.length > 0;
  }

  async updatePuzzleMetadata(puzzleId: string, metadata: {
    averageCompletionTime?: number;
    totalAttempts?: number;
    successRate?: number;
  }): Promise<void> {
    const puzzleRef = doc(db, DailyPuzzleGenerator.COLLECTION_PUZZLES, puzzleId);
    const puzzleDoc = await getDoc(puzzleRef);
    
    if (!puzzleDoc.exists()) {
      throw new Error('Puzzle not found');
    }
    
    const puzzle = puzzleDoc.data() as DailyPuzzle;
    
    await setDoc(puzzleRef, {
      ...puzzle,
      metadata: {
        ...puzzle.metadata,
        ...metadata
      }
    });
  }
}

// Export singleton instance
export const dailyPuzzleGenerator = new DailyPuzzleGenerator(); 