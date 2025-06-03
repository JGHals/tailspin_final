import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { userProfileService } from '../services/user-profile-service';
import type { UserProfile, Achievement, PowerUpInventory } from '../types/user-profile';

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        let userProfile = await userProfileService.getProfile(user.id);
        
        if (!userProfile && mounted) {
          // Create new profile if none exists
          userProfile = await userProfileService.createProfile(
            user.id,
            user.username || 'Anonymous Player',
            user.email || '',
            user.avatar || undefined
          );
        }

        if (mounted) {
          setProfile(userProfile);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load user profile');
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [user]);

  const updateTokens = async (amount: number): Promise<number | null> => {
    if (!user || !profile) return null;
    try {
      return await userProfileService.updateTokens(user.id, amount);
    } catch (err) {
      setError('Failed to update tokens');
      return null;
    }
  };

  const usePowerUp = async (type: keyof PowerUpInventory): Promise<boolean> => {
    if (!user || !profile) return false;
    try {
      return await userProfileService.usePowerUp(user.id, type);
    } catch (err) {
      setError('Failed to use power-up');
      return false;
    }
  };

  const addPowerUp = async (type: keyof PowerUpInventory, amount: number = 1): Promise<void> => {
    if (!user || !profile) return;
    try {
      await userProfileService.addPowerUp(user.id, type, amount);
      // Update local state
      setProfile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          powerUps: {
            ...prev.powerUps,
            [type]: prev.powerUps[type] + amount
          }
        };
      });
    } catch (err) {
      setError('Failed to add power-up');
    }
  };

  const updateAchievement = async (achievement: Achievement): Promise<void> => {
    if (!user || !profile) return;
    try {
      await userProfileService.updateAchievement(user.id, achievement);
      // Update local state
      setProfile(prev => {
        if (!prev) return prev;
        const achievements = [...prev.achievements];
        const index = achievements.findIndex(a => a.id === achievement.id);
        if (index >= 0) {
          achievements[index] = achievement;
        } else {
          achievements.push(achievement);
        }
        return {
          ...prev,
          achievements
        };
      });
    } catch (err) {
      setError('Failed to update achievement');
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const refreshed = await userProfileService.getProfile(user.id);
      setProfile(refreshed);
      setLoading(false);
    } catch (err) {
      setError('Failed to refresh profile');
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error,
    updateTokens,
    usePowerUp,
    addPowerUp,
    updateAchievement,
    refreshProfile
  };
} 