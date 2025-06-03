"use client";

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { achievementService } from '../services/achievement-service';
import type { Achievement } from '../types/user-profile';

export function useAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    totalTokens: 0
  });

  useEffect(() => {
    async function loadAchievements() {
      if (!user) {
        setAchievements([]);
        setLoading(false);
        return;
      }

      try {
        const [userAchievements, achievementStats] = await Promise.all([
          achievementService.getUserAchievements(user.uid),
          achievementService.getAchievementStats(user.uid)
        ]);
        setAchievements(userAchievements);
        setStats(achievementStats);
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAchievements();
  }, [user]);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  return {
    achievements,
    loading,
    showModal,
    openModal,
    closeModal,
    stats
  };
} 