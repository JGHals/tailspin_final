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

async function fixDictionaryMetadata() {
  try {
    console.log('Analyzing dictionary data...');
    
    // Get all dictionary documents
    const chunks = await db.collection('dictionary').where('words', '!=', null).get();
    
    // Calculate prefix counts
    const prefixWordCounts: Record<string, number> = {};
    let totalWords = 0;

    chunks.forEach(chunk => {
      const data = chunk.data();
      if (!data.prefix || !Array.isArray(data.words)) {
        console.error(`Skipping invalid chunk document: ${chunk.id}`);
        return;
      }

      const prefix = data.prefix;
      const words = data.words as string[];
      
      prefixWordCounts[prefix] = words.length;
      totalWords += words.length;
    });

    console.log(`Found ${totalWords} total words`);
    console.log('Prefix counts calculated');

    // Update metadata document
    console.log('Updating metadata...');
    await db.collection('dictionary').doc('metadata').set({
      totalWords,
      prefixCounts: prefixWordCounts,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Metadata updated successfully!');
    console.log({
      totalWords,
      prefixCount: Object.keys(prefixWordCounts).length
    });

  } catch (error) {
    console.error('Failed to fix metadata:', error);
    process.exit(1);
  }
}

// Run the fix
fixDictionaryMetadata(); 