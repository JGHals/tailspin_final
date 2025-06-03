import { NextRequest, NextResponse } from 'next/server';
import { gameModeManager } from '@/lib/game/game-mode-manager';
import { chainValidator } from '@/lib/game/chain-validator';
import { rateLimit, GAME_ENDPOINTS_RATE_LIMIT } from '@/lib/middleware/rate-limit';
import { validateRequest, validateAuth, LoadGameSchema } from '@/lib/middleware/validate';
import type { GameMode } from '@/lib/types/game';

export interface LoadGameRequest {
  gameId: string;
  mode: GameMode;
}

/**
 * POST /api/game/load
 * 
 * Load a previously saved game state
 * 
 * Example request:
 * ```
 * POST /api/game/load
 * Authorization: Bearer {firebaseIdToken}
 * {
 *   "gameId": "abc123",
 *   "mode": "endless"
 * }
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "success": true,
 *   "state": {
 *     "mode": "endless",
 *     "chain": ["puzzle", "lethal", "alliance"],
 *     "startWord": "puzzle",
 *     "score": {
 *       "total": 85,
 *       "wordScores": {
 *         "lethal": { "total": 45, ... },
 *         "alliance": { "total": 40, ... }
 *       },
 *       "multiplier": 1.5,
 *       "terminalBonus": 0,
 *       "dailyBonus": 0,
 *       "penalties": 0
 *     },
 *     "stats": {
 *       "length": 3,
 *       "uniqueLetters": ["p", "u", "z", "l", "e", "t", "h", "a", "i", "n", "c"],
 *       "rareLetters": [],
 *       "averageWordLength": 6.3,
 *       "longestWord": "alliance",
 *       "currentStreak": 3,
 *       "maxStreak": 3,
 *       "terminalWords": [],
 *       "branchingFactors": [8.5, 7.2, 6.8],
 *       "pathDifficulty": "medium"
 *     },
 *     "powerUps": {
 *       "available": ["hint", "flip", "bridge", "undo", "wordWarp"],
 *       "used": []
 *     }
 *   },
 *   "analysis": {
 *     "averageBranchingFactor": 7.5,
 *     "terminalRisk": 0.2,
 *     "suggestedMoves": ["certain", "center"],
 *     "deadEndWords": []
 *   }
 * }
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit(req, GAME_ENDPOINTS_RATE_LIMIT);
    if (rateLimitResult) return rateLimitResult;

    // Validate auth header
    const authResult = validateAuth(req);
    if (authResult) return authResult;

    // Validate request body
    const validationResult = await validateRequest(req, LoadGameSchema);
    if (validationResult) return validationResult;

    const body = await req.json() as LoadGameRequest;
    const { gameId, mode } = body;

    // Get user ID from auth token
    const userId = req.headers.get('authorization')!.split(' ')[1];

    // Set the user ID for the game manager
    gameModeManager.setUserId(userId);

    // Resume the saved game - this handles loading from Firebase,
    // validating the state, and setting up auto-save
    const success = await gameModeManager.resumeGame(gameId);
    if (!success) {
      return NextResponse.json(
        { error: 'Game not found or could not be loaded' },
        { status: 404 }
      );
    }

    // Get current game state after resuming
    const currentState = gameModeManager.getGameState();

    // Validate the chain and rebuild the validator's state
    const isValidChain = await chainValidator.validateChain(currentState.chain);
    if (!isValidChain) {
      return NextResponse.json(
        { error: 'Invalid word chain in saved game state' },
        { status: 400 }
      );
    }

    // Get path analysis for current position
    const analysis = await chainValidator.analyzePath(currentState.chain);

    return NextResponse.json({
      success: true,
      state: currentState,
      analysis: {
        averageBranchingFactor: analysis.averageBranchingFactor,
        terminalRisk: analysis.terminalRisk,
        suggestedMoves: analysis.suggestedMoves,
        deadEndWords: analysis.deadEndWords
      }
    });

  } catch (error) {
    console.error('Error loading game:', error);
    return NextResponse.json(
      { error: 'Failed to load game' },
      { status: 500 }
    );
  }
} 