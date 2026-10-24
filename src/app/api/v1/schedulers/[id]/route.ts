import { v1 } from '@/server/shared/http/versioned-handlers';

export const runtime = 'nodejs';
export const GET = (request: Request, context: { params: Promise<{ id: string }> }) => v1.getScheduler(request, context);
export const PUT = (request: Request, context: { params: Promise<{ id: string }> }) => v1.updateScheduler(request, context);
export const DELETE = (request: Request, context: { params: Promise<{ id: string }> }) => v1.deleteScheduler(request, context);
