import { v1 } from "@/server/shared/http/versioned-handlers";
export const runtime = "nodejs";
export const PUT = (request: Request, context: { params: Promise<{ id: string }> }) => v1.updateTransaction(request, context);
export const DELETE = (request: Request, context: { params: Promise<{ id: string }> }) => v1.deleteTransaction(request, context);
