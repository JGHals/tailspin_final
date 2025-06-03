import { dictionaryAccess } from '../dictionary/dictionary-access';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  score?: number;
  isTerminal?: boolean;
  possibleNextMoves?: number;
  rareLettersUsed?: string[];
  branchingFactor?: number;
  pathDifficulty?: 'easy' | 'medium' | 'hard';
  suggestedHints?: string[];
}

export interface ChainValidator {
  validateChain(words: string[]): Promise<boolean>;
  findPossibleNextWords(lastWord: string): Promise<string[]>;
  isTerminalPosition(word: string): Promise<boolean>;
  validateNextWord(chain: string[], nextWord: string): Promise<ValidationResult>;
  getChainStats(chain: string[]): Promise<ChainStats>;
  resetUsedWords(): void;
  analyzePath(chain: string[]): Promise<PathAnalysis>;
  findAlternativePaths(chain: string[], depth?: number): Promise<string[][]>;
}

export interface ChainStats {
  length: number;
  uniqueLetters: Set<string>;
  rareLetters: string[];
  averageWordLength: number;
  longestWord: string;
  currentStreak: number;
  maxStreak: number;
  terminalWords: string[];
  branchingFactors: number[];
  pathDifficulty: 'easy' | 'medium' | 'hard';
}

export interface PathAnalysis {
  averageBranchingFactor: number;
  maxBranchingFactor: number;
  minBranchingFactor: number;
  terminalRisk: number;
  difficulty: 'easy' | 'medium' | 'hard';
  suggestedMoves: string[];
  alternativePaths: string[][];
  deadEndWords: string[];
}

const RARE_LETTERS = new Set(['Q', 'Z', 'X', 'J']);
const MIN_WORD_LENGTH = 2;
const MAX_SEARCH_DEPTH = 3;
const BRANCHING_THRESHOLDS = {
  LOW: 3,
  MEDIUM: 7,
  HIGH: 15
};

export class GameChainValidator implements ChainValidator {
  private usedWords: Set<string> = new Set();
  private currentStreak: number = 0;
  private maxStreak: number = 0;
  private terminalWords: string[] = [];
  private branchingCache: Map<string, string[]> = new Map();

  async validateChain(words: string[]): Promise<boolean> {
    this.usedWords.clear();
    this.currentStreak = 0;
    this.maxStreak = 0;
    this.branchingCache.clear();
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Basic validation
      if (word.length < MIN_WORD_LENGTH) return false;
      
      // Dictionary validation
      const isValid = await dictionaryAccess.isValidWord(word);
      if (!isValid) return false;

      // Duplicate check
      if (this.usedWords.has(word)) return false;
      this.usedWords.add(word);

      // Chain rule check (except first word)
      if (i > 0) {
        const prevWord = words[i - 1];
        const prevLastTwo = prevWord.slice(-2);
        if (!word.startsWith(prevLastTwo)) return false;
      }

      // Update streak
      this.currentStreak++;
      if (this.currentStreak > this.maxStreak) {
        this.maxStreak = this.currentStreak;
      }

      // Check if terminal word and cache next moves
      const nextMoves = await this.findPossibleNextWords(word);
      this.branchingCache.set(word, nextMoves);
      
      if (nextMoves.length === 0) {
        this.terminalWords.push(word);
      }
    }

