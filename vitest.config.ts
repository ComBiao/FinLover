import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  test: { environment: 'node', setupFiles: ['./src/test/setup.ts'], globals: true, env: { JWT_SECRET: 'test-secret-key-for-vitest', PUBLIC_ORIGINS: 'http://localhost,http://localhost:3000' } },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
});
