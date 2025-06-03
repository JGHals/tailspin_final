import { NextRequest, NextResponse } from 'next/server';
import { chainValidator } from '@/lib/game/validator-instance';

export interface ChainStatsRequest {
  chain: string[];
  includePathAnalysis?: boolean;
}

/**
 * POST /api/game/stats
 * 
 * Get statistics and analysis for a word chain
 * 
 * Example request:
 * ```
 * POST /api/game/stats
 * {
 *   "chain": ["puzzle", "lethal", "alliance"],
 *   "includePathAnalysis": true
 * }
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ChainStatsRequest;
    const { chain, includePathAnalysis = false } = body;

    if (!chain || !Array.isArray(chain)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { chain: string[] }' },
        { status: 400 }
      );
    }

    // Get basic chain stats
    const stats = await chainValidator.getChainStats(chain);

    // Optionally get detailed path analysis
    let pathAnalysis = undefined;
    if (includePathAnalysis) {
      pathAnalysis = await chainValidator.analyzePath(chain);
    }

    return NextResponse.json({
      stats,
      pathAnalysis
    });
  } catch (error) {
    console.error('Error getting chain stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 