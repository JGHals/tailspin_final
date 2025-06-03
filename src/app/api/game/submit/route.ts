import { NextRequest, NextResponse } from 'next/server';
import { gameModeManager } from '@/lib/game/game-mode-manager';
import { chainValidator } from '@/lib/game/chain-validator';
import { scoringSystem } from '@/lib/game/scoring';
import { achievementManager } from '@/lib/game/achievement-manager';

export interface SubmitWordRequest {
  word: string;
  moveTime?: number; // Time taken to make this move in seconds
}

/**
 * POST /api/game/submit
 * 
 * Submit a word to the current game chain
 * 
 * Example request:
 * ```
 * POST /api/game/submit
 * Authorization: Bearer {firebaseIdToken}
 * {
 *   "word": "lethal",
 *   "moveTime": 3.5
 * }
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "valid": true,
 *   "score": {
 *     "total": 45,
 *     "wordScores": {
 *       "lethal": {
 *         "base": 10,
 *         "length": 5,
 *         "rareLetters": 0,
 *         "streak": 10,
 *         "speed": 20,
 *         "total": 45
 *       }
 *     },
 *     "multiplier": 1.5,
 *     "terminalBonus": 0,
 *     "dailyBonus": 0,
 *     "penalties": 0
 *   },
 *   "stats": {
 *     "length": 2,
 *     "uniqueLetters": ["l", "e", "t", "h", "a"],
 *     "rareLetters": [],
 *     "averageWordLength": 6,
 *     "longestWord": "lethal",
 *     "currentStreak": 2,
 *     "maxStreak": 2,
 *     "terminalWords": [],
 *     "branchingFactors": [8.5, 7.2],
 *     "pathDifficulty": "medium"
 *   },
 *   "analysis": {
 *     "averageBranchingFactor": 7.2,
 *     "maxBranchingFactor": 8.5,
 *     "minBranchingFactor": 5.9,
 *     "terminalRisk": 0.3,
 *     "difficulty": "medium",
 *     "suggestedMoves": ["all...", "ant..."],
 *     "alternativePaths": [["alliance", "certain"], ["alphabet", "theory"]],
 *     "deadEndWords": []
 *   },
 *   "achievements": [
 *     {
 *       "id": "wordsmith",
 *       "name": "Wordsmith",
 *       "description": "Use a 7+ letter word",
 *       "progress": 1,
 *       "maxProgress": 1,
 *       "completed": true,
 *       "reward": {
 *         "tokens": 5,
 *         "powerUps": ["hint"]
 *       }
 *     }
 *   ]
 * }
 * ```
 * 
 * Error response:
 * ```json
 * {
 *   "valid": false,
 *   "reason": "Word must start with 'al'",
 *   "penalty": -5,
 *   "suggestedHints": ["all...", "alt..."]
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

    const body = await req.json() as SubmitWordRequest;
    const { word, moveTime = 10 } = body;

    if (!word) {
      return NextResponse.json(
        { error: 'Word is required' },
        { status: 400 }
      );
    }

    // Get current game state
    const currentState = gameModeManager.getGameState();
    if (!currentState) {
      return NextResponse.json(
        { error: 'No active game session' },
        { status: 400 }
      );
    }

    // Validate the word in the context of the current chain
    const validationResult = await chainValidator.validateNextWord(currentState.chain, word);
    
    if (validationResult.valid) {
      // Submit the word to the game manager
      const result = await gameModeManager.submitWord(word);
      
      // Get path analysis for future moves
      const analysis = await chainValidator.analyzePath(currentState.chain.concat(word));

      return NextResponse.json({
        valid: true,
        gameComplete: result.gameComplete,
        score: result.score,
        stats: result.stats,
        analysis,
        achievements: result.achievements
      });
    }

    // If invalid, return detailed error with penalty
    return NextResponse.json({
      valid: false,
      reason: validationResult.reason,
      penalty: scoringSystem.recordInvalidAttempt(),
      suggestedHints: validationResult.suggestedHints
    });

  } catch (error) {
    console.error('Error submitting word:', error);
    return NextResponse.json(
      { error: 'Failed to submit word' },
      { status: 500 }
    );
  }
} 