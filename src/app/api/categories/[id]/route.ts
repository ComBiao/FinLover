import { categories } from "@/server/composition";
export const runtime = "nodejs";
export const PUT = (request: Request, context: { params: Promise<{ id: string }> }) => categories.update(request, context);
export const DELETE = (request: Request, context: { params: Promise<{ id: string }> }) => categories.remove(request, context);
