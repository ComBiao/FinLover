import { v1 } from '@/server/shared/http/versioned-handlers';

export const runtime = 'nodejs';
const routeContext = { params: Promise.resolve({ id: '' }) };
export const GET = (request: Request) => v1.listSchedulers(request, routeContext);
export const POST = (request: Request) => v1.createScheduler(request, routeContext);
