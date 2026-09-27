import { categories } from "@/server/composition";
export const runtime = "nodejs";
export const POST = (request: Request) => categories.create(request);
