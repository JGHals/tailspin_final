import { 
  DictionaryData, 
  DictionaryOperations, 
  DictionaryState,
  DictionaryWord
} from './types';
import { 
  DICTIONARY_CONFIG, 
  SCORING,
  TERMINAL_COMBOS,
  VALID_STARTING_COMBOS
} from './constants';

export class Dictionary implements DictionaryOperations {
  private data: DictionaryData;
  private state: DictionaryState;

  constructor() {
    this.data = {
      words: new Set<string>(),
      prefixMap: {},
      suffixMap: {},
      terminalCombos: new Set(TERMINAL_COMBOS),
      version: DICTIONARY_CONFIG.cacheVersion,
      lastUpdated: new Date().toISOString()
    };
    
    this.state = {
      status: 'loading',
      wordCount: 0
    };
  }

  // Core validation methods
  public isValidWord(word: string): boolean {
    if (!word) return false;
    return this.data.words.has(word.toLowerCase());
  }

  public isValidChain(prevWord: string, nextWord: string): boolean {
    if (!prevWord || !nextWord) return false;
    
    const prevSuffix = prevWord.slice(-2).toLowerCase();
    const nextPrefix = nextWord.slice(0, 2).toLowerCase();
    
    return prevSuffix === nextPrefix;
  }

  public isTerminalWord(word: string): boolean {
    if (!word || word.length < 2) return false;
    const suffix = word.slice(-2).toLowerCase();
    return this.data.terminalCombos.has(suffix);
  }

  // Word retrieval methods
  public getValidNextWords(currentWord: string): string[] {
    if (!currentWord || currentWord.length < 2) return [];
    
    const suffix = currentWord.slice(-2).toLowerCase();
    return Array.from(this.data.prefixMap[suffix] || []);
  }

  public getValidPreviousWords(currentWord: string): string[] {
    if (!currentWord || currentWord.length < 2) return [];
    
    const prefix = currentWord.slice(0, 2).toLowerCase();
    return Array.from(this.data.suffixMap[prefix] || []);
  }

  public getRandomWord(options: { minLength?: number; maxLength?: number } = {}): string {
    const { minLength = 2, maxLength = 15 } = options;
    const words = Array.from(this.data.words).filter(
      word => word.length >= minLength && word.length <= maxLength
    );
    
    return words[Math.floor(Math.random() * words.length)];
  }

  public getHintWords(prefix: string, count: number = 3): string[] {
    if (!prefix || !VALID_STARTING_COMBOS.includes(prefix.toLowerCase())) {
      return [];
    }

    const matches = this.data.prefixMap[prefix.toLowerCase()] || new Set();
    return Array.from(matches).slice(0, count);
  }

  // Dictionary building methods
  public addWord(word: string): void {
    if (!this.isValidWordFormat(word)) return;

    const normalizedWord = word.toLowerCase();
    const prefix = normalizedWord.slice(0, 2);
    const suffix = normalizedWord.slice(-2);

    // Add to main word set
    this.data.words.add(normalizedWord);

    // Update prefix map
    if (!this.data.prefixMap[prefix]) {
      this.data.prefixMap[prefix] = new Set();
    }
    this.data.prefixMap[prefix].add(normalizedWord);

    // Update suffix map
    if (!this.data.suffixMap[suffix]) {
      this.data.suffixMap[suffix] = new Set();
    }
    this.data.suffixMap[suffix].add(normalizedWord);

    // Update state
    this.state.wordCount = this.data.words.size;
    this.state.status = 'ready';
    this.state.lastUpdated = new Date().toISOString();
  }

  private isValidWordFormat(word: string): boolean {
    if (!word) return false;
    
    const length = word.length;
    if (length < DICTIONARY_CONFIG.minWordLength || 
        length > DICTIONARY_CONFIG.maxWordLength) {
      return false;
    }

    // Only allow letters
    return /^[a-zA-Z]+$/.test(word);
  }

  // State management
  public getState(): DictionaryState {
    return { ...this.state };
  }

  public getData(): DictionaryData {
    return this.data;
  }

  public clear(): void {
    this.data.words.clear();
    this.data.prefixMap = {};
    this.data.suffixMap = {};
    this.state.wordCount = 0;
    this.state.status = 'loading';
  }
} 