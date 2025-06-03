import { NextResponse } from 'next/server';
import { uploadInitialDictionary } from '@/lib/dictionary/upload-dictionary';

export async function POST() {
  try {
    const success = await uploadInitialDictionary();
    if (success) {
      return NextResponse.json({ message: 'Dictionary initialized successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to initialize dictionary' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error initializing dictionary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Only allow POST method
export async function GET() {
  return new Response('Method not allowed', { status: 405 });
} 