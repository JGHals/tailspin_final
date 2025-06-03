import { FirebaseDictionaryOptimized } from './firebase-dictionary';

/**
 * Singleton access point for the Firebase dictionary implementation.
 * This is the primary dictionary service used for game operations.
 */
export const dictionaryAccess = new FirebaseDictionaryOptimized(); 