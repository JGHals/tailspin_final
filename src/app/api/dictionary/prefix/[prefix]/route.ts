import { NextResponse } from 'next/server';
import { dictionaryAccess } from '@/lib/dictionary/dictionary-access';

export async function GET(
  request: Request,
  { params }: { params: { prefix: string } }
) {
  try {
    const { prefix } = params;
    
    if (!prefix || prefix.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid prefix' },
        { status: 400 }
      );
    }

    const words = await dictionaryAccess.getWords(prefix);
    
    // Set cache control headers
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=86400'); // 24 hours
    headers.set('Vary', 'Accept-Encoding');

    return NextResponse.json(words, {
      headers,
      status: 200
    });

  } catch (error) {
    console.error('Error fetching dictionary words:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 