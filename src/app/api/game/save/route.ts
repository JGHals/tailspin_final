import { NextRequest, NextResponse } from 'next/server';
import { gameModeManager } from '@/lib/game/game-mode-manager';
import { gameStateService } from '@/lib/services/game-state-service';
import type { GameScore } from '@/lib/types/game';

/**
 * POST /api/game/save
 * 
 * Save the current game state
 * 
 * Example request:
 * ```
 * POST /api/game/save
 * Authorization: Bearer {firebaseIdToken}
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "gameId": "user123_1234567890"
 * }
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    // Get user ID from auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    const userId = authHeader.split(' ')[1];

    // Set the user ID for the game manager
    gameModeManager.setUserId(userId);

    // Get current game state
    const state = gameModeManager.getGameState();
    if (!state) {
      return NextResponse.json(
        { error: 'No active game to save' },
        { status: 400 }
      );
    }

    // Save the game state
    const gameId = await gameStateService.saveGameState(userId, {
      mode: state.mode,
      chain: state.chain,
      startWord: state.startWord,
      targetWord: state.targetWord,
      score: {
        total: state.score.total,
        wordPoints: Object.values(state.score.wordScores).reduce((sum, score) => sum + score.base, 0),
        chainPoints: Object.values(state.score.wordScores).reduce((sum, score) => sum + score.streak, 0),
        bonusPoints: state.score.dailyBonus + Object.values(state.score.wordScores).reduce((sum, score) => sum + score.speed + score.length + score.rareLetters, 0),
        terminalPoints: state.score.terminalBonus
      },
      stats: state.stats,
      isComplete: state.isComplete,
      startTime: state.startTime,
      lastMoveTime: state.lastMoveTime,
      hintsUsed: state.hintsUsed,
      invalidAttempts: state.invalidAttempts,
      wordTimings: Array.from(state.wordTimings.entries()).map(([word, time]) => ({ word, time })),
      terminalWords: Array.from(state.terminalWords),
      powerUpsUsed: Array.from(state.powerUpsUsed),
      rareLettersUsed: Array.from(state.rareLettersUsed),
      dailyPuzzle: state.dailyPuzzle
    });

    return NextResponse.json({ gameId });
  } catch (error) {
    console.error('Error saving game:', error);
    return NextResponse.json(
      { error: 'Failed to save game' },
      { status: 500 }
    );
  }
} 