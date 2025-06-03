import { PowerUpSystem, powerUpSystem } from '../power-up-system';
import { userProfileService } from '../../services/user-profile-service';
import { chainValidator } from '../chain-validator';
import type { PowerUpInventory } from '../../types/user-profile';
import { mockWordList, mockValidChains } from '../../test-utils/mock-data';

// Mock dependencies
jest.mock('../../services/user-profile-service', () => ({
  userProfileService: {
    getProfile: jest.fn(),
    usePowerUp: jest.fn(),
    updateProfile: jest.fn()
  }
}));

jest.mock('../chain-validator', () => ({
  chainValidator: {
    findPossibleNextWords: jest.fn(),
    validateNextWord: jest.fn()
  }
}));

describe('PowerUpSystem', () => {
  const mockUserId = 'test-user-123';
  let system: PowerUpSystem;

  beforeEach(() => {
    system = new PowerUpSystem();
    jest.clearAllMocks();
  });

  describe('Token Management & Validation', () => {
    it('should validate power-up availability', async () => {
      const mockProfile = {
        powerUps: {
          hint: 1,
          undo: 0,
          bridge: 2,
          flip: 1,
          wordWarp: 3
        } as PowerUpInventory
      };

      (userProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);

      // Test available power-up
      const result1 = await system['validateAndDeduct'](mockUserId, 'hint');
      expect(result1).toBe(true);
      expect(userProfileService.usePowerUp).toHaveBeenCalledWith(mockUserId, 'hint');

      // Test unavailable power-up
      const result2 = await system['validateAndDeduct'](mockUserId, 'undo');
      expect(result2).toBe(false);
      expect(userProfileService.usePowerUp).not.toHaveBeenCalledWith(mockUserId, 'undo');
    });

    it('should handle missing user profile', async () => {
      (userProfileService.getProfile as jest.Mock).mockResolvedValue(null);

      const result = await system['validateAndDeduct'](mockUserId, 'hint');
      expect(result).toBe(false);
      expect(userProfileService.usePowerUp).not.toHaveBeenCalled();
    });
  });

  describe('Power-Up Effects', () => {
    describe('Hint', () => {
      it('should provide valid next word suggestions', async () => {
        (userProfileService.getProfile as jest.Mock).mockResolvedValue({
          powerUps: { hint: 1 }
        });
        (chainValidator.findPossibleNextWords as jest.Mock).mockResolvedValue(['lethal', 'legal']);

        const result = await system.useHint(mockUserId, 'puzzle');
        
        expect(result.success).toBe(true);
        expect(result.data?.words).toEqual(['lethal', 'legal']);
        expect(userProfileService.usePowerUp).toHaveBeenCalledWith(mockUserId, 'hint');
      });

      it('should handle no suggestions found', async () => {
        (userProfileService.getProfile as jest.Mock).mockResolvedValue({
          powerUps: { hint: 1 }
        });
        (chainValidator.findPossibleNextWords as jest.Mock).mockResolvedValue([]);

        const result = await system.useHint(mockUserId, 'xyz');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('No valid suggestions found');
      });
    });

    describe('Bridge', () => {
      it('should find valid bridge word', async () => {
        (userProfileService.getProfile as jest.Mock).mockResolvedValue({
          powerUps: { bridge: 1 }
        });
        (chainValidator.findPossibleNextWords as jest.Mock).mockResolvedValue(['lethal']);

        const result = await system.useBridge(mockUserId, 'puzzle');
        
        expect(result.success).toBe(true);
        expect(result.data?.bridgeWord).toBe('lethal');
      });

      it('should handle no valid bridge words', async () => {
        (userProfileService.getProfile as jest.Mock).mockResolvedValue({
          powerUps: { bridge: 1 }
        });
        (chainValidator.findPossibleNextWords as jest.Mock).mockResolvedValue([]);

        const result = await system.useBridge(mockUserId, 'xyz');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('No valid bridge words found');
      });
    });

    describe('Word Warp', () => {
      it('should find valid prefix combinations', async () => {
        (userProfileService.getProfile as jest.Mock).mockResolvedValue({
          powerUps: { wordWarp: 1 }
        });
        (chainValidator.findPossibleNextWords as jest.Mock).mockResolvedValue(['te', 'al', 'in']);

        const result = await system.useWordWarp(mockUserId);
        
        expect(result.success).toBe(true);
        expect(result.data?.words).toEqual(['te', 'al', 'in']);
      });

      it('should handle no valid prefixes', async () => {
        (userProfileService.getProfile as jest.Mock).mockResolvedValue({
          powerUps: { wordWarp: 1 }
        });
        (chainValidator.findPossibleNextWords as jest.Mock).mockResolvedValue([]);

        const result = await system.useWordWarp(mockUserId);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('No valid prefixes found');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle chain validator errors gracefully', async () => {
      (userProfileService.getProfile as jest.Mock).mockResolvedValue({
        powerUps: { hint: 1 }
      });
      (chainValidator.findPossibleNextWords as jest.Mock).mockRejectedValue(new Error('Validation error'));

      const result = await system.useHint(mockUserId, 'puzzle');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get suggestions');
    });

    it('should handle profile service errors gracefully', async () => {
      (userProfileService.getProfile as jest.Mock).mockRejectedValue(new Error('Profile error'));

      const result = await system.useHint(mockUserId, 'puzzle');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get suggestions');
    });
  });

  describe('Cost Management', () => {
    it('should return correct power-up costs', () => {
      const costs = system.getCosts();
      
      expect(costs).toEqual({
        flip: 5,
        hint: 3,
        bridge: 7,
        undo: 4,
        wordWarp: 10
      });
    });
  });
}); 