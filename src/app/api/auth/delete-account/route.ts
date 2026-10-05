import { auth } from "@/server/composition";
export const runtime = "nodejs";
export const DELETE = (request: Request) => auth.deleteAccount(request);