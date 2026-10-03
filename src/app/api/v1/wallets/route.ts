import { v1 } from '@/server/shared/http/versioned-handlers';

export const runtime = 'nodejs';
export const GET = (request: Request) => v1.listWallets(request, { params: Promise.resolve({ id: '' }) });
