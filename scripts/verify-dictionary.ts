#!/usr/bin/env node

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the service account file
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'firebase-admin.json'), 'utf8')
);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

interface DictionaryMetadata {
  totalWords: number;
  prefixCounts: Record<string, number>;
}

async function listCollections() {
  const collections = await db.listCollections();
  console.log('\nFound collections:');
  collections.forEach(col => {
    console.log(`- ${col.id}`);
  });
  return collections;
}

async function verifyDictionaryCollection(collectionName: string) {
  try {
    console.log(`\nVerifying dictionary collection: ${collectionName}`);

    // Get metadata
    const metadataDoc = await db.collection(collectionName).doc('metadata').get();
    if (!metadataDoc.exists) {
      console.log(`No metadata found in ${collectionName}`);
      return;
    }

    const metadata = metadataDoc.data() as DictionaryMetadata;
    console.log(`Total words in metadata: ${metadata.totalWords}`);
    console.log('Prefix counts:', metadata.prefixCounts);

    // Get all dictionary documents
    const chunks = await db.collection(collectionName).where('words', '!=', null).get();
    
    // Verify each prefix's integrity
    const prefixWordCounts = new Map<string, number>();
    const seenWords = new Set<string>();
    let totalWords = 0;

    chunks.forEach(chunk => {
      const data = chunk.data();
      if (!Array.isArray(data.words)) {
        console.error(`Invalid chunk document: ${chunk.id} (no words array)`);
        return;
      }

      // Use document ID as prefix if prefix field is missing
      const prefix = data.prefix || chunk.id;
      const words = data.words as string[];
      
      // Update counts
      prefixWordCounts.set(
        prefix, 
        (prefixWordCounts.get(prefix) || 0) + words.length
      );

      // Check for duplicates
      words.forEach(word => {
        if (seenWords.has(word)) {
          console.error(`Duplicate word found: ${word}`);
        }
        seenWords.add(word);
        totalWords++;
      });
    });

    console.log('\nVerification Results:');
    console.log('---------------------');
    console.log(`Total words found: ${totalWords}`);
    console.log(`Total unique words: ${seenWords.size}`);
    
    if (totalWords > 0) {
      console.log('\nPrefix Word Counts:');
      // Sort prefixes for consistent output
      const sortedPrefixes = Array.from(prefixWordCounts.keys()).sort();
      sortedPrefixes.forEach(prefix => {
        const count = prefixWordCounts.get(prefix);
        const metadataCount = metadata.prefixCounts?.[prefix] || 0;
        if (count !== metadataCount) {
          console.error(`Mismatch for prefix ${prefix}: Found ${count}, Metadata shows ${metadataCount}`);
        } else {
          console.log(`${prefix}: ${count} words`);
        }
      });

      // Check for any prefixes in metadata that weren't found in chunks
      if (metadata.prefixCounts) {
        Object.entries(metadata.prefixCounts).forEach(([prefix, count]) => {
          if (!prefixWordCounts.has(prefix)) {
            console.error(`Missing prefix ${prefix} from metadata (expected ${count} words)`);
          }
        });
      }
    }

    return {
      collectionName,
      totalWords,
      uniqueWords: seenWords.size,
      hasMetadata: true,
      metadataWordCount: metadata.totalWords
    };

  } catch (error) {
    console.error(`Verification failed for ${collectionName}:`, error);
    return {
      collectionName,
      totalWords: 0,
      uniqueWords: 0,
      hasMetadata: false,
      metadataWordCount: 0,
      error
    };
  }
}

async function verifyAllDictionaries() {
  const collections = await listCollections();
  const dictionaryCollections = collections.filter(col => 
    col.id.toLowerCase().includes('dictionary')
  );

  const results = await Promise.all(
    dictionaryCollections.map(col => verifyDictionaryCollection(col.id))
  );

  console.log('\nSummary of All Dictionary Collections:');
  console.log('------------------------------------');
  results.forEach(result => {
    if (result) {
      console.log(`\n${result.collectionName}:`);
      console.log(`- Total Words: ${result.totalWords}`);
      console.log(`- Unique Words: ${result.uniqueWords}`);
      console.log(`- Has Metadata: ${result.hasMetadata}`);
      console.log(`- Metadata Word Count: ${result.metadataWordCount}`);
      if (result.error) {
        console.log(`- Error: ${(result.error as Error).message}`);
      }
    }
  });
}

// Run the verification
verifyAllDictionaries(); 