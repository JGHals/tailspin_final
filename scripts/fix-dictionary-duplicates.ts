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

async function fixDictionaryDuplicates() {
  try {
    console.log('Fixing dictionary duplicates and prefix counts...');
    
    // Get all dictionary documents except metadata
    const chunks = await db.collection('dictionary')
      .where('words', '!=', null)
      .get();
    
    console.log(`Found ${chunks.size} documents to process`);
    
    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;
    let totalFixed = 0;

    // Keep track of all words to detect duplicates
    const allWords = new Set<string>();
    const prefixCounts: Record<string, number> = {};
    const wordsByPrefix: Record<string, Set<string>> = {};

    // First pass: collect all words and find duplicates
    for (const doc of chunks.docs) {
      const data = doc.data();
      const docId = doc.id;
      
      // Skip metadata document
      if (docId === 'metadata') continue;

      const words = data.words as string[];
      
      // Initialize set for this prefix if it doesn't exist
      if (!wordsByPrefix[docId]) {
        wordsByPrefix[docId] = new Set();
      }

      // Add words to both global set and prefix-specific set
      words.forEach(word => {
        allWords.add(word);
        wordsByPrefix[docId].add(word);
      });
    }

    // Second pass: update documents with unique words
    for (const doc of chunks.docs) {
      const docId = doc.id;
      
      // Skip metadata document
      if (docId === 'metadata') continue;

      const uniqueWords = Array.from(wordsByPrefix[docId]);
      prefixCounts[docId] = uniqueWords.length;

      // Update document with unique words
      const docRef = db.collection('dictionary').doc(docId);
      batch.update(docRef, {
        words: uniqueWords,
        wordCount: uniqueWords.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      batchCount++;
      totalFixed++;

      // If batch is full, commit it and start a new one
      if (batchCount === batchSize) {
        console.log(`Committing batch of ${batchCount} updates...`);
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit any remaining document updates
    if (batchCount > 0) {
      console.log(`Committing final batch of ${batchCount} updates...`);
      await batch.commit();
    }

    // Update metadata with correct prefix counts
    const metadataRef = db.collection('dictionary').doc('metadata');
    await metadataRef.update({
      prefixCounts,
      totalWords: allWords.size,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Fixed ${totalFixed} documents with duplicates`);
    console.log(`Updated metadata with ${Object.keys(prefixCounts).length} prefix counts`);
    console.log('Total unique words:', allWords.size);
    console.log('Fix complete!');

  } catch (error) {
    console.error('Failed to fix dictionary duplicates:', error);
    process.exit(1);
  }
}

// Run the fix
fixDictionaryDuplicates(); 