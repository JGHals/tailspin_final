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

async function checkDocumentStructure() {
  try {
    console.log('Checking document structure...');
    
    // Get a few sample documents
    const prefixesToCheck = ['aa', 'ba', 'ca', 'da', 'ea'];
    
    for (const prefix of prefixesToCheck) {
      console.log(`\nChecking document for prefix "${prefix}":`);
      const doc = await db.collection('dictionary').doc(prefix).get();
      
      if (!doc.exists) {
        console.log('Document does not exist');
        continue;
      }

      const data = doc.data();
      console.log('Document structure:');
      console.log(JSON.stringify(data, null, 2));
      
      // Check expected fields
      console.log('\nField validation:');
      console.log(`- Has 'prefix' field: ${data?.prefix !== undefined}`);
      console.log(`- Prefix matches doc ID: ${data?.prefix === prefix}`);
      console.log(`- Has 'words' array: ${Array.isArray(data?.words)}`);
      if (Array.isArray(data?.words)) {
        console.log(`- Words count: ${data.words.length}`);
        console.log('- First few words:', data.words.slice(0, 5));
      }
    }

  } catch (error) {
    console.error('Failed to check document structure:', error);
    process.exit(1);
  }
}

// Run the check
checkDocumentStructure(); 