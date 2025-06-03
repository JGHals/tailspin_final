import { FirebaseDictionaryOptimized } from './firebase-dictionary';

/**
 * Dictionary Access Layer
 * 
 * Provides a unified access point to Tailspin's multi-tiered dictionary system.
 * This layer coordinates between the different dictionary implementations to provide
 * the most appropriate service for each operation.
 * 
 * Architectural Role:
 * - Acts as the primary entry point for dictionary operations
 * - Coordinates between synchronous and asynchronous implementations
 * - Manages state consistency across layers
 * - Handles initialization and error recovery
 * 
 * Layer Coordination:
 * 1. DictionaryService (Synchronous)
 *    - UI feedback
 *    - Quick validations
 *    - Local caching
 * 
 * 2. DictionaryCore (Game Features)
 *    - Game rules
 *    - Chain validation
 *    - Scoring support
 * 
 * 3. FirebaseDictionary (Persistence)
 *    - Data storage
 *    - Cross-device sync
 *    - Analytics
 * 
 * Usage Guidelines:
 * - Use for all new feature implementations
 * - Prefer this over direct service access
 * - Handles proper service selection
 * 
 * Example:
 * ```typescript
 * const dictionaryAccess = new DictionaryAccess();
 * 
 * // Automatically uses appropriate service
 * const isValid = await dictionaryAccess.isValidWord(word);
 * const chain = await dictionaryAccess.validateChain(words);
 * ```
 * 
 * Error Handling:
 * - Provides unified error handling
 * - Manages fallbacks between services
 * - Handles recovery and retries
 * 
 * @see DictionaryService for synchronous operations
 * @see FirebaseDictionary for persistence
 * @see DictionaryCore for game features
 */

/**
 * Singleton access point for the Firebase dictionary implementation.
 * This is the primary dictionary service used for game operations.
 */
export const dictionaryAccess = new FirebaseDictionaryOptimized(); 