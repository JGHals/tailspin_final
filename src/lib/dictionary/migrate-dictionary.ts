import { db } from '../firebase/firebase';
import { collection, doc, getDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { FIREBASE_CONFIG, DICTIONARY_CONFIG } from './constants';
import type { DictionaryMetadata } from './types';

interface MigrationProgress {
  totalPrefixes: number;
  processedPrefixes: number;
  errors: Array<{ prefix: string; error: string }>;
}

export async function migrateDictionary(
  progressCallback?: (progress: MigrationProgress) => void
): Promise<void> {
  // Get existing dictionary data
  const dictionaryDoc = await getDoc(
    doc(collection(db, DICTIONARY_CONFIG.firebasePath))
  );

  if (!dictionaryDoc.exists()) {
    throw new Error('Source dictionary not found');
  }

  const words = dictionaryDoc.data().words as string[];
  
  // Group words by prefix
  const prefixMap = new Map<string, string[]>();
  words.forEach(word => {
    const prefix = word.slice(0, 2).toLowerCase();
    if (!prefixMap.has(prefix)) {
      prefixMap.set(prefix, []);
    }
    prefixMap.get(prefix)!.push(word);
  });

  const progress: MigrationProgress = {
    totalPrefixes: prefixMap.size,
    processedPrefixes: 0,
    errors: []
  };

  // Process each prefix
  for (const [prefix, prefixWords] of prefixMap.entries()) {
    try {
      // Create chunks
      const chunks = [];
      for (let i = 0; i < prefixWords.length; i += FIREBASE_CONFIG.CHUNK_SIZE) {
        const chunkWords = prefixWords.slice(i, i + FIREBASE_CONFIG.CHUNK_SIZE);
        const lengths = chunkWords.map(w => w.length);
        
        chunks.push({
          words: chunkWords,
          prefix,
          chunkIndex: Math.floor(i / FIREBASE_CONFIG.CHUNK_SIZE),
          wordCount: chunkWords.length,
          minLength: Math.min(...lengths),
          maxLength: Math.max(...lengths),
          updatedAt: new Date().toISOString()
        });
      }

      // Write chunks in batches
      const batches: Array<Promise<void>> = [];
      for (let i = 0; i < chunks.length; i += FIREBASE_CONFIG.BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchChunks = chunks.slice(i, i + FIREBASE_CONFIG.BATCH_SIZE);

        batchChunks.forEach(chunk => {
          const chunkRef = doc(
            collection(db, FIREBASE_CONFIG.COLLECTIONS.PREFIXES),
            `${prefix}_${chunk.chunkIndex}`
          );
          batch.set(chunkRef, chunk);
        });

        batches.push(batch.commit());
      }

      await Promise.all(batches);
      progress.processedPrefixes++;
      
      if (progressCallback) {
        progressCallback(progress);
      }
    } catch (error) {
      progress.errors.push({
        prefix,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (progressCallback) {
        progressCallback(progress);
      }
    }
  }

  // Create metadata
  const metadata: DictionaryMetadata = {
    totalWords: words.length,
    prefixCounts: Object.fromEntries(
      Array.from(prefixMap.entries()).map(([prefix, words]) => [prefix, words.length])
    ),
    lastUpdated: new Date().toISOString(),
    version: DICTIONARY_CONFIG.cacheVersion
  };

  await runTransaction(db, async transaction => {
    const metadataRef = doc(
      collection(db, FIREBASE_CONFIG.COLLECTIONS.METADATA),
      FIREBASE_CONFIG.METADATA_DOC
    );
    transaction.set(metadataRef, metadata);
  });

  if (progress.errors.length > 0) {
    console.warn('Migration completed with errors:', progress.errors);
  }
} 