/**
 * Game State Service
 * 
 * A Firebase-backed persistence layer for TailSpin's game state management.
 * This service is part of the multi-tiered state architecture, specifically
 * handling persistence, cross-device synchronization, and error logging.
 * 
 * Key Responsibilities:
 * - Firebase persistence of game states
 * - Cross-device synchronization
 * - Error logging and tracking
 * - Game state cleanup
 * 
 * Architecture Notes:
 * This service works in conjunction with GameStateManager and GamePersistenceService
 * to provide a complete state management system. While GameStateManager handles
 * real-time state and GamePersistenceService handles auto-saving, this service
 * focuses on reliable persistence and cross-device support.
 * 
 * Usage Pattern:
 * ```typescript
 * // Save game state
 * const gameId = await gameStateService.saveGameState(userId, state);
 * 
 * // Load game state
 * const savedState = await gameStateService.loadGameState(gameId);
 * ```
 */

import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc, query, collection, where, orderBy, limit, getDocs, deleteDoc, DocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { SavedGameState, GameStateError, GameMode, GameState } from '../types/game';
import { withRetry } from '../utils/retry';

const SAVED_GAMES_COLLECTION = 'saved_games';
const ERROR_LOGS_COLLECTION = 'game_error_logs';
const MAX_SAVED_GAMES_PER_USER = 5;

export class GameStateService {
  private readonly CURRENT_VERSION = 1;

  /**
   * Saves a game state to Firebase with versioning and cleanup.
   * 
   * @param userId - The ID of the user who owns this game state
   * @param gameState - The game state to save (without metadata)
   * @returns The ID of the saved game state
   * @throws Will throw an error if save fails
   */
  async saveGameState(userId: string, gameState: GameState): Promise<string> {
    try {
      // Check if we need to clean up old saved games
      await this.cleanupOldSavedGames(userId);

      // Create new saved game document
      const savedGame: SavedGameState = {
        id: `${userId}_${Date.now()}`,
        userId,
        lastSaved: new Date().toISOString(),
        version: this.CURRENT_VERSION,
        state: gameState
      };

      // Convert Map/Set to arrays for Firestore storage
      const firestoreDoc = {
        ...savedGame,
        state: {
          ...gameState,
          wordTimings: Array.from(gameState.wordTimings.entries()),
          terminalWords: Array.from(gameState.terminalWords),
          powerUpsUsed: Array.from(gameState.powerUpsUsed),
          rareLettersUsed: Array.from(gameState.rareLettersUsed)
        }
      };

      await withRetry(() => setDoc(doc(db, SAVED_GAMES_COLLECTION, savedGame.id), firestoreDoc));
      return savedGame.id;
    } catch (error) {
      await this.logError('save_failed', 'Failed to save game state', error, { state: gameState });
      throw error;
    }
  }

  /**
   * Loads a game state from Firebase with version checking.
   * 
   * @param gameId - The ID of the game state to load
   * @returns The loaded game state, or null if not found
   * @throws Will throw an error if load fails
   */
  async loadGameState(gameId: string): Promise<SavedGameState | null> {
    try {
      const docRef: DocumentSnapshot<DocumentData> = await withRetry(() => 
        getDoc(doc(db, SAVED_GAMES_COLLECTION, gameId))
      );
      
      if (!docRef.exists()) {
        return null;
      }

      const data = docRef.data() as SavedGameState;

      // Convert arrays back to Map/Set
      return {
        ...data,
        state: {
          ...data.state,
          wordTimings: new Map(data.state.wordTimings),
          terminalWords: new Set(data.state.terminalWords),
          powerUpsUsed: new Set(data.state.powerUpsUsed),
          rareLettersUsed: new Set(data.state.rareLettersUsed)
        }
      };
    } catch (error) {
      await this.logError('load_failed', 'Failed to load game state', error);
      throw error;
    }
  }

