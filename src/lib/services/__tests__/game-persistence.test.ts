import { GamePersistenceService } from '../game-persistence';
import { app } from '../../firebase/firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Mock Firebase
jest.mock('../../firebase/firebase', () => ({
  app: {}
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn()
}));

describe('GamePersistenceService', () => {
  let service: GamePersistenceService;
  let mockState: any;
  const userId = 'test-user-123';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service instance
    service = new GamePersistenceService(userId);
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Create mock state
    mockState = {
      mode: 'endless',
      chain: ['puzzle', 'lethal'],
      wordTimings: new Map([
        ['puzzle', Date.now() - 10000],
        ['lethal', Date.now()]
      ]),
      terminalWords: new Set(['xyz']),
      powerUpsUsed: new Set(['hint']),
      rareLettersUsed: new Set(['z']),
      ui: {
        letterTracking: {
          usedLetters: new Set(['p', 'u', 'z']),
          rareLettersUsed: new Set(['z'])
        }
      }
    };
  });

  describe('saveGameState', () => {
    it('should save state to Firebase successfully', async () => {
      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      await service.saveGameState(mockState, true);

      expect(doc).toHaveBeenCalledWith(expect.any(Object), 'game_states', userId);
      expect(setDoc).toHaveBeenCalledWith(
        mockDoc,
        expect.objectContaining({
          mode: 'endless',
          chain: ['puzzle', 'lethal'],
          wordTimings: expect.any(Object),
          terminalWords: ['xyz'],
          powerUpsUsed: ['hint'],
          rareLettersUsed: ['z'],
          'ui.letterTracking.usedLetters': ['p', 'u', 'z'],
          'ui.letterTracking.rareLettersUsed': ['z']
        }),
        { merge: true }
      );
    });

    it('should save to localStorage when Firebase fails', async () => {
      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);
      (setDoc as jest.Mock).mockRejectedValue(new Error('Firebase error'));

      await service.saveGameState(mockState, true);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'game_state_backup',
        expect.any(String)
      );
      
      const savedData = JSON.parse(
        (localStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.state).toEqual(expect.objectContaining({
        mode: 'endless',
        chain: ['puzzle', 'lethal']
      }));
    });

    it('should respect autosave interval', async () => {
      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      // First save
      await service.saveGameState(mockState, false);
      expect(setDoc).toHaveBeenCalledTimes(1);

      // Second save immediately after
      await service.saveGameState(mockState, false);
      expect(setDoc).toHaveBeenCalledTimes(1); // Should not have called again

      // Force save should ignore interval
      await service.saveGameState(mockState, true);
      expect(setDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadGameState', () => {
    it('should load state from Firebase successfully', async () => {
      const mockDoc = {};
      const mockSnapshot = {
        exists: () => true,
        data: () => ({
          mode: 'endless',
          chain: ['puzzle', 'lethal'],
          wordTimings: { puzzle: Date.now() - 10000, lethal: Date.now() },
          terminalWords: ['xyz'],
          powerUpsUsed: ['hint'],
          rareLettersUsed: ['z'],
          'ui.letterTracking.usedLetters': ['p', 'u', 'z'],
          'ui.letterTracking.rareLettersUsed': ['z']
        })
      };

      (doc as jest.Mock).mockReturnValue(mockDoc);
      (getDoc as jest.Mock).mockResolvedValue(mockSnapshot);

      const loadedState = await service.loadGameState();

      expect(doc).toHaveBeenCalledWith(expect.any(Object), 'game_states', userId);
      expect(loadedState).toBeDefined();
      expect(loadedState?.mode).toBe('endless');
      expect(loadedState?.chain).toEqual(['puzzle', 'lethal']);
      expect(loadedState?.wordTimings instanceof Map).toBe(true);
      expect(loadedState?.terminalWords instanceof Set).toBe(true);
    });

    it('should fall back to localStorage when Firebase fails', async () => {
      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);
      (getDoc as jest.Mock).mockRejectedValue(new Error('Firebase error'));

      const backupState = {
        state: mockState,
        timestamp: Date.now()
      };
      (localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(backupState)
      );

      const loadedState = await service.loadGameState();

      expect(localStorage.getItem).toHaveBeenCalledWith('game_state_backup');
      expect(loadedState).toBeDefined();
      expect(loadedState?.mode).toBe('endless');
    });

    it('should return null for expired backup state', async () => {
      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);
      (getDoc as jest.Mock).mockRejectedValue(new Error('Firebase error'));

      const backupState = {
        state: mockState,
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours old
      };
      (localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(backupState)
      );

      const loadedState = await service.loadGameState();

      expect(loadedState).toBeNull();
    });
  });

  describe('auto-save functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start auto-save timer', () => {
      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      service.startAutoSave(mockState);
      
      jest.advanceTimersByTime(30000); // 30 seconds
      expect(setDoc).toHaveBeenCalled();
    });

    it('should stop auto-save timer', () => {
      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      service.startAutoSave(mockState);
      service.stopAutoSave();
      
      jest.advanceTimersByTime(30000); // 30 seconds
      expect(setDoc).not.toHaveBeenCalled();
    });
  });
}); 