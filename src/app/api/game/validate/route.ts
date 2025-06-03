import { NextRequest, NextResponse } from 'next/server';
import { chainValidator } from '@/lib/game/chain-validator';
import { scoringSystem } from '@/lib/game/scoring';
import { auth } from '@/lib/firebase/firebase';

export interface ValidateWordRequest {
  chain: string[];
  nextWord: string;
  moveTime?: number; // Time taken to make this move in seconds
}

/**
 * POST /api/game/validate
 * 
 * Validate a word in the context of the current chain
 * 
 * Example request:
 * ```
 * POST /api/game/validate
 * Authorization: Bearer {firebaseIdToken}
 * {
 *   "chain": ["puzzle", "lethal"],
 *   "nextWord": "alliance",
 *   "moveTime": 3.5
 * }
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "valid": true,
 *   "score": {
 *     "base": 10,
 *     "length": 10,
 *     "rareLetters": 0,
 *     "streak": 5,
 *     "speed": 20,
 *     "total": 45
 *   },
 *   "stats": {
 *     "branchingFactor": 8.5,
 *     "pathDifficulty": "medium",
 *     "isTerminal": false,
 *     "possibleNextMoves": 12,
 *     "rareLettersUsed": []
 *   },
 *   "analysis": {
 *     "averageBranchingFactor": 7.2,
 *     "terminalRisk": 0.3,
 *     "suggestedMoves": ["all...", "ant..."],
 *     "deadEndWords": []
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
    const token = authHeader.split(' ')[1];

    const body = await req.json() as ValidateWordRequest;
    const { chain, nextWord, moveTime = 10 } = body;

    if (!chain || !Array.isArray(chain) || !nextWord || typeof nextWord !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { chain: string[], nextWord: string }' },
        { status: 400 }
      );
    }

    // Validate the word using our chain validator
    const validationResult = await chainValidator.validateNextWord(chain, nextWord);
    
    // If valid, get detailed stats and analysis
    if (validationResult.valid) {
      // Get chain stats including the new word
      const newChain = [...chain, nextWord];
      const stats = await chainValidator.getChainStats(newChain);
      
      // Get path analysis for future moves
      const analysis = await chainValidator.analyzePath(newChain);

      // Calculate score for this word
      const wordScore = scoringSystem.calculateWordScore(
        nextWord,
        moveTime,
        validationResult.isTerminal,
        stats.currentStreak
      );

      return NextResponse.json({
        valid: true,
        score: wordScore,
        stats: {
          branchingFactor: validationResult.branchingFactor,
          pathDifficulty: validationResult.pathDifficulty,
          isTerminal: validationResult.isTerminal,
          possibleNextMoves: validationResult.possibleNextMoves,
          rareLettersUsed: validationResult.rareLettersUsed
        },
        analysis: {
          averageBranchingFactor: analysis.averageBranchingFactor,
          terminalRisk: analysis.terminalRisk,
          suggestedMoves: analysis.suggestedMoves,
          deadEndWords: analysis.deadEndWords
        }
      });
    }

    // If invalid, return the reason
    return NextResponse.json({
      valid: false,
      reason: validationResult.reason,
      penalty: scoringSystem.recordInvalidAttempt()
    });

  } catch (error) {
    console.error('Error validating word:', error);
    return NextResponse.json(
      { error: 'Failed to validate word' },
      { status: 500 }
    );
  }
} 