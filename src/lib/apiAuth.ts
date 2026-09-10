import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifySessionToken } from '@/lib/session';

/** Authenticate a Bearer token and validate its user ID before database queries. */
export function authenticateRequest(req: NextRequest):
  | { userId: mongoose.Types.ObjectId; errorRes?: never }
  | { userId?: never; errorRes: NextResponse } {
  const header = req.headers.get('authorization');
  const token = header?.match(/^Bearer ([^\s]+)$/)?.[1];
  const verification = verifySessionToken<{ userId?: unknown }>(token);
  const userId = verification.valid ? verification.payload?.userId : undefined;

  if (typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    return {
      errorRes: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } },
        { status: 401 }
      ),
    };
  }

  return { userId: new mongoose.Types.ObjectId(userId) };
}
