import { PowerUpResult } from '../types/game';
import { DictionaryService } from './dictionary.service';

export class PowerUpService {
  constructor(private dictionaryService: DictionaryService) {}

  async hint(currentWord: string): Promise<string[]> {
    // Get valid next words starting with last 2 letters
    const prefix: string = currentWord.slice(-2);
    const validWords: string[] = await this.dictionaryService.findWordsWithPrefix(prefix);
    return validWords.slice(0, 3); // Return top 3 suggestions
  }

  async undo(chain: string[]): Promise<PowerUpResult> {
    if (chain.length <= 1) {
      return { success: false, error: "Cannot undo - at start of chain" };
    }
    return { success: true };
  }

  async wordWarp(currentWord: string): Promise<PowerUpResult> {
    // Get all valid 2-letter combinations that have valid next words
    const validPrefixes: string[] = await this.dictionaryService.getValidPrefixes();
    const words: string[][] = await Promise.all(
      validPrefixes.map((prefix: string) => this.dictionaryService.findWordsWithPrefix(prefix))
    );
    
    return {
      success: true,
      data: {
        words: words.flat().slice(0, 10) // Return up to 10 valid words
      }
    };
  }

  async flip(currentWord: string): Promise<PowerUpResult> {
    const prefix: string = currentWord.slice(-2);
    const flippedPrefix: string = prefix.split('').reverse().join('');
    
    const validWords: string[] = await this.dictionaryService.findWordsWithPrefix(flippedPrefix);
    if (validWords.length === 0) {
      return { 
        success: false, 
        error: `No valid words start with '${flippedPrefix}'` 
      };
    }

    return {
      success: true,
      data: {
        originalPrefix: prefix,
        flippedPrefix: flippedPrefix
      }
    };
  }

  async bridge(currentWord: string, targetWord?: string): Promise<PowerUpResult> {
    const prefix: string = currentWord.slice(-2);
    const validWords: string[] = await this.dictionaryService.findWordsWithPrefix(prefix);
    
    if (targetWord) {
      // If we have a target word, try to find a bridge word that gets us closer
      const targetPrefix: string = targetWord.slice(0, 2);
      const bridgeWord: string | undefined = validWords.find((word: string) => {
        const wordEnding: string = word.slice(-2);
        return this.dictionaryService.hasWordsWithPrefix(wordEnding) &&
               wordEnding[0] === targetPrefix[0];
      });
      
      if (bridgeWord) {
        return {
          success: true,
          data: { bridgeWord }
        };
      }
    }
    
    // If no target word or no strategic bridge found, return a random valid word
    const randomWord: string = validWords[Math.floor(Math.random() * validWords.length)];
    return {
      success: true,
      data: { bridgeWord: randomWord }
    };
  }
} 