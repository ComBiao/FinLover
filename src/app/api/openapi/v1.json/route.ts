import { buildSpec } from "@/server/shared/docs/openapi";
export function GET() { return Response.json(buildSpec("v1")); }
