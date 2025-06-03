import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc, query, collection, where, orderBy, limit, getDocs, deleteDoc, DocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { SavedGameState, GameStateError, GameMode } from '../types/game';
import { withRetry } from '../utils/retry';

const SAVED_GAMES_COLLECTION = 'saved_games';
const ERROR_LOGS_COLLECTION = 'game_error_logs';
const MAX_SAVED_GAMES_PER_USER = 5;

export class GameStateService {
  private readonly CURRENT_VERSION = 1;

  async saveGameState(userId: string, state: Omit<SavedGameState, 'id' | 'userId' | 'lastSaved' | 'version'>): Promise<string> {
    try {
      // Check if we need to clean up old saved games
      await this.cleanupOldSavedGames(userId);

      // Create new saved game document
      const savedGame: SavedGameState = {
        id: `${userId}_${Date.now()}`,
        userId,
        lastSaved: new Date().toISOString(),
        version: this.CURRENT_VERSION,
        ...state
      };

      // Convert Map/Set to arrays for Firestore storage
      const firestoreDoc = {
        ...savedGame,
        wordTimings: state.wordTimings || [],
        terminalWords: Array.from(state.terminalWords || []),
        powerUpsUsed: Array.from(state.powerUpsUsed || []),
        rareLettersUsed: Array.from(state.rareLettersUsed || [])
      };

      await withRetry(() => setDoc(doc(db, SAVED_GAMES_COLLECTION, savedGame.id), firestoreDoc));
      return savedGame.id;
    } catch (error) {
      await this.logError('save_failed', 'Failed to save game state', error, state);
      throw error;
    }
  }

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
        wordTimings: data.wordTimings || [],
        terminalWords: data.terminalWords || [],
        powerUpsUsed: data.powerUpsUsed || [],
        rareLettersUsed: data.rareLettersUsed || []
      };
    } catch (error) {
      await this.logError('load_failed', 'Failed to load game state', error);
      throw error;
    }
  }

  async getLastSavedGame(userId: string, mode?: GameMode): Promise<SavedGameState | null> {
    try {
      const constraints = [
        where('userId', '==', userId),
        where('isComplete', '==', false),
        orderBy('lastSaved', 'desc'),
        limit(1)
      ];

      if (mode) {
        constraints.splice(1, 0, where('mode', '==', mode));
      }

      const q = query(collection(db, SAVED_GAMES_COLLECTION), ...constraints);
      const snapshot = await withRetry(() => getDocs(q));

      if (snapshot.empty) {
        return null;
      }

      const data = snapshot.docs[0].data() as SavedGameState;

      // For daily challenges, verify the save is from today
      if (data.mode === 'daily' && data.dailyPuzzle) {
        const today = new Date().toISOString().split('T')[0];
        if (data.dailyPuzzle.date !== today) {
          // Delete outdated daily challenge save
          await this.deleteSavedGame(data.id);
          return null;
        }
      }

      return {
        ...data,
        wordTimings: data.wordTimings || [],
        terminalWords: data.terminalWords || [],
        powerUpsUsed: data.powerUpsUsed || [],
        rareLettersUsed: data.rareLettersUsed || []
      };
    } catch (error) {
      await this.logError('load_last_failed', 'Failed to load last saved game', error);
      throw error;
    }
  }

  async deleteSavedGame(gameId: string): Promise<void> {
    try {
      await withRetry(() => deleteDoc(doc(db, SAVED_GAMES_COLLECTION, gameId)));
    } catch (error) {
      await this.logError('delete_failed', 'Failed to delete saved game', error);
      throw error;
    }
  }

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

  async cleanupDailyChallenges(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, SAVED_GAMES_COLLECTION),
        where('mode', '==', 'daily'),
        where('isComplete', '==', false)
      );

      const snapshot = await withRetry(() => getDocs(q));
      const deletePromises = snapshot.docs
        .filter(doc => {
          const data = doc.data() as SavedGameState;
          return data.dailyPuzzle?.date !== today;
        })
        .map(doc => this.deleteSavedGame(doc.id));

      await Promise.all(deletePromises);
    } catch (error) {
      await this.logError('cleanup_daily_failed', 'Failed to cleanup daily challenges', error);
      throw error;
    }
  }

  private async logError(
    code: string,
    message: string,
    error: any,
    gameState?: Partial<SavedGameState>
  ): Promise<void> {
    try {
      const errorLog: GameStateError = {
        code,
        message: `${message}: ${error.message || error}`,
        timestamp: new Date().toISOString(),
        gameState
      };

      await withRetry(() => 
        setDoc(doc(db, ERROR_LOGS_COLLECTION, `${Date.now()}_${code}`), errorLog)
      );
    } catch (logError) {
      console.error('Failed to log game state error:', logError);
    }
  }
}

// Export singleton instance
export const gameStateService = new GameStateService(); 