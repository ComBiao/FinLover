import { v1 } from "@/server/shared/http/versioned-handlers";
export const runtime = "nodejs";
export const PUT = (request: Request, context: { params: Promise<{ id: string }> }) => v1.updateCategory(request, context);
export const DELETE = (request: Request, context: { params: Promise<{ id: string }> }) => v1.deleteCategory(request, context);
