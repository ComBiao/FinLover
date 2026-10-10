import type { NextRequest } from "next/server";
import { v1 } from "@/server/shared/http/versioned-handlers";
export const runtime = "nodejs";
export const GET = (request: NextRequest) => v1.listCategories(request, { params: Promise.resolve({ id: "" }) });
export const POST = (request: NextRequest) => v1.createCategory(request, { params: Promise.resolve({ id: "" }) });
