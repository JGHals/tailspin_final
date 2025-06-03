import { GameState } from '../types/game';
import { getFirestore } from 'firebase/firestore';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { app } from '../firebase/firebase';

export class GamePersistenceService {
  private static AUTOSAVE_INTERVAL = 30000; // 30 seconds
  private lastSaveTime: number = 0;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private userId: string;
  private db: ReturnType<typeof getFirestore>;

  constructor(userId: string) {
    this.userId = userId;
    this.db = getFirestore(app);
  }

  async saveGameState(state: GameState, force: boolean = false): Promise<void> {
    const now = Date.now();
    
    // Only save if forced or enough time has passed
    if (!force && now - this.lastSaveTime < GamePersistenceService.AUTOSAVE_INTERVAL) {
      return;
    }

    try {
      const gameDoc = doc(this.db, 'game_states', this.userId);
      const gameData = {
        ...state,
        lastSaved: now,
        wordTimings: Object.fromEntries(state.wordTimings),
        terminalWords: Array.from(state.terminalWords),
        powerUpsUsed: Array.from(state.powerUpsUsed),
        rareLettersUsed: Array.from(state.rareLettersUsed),
        'ui.letterTracking.usedLetters': Array.from(state.ui.letterTracking.usedLetters),
        'ui.letterTracking.rareLettersUsed': Array.from(state.ui.letterTracking.rareLettersUsed)
      };

      await setDoc(gameDoc, gameData, { merge: true });
      this.lastSaveTime = now;
    } catch (error) {
      console.error('Failed to save game state:', error);
      // Store in localStorage as backup
      try {
        localStorage.setItem('game_state_backup', JSON.stringify({
          state,
          timestamp: now
        }));
      } catch (localError) {
        console.error('Failed to save backup state:', localError);
      }
    }
  }

  async loadGameState(): Promise<GameState | null> {
    try {
      const gameDoc = doc(this.db, 'game_states', this.userId);
      const snapshot = await getDoc(gameDoc);
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        return this.reconstructGameState(data);
      }
      
      // Try loading from backup
      return this.loadBackupState();
    } catch (error) {
      console.error('Failed to load game state:', error);
      return this.loadBackupState();
    }
  }

  private reconstructGameState(data: any): GameState {
    return {
      ...data,
      wordTimings: new Map(Object.entries(data.wordTimings || {})),
      terminalWords: new Set(data.terminalWords || []),
      powerUpsUsed: new Set(data.powerUpsUsed || []),
      rareLettersUsed: new Set(data.rareLettersUsed || []),
      ui: {
        ...data.ui,
        letterTracking: {
          ...data.ui?.letterTracking,
          usedLetters: new Set(data['ui.letterTracking.usedLetters'] || []),
          rareLettersUsed: new Set(data['ui.letterTracking.rareLettersUsed'] || [])
        }
      }
    };
  }

  private loadBackupState(): GameState | null {
    try {
      const backup = localStorage.getItem('game_state_backup');
      if (backup) {
        const { state, timestamp } = JSON.parse(backup);
        // Only use backup if it's less than 24 hours old
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return this.reconstructGameState(state);
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to load backup state:', error);
      return null;
    }
  }

  startAutoSave(state: GameState): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setInterval(() => {
      this.saveGameState(state);
    }, GamePersistenceService.AUTOSAVE_INTERVAL);
  }

  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
}

export const createGamePersistence = (userId: string) => new GamePersistenceService(userId); 