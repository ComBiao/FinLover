import type { NextRequest } from "next/server";
import { v1 } from "@/server/shared/http/versioned-handlers";
export const runtime = "nodejs";
export const POST = (request: NextRequest) => v1.logout(request, { params: Promise.resolve({ id: "" }) });
