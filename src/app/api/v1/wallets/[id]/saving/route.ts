import { v1 } from "@/server/shared/http/versioned-handlers";
export const runtime = "nodejs";
export const PATCH = (request: Request, context: { params: Promise<{ id: string }> }) => v1.updateWalletSaving(request, context);
