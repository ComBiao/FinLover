import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';
import { buildSpec, operations } from '../../src/server/shared/docs/openapi';
const dir = path.resolve(import.meta.dirname, '../../docs/api');
const apiRoot = path.resolve(import.meta.dirname, '../../src/app/api');
const mode = process.argv[2] ?? 'check';
const coveredHandlers = new Set<string>();
async function routeFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(target) : entry.name === 'route.ts' ? [target] : [];
  }));
  return nested.flat();
}
async function main() {
await mkdir(dir, { recursive: true });
for (const version of ['legacy', 'v1'] as const) {
  const spec = buildSpec(version);
  const text = JSON.stringify(spec, null, 2) + '\n';
  const file = path.join(dir, `${version}.json`);
  await SwaggerParser.validate(JSON.parse(text));
  const ajv = new Ajv({ strict: false }); addFormats(ajv);
  for (const [route, methods] of Object.entries(spec.paths)) {
    const source = path.resolve(import.meta.dirname, '../../src/app', route.slice(1).replaceAll('{id}', '[id]'), 'route.ts');
    const contents = await readFile(source, 'utf8');
    for (const [method, value] of Object.entries(methods)) {
      if (!contents.includes(`export const ${method.toUpperCase()}`)) throw new Error(`Missing handler for ${method} ${route}`);
      coveredHandlers.add(`${method.toUpperCase()} ${route}`);
      const operation = value as { requestBody?: { content: { 'application/json': { schema: object; example: unknown } } } };
      const body = operation.requestBody?.content['application/json'];
      if (body && !ajv.validate(body.schema, body.example)) throw new Error(`Invalid example for ${route}: ${ajv.errorsText()}`);
    }
  }
  const entries = Object.values(spec.paths).flatMap(value => Object.values(value)) as { operationId: string }[];
  const applicableCount = operations.filter(operation => !('versions' in operation) || (operation.versions as readonly string[]).includes(version)).length;
  if (entries.length !== applicableCount || new Set(entries.map(value => value.operationId)).size !== applicableCount) throw new Error('Operation coverage or duplicate operationId');
  if (mode === 'generate') await writeFile(file, text);
  else {
    const stored = await readFile(file, 'utf8');
    await SwaggerParser.validate(JSON.parse(stored));
    if (stored !== text) throw new Error(`${file} is out of date; run npm run api:generate`);
  }
  console.log(`${version}: valid, ${entries.length} operations, ${mode}`);
}
for (const file of await routeFiles(apiRoot)) {
  const relativeDirectory = path.relative(apiRoot, path.dirname(file));
  const suffix = relativeDirectory === '.' ? '' : `/${relativeDirectory.split(path.sep).map(segment => segment.replace(/^\[(.+)\]$/, '{$1}')).join('/')}`;
  const route = `/api${suffix}`;
  // Swagger UI and spec-serving routes are documentation infrastructure, not product API operations.
  if (route === '/api/docs' || route.startsWith('/api/docs/') || route === '/api/openapi' || route.startsWith('/api/openapi/')) continue;
  const contents = await readFile(file, 'utf8');
  const handlers = contents.matchAll(/export\s+(?:(?:async\s+)?function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g);
  for (const [, method] of handlers) {
    const key = `${method} ${route}`;
    if (!coveredHandlers.has(key)) throw new Error(`Missing OpenAPI operation for route handler ${key}`);
  }
}
}
main().catch(error => { console.error(error); process.exitCode = 1; });
