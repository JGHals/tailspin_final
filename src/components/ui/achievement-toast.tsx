import React from 'react';
import { useToast } from './use-toast';
import * as LucideIcons from "lucide-react";
import { cn } from '@/lib/utils';

interface Achievement {
  title: string;
  description: string;
  points?: number;
  type?: 'bronze' | 'silver' | 'gold' | 'special';
}

const achievementStyles = {
  bronze: 'bg-orange-100 border-orange-200',
  silver: 'bg-gray-100 border-gray-200',
  gold: 'bg-yellow-100 border-yellow-200',
  special: 'bg-purple-100 border-purple-200',
};

const achievementIconStyles = {
  bronze: 'text-orange-500',
  silver: 'text-gray-500',
  gold: 'text-yellow-500',
  special: 'text-purple-500',
};

// Custom hook for showing achievement toasts
/* eslint-disable react-hooks/rules-of-hooks */
export function useAchievementToast() {
  const { toast } = useToast();

  const showAchievement = React.useCallback((achievement: Achievement) => {
    const { title, description, points = 0, type = 'bronze' } = achievement;

    return toast({
      variant: "default",
      title: title,
      description: description + (points > 0 ? ` (+${points} points)` : ''),
      className: cn(
        'border',
        achievementStyles[type]
      ),
      duration: 5000,
    });
  }, [toast]);

  return { showAchievement };
}
/* eslint-enable react-hooks/rules-of-hooks */

// Example usage:
// function MyComponent() {
//   const { showAchievement } = useAchievementToast();
//   
//   const handleAchievement = () => {
//     showAchievement({
//       title: "Word Master",
//       description: "Created a chain of 5 words!",
//       points: 100,
//       type: "silver"
//     });
//   }
//   return <button onClick={handleAchievement}>Trigger Achievement</button>
// } 