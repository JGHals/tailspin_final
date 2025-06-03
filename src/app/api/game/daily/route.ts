import { NextRequest, NextResponse } from 'next/server';
import { dailyPuzzleService } from '@/lib/game/daily-puzzle-service';

/**
 * GET /api/game/daily
 * 
 * Get today's daily puzzle
 * 
 * Example request:
 * ```
 * GET /api/game/daily
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "puzzle": {
 *     "date": "2024-03-21",
 *     "startWord": "puzzle",
 *     "targetWord": "lethal",
 *     "parMoves": 3,
 *     "difficulty": "medium",
 *     "hints": ["puz...", "let..."]
 *   }
 * }
 * ```
 */
export async function GET(req: NextRequest) {
  try {
    const puzzle = await dailyPuzzleService.getDailyPuzzle();
    
    // Return only the safe fields that don't expose solutions
    const safePuzzle = {
      date: puzzle.date,
      startWord: puzzle.startWord,
      targetWord: puzzle.targetWord,
      parMoves: puzzle.parMoves,
      difficulty: (puzzle as any).difficulty,
      hints: (puzzle as any).hints
    };
    
    return NextResponse.json({ puzzle: safePuzzle });
  } catch (error) {
    console.error('Error fetching daily puzzle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily puzzle' },
      { status: 500 }
    );
  }
} 