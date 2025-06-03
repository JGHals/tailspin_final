export class DictionaryService {
  private dictionary: Set<string>;
  private prefixMap: Map<string, string[]>;
  private suffixMap: Map<string, string[]>;

  constructor() {
    this.dictionary = new Set();
    this.prefixMap = new Map();
    this.suffixMap = new Map();
  }

  async initialize(wordList: string[]): Promise<void> {
    // Clear existing data
    this.dictionary.clear();
    this.prefixMap.clear();
    this.suffixMap.clear();

    // Add words and build maps
    wordList?.forEach(word => {
      if (!word) return;
      const normalizedWord = word.toLowerCase().trim();
      if (this.isValidFormat(normalizedWord)) {
        this.dictionary.add(normalizedWord);
        this.updatePrefixMap(normalizedWord);
        this.updateSuffixMap(normalizedWord);
      }
    });
  }

  private isValidFormat(word: string): boolean {
    return Boolean(word) && /^[a-z]+$/.test(word);
  }

  private updatePrefixMap(word: string): void {
    if (!word) return;
    for (let i = 1; i <= word.length; i++) {
      const prefix = word.slice(0, i);
      const words = this.prefixMap.get(prefix) || [];
      words.push(word);
      this.prefixMap.set(prefix, words);
    }
  }

  private updateSuffixMap(word: string): void {
    if (!word) return;
    for (let i = 0; i < word.length; i++) {
      const suffix = word.slice(i);
      const words = this.suffixMap.get(suffix) || [];
      words.push(word);
      this.suffixMap.set(suffix, words);
    }
  }

  isValidWord(word: string | null | undefined): boolean {
    if (!word) return false;
    return this.dictionary.has(word.toLowerCase());
  }

  getWordsWithPrefix(prefix: string | null | undefined): string[] {
    if (!prefix) return [];
    return this.prefixMap.get(prefix.toLowerCase()) || [];
  }

  getWordsWithSuffix(suffix: string | null | undefined): string[] {
    if (!suffix) return [];
    return this.suffixMap.get(suffix.toLowerCase()) || [];
  }

  isValidChainPair(word1: string | null | undefined, word2: string | null | undefined): boolean {
    if (!word1 || !word2) return false;
    if (!this.isValidWord(word1) || !this.isValidWord(word2)) {
      return false;
    }
    const lastTwoLetters = word1.slice(-2).toLowerCase();
    return word2.toLowerCase().startsWith(lastTwoLetters);
  }

  size(): number {
    return this.dictionary.size;
  }
} 