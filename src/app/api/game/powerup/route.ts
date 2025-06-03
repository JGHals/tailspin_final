import { NextRequest, NextResponse } from 'next/server';
import { gameModeManager } from '@/lib/game/game-mode-manager';
import { chainValidator } from '@/lib/game/chain-validator';
import { scoringSystem } from '@/lib/game/scoring';

export type PowerUpType = 'hint' | 'flip' | 'bridge' | 'undo' | 'wordWarp';

export interface UsePowerUpRequest {
  type: PowerUpType;
}

/**
 * POST /api/game/powerup
 * 
 * Use a power-up in the current game
 * 
 * Example request:
 * ```
 * POST /api/game/powerup
 * Authorization: Bearer {firebaseIdToken}
 * {
 *   "type": "hint"
 * }
 * ```
 * 
 * Example response for "hint":
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "hints": ["letter", "length", "listen"],
 *     "cost": 5,
 *     "stats": {
 *       "hintsRemaining": 2,
 *       "tokensRemaining": 45
 *     }
 *   }
 * }
 * ```
 * 
 * Example response for "flip":
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "originalPrefix": "al",
 *     "flippedPrefix": "la",
 *     "validWords": ["large", "laser", "later"],
 *     "cost": 10,
 *     "stats": {
 *       "flipsRemaining": 1,
 *       "tokensRemaining": 40
 *     }
 *   }
 * }
 * ```
 * 
 * Example response for "bridge":
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "bridgeWord": "alliance",
 *     "nextPossibleWords": ["certain", "center"],
 *     "cost": 15,
 *     "stats": {
 *       "bridgesRemaining": 1,
 *       "tokensRemaining": 35
 *     }
 *   }
 * }
 * ```
 * 
 * Example response for "undo":
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "removedWord": "lethal",
 *     "newChainEnd": "puzzle",
 *     "possibleWords": ["letter", "level"],
 *     "cost": 5,
 *     "stats": {
 *       "undosRemaining": 2,
 *       "tokensRemaining": 30
 *     }
 *   }
 * }
 * ```
 * 
 * Example response for "wordWarp":
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "words": ["letter", "length", "listen"],
 *     "prefixOptions": ["le", "li", "lo"],
 *     "cost": 20,
 *     "stats": {
 *       "warpsRemaining": 0,
 *       "tokensRemaining": 10
 *     }
 *   }
 * }
 * ```
 * 
 * Error responses:
 * ```json
 * {
 *   "success": false,
 *   "error": "Not enough tokens",
 *   "required": 10,
 *   "available": 5
 * }
 * ```
 * ```json
 * {
 *   "success": false,
 *   "error": "No active game session"
 * }
 * ```
 * ```json
 * {
 *   "success": false,
 *   "error": "Power-up not available",
 *   "reason": "Already used maximum number of hints"
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

    const body = await req.json() as UsePowerUpRequest;
    const { type } = body;

    if (!type || !['hint', 'flip', 'bridge', 'undo', 'wordWarp'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid power-up type' },
        { status: 400 }
      );
    }

    // Get current game state
    const currentState = gameModeManager.getGameState();
    if (!currentState) {
      return NextResponse.json({
        success: false,
        error: 'No active game session'
      });
    }

    let result;
    switch (type) {
      case 'hint':
        result = await gameModeManager.useHint();
        return NextResponse.json({
          success: true,
          data: {
            hints: result,
            cost: 5,
            stats: {
              hintsRemaining: 3 - currentState.hintsUsed,
              tokensRemaining: currentState.score.total
            }
          }
        });

      case 'flip':
        result = await gameModeManager.useFlip();
        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error,
            reason: result.reason
          });
        }
        return NextResponse.json({
          success: true,
          data: {
            ...result.data,
            cost: 10,
            stats: {
              flipsRemaining: 2 - currentState.powerUpsUsed.size,
              tokensRemaining: currentState.score.total
            }
          }
        });

      case 'bridge':
        result = await gameModeManager.useBridge();
        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error,
            reason: result.reason
          });
        }
        return NextResponse.json({
          success: true,
          data: {
            ...result.data,
            cost: 15,
            stats: {
              bridgesRemaining: 1 - currentState.powerUpsUsed.size,
              tokensRemaining: currentState.score.total
            }
          }
        });

      case 'undo':
        result = await gameModeManager.useUndo();
        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error,
            reason: result.reason
          });
        }
        return NextResponse.json({
          success: true,
          data: {
            ...result.data,
            cost: 5,
            stats: {
              undosRemaining: 3 - currentState.powerUpsUsed.size,
              tokensRemaining: currentState.score.total
            }
          }
        });

      case 'wordWarp':
        result = await gameModeManager.useWordWarp();
        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error,
            reason: result.reason
          });
        }
        return NextResponse.json({
          success: true,
          data: {
            ...result.data,
            cost: 20,
            stats: {
              warpsRemaining: 1 - currentState.powerUpsUsed.size,
              tokensRemaining: currentState.score.total
            }
          }
        });
    }
  } catch (error) {
    console.error('Error using power-up:', error);
    return NextResponse.json(
      { error: 'Failed to use power-up' },
      { status: 500 }
    );
  }
} 