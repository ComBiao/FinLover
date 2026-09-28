import { transactions } from "@/server/composition";
export const runtime = "nodejs";
export const PUT = (request: Request, context: { params: Promise<{ id: string }> }) => transactions.update(request, context);
export const DELETE = (request: Request, context: { params: Promise<{ id: string }> }) => transactions.remove(request, context);
