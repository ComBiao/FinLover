import { readFile, writeFile } from 'node:fs/promises';
import { marked } from 'marked';
const source = new URL('../../docs/codebase.md', import.meta.url);
const target = new URL('../../docs/codebase.html', import.meta.url);
const content = marked.parse(await readFile(source, 'utf8'));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>FinLover Codebase Guide</title><style>body{max-width:1080px;margin:40px auto;padding:0 24px;font:16px/1.65 system-ui;color:#17212b}pre{overflow:auto;background:#f3f5f7;padding:16px}code{font-size:.9em}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd4dc;padding:8px;text-align:left}a{color:#165dc8}</style></head><body>${content}</body></html>\n`;
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== html) throw new Error('codebase.html is stale; run npm run docs:generate');
} else await writeFile(target, html);
