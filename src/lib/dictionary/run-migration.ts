import { db } from '../firebase/firebase';
import { chunk } from 'lodash';
import { Word, DictionaryMetadata } from '../types/dictionary';
import { collection, getDocs, doc, writeBatch, Timestamp } from 'firebase/firestore';

const CHUNK_SIZE = 500; // Number of words per document
const BATCH_SIZE = 100; // Number of operations per batch

export async function runDictionaryMigration() {
  const startTime = Date.now();
  let totalWords = 0;
  let processedWords = 0;

  // Get all words from current dictionary
  console.log('📚 Reading current dictionary...');
  const wordsSnapshot = await getDocs(collection(db, 'dictionary'));
  const words = wordsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Word));

  totalWords = words.length;
  console.log(`📊 Found ${totalWords} words to migrate`);

  // Group words by two-letter prefix
  const prefixGroups = new Map<string, Word[]>();
  for (const word of words) {
    const prefix = word.text.slice(0, 2).toLowerCase();
    if (!prefixGroups.has(prefix)) {
      prefixGroups.set(prefix, []);
    }
    prefixGroups.get(prefix)!.push(word);
  }

  console.log(`🔍 Identified ${prefixGroups.size} unique prefixes`);

  // Process each prefix group
  for (const [prefix, prefixWords] of prefixGroups) {
    console.log(`\n📝 Processing prefix "${prefix}" (${prefixWords.length} words)`);

    // Split words into chunks
    const chunks = chunk(prefixWords, CHUNK_SIZE);
    
    // Create batches for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const batch = writeBatch(db);
      const chunkWords = chunks[i];

      // Add chunk document
      const chunkRef = doc(collection(db, 'dictionary_v2'), `${prefix}_${i}`);
      batch.set(chunkRef, {
        prefix,
        chunkIndex: i,
        words: chunkWords
      });

      // Update prefix metadata
      if (i === 0) {
        const prefixRef = doc(collection(db, 'prefixes'), prefix);
        batch.set(prefixRef, {
          prefix,
          wordCount: prefixWords.length,
          chunks: chunks.length,
          lastUpdated: Timestamp.now()
        });
      }

      await batch.commit();
      processedWords += chunkWords.length;
      
      const progress = ((processedWords / totalWords) * 100).toFixed(1);
      console.log(`   ⏳ Progress: ${progress}% (${processedWords}/${totalWords} words)`);
    }
  }

  // Create metadata document
  const metadata: DictionaryMetadata = {
    totalWords,
    uniquePrefixes: prefixGroups.size,
    lastUpdated: Timestamp.now(),
    version: 2,
    chunkSize: CHUNK_SIZE
  };

  const metadataRef = doc(collection(db, 'dictionary_metadata'), 'stats');
  const finalBatch = writeBatch(db);
  await finalBatch.set(metadataRef, metadata);
  await finalBatch.commit();

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n🎉 Migration completed in ${duration.toFixed(1)} seconds`);
  console.log(`   ✓ ${totalWords} words processed`);
  console.log(`   ✓ ${prefixGroups.size} prefix groups created`);
} 