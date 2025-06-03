import { db } from '../firebase/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { INITIAL_DICTIONARY } from './initial-dictionary';
import { DICTIONARY_CONFIG } from './constants';

export async function uploadInitialDictionary() {
  try {
    const dictionaryDoc = doc(collection(db, DICTIONARY_CONFIG.firebasePath));
    await setDoc(dictionaryDoc, { 
      words: INITIAL_DICTIONARY,
      updatedAt: new Date().toISOString(),
      version: DICTIONARY_CONFIG.cacheVersion
    });
    console.log('Initial dictionary uploaded successfully');
    return true;
  } catch (error) {
    console.error('Failed to upload dictionary:', error);
    return false;
  }
} 