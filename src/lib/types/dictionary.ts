import { Timestamp } from 'firebase/firestore';

export interface Word {
  id: string;
  text: string;
  length: number;
  prefixes: string[];
  suffixes: string[];
  frequency?: number;
  isTerminal?: boolean;
}

export interface DictionaryMetadata {
  totalWords: number;
  uniquePrefixes: number;
  lastUpdated: Timestamp;
  version: number;
  chunkSize: number;
}

export interface PrefixMetadata {
  prefix: string;
  wordCount: number;
  chunks: number;
  lastUpdated: Timestamp;
} 