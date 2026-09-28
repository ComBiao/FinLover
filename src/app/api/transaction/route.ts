import { transactions } from "@/server/composition";
export const runtime = "nodejs";
export const POST = (request: Request) => transactions.create(request);
