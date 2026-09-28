import path from 'node:path';
import { readFile } from 'node:fs/promises';
import getAbsoluteFSPath from 'swagger-ui-dist/absolute-path.js';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const types: Record<string, string> = { 'swagger-ui.css': 'text/css', 'swagger-ui-bundle.js': 'text/javascript' };
  if (!Object.hasOwn(types, name)) return new Response(null, { status: 404 });
  const data = await readFile(path.join(getAbsoluteFSPath(), name));
  return new Response(data, { headers: { 'content-type': types[name], 'cache-control': 'public, max-age=3600' } });
}
