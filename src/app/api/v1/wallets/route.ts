import type { NextRequest } from 'next/server';
import { v1 } from '@/server/shared/http/versioned-handlers';

export const runtime = 'nodejs';
const routeContext = { params: Promise.resolve({ id: '' }) };
export const GET = (request: NextRequest) => v1.listWallets(request, routeContext);
export const POST = (request: NextRequest) => v1.createWallet(request, routeContext);
