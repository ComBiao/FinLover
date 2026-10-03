import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';
import { buildSpec, operationsFor } from '../../src/server/shared/docs/openapi';
const dir = path.resolve(import.meta.dirname, '../../docs/api');
const mode = process.argv[2] ?? 'check';
async function main() {
await mkdir(dir, { recursive: true });
for (const version of ['legacy', 'v1'] as const) {
  const spec = buildSpec(version);
  const operations = operationsFor(version);
  const text = JSON.stringify(spec, null, 2) + '\n';
  const file = path.join(dir, `${version}.json`);
  await SwaggerParser.validate(JSON.parse(text));
  const ajv = new Ajv({ strict: false }); addFormats(ajv);
  for (const [route, methods] of Object.entries(spec.paths)) {
    const source = path.resolve(import.meta.dirname, '../../src/app', route.slice(1).replaceAll('{id}', '[id]'), 'route.ts');
    const contents = await readFile(source, 'utf8');
    for (const [method, value] of Object.entries(methods)) {
      if (!contents.includes(`export const ${method.toUpperCase()}`)) throw new Error(`Missing handler for ${method} ${route}`);
      const operation = value as { requestBody?: { content: { 'application/json': { schema: object; example: unknown } } } };
      const body = operation.requestBody?.content['application/json'];
      if (body && !ajv.validate(body.schema, body.example)) throw new Error(`Invalid example for ${route}: ${ajv.errorsText()}`);
    }
  }
  const entries = Object.values(spec.paths).flatMap(value => Object.values(value)) as { operationId: string }[];
  if (entries.length !== operations.length || new Set(entries.map(value => value.operationId)).size !== operations.length) throw new Error('Operation coverage or duplicate operationId');
  if (mode === 'generate') await writeFile(file, text);
  else {
    const stored = await readFile(file, 'utf8');
    await SwaggerParser.validate(JSON.parse(stored));
    if (stored !== text) throw new Error(`${file} is out of date; run npm run api:generate`);
  }
  console.log(`${version}: valid, ${entries.length} operations, ${mode}`);
}
}
main().catch(error => { console.error(error); process.exitCode = 1; });
