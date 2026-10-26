import { v1 } from '@/server/shared/http/versioned-handlers';

export const runtime = 'nodejs';
export const POST = (request: Request, context: { params: Promise<{ id: string }> }) => v1.transferWalletOwnership(request, context);