    return true;
  }

  async findPossibleNextWords(lastWord: string): Promise<string[]> {
    // Check cache first
    if (this.branchingCache.has(lastWord)) {
      return this.branchingCache.get(lastWord)!;
    }

    const nextWords = await dictionaryAccess.findNextValidWords(lastWord);
    const validNextWords = nextWords.filter((word: string) => 
      !this.usedWords.has(word) && 
      word.length >= MIN_WORD_LENGTH
    );

    // Cache the result
    this.branchingCache.set(lastWord, validNextWords);
    return validNextWords;
  }

  async isTerminalPosition(word: string): Promise<boolean> {
    // Check cache first
    if (this.branchingCache.has(word)) {
      return this.branchingCache.get(word)!.length === 0;
    }

    const nextWords = await this.findPossibleNextWords(word);
    return nextWords.length === 0;
  }

  private async calculateBranchingFactor(word: string, depth: number = 1): Promise<number> {
    if (depth <= 0) return 0;

    const nextWords = await this.findPossibleNextWords(word);
    if (depth === 1) return nextWords.length;

    let totalBranches = nextWords.length;
    for (const nextWord of nextWords.slice(0, 3)) { // Limit recursive search
      totalBranches += await this.calculateBranchingFactor(nextWord, depth - 1);
    }

    return totalBranches / (depth * 2); // Normalize by depth
  }

  private async findDeadEndWords(word: string, depth: number = 2): Promise<string[]> {
    const deadEnds: string[] = [];
    const nextWords = await this.findPossibleNextWords(word);

    for (const nextWord of nextWords) {
      const branchingFactor = await this.calculateBranchingFactor(nextWord);
      if (branchingFactor <= BRANCHING_THRESHOLDS.LOW) {
        deadEnds.push(nextWord);
      } else if (depth > 0) {
        deadEnds.push(...await this.findDeadEndWords(nextWord, depth - 1));
      }
    }

    return deadEnds;
  }

  async validateNextWord(chain: string[], nextWord: string): Promise<ValidationResult> {
    // Basic validation (reuse existing code)
    if (nextWord.length < MIN_WORD_LENGTH) {
      return { 
        valid: false, 
        reason: `Word must be at least ${MIN_WORD_LENGTH} letters long` 
      };
    }

    // Dictionary check
    const isValid = await dictionaryAccess.isValidWord(nextWord);
    if (!isValid) {
      return { valid: false, reason: 'Word not found in dictionary' };
    }

    // Duplicate check
    if (this.usedWords.has(nextWord)) {
      return { valid: false, reason: 'Word already used in this game' };
    }

    // Chain rule check
    if (chain.length > 0) {
      const lastWord = chain[chain.length - 1];
      const lastTwoLetters = lastWord.slice(-2);
      
      if (!nextWord.startsWith(lastTwoLetters)) {
        return { 
          valid: false, 
          reason: `Word must start with "${lastTwoLetters}"` 
        };
      }
    }

    // Advanced validation
    const branchingFactor = await this.calculateBranchingFactor(nextWord, 2);
    const nextMoves = await this.findPossibleNextWords(nextWord);
    const isTerminal = nextMoves.length === 0;
    const deadEnds = await this.findDeadEndWords(nextWord);
    
    let pathDifficulty: 'easy' | 'medium' | 'hard';
    if (branchingFactor >= BRANCHING_THRESHOLDS.HIGH) {
      pathDifficulty = 'easy';
    } else if (branchingFactor >= BRANCHING_THRESHOLDS.MEDIUM) {
      pathDifficulty = 'medium';
    } else {
      pathDifficulty = 'hard';
    }

    // Generate hints if the path is difficult
    let suggestedHints: string[] | undefined;
    if (pathDifficulty === 'hard' && nextMoves.length > 0) {
      suggestedHints = nextMoves
        .slice(0, 3)
        .map(word => `${word.slice(0, 3)}...`);
    }

    // Calculate rare letters
    const rareLettersUsed = Array.from(nextWord.toUpperCase())
      .filter(letter => RARE_LETTERS.has(letter));

    // Add word to used words if valid
    this.usedWords.add(nextWord);
    
    // Update streak
    this.currentStreak++;
    if (this.currentStreak > this.maxStreak) {
      this.maxStreak = this.currentStreak;
    }

    // Track terminal words
    if (isTerminal) {
      this.terminalWords.push(nextWord);
    }

    return { 
      valid: true,
      isTerminal,
      possibleNextMoves: nextMoves.length,
      rareLettersUsed,
      branchingFactor,
      pathDifficulty,
      suggestedHints
    };
  }

  async getChainStats(chain: string[]): Promise<ChainStats> {
    const uniqueLetters = new Set<string>();
    const rareLetters: string[] = [];
    let totalLength = 0;
    let longestWord = '';
    const branchingFactors: number[] = [];

    for (const word of chain) {
      // Track unique letters
      Array.from(word.toUpperCase()).forEach(letter => {
        uniqueLetters.add(letter);
        if (RARE_LETTERS.has(letter) && !rareLetters.includes(letter)) {
          rareLetters.push(letter);
        }
      });

      // Track longest word
      if (word.length > longestWord.length) {
        longestWord = word;
      }

      totalLength += word.length;

      // Calculate branching factor
      const bf = await this.calculateBranchingFactor(word);
      branchingFactors.push(bf);
    }

    // Calculate path difficulty based on average branching factor
    const avgBranching = branchingFactors.reduce((a, b) => a + b, 0) / branchingFactors.length;
    let pathDifficulty: 'easy' | 'medium' | 'hard';
    
    if (avgBranching >= BRANCHING_THRESHOLDS.HIGH) {
      pathDifficulty = 'easy';
    } else if (avgBranching >= BRANCHING_THRESHOLDS.MEDIUM) {
      pathDifficulty = 'medium';
    } else {
      pathDifficulty = 'hard';
    }

    return {
      length: chain.length,
      uniqueLetters,
      rareLetters,
      averageWordLength: chain.length > 0 ? totalLength / chain.length : 0,
      longestWord,
      currentStreak: this.currentStreak,
      maxStreak: this.maxStreak,
      terminalWords: [...this.terminalWords],
      branchingFactors,
      pathDifficulty
    };
  }

  async analyzePath(chain: string[]): Promise<PathAnalysis> {
    const branchingFactors: number[] = [];
    const deadEndWords: string[] = [];
    let maxBranching = 0;
    let minBranching = Infinity;

    // Analyze each position
    for (const word of chain) {
      const bf = await this.calculateBranchingFactor(word, 2);
      branchingFactors.push(bf);
      maxBranching = Math.max(maxBranching, bf);
      minBranching = Math.min(minBranching, bf);

      // Find potential dead ends
      const deadEnds = await this.findDeadEndWords(word);
      deadEndWords.push(...deadEnds);
    }

    const avgBranching = branchingFactors.reduce((a, b) => a + b, 0) / branchingFactors.length;
    
    // Calculate terminal risk based on branching factors
    const terminalRisk = Math.max(0, Math.min(1, 
      (BRANCHING_THRESHOLDS.MEDIUM - avgBranching) / BRANCHING_THRESHOLDS.MEDIUM
    ));

    // Determine difficulty
    let difficulty: 'easy' | 'medium' | 'hard';
    if (avgBranching >= BRANCHING_THRESHOLDS.HIGH) {
      difficulty = 'easy';
    } else if (avgBranching >= BRANCHING_THRESHOLDS.MEDIUM) {
      difficulty = 'medium';
    } else {
      difficulty = 'hard';
    }

    // Find alternative paths
    const alternativePaths = await this.findAlternativePaths(chain);

    // Generate suggested moves
    const lastWord = chain[chain.length - 1];
    const nextMoves = await this.findPossibleNextWords(lastWord);
    const suggestedMoves = nextMoves
      .sort((a, b) => b.length - a.length) // Prefer longer words
      .slice(0, 3);

    return {
      averageBranchingFactor: avgBranching,
      maxBranchingFactor: maxBranching,
      minBranchingFactor: minBranching,
      terminalRisk,
      difficulty,
      suggestedMoves,
      alternativePaths,
      deadEndWords: Array.from(new Set(deadEndWords)) // Remove duplicates
    };
  }

  async findAlternativePaths(
    chain: string[], 
    depth: number = MAX_SEARCH_DEPTH
  ): Promise<string[][]> {
    if (chain.length === 0) return [];

    const lastWord = chain[chain.length - 1];
    const paths: string[][] = [];
    const visited = new Set(chain);

    const explore = async (
      current: string,
      path: string[],
      currentDepth: number
    ) => {
      if (currentDepth >= depth) return;
      if (paths.length >= 5) return; // Limit number of alternative paths

      const nextWords = await this.findPossibleNextWords(current);
      
      for (const word of nextWords) {
        if (visited.has(word)) continue;
        
        const newPath = [...path, word];
        paths.push(newPath);
        
        visited.add(word);
        await explore(word, newPath, currentDepth + 1);
        visited.delete(word);
      }
    };

    await explore(lastWord, [], 0);
    return paths;
  }

  resetUsedWords(): void {
    this.usedWords.clear();
    this.currentStreak = 0;
    this.maxStreak = 0;
    this.terminalWords = [];
    this.branchingCache.clear();
  }
}

// Export singleton instance
export const chainValidator = new GameChainValidator(); 