  /**
   * Gets the most recent unfinished game for a user.
   * For daily challenges, ensures the save is from today.
   * 
   * @param userId - The ID of the user
   * @param mode - Optional game mode filter
   * @returns The most recent saved game state, or null if none found
   */
  async getLastSavedGame(userId: string, mode?: GameMode): Promise<SavedGameState | null> {
    try {
      const constraints = [
        where('userId', '==', userId),
        where('state.isComplete', '==', false),
        orderBy('lastSaved', 'desc'),
        limit(1)
      ];

      if (mode) {
        constraints.splice(1, 0, where('state.mode', '==', mode));
      }

      const q = query(collection(db, SAVED_GAMES_COLLECTION), ...constraints);
      const snapshot = await withRetry(() => getDocs(q));

      if (snapshot.empty) {
        return null;
      }

      const data = snapshot.docs[0].data() as SavedGameState;

      // For daily challenges, verify the save is from today
      if (data.state.mode === 'daily' && data.state.dailyPuzzle) {
        const today = new Date().toISOString().split('T')[0];
        if (data.state.dailyPuzzle.date !== today) {
          // Delete outdated daily challenge save
          await this.deleteSavedGame(data.id);
          return null;
        }
      }

      return {
        ...data,
        state: {
          ...data.state,
          wordTimings: new Map(data.state.wordTimings),
          terminalWords: new Set(data.state.terminalWords),
          powerUpsUsed: new Set(data.state.powerUpsUsed),
          rareLettersUsed: new Set(data.state.rareLettersUsed)
        }
      };
    } catch (error) {
      await this.logError('load_last_failed', 'Failed to load last saved game', error);
      throw error;
    }
  }

  /**
   * Deletes a saved game state.
   * Used for cleanup and managing storage limits.
   * 
   * @param gameId - The ID of the game state to delete
   */
  async deleteSavedGame(gameId: string): Promise<void> {
    try {
      await withRetry(() => deleteDoc(doc(db, SAVED_GAMES_COLLECTION, gameId)));
    } catch (error) {
      await this.logError('delete_failed', 'Failed to delete saved game', error);
      throw error;
    }
  }

  /**
   * Maintains the limit of saved games per user by removing oldest saves.
   * 
   * @param userId - The ID of the user to cleanup saves for
   */
  async cleanupOldSavedGames(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, SAVED_GAMES_COLLECTION),
        where('userId', '==', userId),
        orderBy('lastSaved', 'desc'),
        limit(MAX_SAVED_GAMES_PER_USER + 1)
      );

      const snapshot = await withRetry(() => getDocs(q));
      if (snapshot.size > MAX_SAVED_GAMES_PER_USER) {
        const oldestDoc = snapshot.docs[snapshot.size - 1];
        await this.deleteSavedGame(oldestDoc.id);
      }
    } catch (error) {
      await this.logError('cleanup_failed', 'Failed to cleanup old saved games', error);
      throw error;
    }
  }

  /**
   * Cleans up incomplete daily challenges from previous days.
   * Ensures daily challenge integrity across the system.
   */
  async cleanupDailyChallenges(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, SAVED_GAMES_COLLECTION),
        where('state.mode', '==', 'daily'),
        where('state.isComplete', '==', false)
      );

      const snapshot = await withRetry(() => getDocs(q));
      const deletePromises = snapshot.docs
        .filter(doc => {
          const data = doc.data() as SavedGameState;
          return data.state.dailyPuzzle?.date !== today;
        })
        .map(doc => this.deleteSavedGame(doc.id));

      await Promise.all(deletePromises);
    } catch (error) {
      await this.logError('cleanup_daily_failed', 'Failed to cleanup daily challenges', error);
      throw error;
    }
  }

  /**
   * Logs errors to Firebase for monitoring and debugging.
   * 
   * @param code - Error code for categorization
   * @param message - Human-readable error message
   * @param error - The original error object
   * @param gameState - Optional game state when error occurred
   */
  private async logError(
    code: string,
    message: string,
    error: any,
    gameState?: Partial<SavedGameState>
  ): Promise<void> {
    try {
      const errorLog: GameStateError = {
        code,
        message: `${message}: ${error?.message || String(error)}`,
        timestamp: new Date().toISOString(),
        gameState
      };

      await withRetry(() => 
        setDoc(doc(collection(db, ERROR_LOGS_COLLECTION)), errorLog)
      );
    } catch (logError) {
      console.error('Failed to log error:', logError);
      // Don't throw here to avoid recursive error logging
    }
  }
}

// Export singleton instance for consistent access
export const gameStateService = new GameStateService(); 