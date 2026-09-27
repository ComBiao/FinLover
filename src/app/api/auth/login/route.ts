import { auth } from "@/server/composition";
export const runtime = "nodejs";
export const POST = (request: Request) => auth.login(request);
