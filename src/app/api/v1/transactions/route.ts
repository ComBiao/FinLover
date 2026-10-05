import type { NextRequest } from "next/server";
import { v1 } from "@/server/shared/http/versioned-handlers";
export const runtime = "nodejs";
export const GET = (request: NextRequest) => v1.listTransactions(request, { params: Promise.resolve({ id: "" }) });
export const POST = (request: NextRequest) => v1.createTransaction(request, { params: Promise.resolve({ id: "" }) });
