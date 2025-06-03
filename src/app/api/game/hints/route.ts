import { NextRequest, NextResponse } from 'next/server';
import { chainValidator } from '@/lib/game/chain-validator';

export interface GetHintsRequest {
  chain: string[];
  maxHints?: number;
}

/**
 * POST /api/game/hints
 * 
 * Get hints for possible next moves from the current position
 * 
 * Example request:
 * ```
 * POST /api/game/hints
 * {
 *   "chain": ["puzzle", "lethal"],
 *   "maxHints": 3
 * }
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "hints": ["all...", "ant...", "alp..."],
 *   "totalPossibleMoves": 8
 * }
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GetHintsRequest;
    const { chain, maxHints = 3 } = body;

    if (!chain || !Array.isArray(chain)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { chain: string[] }' },
        { status: 400 }
      );
    }

    const currentWord = chain[chain.length - 1];
    const possibleNextWords = await chainValidator.findPossibleNextWords(currentWord);
    
    // Filter out words already used in the chain
    const unusedWords = possibleNextWords.filter(word => !chain.includes(word));
    
    // Generate hints by showing first few letters
    const hints = unusedWords
      .slice(0, maxHints)
      .map(word => {
        const hintLength = Math.min(4, Math.ceil(word.length * 0.6));
        return word.slice(0, hintLength) + '.'.repeat(word.length - hintLength);
      });

    return NextResponse.json({
      hints,
      totalPossibleMoves: unusedWords.length
    });
  } catch (error) {
    console.error('Error getting hints:', error);
    return NextResponse.json(
      { error: 'Failed to get hints' },
      { status: 500 }
    );
  }
} 