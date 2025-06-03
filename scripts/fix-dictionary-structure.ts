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

async function fixDictionaryStructure() {
  try {
    console.log('Fixing dictionary document structure...');
    
    // Get all dictionary documents except metadata
    const chunks = await db.collection('dictionary')
      .where('words', '!=', null)
      .get();
    
    console.log(`Found ${chunks.size} documents to fix`);
    let fixedCount = 0;

    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of chunks.docs) {
      const data = doc.data();
      const docId = doc.id;
      
      // Skip metadata document
      if (docId === 'metadata') continue;

      // Add prefix field if missing
      if (!data.prefix) {
        const docRef = db.collection('dictionary').doc(docId);
        batch.update(docRef, {
          prefix: docId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        batchCount++;
        fixedCount++;

        // If batch is full, commit it and start a new one
        if (batchCount === batchSize) {
          console.log(`Committing batch of ${batchCount} updates...`);
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    // Commit any remaining updates
    if (batchCount > 0) {
      console.log(`Committing final batch of ${batchCount} updates...`);
      await batch.commit();
    }

    console.log(`Fixed ${fixedCount} documents`);
    console.log('Structure fix complete!');

  } catch (error) {
    console.error('Failed to fix dictionary structure:', error);
    process.exit(1);
  }
}

// Run the fix
fixDictionaryStructure(); 