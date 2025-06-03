import { NextRequest, NextResponse } from 'next/server';
import { gameModeManager } from '@/lib/game/game-mode-manager';
import { dailyPuzzleService } from '@/lib/game/daily-puzzle-service';
import { chainValidator } from '@/lib/game/chain-validator';
import { scoringSystem } from '@/lib/game/scoring';
import type { GameMode, DailyPuzzle } from '@/lib/types/game';

export interface StartGameRequest {
  mode: GameMode;
  startWord?: string; // Optional - if not provided, one will be chosen
}

/**
 * POST /api/game/start
 * 
 * Start a new game session
 * 
 * Example request:
 * ```
 * POST /api/game/start
 * Authorization: Bearer {firebaseIdToken}
 * {
 *   "mode": "endless",
 *   "startWord": "puzzle" // Optional
 * }
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "state": {
 *     "mode": "endless",
 *     "chain": ["puzzle"],
 *     "startWord": "puzzle",
 *     "score": {
 *       "total": 0,
 *       "wordScores": {},
 *       "multiplier": 1,
 *       "terminalBonus": 0,
 *       "dailyBonus": 0,
 *       "penalties": 0
 *     },
 *     "stats": {
 *       "averageBranchingFactor": 8.5,
 *       "uniqueLettersUsed": ["p", "u", "z", "l", "e"],
 *       "pathDifficulty": "medium",
 *       "currentStreak": 0,
 *       "maxStreak": 0,
 *       "terminalWords": []
 *     },
 *     "analysis": {
 *       "terminalRisk": 0.2,
 *       "suggestedMoves": ["puz...", "pul..."],
 *       "deadEndWords": []
 *     },
 *     "powerUps": {
 *       "available": ["hint", "flip", "bridge", "undo", "wordWarp"],
 *       "used": []
 *     }
 *   }
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

    const body = await req.json() as StartGameRequest;
    const { mode, startWord } = body;

    // Validate mode
    if (!['daily', 'endless', 'versus'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid game mode' },
        { status: 400 }
      );
    }

    // Reset validators and scoring for new game
    chainValidator.resetUsedWords();
    scoringSystem.reset();

    // Set the user ID for the game manager
    gameModeManager.setUserId(userId);

    // For daily mode, always use the daily puzzle
    if (mode === 'daily') {
      const dailyPuzzle = await dailyPuzzleService.getDailyPuzzle();
      
      // Validate daily puzzle words
      const startValid = await chainValidator.validateNextWord([], dailyPuzzle.startWord);
      const endValid = await chainValidator.validateNextWord([dailyPuzzle.startWord], dailyPuzzle.targetWord);
      
      if (!startValid.valid || !endValid.valid) {
        console.error('Invalid daily puzzle words:', { startValid, endValid });
        return NextResponse.json(
          { error: 'Invalid daily puzzle configuration' },
          { status: 500 }
        );
      }

      await gameModeManager.startGame({
        startWord: dailyPuzzle.startWord,
        targetWord: dailyPuzzle.targetWord,
        dailyPuzzle
      });

      // Get initial path analysis
      const initialState = gameModeManager.getGameState();
      const analysis = await chainValidator.analyzePath([initialState.startWord]);

      return NextResponse.json({
        state: {
          ...initialState,
          analysis: {
            terminalRisk: analysis.terminalRisk,
            suggestedMoves: analysis.suggestedMoves,
            deadEndWords: analysis.deadEndWords
          }
        }
      });
    }

    // For other modes, validate provided start word or get a random one
    let finalStartWord = startWord;
    if (finalStartWord) {
      const validation = await chainValidator.validateNextWord([], finalStartWord);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `Invalid start word: ${validation.reason}` },
          { status: 400 }
        );
      }
    }

    await gameModeManager.startGame({
      startWord: finalStartWord
    });

    // Get initial path analysis
    const initialState = gameModeManager.getGameState();
    const analysis = await chainValidator.analyzePath([initialState.startWord]);

    return NextResponse.json({
      state: {
        ...initialState,
        analysis: {
          terminalRisk: analysis.terminalRisk,
          suggestedMoves: analysis.suggestedMoves,
          deadEndWords: analysis.deadEndWords
        }
      }
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    );
  }
} 