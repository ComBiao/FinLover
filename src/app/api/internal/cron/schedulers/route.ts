import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import { rawSchedulers } from '@/server/composition';
import { isCronAuthorized } from '@/server/shared/http/cron';
import { logged } from '@/server/shared/http/logging';

export const runtime = 'nodejs';
// Vercel Cron calls this daily at 17:00 UTC (00:00 Asia/Bangkok); see vercel.json.
const handle = logged(async request => {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } }, { status: 401 });
  await connectDB();
  return NextResponse.json({ data: await rawSchedulers.runDue.execute() });
});
export const GET = (request: Request) => handle(request);
