#!/usr/bin/env node

import fetch from 'node-fetch';
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CHECKPOINT_FILE = join(__dirname, 'dictionary-checkpoint.json');

interface Checkpoint {
  prefix: string;
  totalUploaded: number;
}

interface DictionaryMetadata {
  totalWords: number;
  updatedAt: admin.firestore.FieldValue;
  prefixCounts: Record<string, number>;
  letterCounts: Record<string, number>;
}

interface DictionaryChunk {
  words: string[];
  count: number;
  prefix: string;
  chunkIndex: number;
  totalChunks: number;
  updatedAt: admin.firestore.FieldValue;
}

// Read the service account file
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'firebase-admin.json'), 'utf8')
);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Common English words that should be excluded
const EXCLUDED_WORDS = new Set([
  'john', 'mary', 'peter', 'london', 'paris', 'monday', 'tuesday',
]);

const WORD_LIST_URL = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';

// Basic validation rules
function isValidWord(word: string): boolean {
  // Length check (2-15 characters)
  if (word.length < 2 || word.length > 15) return false;

  // Only letters
  if (!/^[a-z]+$/.test(word)) return false;

  // Not in excluded list
  if (EXCLUDED_WORDS.has(word.toLowerCase())) return false;

  // Not a proper noun (starts with capital)
  if (/^[A-Z]/.test(word)) return false;

  return true;
}

async function downloadWordList(): Promise<string[]> {
  console.log('Downloading word list...');
  const response = await fetch(WORD_LIST_URL);
  const text = await response.text();
  return text.split('\n').filter(word => word.trim().length > 0);
}

async function uploadWordsForPrefix(
  prefix: string, 
  words: string[], 
  db: admin.firestore.Firestore
): Promise<number> {
  // Split words into smaller chunks of 100
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += 100) {
    chunks.push(words.slice(i, i + 100));
  }

  // Upload each chunk as a separate document
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const docRef = db.collection('dictionary').doc(`${prefix}_${i}`);
    
    const chunkData: DictionaryChunk = {
      words: chunk,
      count: chunk.length,
      prefix,
      chunkIndex: i,
      totalChunks: chunks.length,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.set(chunkData);
    
    // Add a small delay between chunks
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return words.length;
}

function saveCheckpoint(prefix: string, totalUploaded: number): void {
  const checkpoint: Checkpoint = { prefix, totalUploaded };
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint));
  console.log(`Checkpoint saved at prefix: ${prefix}, total uploaded: ${totalUploaded}`);
}

function loadCheckpoint(): Checkpoint | null {
  if (existsSync(CHECKPOINT_FILE)) {
    const checkpoint = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8')) as Checkpoint;
    console.log(`Resuming from checkpoint: prefix ${checkpoint.prefix}, total uploaded: ${checkpoint.totalUploaded}`);
    return checkpoint;
  }
  return null;
}

async function processAndUploadWords(): Promise<void> {
  try {
    const checkpoint = loadCheckpoint();
    let totalUploaded = checkpoint?.totalUploaded || 0;
    
    const rawWords = await downloadWordList();
    console.log(`Downloaded ${rawWords.length} raw words`);

    // Process words
    const validWords = new Set<string>();
    for (const word of rawWords) {
      const normalizedWord = word.trim().toLowerCase();
      if (isValidWord(normalizedWord)) {
        validWords.add(normalizedWord);
      }
    }

    const wordArray = Array.from(validWords);
    console.log(`Found ${wordArray.length} valid words`);

    // Create word groups by first two letters
    const wordGroups: Record<string, string[]> = {};
    const prefixCounts: Record<string, number> = {};
    
    for (const word of wordArray) {
      if (word.length < 2) continue;
      
      const prefix = word.slice(0, 2);
      if (!wordGroups[prefix]) {
        wordGroups[prefix] = [];
      }
      wordGroups[prefix].push(word);
      
      // Track counts for metadata
      const firstLetter = prefix[0];
      prefixCounts[firstLetter] = (prefixCounts[firstLetter] || 0) + 1;
    }

    // Sort prefixes to ensure consistent ordering
    const sortedPrefixes = Object.keys(wordGroups).sort();
    
    // If we have a checkpoint, skip until we reach that prefix
    const startIndex = checkpoint ? sortedPrefixes.indexOf(checkpoint.prefix) + 1 : 0;
    
    // Upload each group
    console.log('Uploading word groups...');

    for (let i = startIndex; i < sortedPrefixes.length; i++) {
      const prefix = sortedPrefixes[i];
      const words = wordGroups[prefix];
      
      console.log(`Processing prefix ${prefix} (${words.length} words)...`);
      const uploadedCount = await uploadWordsForPrefix(prefix, words, db);
      totalUploaded += uploadedCount;
      
      // Save checkpoint after each prefix
      saveCheckpoint(prefix, totalUploaded);
      console.log(`Uploaded ${totalUploaded} words so far...`);
    }

    // Update metadata
    const metadata: DictionaryMetadata = {
      totalWords: wordArray.length,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      prefixCounts: Object.fromEntries(
        Object.entries(wordGroups).map(([prefix, words]) => [prefix, words.length])
      ),
      letterCounts: prefixCounts
    };

    await db.collection('dictionary').doc('metadata').set(metadata);

    console.log(`Dictionary populated successfully with ${wordArray.length} words!`);
    
    // Clear checkpoint file on successful completion
    if (existsSync(CHECKPOINT_FILE)) {
      unlinkSync(CHECKPOINT_FILE);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to populate dictionary:', error);
    process.exit(1);
  }
}

// Run the script
processAndUploadWords(); 