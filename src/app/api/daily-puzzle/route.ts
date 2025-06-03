import { NextResponse } from 'next/server';
import { dailyPuzzleService } from '@/lib/game/daily-puzzle-service';

export async function GET(request: Request) {
  try {
    // Get date from query params if provided
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const date = dateStr ? new Date(dateStr) : new Date();

    // Get puzzle for the specified date
    const puzzle = await dailyPuzzleService.getDailyPuzzle(date);

    return NextResponse.json(puzzle);
  } catch (error) {
    console.error('Error getting daily puzzle:', error);
    return NextResponse.json(
      { error: 'Failed to get daily puzzle' },
      { status: 500 }
    );
  }
}

// Generate puzzles for the next week
export async function POST(request: Request) {
  try {
    await dailyPuzzleService.generatePuzzlesForNextWeek();
    return NextResponse.json({ message: 'Generated puzzles for next week' });
  } catch (error) {
    console.error('Error generating puzzles:', error);
    return NextResponse.json(
      { error: 'Failed to generate puzzles' },
      { status: 500 }
    );
  }
} 