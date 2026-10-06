import type { NextRequest } from "next/server";
import { v1 } from "@/server/shared/http/versioned-handlers";
export const runtime = "nodejs";
export const DELETE = (request: NextRequest) => v1.deleteAccount(request, { params: Promise.resolve({ id: "" }) });