import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Validate request body against a Zod schema
 * 
 * @param req - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Response if validation fails, undefined otherwise
 */
export async function validateRequest<T>(
  req: NextRequest,
  schema: z.Schema<T>
): Promise<NextResponse | undefined> {
  try {
    const body = await req.json();
    await schema.parseAsync(body);
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(
        JSON.stringify({
          error: 'Invalid request body',
          details: error.errors
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return new NextResponse(
      JSON.stringify({
        error: 'Failed to parse request body'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

/**
 * Validate request headers
 * 
 * @param req - Next.js request object
 * @returns Response if validation fails, undefined otherwise
 */
export function validateAuth(req: NextRequest): NextResponse | undefined {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return new NextResponse(
      JSON.stringify({
        error: 'Missing or invalid authorization header'
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  return undefined;
}

// Game-specific schemas
export const LoadGameSchema = z.object({
  gameId: z.string().min(1),
  mode: z.enum(['daily', 'endless', 'versus'])
});

export const SubmitWordSchema = z.object({
  word: z.string().min(2),
  moveTime: z.number().optional()
});

export const StartGameSchema = z.object({
  mode: z.enum(['daily', 'endless', 'versus']),
  startWord: z.string().min(2).optional()
});

export const UsePowerUpSchema = z.object({
  type: z.enum(['hint', 'flip', 'bridge', 'undo', 'wordWarp'])
}); 