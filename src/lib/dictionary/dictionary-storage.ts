import { DictionaryData, DictionaryCache } from './types';
import { CACHE_KEYS, CACHE_CONFIG, DICTIONARY_CONFIG } from './constants';
import { db } from '../firebase/firebase';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';

// Memory Cache Implementation
class MemoryCache implements DictionaryCache {
  public data: DictionaryData | null = null;
  private timestamp: number = 0;

  isValid(): boolean {
    if (!this.data) return false;
    const age = Date.now() - this.timestamp;
    return age < CACHE_CONFIG.MAX_AGE_MS;
  }

  set(data: DictionaryData): void {
    this.data = data;
    this.timestamp = Date.now();
  }

  get(): DictionaryData | null {
    return this.data;
  }

  clear(): void {
    this.data = null;
    this.timestamp = 0;
  }
}

// Local Storage Cache Implementation
class LocalStorageCache implements DictionaryCache {
  public data: DictionaryData | null = null;

  isValid(): boolean {
    const timestamp = window.localStorage.getItem(CACHE_KEYS.DICTIONARY_TIMESTAMP);
    const version = window.localStorage.getItem(CACHE_KEYS.DICTIONARY_VERSION);
    
    if (!timestamp || !version) return false;
    if (version !== DICTIONARY_CONFIG.cacheVersion) return false;
    
    const age = Date.now() - parseInt(timestamp, 10);
    return age < CACHE_CONFIG.MAX_AGE_MS;
  }

  set(data: DictionaryData): void {
    try {
      // Convert Sets to Arrays for storage
      const storageData = {
        ...data,
        words: Array.from(data.words),
        terminalCombos: Array.from(data.terminalCombos),
        prefixMap: Object.fromEntries(
          Object.entries(data.prefixMap).map(([k, v]) => [k, Array.from(v)])
        ),
        suffixMap: Object.fromEntries(
          Object.entries(data.suffixMap).map(([k, v]) => [k, Array.from(v)])
        )
      };

      window.localStorage.setItem(CACHE_KEYS.DICTIONARY_DATA, JSON.stringify(storageData));
      window.localStorage.setItem(CACHE_KEYS.DICTIONARY_VERSION, DICTIONARY_CONFIG.cacheVersion);
      window.localStorage.setItem(CACHE_KEYS.DICTIONARY_TIMESTAMP, Date.now().toString());
      this.data = data;
    } catch (error) {
      console.error('Failed to save dictionary to localStorage:', error);
    }
  }

  get(): DictionaryData | null {
    try {
      const data = window.localStorage.getItem(CACHE_KEYS.DICTIONARY_DATA);
      if (!data) return null;

      const parsed = JSON.parse(data) as {
        words: string[];
        terminalCombos: string[];
        prefixMap: Record<string, string[]>;
        suffixMap: Record<string, string[]>;
        version: string;
        lastUpdated: string;
      };
      
      // Convert Arrays back to Sets
      this.data = {
        words: new Set(parsed.words),
        terminalCombos: new Set(parsed.terminalCombos),
        prefixMap: Object.fromEntries(
          Object.entries(parsed.prefixMap).map(([k, v]) => [k, new Set(v)])
        ),
        suffixMap: Object.fromEntries(
          Object.entries(parsed.suffixMap).map(([k, v]) => [k, new Set(v)])
        ),
        version: parsed.version,
        lastUpdated: parsed.lastUpdated
      };

      return this.data;
    } catch (error) {
      console.error('Failed to load dictionary from localStorage:', error);
      return null;
    }
  }

  clear(): void {
    window.localStorage.removeItem(CACHE_KEYS.DICTIONARY_DATA);
    window.localStorage.removeItem(CACHE_KEYS.DICTIONARY_VERSION);
    window.localStorage.removeItem(CACHE_KEYS.DICTIONARY_TIMESTAMP);
    this.data = null;
  }
}

// Firebase Operations
export async function loadFromFirebase(): Promise<string[]> {
  const dictionaryDoc = doc(collection(db, DICTIONARY_CONFIG.firebasePath));
  const snapshot = await getDoc(dictionaryDoc);
  
  if (!snapshot.exists()) {
    throw new Error('Dictionary not found in Firebase');
  }

  return snapshot.data().words as string[];
}

export async function saveToFirebase(words: string[]): Promise<void> {
  const dictionaryDoc = doc(collection(db, DICTIONARY_CONFIG.firebasePath));
  await setDoc(dictionaryDoc, { words, updatedAt: new Date().toISOString() });
}

// Export cache instances
export const memoryCache = new MemoryCache();
export const localStorageCache = new LocalStorageCache(); 